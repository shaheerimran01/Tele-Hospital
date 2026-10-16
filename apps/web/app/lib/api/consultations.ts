// apps/web/app/lib/api/consultations.ts
// Online consultation rooms (video and text): access check, chat history, files, ending the session.
// The patient is identified by their user id (same as the rest of the patient API);
// the doctor by the doctor login token kept in this tab's sessionStorage.

export const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export type ParticipantRole = 'USER' | 'DOCTOR';
export type RoomMode = 'VIDEO' | 'TEXT';

/** Who is opening the room */
export type Viewer =
  | { role: 'DOCTOR'; token: string; name?: string }
  | { role: 'USER'; userId: string; name?: string };

export interface RoomAppointment {
  id: string;
  appointmentNum: string;
  status: 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED' | 'RESCHEDULED' | 'NO_SHOW';
  serviceMode: 'IN_CLINIC' | 'VIDEO' | 'TEXT';
  appointmentDate: string;
  startTime: string;
  endTime: string;
  /** "Thu, 22 Oct 2026 at 10:30 AM" */
  when: string;
  doctor: { id: string; name: string; speciality: string; profilePhotoUrl: string | null };
  patientName: string;
  clinicName: string | null;
  symptoms: string[];
  doctorNotes: string | null;
  /** text consultations: transcript, voice notes and files compiled at the end (GET /summary) */
  hasCompiledSummary?: boolean;
}

export type LockedReason =
  | 'NOT_APPROVED'
  | 'RESCHEDULE_PENDING'
  | 'CANCELLED'
  | 'COMPLETED'
  | 'NO_SHOW'
  | 'IN_CLINIC'
  | 'TOO_EARLY'
  | 'EXPIRED';

interface AccessBase {
  appointment: RoomAppointment;
  role: ParticipantRole;
  me: { role: ParticipantRole; name: string };
  other: { role: ParticipantRole; name: string };
  scheduledTime: string;
  opensAt: string;
  closesAt: string;
}

export type AccessResult =
  | (AccessBase & { canJoin: false; reason: LockedReason; message: string; secondsUntilOpen?: number })
  | (AccessBase & {
      canJoin: true;
      serviceMode: RoomMode;
      rtcToken: string;
      roomChannel: string;
      iceServers: RTCIceServer[];
      startsAt: string;
      endsAt: string;
    });

export type MessageType = 'TEXT' | 'VOICE' | 'IMAGE' | 'DOCUMENT';

export interface ChatMessage {
  id: string;
  appointmentId: string;
  senderId: string;
  senderType: 'USER' | 'DOCTOR' | 'SYSTEM';
  /** set by the API; older messages default to TEXT */
  messageType?: MessageType;
  message: string | null;
  attachments: string[];
  /** voice notes: length in seconds */
  audioDuration?: number | null;
  isRead: boolean;
  createdAt: string;
  /** set on messages this browser sent, to match the server copy */
  clientId?: string;
}

export interface UploadedChatFile {
  fileUrl: string;
  fileName: string;
  fileType: string;
  size: number;
}

export class RoomApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = 'RoomApiError';
  }
}

function query(viewer: Viewer) {
  return viewer.role === 'DOCTOR' ? 'as=doctor' : `userId=${encodeURIComponent(viewer.userId)}`;
}
function headers(viewer: Viewer, extra: Record<string, string> = {}): Record<string, string> {
  return viewer.role === 'DOCTOR' ? { Authorization: `Bearer ${viewer.token}`, ...extra } : extra;
}

async function call<T>(url: string, init: RequestInit, fallback: string): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, { cache: 'no-store', ...init });
  } catch {
    throw new RoomApiError('Could not reach the server. Check your internet connection and try again.', 0);
  }
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    const message = Array.isArray(data?.message) ? data.message[0] : data?.message;
    throw new RoomApiError(message || fallback, res.status);
  }
  return res.json();
}

export const fileUrl = (path: string) => (path.startsWith('http') ? path : `${API_BASE}${path}`);

export const checkRoomAccessApi = (appointmentId: string, viewer: Viewer) =>
  call<AccessResult>(
    `${API_BASE}/consultations/${encodeURIComponent(appointmentId)}/access-check?${query(viewer)}`,
    { headers: headers(viewer) },
    'Could not open the consultation room.',
  );

export const getRoomMessagesApi = (appointmentId: string, viewer: Viewer) =>
  call<{ role: ParticipantRole; messages: ChatMessage[] }>(
    `${API_BASE}/consultations/${encodeURIComponent(appointmentId)}/messages?${query(viewer)}`,
    { headers: headers(viewer) },
    'Could not load the conversation.',
  );

export function uploadRoomFileApi(appointmentId: string, ticket: string, file: File) {
  const body = new FormData();
  body.append('file', file);
  return call<UploadedChatFile>(
    `${API_BASE}/consultations/${encodeURIComponent(appointmentId)}/attachments`,
    { method: 'POST', headers: { 'x-room-ticket': ticket }, body },
    `Could not upload ${file.name}.`,
  );
}

export const endConsultationApi = (appointmentId: string, token: string, notes?: string) =>
  call<{ appointment: RoomAppointment }>(
    `${API_BASE}/consultations/${encodeURIComponent(appointmentId)}/end?as=doctor`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(notes ? { notes } : {}),
    },
    'Could not end the consultation.',
  );

/** Doctor waiting for the patient (sent by the room's real-time connection to the doctor) */
export interface WaitingState {
  /** server clock when this was sent (for the countdowns) */
  serverTime: string;
  /** when the doctor first entered the room */
  doctorSince: string | null;
  /** the patient has been in the room at some point */
  patientJoined: boolean;
  /** the patient is in the room now */
  patientPresent: boolean;
  /** last "I'm waiting" notification */
  lastAlertAt: string | null;
  cooldownSeconds: number;
  waitMinutes: number;
}

/** Doctor: the patient did not join within the waiting time */
export const markNoShowApi = (appointmentId: string, token: string) =>
  call<{ appointment: RoomAppointment; waitedMinutes: number }>(
    `${API_BASE}/consultations/${encodeURIComponent(appointmentId)}/no-show?as=doctor`,
    { method: 'POST', headers: { Authorization: `Bearer ${token}` } },
    'Could not mark the patient as a no-show.',
  );

// ---------------------------------------------------------------------------
// Media messages (text consultation room)
// ---------------------------------------------------------------------------

export interface UploadedMedia {
  fileUrl: string;
  fileName: string;
  messageType: Exclude<MessageType, 'TEXT'>;
  audioDuration?: number;
  fileType: string;
  size: number;
}

/** Uploads a voice note, image or document for this consultation (POST /upload-attachment). */
export function uploadChatMediaApi(appointmentId: string, ticket: string, file: File, audioDuration?: number) {
  const body = new FormData();
  if (audioDuration !== undefined) body.append('audioDuration', String(Math.round(audioDuration)));
  body.append('file', file);
  return call<UploadedMedia>(
    `${API_BASE}/consultations/${encodeURIComponent(appointmentId)}/upload-attachment`,
    { method: 'POST', headers: { 'x-room-ticket': ticket }, body },
    `Could not upload ${file.name}.`,
  );
}

interface SummaryEntry {
  id: string;
  at: string;
  senderRole: ParticipantRole;
  senderName: string;
}

export interface ConsultationSummary {
  appointment: RoomAppointment;
  clinicalNotes: string | null;
  transcript: (SummaryEntry & { messageType: MessageType; text: string })[];
  voiceNotes: (SummaryEntry & { url: string; duration: number | null })[];
  files: (SummaryEntry & { url: string; kind: 'IMAGE' | 'DOCUMENT'; fileName: string; caption: string | null })[];
  counts: { messages: number; voiceNotes: number; images: number; documents: number };
}

export const getConsultationSummaryApi = (appointmentId: string, viewer: Viewer) =>
  call<ConsultationSummary>(
    `${API_BASE}/consultations/${encodeURIComponent(appointmentId)}/summary?${query(viewer)}`,
    { headers: headers(viewer) },
    'Could not load the consultation summary.',
  );

/** "1760-123__Blood-test-report.pdf" -> "Blood-test-report.pdf" */
export function attachmentName(url: string) {
  const file = decodeURIComponent(url.split('/').pop() ?? url);
  const i = file.indexOf('__');
  return i >= 0 ? file.slice(i + 2) : file;
}

export type AttachmentKind = 'VOICE' | 'IMAGE' | 'DOCUMENT';
export function attachmentKind(url: string): AttachmentKind {
  const ext = url.split('?')[0].split('.').pop()?.toLowerCase() ?? '';
  if (['jpg', 'jpeg', 'png', 'webp'].includes(ext)) return 'IMAGE';
  if (['webm', 'mp3', 'm4a', 'ogg', 'mp4', 'aac', 'wav'].includes(ext)) return 'VOICE';
  return 'DOCUMENT';
}
