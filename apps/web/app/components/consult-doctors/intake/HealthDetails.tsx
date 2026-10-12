'use client';

import { useEffect, useRef, useState } from 'react';
import { FileText, ImageIcon, LoaderCircle, Plus, CloudUpload, X } from 'lucide-react';
import {
  uploadConsultationAttachmentApi,
  type UploadedAttachment,
} from '@/app/lib/api/consultation';
import SectionCard from './SectionCard';

export const COMMON_SYMPTOMS = [
  'Fever',
  'Headache',
  'Cough',
  'Cold',
  'Sore Throat',
  'Skin Rash',
  'Stomach Pain',
  'Acidity',
  'Body Ache',
  'Hair Fall',
  'Acne',
  'Anxiety',
];

export const DURATION_OPTIONS = ['Today', '1-3 Days', '1 Week', 'More than a week'];

const MAX_FILES = 5;
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ACCEPTED_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'application/pdf'];

interface Props {
  userId: string;
  symptoms: string[];
  onSymptomsChange: (symptoms: string[]) => void;
  duration: string;
  onDurationChange: (duration: string) => void;
  description: string;
  onDescriptionChange: (description: string) => void;
  attachments: UploadedAttachment[];
  onAttachmentsChange: (updater: (prev: UploadedAttachment[]) => UploadedAttachment[]) => void;
  onUploadingChange: (uploading: boolean) => void;
  showError: boolean;
}

export default function HealthDetails({
  userId,
  symptoms,
  onSymptomsChange,
  duration,
  onDurationChange,
  description,
  onDescriptionChange,
  attachments,
  onAttachmentsChange,
  onUploadingChange,
  showError,
}: Props) {
  const [customSymptom, setCustomSymptom] = useState('');
  const [uploadingNames, setUploadingNames] = useState<string[]>([]);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Let the parent block submit while files are still uploading
  const isUploading = uploadingNames.length > 0;
  useEffect(() => {
    onUploadingChange(isUploading);
  }, [isUploading, onUploadingChange]);

  const hasSymptom = (s: string) =>
    symptoms.some((x) => x.toLowerCase() === s.toLowerCase());

  const toggleSymptom = (s: string) => {
    onSymptomsChange(
      hasSymptom(s)
        ? symptoms.filter((x) => x.toLowerCase() !== s.toLowerCase())
        : [...symptoms, s],
    );
  };

  const addCustomSymptom = () => {
    const value = customSymptom.trim().replace(/\s+/g, ' ');
    if (!value) return;
    if (!hasSymptom(value)) onSymptomsChange([...symptoms, value.slice(0, 60)]);
    setCustomSymptom('');
  };

  // Symptoms typed by the user that aren't in the common list
  const customSymptoms = symptoms.filter(
    (s) => !COMMON_SYMPTOMS.some((c) => c.toLowerCase() === s.toLowerCase()),
  );

  const handleFiles = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    setUploadError(null);

    const slotsLeft = MAX_FILES - attachments.length - uploadingNames.length;
    const files = Array.from(fileList);
    if (files.length > slotsLeft) {
      setUploadError(`You can attach up to ${MAX_FILES} files.`);
    }

    const accepted = files.slice(0, Math.max(0, slotsLeft)).filter((f) => {
      if (!ACCEPTED_TYPES.includes(f.type)) {
        setUploadError(`${f.name}: only images (PNG, JPG, WEBP) and PDF are allowed.`);
        return false;
      }
      if (f.size > MAX_FILE_SIZE) {
        setUploadError(`${f.name} is larger than 10 MB.`);
        return false;
      }
      return true;
    });
    if (accepted.length === 0) return;

    setUploadingNames((prev) => [...prev, ...accepted.map((f) => f.name)]);

    await Promise.all(
      accepted.map(async (file) => {
        try {
          const uploaded = await uploadConsultationAttachmentApi(userId, file);
          onAttachmentsChange((prev) => [...prev, uploaded]);
        } catch (err) {
          setUploadError(err instanceof Error ? err.message : `Could not upload ${file.name}.`);
        } finally {
          setUploadingNames((prev) => {
            const i = prev.indexOf(file.name);
            return i === -1 ? prev : [...prev.slice(0, i), ...prev.slice(i + 1)];
          });
        }
      }),
    );

    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeAttachment = (fileUrl: string) => {
    onAttachmentsChange((prev) => prev.filter((a) => a.fileUrl !== fileUrl));
  };

  const formatSize = (bytes: number) =>
    bytes > 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.ceil(bytes / 1024)} KB`;

  return (
    <SectionCard
      step={3}
      title="Tell us about the health problem"
      subtitle="This helps the doctor prepare before your consultation."
    >
      {/* Symptoms */}
      <div>
        <p className="text-xs font-semibold text-gray-700 mb-2">
          Symptoms <span className="text-red-500">*</span>
        </p>
        <div className="flex flex-wrap gap-2">
          {COMMON_SYMPTOMS.map((s) => {
            const active = hasSymptom(s);
            return (
              <button
                key={s}
                type="button"
                onClick={() => toggleSymptom(s)}
                aria-pressed={active}
                className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                  active
                    ? 'border-[#ff6f61] bg-[#ff6f61] text-white'
                    : 'border-gray-200 text-gray-700 hover:border-[#ff6f61]/50 hover:bg-[#fff0ed]'
                }`}
              >
                {s}
              </button>
            );
          })}
          {customSymptoms.map((s) => (
            <span
              key={s}
              className="inline-flex items-center gap-1 rounded-full border border-[#ff6f61] bg-[#ff6f61] py-1.5 pl-3 pr-1.5 text-xs font-medium text-white"
            >
              {s}
              <button
                type="button"
                onClick={() => toggleSymptom(s)}
                aria-label={`Remove ${s}`}
                className="rounded-full p-0.5 hover:bg-white/20"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>

        <div className="mt-3 flex gap-2">
          <input
            type="text"
            value={customSymptom}
            onChange={(e) => setCustomSymptom(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addCustomSymptom();
              }
            }}
            maxLength={60}
            placeholder="Other symptom? Type and press Enter"
            aria-label="Add another symptom"
            className="min-w-0 flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#ff6f61] focus:ring-2 focus:ring-[#ff6f61]/15"
          />
          <button
            type="button"
            onClick={addCustomSymptom}
            disabled={!customSymptom.trim()}
            className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-3 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition"
          >
            <Plus className="h-3.5 w-3.5" /> Add
          </button>
        </div>

        {showError && symptoms.length === 0 && (
          <p className="mt-2 text-xs font-medium text-red-600">Add at least one symptom.</p>
        )}
      </div>

      {/* Duration */}
      <div className="mt-5">
        <label htmlFor="symptom-duration" className="block text-xs font-semibold text-gray-700 mb-2">
          How long have you had these symptoms?
        </label>
        <select
          id="symptom-duration"
          value={duration}
          onChange={(e) => onDurationChange(e.target.value)}
          className="w-full sm:w-64 rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#ff6f61] focus:ring-2 focus:ring-[#ff6f61]/15"
        >
          <option value="">Select duration</option>
          {DURATION_OPTIONS.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
      </div>

      {/* Description */}
      <div className="mt-5">
        <label htmlFor="problem-description" className="block text-xs font-semibold text-gray-700 mb-2">
          Describe the problem <span className="font-normal text-gray-400">(optional)</span>
        </label>
        <textarea
          id="problem-description"
          value={description}
          onChange={(e) => onDescriptionChange(e.target.value)}
          rows={4}
          maxLength={2000}
          placeholder="e.g. Fever since yesterday evening, around 101°F, with mild headache. Took paracetamol once."
          className="w-full resize-y rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-[#ff6f61] focus:ring-2 focus:ring-[#ff6f61]/15"
        />
        <p className="mt-1 text-right text-[11px] text-gray-400">{description.length}/2000</p>
      </div>

      {/* Attachments */}
      <div className="mt-3">
        <p className="text-xs font-semibold text-gray-700 mb-2">
          Reports or photos <span className="font-normal text-gray-400">(optional)</span>
        </p>

        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragActive(true);
          }}
          onDragLeave={() => setDragActive(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragActive(false);
            handleFiles(e.dataTransfer.files);
          }}
          onClick={() => fileInputRef.current?.click()}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              fileInputRef.current?.click();
            }
          }}
          role="button"
          tabIndex={0}
          aria-label="Upload reports or photos"
          className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-4 py-6 text-center transition ${
            dragActive
              ? 'border-[#ff6f61] bg-[#fff0ed]'
              : 'border-gray-200 hover:border-[#ff6f61]/50 hover:bg-gray-50'
          }`}
        >
          <CloudUpload className="h-7 w-7 text-[#ff6f61]" />
          <p className="mt-2 text-sm font-semibold text-gray-800">
            Drag & drop files, or <span className="text-[#e8453b]">browse</span>
          </p>
          <p className="mt-0.5 text-[11px] text-gray-500">
            PNG, JPG, WEBP or PDF · up to 10 MB each · max {MAX_FILES} files
          </p>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".png,.jpg,.jpeg,.webp,.pdf"
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
          />
        </div>

        {uploadError && (
          <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{uploadError}</p>
        )}

        {(attachments.length > 0 || uploadingNames.length > 0) && (
          <ul className="mt-3 space-y-2">
            {attachments.map((a) => {
              const Icon = a.fileType === 'application/pdf' ? FileText : ImageIcon;
              return (
                <li
                  key={a.fileUrl}
                  className="flex items-center gap-3 rounded-lg border border-gray-200 px-3 py-2"
                >
                  <Icon className="h-4 w-4 shrink-0 text-gray-500" />
                  <span className="min-w-0 flex-1 truncate text-xs font-medium text-gray-800">
                    {a.fileName}
                  </span>
                  <span className="text-[11px] text-gray-400">{formatSize(a.fileSize)}</span>
                  <button
                    type="button"
                    onClick={() => removeAttachment(a.fileUrl)}
                    aria-label={`Remove ${a.fileName}`}
                    className="rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </li>
              );
            })}
            {uploadingNames.map((name, i) => (
              <li
                key={`${name}-${i}`}
                className="flex items-center gap-3 rounded-lg border border-gray-100 bg-gray-50 px-3 py-2"
              >
                <LoaderCircle className="h-4 w-4 shrink-0 animate-spin text-[#ff6f61]" />
                <span className="min-w-0 flex-1 truncate text-xs text-gray-600">{name}</span>
                <span className="text-[11px] text-gray-400">Uploading…</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </SectionCard>
  );
}
