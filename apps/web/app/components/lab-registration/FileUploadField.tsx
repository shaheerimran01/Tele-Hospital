'use client';

// File picker with a preview card: drag & drop or browse, then Replace / Remove.
// Files stay in the browser until the backend upload is connected.

import { useRef, useState } from 'react';
import { ExternalLink, FileText, ImageIcon, RefreshCw, Trash2, Upload } from 'lucide-react';
import { fileError, type PickedFile } from './form-model';

interface Props {
  id: string;
  label: string;
  hint?: string;
  required?: boolean;
  value: PickedFile | null;
  onChange: (value: PickedFile | null) => void;
  /** accepted MIME types */
  types: string[];
  maxBytes: number;
  kind: 'logo' | 'license';
  error?: string;
}

const formatSize = (n: number) => (n < 1024 * 1024 ? `${Math.max(1, Math.round(n / 1024))} KB` : `${(n / 1024 / 1024).toFixed(1)} MB`);

export default function FileUploadField({ id, label, hint, required, value, onChange, types, maxBytes, kind, error }: Props) {
  const input = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const shownError = localError ?? error;
  const formats = kind === 'logo' ? 'PNG or JPG' : 'PNG, JPG or PDF';

  const pick = (file: File | undefined) => {
    if (!file) return;
    const err = fileError(file, types, maxBytes, kind);
    if (err) {
      setLocalError(err);
      return;
    }
    setLocalError(null);
    if (value) URL.revokeObjectURL(value.previewUrl);
    onChange({ file, previewUrl: URL.createObjectURL(file) });
  };

  const remove = () => {
    if (value) URL.revokeObjectURL(value.previewUrl);
    setLocalError(null);
    onChange(null);
    if (input.current) input.current.value = '';
  };

  const isPdf = value?.file.type === 'application/pdf';

  return (
    <div id={`field-${id}`}>
      <p className="mb-1.5 text-xs font-medium text-[#3a3f52]">
        <label htmlFor={id}>{label}</label>
        {required && <span className="ml-0.5 text-red-500">*</span>}
        {hint && <span className="ml-1 font-normal text-[#8a8d99]">{hint}</span>}
      </p>

      <input
        ref={input}
        id={id}
        type="file"
        accept={types.join(',')}
        className="sr-only"
        aria-invalid={!!shownError}
        aria-describedby={shownError ? `${id}-error` : undefined}
        onChange={(e) => pick(e.target.files?.[0])}
      />

      {value ? (
        <div className={`flex items-center gap-3 rounded-xl border bg-white p-3 ${shownError ? 'border-red-300' : 'border-[#e2ddd2]'}`}>
          {isPdf ? (
            <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-rose-50 text-rose-600">
              <FileText className="h-7 w-7" />
            </span>
          ) : (
            <img
              src={value.previewUrl}
              alt={`${label} preview`}
              className={`h-16 w-16 shrink-0 rounded-lg border border-[#ece9e2] bg-[#f6f4ef] ${kind === 'logo' ? 'object-contain p-1' : 'object-cover'}`}
            />
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-[#141b34]" title={value.file.name}>
              {value.file.name}
            </p>
            <p className="text-xs text-[#8a8d99]">
              {isPdf ? 'PDF document' : 'Image'} · {formatSize(value.file.size)}
            </p>
            <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-xs font-semibold">
              <a href={value.previewUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[#141b34] hover:underline">
                <ExternalLink className="h-3.5 w-3.5" /> View
              </a>
              <button type="button" onClick={() => input.current?.click()} className="inline-flex items-center gap-1 text-[#141b34] hover:underline">
                <RefreshCw className="h-3.5 w-3.5" /> Replace
              </button>
              <button type="button" onClick={remove} className="inline-flex items-center gap-1 text-red-600 hover:underline">
                <Trash2 className="h-3.5 w-3.5" /> Remove
              </button>
            </div>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => input.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDrag(true);
          }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDrag(false);
            pick(e.dataTransfer.files?.[0]);
          }}
          className={`flex w-full flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed px-4 py-6 text-center transition ${
            drag ? 'border-[#141b34] bg-[#f3f1ec]' : shownError ? 'border-red-300 bg-red-50/40' : 'border-[#d9d3c6] bg-[#faf9f6] hover:border-[#b9b3a5]'
          }`}
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-[#3a3f52] shadow-sm">
            {kind === 'logo' ? <ImageIcon className="h-5 w-5" /> : <Upload className="h-5 w-5" />}
          </span>
          <span className="text-sm font-medium text-[#141b34]">
            Drag and drop, or <span className="underline">browse</span>
          </span>
          <span className="text-xs text-[#8a8d99]">
            {formats}, up to {Math.round(maxBytes / 1024 / 1024)} MB
          </span>
        </button>
      )}

      {shownError && (
        <p id={`${id}-error`} className="mt-1 text-xs text-red-600" role="alert">
          {shownError}
        </p>
      )}
    </div>
  );
}
