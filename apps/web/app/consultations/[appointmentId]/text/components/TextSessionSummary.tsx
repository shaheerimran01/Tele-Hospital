'use client';

// Summary of a finished TEXT consultation: the doctor's clinical notes, the
// conversation (same chat view for doctor and patient), every voice note (with its length) and every
// image / document that was shared.

import { useEffect, useState } from 'react';
import { ClipboardList, FileText, ImageIcon, LoaderCircle, Mic } from 'lucide-react';
import ConversationHistory from '@/app/components/consultations/ConversationHistory';
import {
  fileUrl,
  getConsultationSummaryApi,
  type ConsultationSummary,
  type Viewer,
} from '@/app/lib/api/consultations';
import AudioPlayerBubble from './AudioPlayerBubble';
import DocumentBubble from './DocumentBubble';
import { ImageLightbox } from './ImageBubble';

const stamp = (iso: string) =>
  new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true });
const length = (s: number | null) => (s ? `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}` : '–:––');

function Section({
  icon: Icon,
  title,
  count,
  children,
  defaultOpen = true,
}: {
  icon: typeof Mic;
  title: string;
  count: number;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className="rounded-xl border border-slate-200 bg-white">
      <button type="button" onClick={() => setOpen((o) => !o)} className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left">
        <span className="flex items-center gap-2 text-sm font-bold text-slate-900">
          <Icon className="h-4 w-4 text-slate-400" /> {title}
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">{count}</span>
        </span>
        <span className="text-xs font-semibold text-slate-400">{open ? 'Hide' : 'Show'}</span>
      </button>
      {open && <div className="border-t border-slate-100 px-4 py-3">{children}</div>}
    </section>
  );
}

export default function TextSessionSummary({
  appointmentId,
  viewer,
  defaultConversationOpen = false,
}: {
  appointmentId: string;
  viewer: Viewer;
  /** show the chat expanded (e.g. in the doctor's Chat Summary modal) */
  defaultConversationOpen?: boolean;
}) {
  const [data, setData] = useState<ConsultationSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lightbox, setLightbox] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    getConsultationSummaryApi(appointmentId, viewer)
      .then((d) => !cancelled && setData(d))
      .catch((e) => !cancelled && setError(e instanceof Error ? e.message : 'Could not load the consultation summary.'));
    return () => {
      cancelled = true;
    };
  }, [appointmentId, viewer]);

  if (error) {
    return (
      <p className="mt-4 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700 ring-1 ring-rose-200" role="alert">
        {error}
      </p>
    );
  }
  if (!data) {
    return (
      <p className="mt-4 flex items-center gap-2 text-sm text-slate-500">
        <LoaderCircle className="h-4 w-4 animate-spin" /> Loading consultation summary…
      </p>
    );
  }

  const images = data.files.filter((f) => f.kind === 'IMAGE');
  const docs = data.files.filter((f) => f.kind === 'DOCUMENT');

  return (
    <div className="mt-4 space-y-3">
      <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Consultation summary</p>

      {data.clinicalNotes && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4">
          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-emerald-800">
            <ClipboardList className="h-4 w-4" /> Doctor&apos;s notes
          </p>
          <p className="mt-1.5 whitespace-pre-wrap text-sm text-slate-800">{data.clinicalNotes}</p>
        </div>
      )}

      <ConversationHistory
        appointmentId={appointmentId}
        viewer={viewer}
        doctorName={data.appointment.doctor.name}
        patientName={data.appointment.patientName}
        defaultOpen={defaultConversationOpen}
      />

      <Section icon={Mic} title="Voice notes" count={data.voiceNotes.length} defaultOpen={data.voiceNotes.length > 0}>
        {data.voiceNotes.length === 0 ? (
          <p className="text-sm text-slate-500">No voice notes were sent.</p>
        ) : (
          <ul className="space-y-3">
            {data.voiceNotes.map((v) => (
              <li key={v.url} className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <span className="text-xs text-slate-500">
                  <span className="font-semibold text-slate-700">{v.senderName}</span> · {stamp(v.at)} · {length(v.duration)}
                </span>
                <span className="rounded-xl bg-slate-50 px-2 ring-1 ring-slate-200">
                  <AudioPlayerBubble url={v.url} duration={v.duration} mine={false} />
                </span>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section icon={FileText} title="Medical files and reports" count={data.files.length} defaultOpen={data.files.length > 0}>
        {data.files.length === 0 ? (
          <p className="text-sm text-slate-500">No images or documents were shared.</p>
        ) : (
          <div className="space-y-3">
            {images.length > 0 && (
              <div>
                <p className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-slate-500">
                  <ImageIcon className="h-3.5 w-3.5" /> Images ({images.length})
                </p>
                <div className="flex flex-wrap gap-2">
                  {images.map((f, i) => (
                    <button
                      key={f.url}
                      type="button"
                      onClick={() => setLightbox(i)}
                      className="overflow-hidden rounded-lg ring-1 ring-slate-200"
                      title={`${f.fileName} · ${f.senderName} · ${stamp(f.at)}`}
                      aria-label={`Open ${f.fileName}`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={fileUrl(f.url)} alt={f.fileName} loading="lazy" className="h-20 w-20 object-cover" />
                    </button>
                  ))}
                </div>
              </div>
            )}
            {docs.length > 0 && (
              <ul className="space-y-2">
                {docs.map((f) => (
                  <li key={f.url} className="flex flex-col gap-1">
                    <span className="text-[11px] text-slate-500">
                      Shared by <span className="font-semibold text-slate-700">{f.senderName}</span> · {stamp(f.at)}
                      {f.caption ? ` · “${f.caption}”` : ''}
                    </span>
                    <DocumentBubble url={f.url} mine={false} />
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </Section>

      {lightbox !== null && (
        <ImageLightbox images={images.map((f) => f.url)} start={lightbox} onClose={() => setLightbox(null)} />
      )}
    </div>
  );
}
