// Real-time consultation room (Socket.io namespace "/consultations").
//
// A socket joins only with a valid room ticket from GET /consultations/:id/access-check
// (handshake auth: { ticket }). Each appointment is its own room.
//
// Client -> server events
//   message:send   { messageType?, text?, attachments?: string[], audioDuration?, clientId? }   (ack: { ok, message } | { ok: false, error })
//   sendMessage    same as message:send
//   message:read   {}                                             mark the other side's messages read
//   typing         { isTyping: boolean }
//   rtc:signal     { type: 'ready' | 'offer' | 'answer' | 'candidate' | 'hangup', payload? }   WebRTC signaling relay
//   media:state    { audio: boolean, video: boolean }
//   waiting:notify {}         doctor: "Notify Patient I'm Waiting" (ack: { ok, retryAfter } | { ok: false, error, retryAfter? })
//   waiting:state  {}         doctor: current waiting state (ack: WaitingState)
// Server -> client events
//   room:joined, room:error, presence, participant:joined, participant:left,
//   message:new, message:read, typing, rtc:signal, media:state, session:ended,
//   waiting:state (to the doctor only)

import { Logger } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import type { Namespace, Socket } from 'socket.io';
import { ConsultationsService } from './consultations.service.js';
import { verifyRoomTicket, type RoomTicket } from './room-ticket.js';
import {
  PATIENT_WAIT_MINUTES,
  WAITING_ALERT_COOLDOWN_SECONDS,
  WaitingRoomTracker,
  type WaitingSnapshot,
} from './doctor-waiting.js';

const RTC_SIGNAL_TYPES = ['ready', 'offer', 'answer', 'candidate', 'hangup'] as const;
type RtcSignalType = (typeof RTC_SIGNAL_TYPES)[number];

/** Same origins as the HTTP API (apps/api/src/main.ts) plus WEB_ORIGINS from .env */
const ORIGINS = [
  'http://localhost:3000',
  'http://localhost:3001',
  ...(process.env.WEB_ORIGINS ?? '').split(',').map((o) => o.trim()).filter(Boolean),
];

const roomOf = (appointmentId: string) => `consultation:${appointmentId}`;

/** A chat message: TEXT, or a VOICE / IMAGE / DOCUMENT message with uploaded attachments */
interface MessagePayload {
  messageType?: unknown;
  text?: unknown;
  /** caption (spec name); same as text */
  message?: unknown;
  attachments?: unknown;
  audioDuration?: unknown;
  clientId?: unknown;
}

type RoomSocket = Pick<Socket, 'id' | 'data' | 'emit' | 'to' | 'join' | 'disconnect'> & {
  handshake: { auth?: Record<string, unknown> };
};

@WebSocketGateway({
  namespace: '/consultations',
  cors: { origin: ORIGINS, credentials: true },
  maxHttpBufferSize: 256 * 1024, // messages are text; files go through the upload endpoint
})
export class ConsultationsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(ConsultationsGateway.name);
  /** Who is waiting for whom in each room (doctor waiting for the patient) */
  private readonly waiting = new WaitingRoomTracker();

  @WebSocketServer()
  server!: Namespace;

  constructor(private readonly consultations: ConsultationsService) {}

  // ---------------------------------------------------------------------------
  // Join / leave
  // ---------------------------------------------------------------------------

  async handleConnection(client: RoomSocket) {
    const ticket = verifyRoomTicket(client.handshake.auth?.ticket as string | undefined);
    if (!ticket) return this.reject(client, 'Your access to this consultation room has expired. Please reopen the room.');
    try {
      await this.consultations.assertRoomOpen(ticket.aid);
    } catch (e) {
      return this.reject(client, (e as Error).message);
    }

    client.data.ticket = ticket;
    if (ticket.role === 'USER') {
      this.waiting.patientJoined(ticket.aid);
    } else if (this.waiting.doctorJoined(ticket.aid)) {
      // First time in this room since the API started: has the patient already taken part?
      if (await this.consultations.patientHasParticipated(ticket.aid).catch(() => false)) this.waiting.patientJoined(ticket.aid);
    }
    await client.join(roomOf(ticket.aid));
    const presence = await this.presence(ticket.aid);
    client.emit('room:joined', { me: { role: ticket.role, name: ticket.name }, presence });
    client.to(roomOf(ticket.aid)).emit('participant:joined', { role: ticket.role, name: ticket.name });
    this.server.to(roomOf(ticket.aid)).emit('presence', presence);
    await this.broadcastWaiting(ticket.aid, presence);
  }

  async handleDisconnect(client: RoomSocket) {
    const ticket = client.data?.ticket as RoomTicket | undefined;
    if (!ticket) return;
    const presence = await this.presence(ticket.aid);
    // Another tab of the same person may still be connected
    if (!presence[ticket.role]) {
      this.server.to(roomOf(ticket.aid)).emit('participant:left', { role: ticket.role, name: ticket.name });
    }
    this.server.to(roomOf(ticket.aid)).emit('presence', presence);
    await this.broadcastWaiting(ticket.aid, presence);
  }

  // ---------------------------------------------------------------------------
  // Doctor waiting for the patient
  // ---------------------------------------------------------------------------

  @SubscribeMessage('waiting:state')
  async onWaitingState(@ConnectedSocket() client: RoomSocket) {
    const ticket = this.ticketOf(client);
    if (!ticket || ticket.role !== 'DOCTOR') return { ok: false };
    return { ok: true, ...this.waitingState(ticket.aid, await this.presence(ticket.aid)) };
  }

  @SubscribeMessage('waiting:notify')
  async onWaitingNotify(@ConnectedSocket() client: RoomSocket) {
    const ticket = this.ticketOf(client);
    if (!ticket) return { ok: false, error: 'Your access to this consultation room has expired. Please reopen the room.' };
    if (ticket.role !== 'DOCTOR') return { ok: false, error: 'Only the doctor can send this notification.' };
    const presence = await this.presence(ticket.aid);
    if (presence.USER) return { ok: false, error: 'The patient is already in the consultation room.' };
    const retryAfter = this.waiting.cooldownLeft(ticket.aid);
    if (retryAfter > 0) return { ok: false, error: `You can notify the patient again in ${retryAfter} seconds.`, retryAfter };

    // Hold the slot first so a double click can't send two alerts
    const previous = this.waiting.recordAlert(ticket.aid);
    try {
      const snapshot = this.waiting.snapshot(ticket.aid, presence.USER);
      await this.consultations.sendDoctorWaitingAlert(ticket, { patientLeft: snapshot.patientJoined });
    } catch (e) {
      this.waiting.undoAlert(ticket.aid, previous);
      return { ok: false, error: (e as Error).message };
    }
    await this.broadcastWaiting(ticket.aid, presence);
    return { ok: true, retryAfter: WAITING_ALERT_COOLDOWN_SECONDS };
  }

  // ---------------------------------------------------------------------------
  // Chat
  // ---------------------------------------------------------------------------

  @SubscribeMessage('sendMessage')
  onSendMessage(@ConnectedSocket() client: RoomSocket, @MessageBody() body: MessagePayload) {
    return this.onMessage(client, body);
  }

  @SubscribeMessage('message:send')
  async onMessage(@ConnectedSocket() client: RoomSocket, @MessageBody() body: MessagePayload) {
    const ticket = this.ticketOf(client);
    if (!ticket) return { ok: false, error: 'Your access to this consultation room has expired. Please reopen the room.' };
    try {
      const message = await this.consultations.saveMessage(ticket, {
        messageType: body?.messageType,
        text: body?.text ?? body?.message,
        attachments: body?.attachments,
        audioDuration: body?.audioDuration,
      });
      const clientId = typeof body?.clientId === 'string' ? body.clientId.slice(0, 64) : undefined;
      this.server.to(roomOf(ticket.aid)).emit('message:new', { ...message, clientId });
      return { ok: true, message: { ...message, clientId } };
    } catch (e) {
      return { ok: false, error: (e as Error).message };
    }
  }

  @SubscribeMessage('message:read')
  async onRead(@ConnectedSocket() client: RoomSocket) {
    const ticket = this.ticketOf(client);
    if (!ticket) return { ok: false };
    const ids = await this.consultations.markRead(ticket);
    if (ids.length) this.server.to(roomOf(ticket.aid)).emit('message:read', { ids, by: ticket.role });
    return { ok: true, count: ids.length };
  }

  @SubscribeMessage('typing')
  onTyping(@ConnectedSocket() client: RoomSocket, @MessageBody() body: { isTyping?: unknown }) {
    const ticket = this.ticketOf(client);
    if (!ticket) return;
    client.to(roomOf(ticket.aid)).emit('typing', { role: ticket.role, name: ticket.name, isTyping: body?.isTyping === true });
  }

  // ---------------------------------------------------------------------------
  // Video call signaling (WebRTC offer / answer / ICE candidates)
  // ---------------------------------------------------------------------------

  @SubscribeMessage('rtc:signal')
  onSignal(@ConnectedSocket() client: RoomSocket, @MessageBody() body: { type?: unknown; payload?: unknown }) {
    const ticket = this.ticketOf(client);
    if (!ticket || !RTC_SIGNAL_TYPES.includes(body?.type as RtcSignalType)) return;
    client.to(roomOf(ticket.aid)).emit('rtc:signal', { from: ticket.role, type: body.type, payload: body.payload ?? null });
  }

  @SubscribeMessage('media:state')
  onMediaState(@ConnectedSocket() client: RoomSocket, @MessageBody() body: { audio?: unknown; video?: unknown }) {
    const ticket = this.ticketOf(client);
    if (!ticket) return;
    client.to(roomOf(ticket.aid)).emit('media:state', { role: ticket.role, audio: body?.audio !== false, video: body?.video !== false });
  }

  // ---------------------------------------------------------------------------

  /** Called after the doctor ends the consultation (POST /consultations/:id/end) or marks a no-show. */
  notifyEnded(appointmentId: string, endedBy: string, outcome: 'COMPLETED' | 'NO_SHOW' = 'COMPLETED') {
    this.waiting.clear(appointmentId);
    this.server?.to(roomOf(appointmentId)).emit('session:ended', { endedBy, outcome });
  }

  /** Waiting state of a room, for POST /consultations/:id/no-show */
  async waitingSnapshot(appointmentId: string): Promise<WaitingSnapshot> {
    const presence = await this.presence(appointmentId);
    return this.waiting.snapshot(appointmentId, presence.USER);
  }

  private waitingState(appointmentId: string, presence: Record<'USER' | 'DOCTOR', boolean>) {
    const w = this.waiting.snapshot(appointmentId, presence.USER);
    const iso = (ms: number | null) => (ms === null ? null : new Date(ms).toISOString());
    return {
      serverTime: new Date().toISOString(),
      doctorSince: iso(w.doctorSince),
      patientJoined: w.patientJoined,
      patientPresent: w.patientPresent,
      lastAlertAt: iso(w.lastAlertAt),
      cooldownSeconds: WAITING_ALERT_COOLDOWN_SECONDS,
      waitMinutes: PATIENT_WAIT_MINUTES,
    };
  }

  /** Sends the waiting state to the doctor's sockets in the room (the patient doesn't need it). */
  private async broadcastWaiting(appointmentId: string, presence: Record<'USER' | 'DOCTOR', boolean>) {
    if (!presence.DOCTOR) return;
    try {
      const state = this.waitingState(appointmentId, presence);
      const sockets = await this.server.in(roomOf(appointmentId)).fetchSockets();
      for (const s of sockets) if ((s.data?.ticket as RoomTicket | undefined)?.role === 'DOCTOR') s.emit('waiting:state', state);
    } catch (e) {
      this.logger.warn(`Could not send the waiting state: ${(e as Error).message}`);
    }
  }

  /** Which roles currently have at least one socket in the room. */
  private async presence(appointmentId: string): Promise<Record<'USER' | 'DOCTOR', boolean>> {
    const sockets = await this.server.in(roomOf(appointmentId)).fetchSockets();
    const roles = new Set(sockets.map((s) => (s.data?.ticket as RoomTicket | undefined)?.role));
    return { USER: roles.has('USER'), DOCTOR: roles.has('DOCTOR') };
  }

  /** The socket's ticket while it is still valid. */
  private ticketOf(client: RoomSocket): RoomTicket | null {
    const ticket = client.data?.ticket as RoomTicket | undefined;
    return ticket ?? null;
  }

  private reject(client: RoomSocket, message: string) {
    client.emit('room:error', { message });
    client.disconnect(true);
  }
}
