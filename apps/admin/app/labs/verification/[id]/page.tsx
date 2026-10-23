'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Building2,
  CheckCircle2,
  XCircle,
  FileText,
  ExternalLink,
  MapPin,
  User,
  ShieldCheck,
  Phone,
  Mail,
  Home,
} from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

interface LabBranch {
  id: string;
  name: string;
  address: string;
  medicalDirectorName: string;
  medicalCouncilLicenseNo: string;
  phone?: string;
  isMainCenter: boolean;
}

interface LabDetails {
  id: string;
  name: string;
  email: string;
  phone: string;
  whatsappNumber?: string;
  logoUrl?: string;
  licenseNumber: string;
  licenseDocUrl: string;
  regulatoryBody: string;
  hasHomeSample: boolean;
  homeSampleFee: number;
  verificationStatus: 'PENDING' | 'APPROVED' | 'REJECTED';
  isVerified: boolean;
  documentVerified: boolean;
  rejectionReason?: string;
  createdAt: string;
  branches: LabBranch[];
}

export default function LabDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const labId = params?.id as string;

  const [lab, setLab] = useState<LabDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [updating, setUpdating] = useState(false);

  const documentUrl = (url: string) => (url.startsWith('http') ? url : `${API_BASE.replace('/api', '')}${url}`);
  const isPdf = /\.pdf(?:$|[?#])/i.test(lab?.licenseDocUrl ?? '');
  const isImage = /\.(?:jpe?g|png|webp)(?:$|[?#])/i.test(lab?.licenseDocUrl ?? '');

  const fetchLabDetails = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/labs/admin/labs/details/${labId}`, { cache: 'no-store' });
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          setLab(json.data);
        }
      }
    } catch (error) {
      console.error('Failed to fetch lab details:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (labId) fetchLabDetails();
  }, [labId]);

  const handleApprove = async () => {
    if (!lab) return;
    try {
      setUpdating(true);
      const res = await fetch(`${API_BASE}/labs/admin/labs/update-status/${lab.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'APPROVED' }),
      });
      if (res.ok) {
        fetchLabDetails();
      }
    } catch (error) {
      console.error('Failed to approve lab:', error);
    } finally {
      setUpdating(false);
    }
  };

  const handleReject = async () => {
    if (!lab || !rejectionReason.trim()) return;
    try {
      setUpdating(true);
      const res = await fetch(`${API_BASE}/labs/admin/labs/update-status/${lab.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'REJECTED', rejectionReason: rejectionReason.trim() }),
      });
      if (res.ok) {
        setShowRejectModal(false);
        setRejectionReason('');
        fetchLabDetails();
      }
    } catch (error) {
      console.error('Failed to reject lab:', error);
    } finally {
      setUpdating(false);
    }
  };

  const handleDocumentVerification = async () => {
    if (!lab) return;
    try {
      setUpdating(true);
      const res = await fetch(`${API_BASE}/labs/admin/labs/${lab.id}/document-verification`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentVerified: !lab.documentVerified }),
      });
      if (res.ok) await fetchLabDetails();
    } catch (error) {
      console.error('Failed to update document verification:', error);
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-violet-600 border-t-transparent"></div>
          <p className="text-sm font-medium text-slate-600">Lab Details Load Ho Rahi Hain...</p>
        </div>
      </div>
    );
  }

  if (!lab) {
    return (
      <div className="min-h-screen bg-slate-50 p-8">
        <div className="mx-auto max-w-4xl text-center">
          <p className="text-slate-600">Laboratory record nahi mila.</p>
          <Link href="/labs/verification" className="mt-4 inline-block text-violet-600 font-semibold">
            ← Back to Verification List
          </Link>
        </div>
      </div>
    );
  }

  const mainBranch = lab.branches.find((b) => b.isMainCenter) || lab.branches[0];

  return (
    <div className="min-h-screen bg-slate-50 p-6 lg:p-10 text-slate-900 font-sans">
      <div className="mx-auto max-w-7xl">
        {/* HEADER BAR */}
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/labs/verification"
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-100"
            >
              <ArrowLeft className="h-4 w-4" /> Back
            </Link>
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-violet-600 text-lg font-bold text-white shadow-md">
                {lab.name.charAt(0)}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-bold tracking-tight text-slate-900">{lab.name}</h1>
                  {lab.verificationStatus === 'APPROVED' && (
                    <span className="rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-xs font-bold text-emerald-700">
                      APPROVED
                    </span>
                  )}
                  {lab.verificationStatus === 'PENDING' && (
                    <span className="rounded-full bg-amber-50 border border-amber-200 px-2.5 py-0.5 text-xs font-bold text-amber-700">
                      PENDING
                    </span>
                  )}
                  {lab.verificationStatus === 'REJECTED' && (
                    <span className="rounded-full bg-red-50 border border-red-200 px-2.5 py-0.5 text-xs font-bold text-red-700">
                      REJECTED
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500">Regulatory Body: {lab.regulatoryBody}</p>
              </div>
            </div>
          </div>

          {/* ACTION BUTTONS */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowRejectModal(true)}
              disabled={updating}
              className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-4 py-2 text-xs font-bold text-red-600 shadow-sm transition hover:bg-red-50 disabled:opacity-50"
            >
              <XCircle className="h-4 w-4" /> Decline
            </button>
            <button
              onClick={handleApprove}
              disabled={updating || lab.verificationStatus === 'APPROVED'}
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow transition hover:bg-emerald-700 disabled:opacity-50"
            >
              <CheckCircle2 className="h-4 w-4" /> Approve Registration
            </button>
          </div>
        </div>

        {/* MAIN GRID CONTENT */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* LEFT COLUMN - 2 SPANS */}
          <div className="space-y-6 lg:col-span-2">
            {/* REGISTRATION & CONTACT INFORMATION */}
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-4">
                Registration & Contact Information
              </h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 text-xs">
                <div>
                  <p className="text-slate-400 uppercase font-semibold">Lab ID</p>
                  <p className="font-mono font-medium text-slate-900 mt-1">{lab.id.substring(0, 8)}</p>
                </div>
                <div>
                  <p className="text-slate-400 uppercase font-semibold">Regulatory Body</p>
                  <p className="font-medium text-slate-900 mt-1">{lab.regulatoryBody}</p>
                </div>
                <div>
                  <p className="text-slate-400 uppercase font-semibold">Primary Phone</p>
                  <p className="font-medium text-slate-900 mt-1 flex items-center gap-1">
                    <Phone className="h-3 w-3 text-slate-400" /> {lab.phone}
                  </p>
                </div>
                <div>
                  <p className="text-slate-400 uppercase font-semibold">Email</p>
                  <p className="font-medium text-slate-900 mt-1 flex items-center gap-1">
                    <Mail className="h-3 w-3 text-slate-400" /> {lab.email}
                  </p>
                </div>
                <div>
                  <p className="text-slate-400 uppercase font-semibold">License Number</p>
                  <p className="font-medium text-slate-900 mt-1">{lab.licenseNumber}</p>
                </div>
                <div>
                  <p className="text-slate-400 uppercase font-semibold">WhatsApp Contact</p>
                  <p className="font-medium text-slate-900 mt-1">{lab.whatsappNumber || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-slate-400 uppercase font-semibold">Home Sample Collection</p>
                  <p className="font-medium text-slate-900 mt-1 flex items-center gap-1">
                    <Home className="h-3 w-3 text-slate-400" />
                    {lab.hasHomeSample ? `Available (Fee: Rs. ${lab.homeSampleFee})` : 'Not Available'}
                  </p>
                </div>
                <div>
                  <p className="text-slate-400 uppercase font-semibold">Registered On</p>
                  <p className="font-medium text-slate-900 mt-1">
                    {new Date(lab.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>

            {/* UPLOADED DOCUMENTS */}
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-4">
                Uploaded Documents
              </h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {/* Document Card */}
                <div className="rounded-lg border border-slate-200 p-4 bg-slate-50">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-slate-800">Healthcare License Document</span>
                    <span className="text-[10px] bg-slate-200 px-2 py-0.5 rounded font-medium">Doc</span>
                  </div>
                  <p className="text-xs text-slate-500 mb-3">License No: {lab.licenseNumber}</p>
                  {isImage ? (
                    <>
                      <a
                        href={documentUrl(lab.licenseDocUrl)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group mb-3 block overflow-hidden rounded-lg border border-slate-200 bg-white"
                        aria-label="View full license image"
                      >
                        <img
                          src={documentUrl(lab.licenseDocUrl)}
                          alt={`Healthcare license for ${lab.name}`}
                          className="h-48 w-full object-contain transition duration-200 group-hover:scale-[1.02]"
                        />
                      </a>
                      <a
                        href={documentUrl(lab.licenseDocUrl)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex w-full items-center justify-center gap-1 rounded border border-slate-300 bg-white py-1.5 text-xs font-semibold text-violet-600 hover:bg-slate-100"
                      >
                        <ExternalLink className="h-3.5 w-3.5" /> View Full Image / Zoom
                      </a>
                    </>
                  ) : isPdf ? (
                    <>
                      <div className="mb-3 overflow-hidden rounded-lg border border-slate-200 bg-white">
                        <iframe
                          title={`Healthcare license PDF for ${lab.name}`}
                          src={documentUrl(lab.licenseDocUrl)}
                          className="h-48 w-full"
                        />
                      </div>
                      <a
                        href={documentUrl(lab.licenseDocUrl)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex w-full items-center justify-center gap-1 rounded border border-slate-300 bg-white py-1.5 text-xs font-semibold text-violet-600 hover:bg-slate-100"
                      >
                        <FileText className="h-3.5 w-3.5" /> Open PDF in New Tab
                      </a>
                    </>
                  ) : (
                    <a
                      href={documentUrl(lab.licenseDocUrl)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex w-full items-center justify-center gap-1 rounded border border-slate-300 bg-white py-1.5 text-xs font-semibold text-violet-600 hover:bg-slate-100"
                    >
                      <FileText className="h-3.5 w-3.5" /> Open Document
                    </a>
                  )}
                  <button
                    type="button"
                    disabled={updating}
                    onClick={handleDocumentVerification}
                    className={`mt-3 inline-flex w-full items-center justify-center gap-1 rounded border py-1.5 text-xs font-bold disabled:opacity-50 ${
                      lab.documentVerified
                        ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                        : 'border-violet-200 bg-violet-50 text-violet-700 hover:bg-violet-100'
                    }`}
                  >
                    <ShieldCheck className="h-3.5 w-3.5" />
                    {lab.documentVerified ? 'Verified — click to undo' : 'Mark Document as Verified'}
                  </button>
                </div>

                {/* Logo Card */}
                {lab.logoUrl && (
                  <div className="rounded-lg border border-slate-200 p-4 bg-slate-50">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-slate-800">Lab Logo</span>
                      <span className="text-[10px] bg-slate-200 px-2 py-0.5 rounded font-medium">Image</span>
                    </div>
                    <p className="text-xs text-slate-500 mb-3">Official Branding</p>
                    <a
                      href={`${API_BASE.replace('/api', '')}${lab.logoUrl}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex w-full items-center justify-center gap-1 rounded bg-white border border-slate-300 py-1.5 text-xs font-semibold text-violet-600 hover:bg-slate-100"
                    >
                      <Building2 className="h-3.5 w-3.5" /> View Logo
                    </a>
                  </div>
                )}
              </div>
            </div>

            {/* REGISTERED BRANCHES */}
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-4">
                Registered Branches ({lab.branches.length})
              </h2>
              <div className="space-y-3">
                {lab.branches.map((b) => (
                  <div key={b.id} className="rounded-lg border border-slate-200 p-4 text-xs">
                    <div className="flex items-center justify-between mb-1">
                      <p className="font-bold text-slate-900">{b.name}</p>
                      {b.isMainCenter && (
                        <span className="rounded bg-violet-50 px-2 py-0.5 text-[10px] font-bold text-violet-700 border border-violet-200">
                          Main Center
                        </span>
                      )}
                    </div>
                    <p className="text-slate-600 flex items-start gap-1 mt-1">
                      <MapPin className="h-3.5 w-3.5 text-slate-400 mt-0.5 shrink-0" />
                      {b.address}
                    </p>
                    <div className="mt-2 pt-2 border-t border-slate-100 flex flex-wrap gap-4 text-slate-500">
                      <span>Medical Director: <strong className="text-slate-800">{b.medicalDirectorName}</strong></span>
                      <span>Council License: <strong className="text-slate-800">{b.medicalCouncilLicenseNo}</strong></span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN - SIDEBAR WIDGETS */}
          <div className="space-y-6">
            {/* MAIN ADDRESS CARD */}
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
                Main Center Location
              </h3>
              <p className="text-xs text-slate-700 leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-100">
                {mainBranch?.address || 'Address not specified'}
              </p>
            </div>

            {/* VERIFICATION CHECKLIST */}
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-4">
                Verification Checklist
              </h3>
              <ul className="space-y-3 text-xs">
                <li className="flex items-center gap-2 text-slate-700">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  <span>Primary phone number verified</span>
                </li>
                <li className="flex items-center gap-2 text-slate-700">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  <span>Healthcare license document provided</span>
                </li>
                <li className="flex items-center gap-2 text-slate-700">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  <span>Main center address & pin set</span>
                </li>
                <li className="flex items-center gap-2 text-slate-700">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  <span>Medical director license details present</span>
                </li>
              </ul>
            </div>

            {/* REJECTION REASON DISPLAY */}
            {lab.verificationStatus === 'REJECTED' && lab.rejectionReason && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-6">
                <h3 className="text-xs font-bold uppercase tracking-wider text-red-800 mb-2">
                  Rejection Reason / Admin Notes
                </h3>
                <p className="text-xs text-red-700 leading-relaxed">{lab.rejectionReason}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* REJECT MODAL */}
      {showRejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/50" onClick={() => setShowRejectModal(false)} />
          <div className="relative w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h3 className="text-base font-bold text-slate-900 mb-2">Reject Laboratory Registration</h3>
            <p className="text-xs text-slate-500 mb-4">
              Specify the reason for rejection (e.g. blurred license, expired document).
            </p>
            <textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              rows={4}
              className="w-full rounded-lg border border-slate-300 p-3 text-xs focus:border-violet-500 focus:outline-none"
              placeholder="Enter rejection reason here..."
            />
            <div className="mt-4 flex gap-3">
              <button
                onClick={() => setShowRejectModal(false)}
                className="flex-1 rounded-lg border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                disabled={!rejectionReason.trim() || updating}
                className="flex-1 rounded-lg bg-red-600 px-4 py-2 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-50"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
