'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronRight, LoaderCircle, Lock } from 'lucide-react';
import {
  uploadConsultationAttachmentApi,
  createIntakeApi,
  getFamilyMembersApi,
  getPrimaryAddressApi,
  relationLabel,
  type FamilyMember,
  type PatientType,
  type SavedAddress,
  type Speciality,
  type UploadedAttachment,
} from '@/app/lib/api/consultation';
import PatientSelection from './PatientSelection';
import SpecialitySelection from './SpecialitySelection';
import HealthDetails from './HealthDetails';
import IntakeSummaryCard from './IntakeSummaryCard';
import AddFamilyMemberModal from './AddFamilyMemberModal';
import { symptomsForSpeciality } from './symptoms';
import { voiceNoteExtension, type VoiceNote } from '@/app/consult-doctors/components/VoiceRecorder';

interface SessionUser {
  id: string;
  name: string;
}

/** Reads the logged-in user the same way the rest of the web app does. */
function readSessionUser(): SessionUser | null {
  try {
    const raw =
      localStorage.getItem('tabibistan_user') ||
      localStorage.getItem('user') ||
      localStorage.getItem('userData');
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    const u = parsed?.user || parsed?.data?.user || parsed;
    const id = u?.id || u?._id || u?.userId;
    if (!id) return null;

    const name =
      [u.firstName, u.lastName].filter(Boolean).join(' ').trim() ||
      u.name ||
      u.fullName ||
      'You';
    return { id, name };
  } catch {
    return null;
  }
}

export default function IntakeScreen() {
  const router = useRouter();

  // Session
  const [user, setUser] = useState<SessionUser | null>(null);
  const [authChecked, setAuthChecked] = useState(false);

  // Patient
  const [patientType, setPatientType] = useState<PatientType>('SELF');
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [membersError, setMembersError] = useState<string | null>(null);
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  // Address
  const [address, setAddress] = useState<SavedAddress | null>(null);
  const [addressLoading, setAddressLoading] = useState(true);

  // Speciality + health details
  const [speciality, setSpeciality] = useState<Speciality | null>(null);
  const [symptoms, setSymptoms] = useState<string[]>([]);
  const [duration, setDuration] = useState('');
  const [description, setDescription] = useState('');
  const [attachments, setAttachments] = useState<UploadedAttachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const [voiceNote, setVoiceNote] = useState<VoiceNote | null>(null);
  const [recording, setRecording] = useState(false);

  // Submit
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [showErrors, setShowErrors] = useState(false);

  // Load session and keep it in sync with login/logout elsewhere in the app
  useEffect(() => {
    const sync = () => {
      const next = readSessionUser();
      // Keep the same object when nothing changed so data isn't refetched
      setUser((prev) =>
        prev && next && prev.id === next.id && prev.name === next.name ? prev : next,
      );
      setAuthChecked(true);
    };
    sync();
    window.addEventListener('auth_state_change', sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener('auth_state_change', sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  // Family members + primary address for the logged-in user
  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    setMembersLoading(true);
    setMembersError(null);
    getFamilyMembersApi(user.id)
      .then((data) => !cancelled && setMembers(data))
      .catch((err) => !cancelled && setMembersError(err.message))
      .finally(() => !cancelled && setMembersLoading(false));

    setAddressLoading(true);
    getPrimaryAddressApi(user.id)
      .then((data) => !cancelled && setAddress(data))
      .catch(() => !cancelled && setAddress(null))
      .finally(() => !cancelled && setAddressLoading(false));

    return () => {
      cancelled = true;
    };
  }, [user]);

  const selectedMember = members.find((m) => m.id === selectedMemberId) ?? null;

  const missing = useMemo(() => {
    const list: string[] = [];
    if (patientType === 'FAMILY_MEMBER' && !selectedMemberId) list.push('family member');
    if (!speciality) list.push('speciality');
    if (symptoms.length === 0) list.push('symptoms');
    return list;
  }, [patientType, selectedMemberId, speciality, symptoms.length]);

  const symptomOptions = useMemo(() => symptomsForSpeciality(speciality), [speciality]);

  /**
   * Picking a speciality swaps the symptom chips. Chips ticked from the previous
   * speciality's list are cleared; symptoms the patient typed themselves are kept.
   */
  const handleSelectSpeciality = (next: Speciality) => {
    if (next.id === speciality?.id) return;
    const previousOptions = symptomsForSpeciality(speciality).map((x) => x.toLowerCase());
    setSymptoms((prev) => prev.filter((x) => !previousOptions.includes(x.toLowerCase())));
    setSpeciality(next);
  };

  const handleMemberCreated = useCallback((member: FamilyMember) => {
    setMembers((prev) => [...prev, member]);
    setSelectedMemberId(member.id);
  }, []);

  const handleSubmit = async () => {
    if (!user || submitting || uploading) return;

    if (recording) {
      setSubmitError('Please stop and save your voice note before continuing.');
      return;
    }

    if (missing.length > 0) {
      setShowErrors(true);
      setSubmitError(null);
      return;
    }

    setSubmitting(true);
    setSubmitError(null);
    try {
      // Upload the voice note first; its URL is saved with the other attachments
      const attachmentUrls = attachments.map((a) => a.fileUrl);
      if (voiceNote) {
        const file = new File(
          [voiceNote.blob],
          voiceNote.fileName ?? `voice-note-${Date.now()}.${voiceNoteExtension(voiceNote.mimeType)}`,
          { type: voiceNote.mimeType },
        );
        try {
          const uploaded = await uploadConsultationAttachmentApi(user.id, file);
          attachmentUrls.push(uploaded.fileUrl);
        } catch (err) {
          throw new Error(
            `Your voice note could not be uploaded. ${err instanceof Error ? err.message : ''} You can try again, or delete it and continue without it.`.trim(),
          );
        }
      }

      const intake = await createIntakeApi(user.id, {
        patientType,
        familyMemberId: patientType === 'FAMILY_MEMBER' ? selectedMemberId ?? undefined : undefined,
        specialityId: speciality!.id,
        symptoms,
        symptomDuration: duration || undefined,
        description: description.trim() || undefined,
        attachments: attachmentUrls,
      });
      router.push(`/consult-doctors/options?intakeId=${encodeURIComponent(intake.id)}`);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
      setSubmitting(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  if (!authChecked) {
    return (
      <div className="flex flex-1 items-center justify-center py-24 text-sm text-gray-500">
        <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> Loading…
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center px-4 py-20 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[#fff0ed] text-[#ff574d]">
          <Lock className="h-6 w-6" />
        </span>
        <h1 className="mt-4 text-lg font-bold text-gray-900">Log in to consult a doctor</h1>
        <p className="mt-1 max-w-sm text-sm text-gray-500">
          We need your account to save the patient details and share them securely with your doctor.
        </p>
        <button
          type="button"
          onClick={() =>
            window.dispatchEvent(
              new CustomEvent('open_login_modal', { detail: { mode: 'login' } }),
            )
          }
          className="mt-5 rounded-xl bg-[#ff6f61] px-6 py-2.5 text-sm font-bold text-white hover:bg-[#e8453b] transition"
        >
          Log in to continue
        </button>
      </div>
    );
  }

  const patientName =
    patientType === 'SELF' ? user.name : selectedMember?.fullName ?? null;
  const patientMeta =
    patientType === 'SELF'
      ? 'Self'
      : selectedMember
        ? `${relationLabel(selectedMember.relation)} · ${selectedMember.gender}${
            selectedMember.age != null ? ` · ${selectedMember.age} yrs` : ''
          }`
        : 'Family member';

  return (
    <div className="mx-auto w-full max-w-[1200px] px-4 sm:px-6 py-6 lg:py-10">
      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="mb-4 flex items-center gap-1 text-xs text-gray-500">
        <Link href="/consult-doctors" className="hover:text-[#ff6f61]">
          Consult doctors
        </Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="font-medium text-gray-800">Patient details</span>
      </nav>

      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-gray-900">
          Consult a doctor online
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Share a few details so we can match you with the right doctor.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:items-start">
        <div className="space-y-5 lg:col-span-8">
          <PatientSelection
            patientType={patientType}
            onPatientTypeChange={setPatientType}
            selfName={user.name}
            members={members}
            membersLoading={membersLoading}
            membersError={membersError}
            selectedMemberId={selectedMemberId}
            onSelectMember={setSelectedMemberId}
            onAddMember={() => setModalOpen(true)}
            showError={showErrors}
          />

          <SpecialitySelection
            selected={speciality}
            onSelect={handleSelectSpeciality}
            showError={showErrors}
          />

          <HealthDetails
            userId={user.id}
            symptoms={symptoms}
            onSymptomsChange={setSymptoms}
            duration={duration}
            onDurationChange={setDuration}
            description={description}
            onDescriptionChange={setDescription}
            attachments={attachments}
            onAttachmentsChange={setAttachments}
            onUploadingChange={setUploading}
            showError={showErrors}
            symptomOptions={symptomOptions}
            specialityName={speciality?.name ?? null}
            voiceNote={voiceNote}
            onVoiceNoteChange={setVoiceNote}
            onRecordingChange={setRecording}
          />
        </div>

        <div className="lg:col-span-4">
          <IntakeSummaryCard
            patientName={patientName}
            patientMeta={patientMeta}
            address={address}
            addressLoading={addressLoading}
            speciality={speciality}
            symptomsCount={symptoms.length}
            missing={missing}
            submitting={submitting}
            uploading={uploading}
            submitError={submitError}
            onSubmit={handleSubmit}
          />
        </div>
      </div>

      <AddFamilyMemberModal
        open={modalOpen}
        userId={user.id}
        onClose={() => setModalOpen(false)}
        onCreated={handleMemberCreated}
      />
    </div>
  );
}
