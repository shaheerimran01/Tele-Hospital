'use client';

import { useRef, useState } from 'react';
import { ImageIcon, LoaderCircle, Upload, X } from 'lucide-react';
import { apiFileUrl, uploadDoctorImageApi, type UploadedImage } from '@/app/lib/api/doctors';
import { useDoctorAuth } from '@/app/consult-doctors/context/DoctorAuthContext';

const MAX_SIZE = 5 * 1024 * 1024;
const ACCEPTED = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

interface Props {
  id: string;
  label: string;
  value: UploadedImage | null;
  onChange: (value: UploadedImage | null) => void;
  shape?: 'square' | 'circle';
  onUploadingChange?: (uploading: boolean) => void;
  /** Shows a red asterisk next to the label */
  required?: boolean;
  /** Validation message from the form (e.g. a required document is missing) */
  error?: string;
  /** Extra line under the label */
  hint?: string;
}

export default function ImageUploadField({
  id,
  label,
  value,
  onChange,
  shape = 'square',
  onUploadingChange,
  required,
  error: formError,
  hint,
}: Props) {
  const { token } = useDoctorAuth();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);

  const setBusy = (busy: boolean) => {
    setUploading(busy);
    onUploadingChange?.(busy);
  };

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    setError(null);
    if (!ACCEPTED.includes(file.type)) {
      setError('Please choose a JPG or PNG image.');
      return;
    }
    if (file.size > MAX_SIZE) {
      setError('Image must be 5 MB or smaller.');
      return;
    }

    if (!token) {
      setError('Your session has ended. Please verify your phone again.');
      return;
    }

    setBusy(true);
    try {
      onChange(await uploadDoctorImageApi(token, file));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed. Please try again.');
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const previewShape = shape === 'circle' ? 'rounded-full' : 'rounded-md';

  return (
    <div id={`field-${id}`}>
      <label htmlFor={id} className="mb-1.5 block text-xs font-medium text-[#3a3f52]">
        {label}
        {required && <span className="ml-0.5 text-red-500">*</span>}
        {hint && <span className="ml-1 font-normal text-[#8a8d99]">{hint}</span>}
      </label>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragActive(true);
        }}
        onDragLeave={() => setDragActive(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragActive(false);
          handleFile(e.dataTransfer.files?.[0]);
        }}
        className={`flex flex-wrap items-center gap-4 rounded-xl border border-dashed px-4 py-4 transition ${
          dragActive
            ? 'border-[#141b34] bg-[#f6f4ef]'
            : formError && !value
              ? 'border-red-400 bg-red-50/40'
              : 'border-[#cfc8b8] bg-white'
        }`}
      >
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          data-upload-trigger
          className="inline-flex items-center gap-2 rounded-lg bg-[#141b34] px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-[#232c4f] disabled:opacity-60"
        >
          {uploading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
          {uploading ? 'Uploading…' : value ? 'Change image' : 'Choose image'}
        </button>

        <div className={`relative h-[72px] w-[72px] shrink-0 overflow-hidden bg-[#ece9e2] ${previewShape}`}>
          {value ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={apiFileUrl(value.fileUrl)} alt={label} className="h-full w-full object-cover" />
          ) : (
            <span className="flex h-full w-full items-center justify-center text-[#a9a59a]">
              <ImageIcon className="h-5 w-5" />
            </span>
          )}
        </div>

        <div className="min-w-0 flex-1 text-[11px] text-[#8a8d99]">
          {value ? (
            <span className="flex items-center gap-2">
              <span className="truncate text-[#3a3f52]">{value.fileName}</span>
              <button
                type="button"
                onClick={() => onChange(null)}
                className="inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-[#8a8d99] hover:bg-gray-100 hover:text-red-600"
                aria-label={`Remove ${label}`}
              >
                <X className="h-3.5 w-3.5" /> Remove
              </button>
            </span>
          ) : (
            <span>JPG or PNG · max 5 MB · or drag it here</span>
          )}
        </div>

        <input
          ref={inputRef}
          id={id}
          type="file"
          accept=".jpg,.jpeg,.png,.webp"
          className="hidden"
          onChange={(e) => handleFile(e.target.files?.[0])}
        />
      </div>
      {error ? (
        <p className="mt-1 text-xs text-red-600" role="alert">
          {error}
        </p>
      ) : (
        formError &&
        !value && (
          <p className="mt-1 text-xs text-red-600" role="alert">
            {formError}
          </p>
        )
      )}
    </div>
  );
}
