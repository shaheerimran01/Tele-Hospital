'use client';

// Read-only copy of the consultation chat, shown after the session ends.
// Doctor and patient see exactly the same view: chat bubbles with voice notes,
// images and documents, the same way they looked in the room.

import { Fragment, useEffect, useState } from 'react';
import { LoaderCircle, MessageSquareText } from 'lucide-react';
import { getRoomMessagesApi, type ChatMessage, type Viewer } from '@/app/lib/api/consultations';
import { MessageBubble } from '@/app/consultations/[appointmentId]/text/components/TextChatPanel';
import { ImageLightbox } from '@/app/consultations/[appointmentId]/text/components/ImageBubble';

const dayOf = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });

export default function ConversationHistory({
  appointmentId,
  viewer,
  doctorName,
  patientName,
  defaultOpen = false,
}: {
  appointmentId: string;
  viewer: Viewer;
  doctorName: string;
  patientName: string;
  defaultOpen?: boolean;
}) {
  const [messages, setMessages] = useState<ChatMessage[] | null>(null);
  const [open, setOpen] = useState(defaultOpen);
  const [lightbox, setLightbox] = useState<{ images: string[]; index: number } | null>(null);

  useEffect(() => {
    let cancelled = false;
    getRoomMessagesApi(appointmentId, viewer)
      .then((r) => !cancelled && setMessages(r.messages))
      .catch(() => !cancelled && setMessages([]));
    return () => {
      cancelled = true;
    };
  }, [appointmentId, viewer]);

  if (messages === null) {
    return (
      <p className="mt-4 flex items-center gap-2 text-sm text-slate-500">
        <LoaderCircle className="h-4 w-4 animate-spin" /> Loading conversation…
      </p>
    );
  }
  const count = messages.filter((m) => m.senderType !== 'SYSTEM').length;
  if (count === 0) return null;

  return (
    <div className="mt-4">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-2 text-sm font-semibold text-[#141b34] hover:underline"
        aria-expanded={open}
      >
        <MessageSquareText className="h-4 w-4" /> {open ? 'Hide' : 'Show'} conversation ({count})
      </button>
      {open && (
        <div className="mt-3 max-h-[28rem] overflow-y-auto rounded-xl border border-slate-200 bg-[#f4f6fb] px-3 py-4">
          <ul className="space-y-3">
            {messages.map((m, i) => {
              const newDay = i === 0 || dayOf(messages[i - 1].createdAt) !== dayOf(m.createdAt);
              const mine = m.senderType === viewer.role;
              const prev = messages[i - 1];
              const showName = m.senderType !== 'SYSTEM' && (newDay || prev?.senderType !== m.senderType);
              return (
                <Fragment key={m.id}>
                  {newDay && (
                    <li className="my-1 text-center text-[11px] font-semibold uppercase tracking-wide text-slate-400" aria-hidden>
                      {dayOf(m.createdAt)}
                    </li>
                  )}
                  <MessageBubble
                    m={m}
                    mine={mine}
                    senderLabel={showName ? (mine ? 'You' : m.senderType === 'DOCTOR' ? doctorName : patientName) : undefined}
                    onOpenImage={(images, index) => setLightbox({ images, index })}
                  />
                </Fragment>
              );
            })}
          </ul>
        </div>
      )}
      {lightbox && <ImageLightbox images={lightbox.images} start={lightbox.index} onClose={() => setLightbox(null)} />}
    </div>
  );
}
