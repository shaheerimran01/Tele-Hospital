// Doctor waiting for the patient in an online consultation room.
//
// While the doctor is in the room and the patient is not, the doctor can send
// "I'm waiting" alerts (at most one per minute) and, once the patient has had
// 10 minutes to join, mark the appointment as a no-show.
//
// The waiting clock is kept in memory by the real-time gateway (it knows who is
// in which room). It starts when the doctor first enters the room, or at the
// scheduled start time if the doctor arrives early. After an API restart it
// starts again when the doctor's room reconnects.

/** How long the doctor waits before the appointment can be marked as a no-show */
export const PATIENT_WAIT_MINUTES = 10;
/** Minimum time between two "I'm waiting" alerts for the same appointment */
export const WAITING_ALERT_COOLDOWN_SECONDS = 60;

/** Entries untouched for this long are dropped (rooms close 30 minutes after the end time) */
const STALE_AFTER_MS = 24 * 60 * 60 * 1000;

interface WaitingEntry {
  /** first time the doctor entered the room (ms) */
  doctorSince: number | null;
  /** the patient has been in the room at some point */
  patientJoined: boolean;
  /** last "I'm waiting" alert (ms) */
  lastAlertAt: number | null;
  touchedAt: number;
}

/** What the gateway knows about one room, plus who is in it right now */
export interface WaitingSnapshot {
  doctorSince: number | null;
  patientJoined: boolean;
  patientPresent: boolean;
  lastAlertAt: number | null;
}

export class WaitingRoomTracker {
  private readonly entries = new Map<string, WaitingEntry>();

  private entry(appointmentId: string, now: number): WaitingEntry {
    let e = this.entries.get(appointmentId);
    if (!e) {
      e = { doctorSince: null, patientJoined: false, lastAlertAt: null, touchedAt: now };
      this.entries.set(appointmentId, e);
    }
    e.touchedAt = now;
    return e;
  }

  /** Returns true the first time the doctor enters this room */
  doctorJoined(appointmentId: string, now = Date.now()): boolean {
    this.prune(now);
    const e = this.entry(appointmentId, now);
    if (e.doctorSince !== null) return false;
    e.doctorSince = now;
    return true;
  }

  patientJoined(appointmentId: string, now = Date.now()) {
    this.entry(appointmentId, now).patientJoined = true;
  }

  /** Seconds before the next alert may be sent (0 = now) */
  cooldownLeft(appointmentId: string, now = Date.now()): number {
    const last = this.entries.get(appointmentId)?.lastAlertAt;
    if (last == null) return 0;
    return Math.max(0, Math.ceil((last + WAITING_ALERT_COOLDOWN_SECONDS * 1000 - now) / 1000));
  }

  /** Returns the previous alert time, for undoAlert */
  recordAlert(appointmentId: string, now = Date.now()): number | null {
    const e = this.entry(appointmentId, now);
    const previous = e.lastAlertAt;
    e.lastAlertAt = now;
    return previous;
  }

  /** Undo recordAlert when the alert could not be sent */
  undoAlert(appointmentId: string, previous: number | null) {
    const e = this.entries.get(appointmentId);
    if (e) e.lastAlertAt = previous;
  }

  snapshot(appointmentId: string, patientPresent: boolean): WaitingSnapshot {
    const e = this.entries.get(appointmentId);
    return {
      doctorSince: e?.doctorSince ?? null,
      patientJoined: (e?.patientJoined ?? false) || patientPresent,
      patientPresent,
      lastAlertAt: e?.lastAlertAt ?? null,
    };
  }

  clear(appointmentId: string) {
    this.entries.delete(appointmentId);
  }

  private prune(now: number) {
    for (const [id, e] of this.entries) if (now - e.touchedAt > STALE_AFTER_MS) this.entries.delete(id);
  }
}

/**
 * The 10-minute window: from when the doctor entered the room, or from the
 * scheduled start if the doctor came in early (the patient isn't late before then).
 */
export function waitingWindow(doctorSince: number, startsAt: number) {
  const start = Math.max(doctorSince, startsAt);
  return { start, deadline: start + PATIENT_WAIT_MINUTES * 60_000 };
}

/** 125000 ms -> "2:05" */
export function minutesSeconds(ms: number) {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}
