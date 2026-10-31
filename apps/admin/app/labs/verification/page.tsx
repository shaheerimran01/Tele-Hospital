'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  LayoutDashboard,
  Building2,
  FlaskConical,
  ShoppingBag,
  FileCheck2,
  ArrowLeft,
  Eye,
  X,
  CheckCircle,
  XCircle,
  AlertCircle,
  Phone,
  Mail,
  MapPin,
  User,
  SlidersHorizontal,
} from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://tabibistan.org';

interface LabBranch {
  id: string;
  name: string;
  address: string;
  medicalDirectorName: string;
  medicalCouncilLicenseNo: string;
  phone?: string;
  isMainCenter: boolean;
}

interface Lab {
  id: string;
  name: string;
  email: string;
  phone: string;
  whatsappNumber?: string;
  logoUrl?: string;
  licenseNumber: string;
  licenseDocUrl: string;
  regulatoryBody: string;
  verificationStatus: 'PENDING' | 'APPROVED' | 'REJECTED';
  isVerified: boolean;
  rejectionReason?: string;
  createdAt: string;
  branchesCount: number;
  branches: LabBranch[];
}

export default function LabVerificationPage() {
  const [labs, setLabs] = useState<Lab[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'>('ALL');
  const [selectedLab, setSelectedLab] = useState<Lab | null>(null);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [updating, setUpdating] = useState(false);

  const fetchLabs = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/labs/admin/labs/verification-list?status=${activeTab}`, {
        cache: 'no-store',
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setLabs(data.data);
        }
      }
    } catch (error) {
      console.error('Failed to fetch labs:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLabs();
  }, [activeTab]);

  const handleApprove = async (labId: string) => {
    try {
      setUpdating(true);
      const res = await fetch(`${API_BASE}/labs/admin/labs/update-status/${labId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'APPROVED' }),
      });
      if (res.ok) {
        setSelectedLab(null);
        fetchLabs();
      }
    } catch (error) {
      console.error('Failed to approve lab:', error);
    } finally {
      setUpdating(false);
    }
  };

  const handleReject = async () => {
    if (!selectedLab || !rejectionReason.trim()) return;
    try {
      setUpdating(true);
      const res = await fetch(`${API_BASE}/labs/admin/labs/update-status/${selectedLab.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'REJECTED', rejectionReason: rejectionReason.trim() }),
      });
      if (res.ok) {
        setShowRejectModal(false);
        setSelectedLab(null);
        setRejectionReason('');
        fetchLabs();
      }
    } catch (error) {
      console.error('Failed to reject lab:', error);
    } finally {
      setUpdating(false);
    }
  };

  const getStatusBadge = (status: string) => {
    if (status === 'APPROVED') {
      return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">APPROVED</span>;
    }
    if (status === 'REJECTED') {
      return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-200">REJECTED</span>;
    }
    return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">PENDING</span>;
  };

  const tabs = [
    { key: 'ALL', label: 'All Labs' },
    { key: 'PENDING', label: 'Pending Review' },
    { key: 'APPROVED', label: 'Approved' },
    { key: 'REJECTED', label: 'Rejected' },
  ];

  const counts = {
    ALL: labs.length,
    PENDING: labs.filter(l => l.verificationStatus === 'PENDING').length,
    APPROVED: labs.filter(l => l.verificationStatus === 'APPROVED').length,
    REJECTED: labs.filter(l => l.verificationStatus === 'REJECTED').length,
  };

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans text-slate-900">
      {/* SIDEBAR */}
      <aside className="sticky top-0 flex h-screen w-64 flex-col justify-between border-r border-slate-200 bg-white p-4">
        <div>
          <div className="mb-8 px-2">
            <Link href="/" className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-800 mb-3">
              <ArrowLeft className="h-3 w-3" /> Back to Gateway
            </Link>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-600 font-bold text-xl text-white shadow-md">T</div>
              <div>
                <h1 className="text-base font-bold leading-none text-slate-900">Tabibistan</h1>
                <span className="text-[10px] font-bold uppercase tracking-wider text-violet-600">Admin Portal</span>
              </div>
            </div>
          </div>
          <nav className="space-y-1">
            <Link href="/labs/dashboard" className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900">
              <LayoutDashboard className="h-5 w-5" />
              Dashboard
            </Link>
            <Link href="/labs/verification" className="flex w-full items-center justify-between rounded-lg bg-violet-50 px-3 py-2.5 text-sm font-medium text-violet-700 transition-colors">
              <div className="flex items-center gap-3">
                <FileCheck2 className="h-5 w-5" />
                Lab Verification
              </div>
            </Link>
            <Link href="/labs/orders" className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900">
              <ShoppingBag className="h-5 w-5" />
              Orders & Bookings
            </Link>
            <Link href="/labs/catalog" className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900">
              <FlaskConical className="h-5 w-5" />
              Master Catalog
            </Link>
            <Link href="/labs/exclusions" className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900">
              <SlidersHorizontal className="h-5 w-5" />
              Exclusions Manager
            </Link>
          </nav>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 overflow-y-auto p-8">
        <div className="mb-8">
          <p className="text-xs font-bold tracking-widest uppercase text-violet-700">LAB & DIAGNOSTICS PORTAL</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Laboratory Verification Portal</h1>
          <p className="mt-2 text-sm text-slate-600">Review and approve diagnostic center applications</p>
        </div>

        {/* Filter Tabs */}
        <div className="mb-6 flex flex-wrap gap-2">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                activeTab === tab.key
                  ? 'bg-violet-600 text-white'
                  : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              {tab.label}
              <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${
                activeTab === tab.key ? 'bg-white/20' : 'bg-slate-100'
              }`}>
                {tab.key === 'ALL' ? labs.length : (counts[tab.key as keyof typeof counts] || 0)}
              </span>
            </button>
          ))}
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Lab Info</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Contact</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Licensing</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Branches</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Applied Date</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-slate-600 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-slate-500">Loading...</td>
                  </tr>
                ) : labs.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-slate-500">No labs found</td>
                  </tr>
                ) : (
                  labs.map((lab) => (
                    <tr key={lab.id} className="hover:bg-slate-50 transition">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-violet-100 flex items-center justify-center">
                            <Building2 className="w-5 h-5 text-violet-600" />
                          </div>
                          <div>
                            <div className="font-medium text-slate-900">{lab.name}</div>
                            <div className="text-sm text-slate-500 flex items-center gap-1">
                              <Mail className="w-3 h-3" /> {lab.email}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-slate-900 flex items-center gap-1">
                          <Phone className="w-3 h-3" /> {lab.phone}
                        </div>
                        {lab.whatsappNumber && (
                          <div className="text-sm text-slate-500 mt-1">WhatsApp: {lab.whatsappNumber}</div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-slate-900">{lab.licenseNumber}</div>
                        <div className="text-sm text-slate-500">{lab.regulatoryBody}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-slate-900">{lab.branchesCount} branch(es)</span>
                      </td>
                      <td className="px-6 py-4">{getStatusBadge(lab.verificationStatus)}</td>
                      <td className="px-6 py-4 text-sm text-slate-500">
                        {new Date(lab.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Link
                          href={`/labs/verification/${lab.id}`}
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-violet-600 hover:bg-violet-50 rounded-lg transition"
                        >
                          <Eye className="w-4 h-4" />
                          View Details / Review
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Review Drawer */}
      {selectedLab && (
        <div className="fixed inset-0 z-50 flex">
          <div className="fixed inset-0 bg-black/50" onClick={() => setSelectedLab(null)} />
          <div className="relative ml-auto w-full max-w-2xl bg-white shadow-xl flex flex-col h-full">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <h2 className="text-lg font-semibold text-slate-900">Lab Verification Review</h2>
              <button onClick={() => setSelectedLab(null)} className="p-2 hover:bg-slate-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <div>
                <h3 className="text-sm font-semibold text-slate-900 mb-3">Profile Overview</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-slate-500">Lab Name:</span><span className="font-medium">{selectedLab.name}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">Email:</span><span className="font-medium">{selectedLab.email}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">Phone:</span><span className="font-medium">{selectedLab.phone}</span></div>
                  {selectedLab.whatsappNumber && <div className="flex justify-between"><span className="text-slate-500">WhatsApp:</span><span className="font-medium">{selectedLab.whatsappNumber}</span></div>}
                  <div className="flex justify-between"><span className="text-slate-500">License Number:</span><span className="font-medium">{selectedLab.licenseNumber}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">Regulatory Body:</span><span className="font-medium">{selectedLab.regulatoryBody}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">Status:</span>{getStatusBadge(selectedLab.verificationStatus)}</div>
                  <div className="pt-2">
                    <a href={selectedLab.licenseDocUrl} target="_blank" rel="noopener noreferrer" className="text-violet-600 hover:underline text-sm font-medium">View License Document →</a>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-slate-900 mb-3">Branches ({selectedLab.branches.length})</h3>
                <div className="space-y-3">
                  {selectedLab.branches.map((branch) => (
                    <div key={branch.id} className="p-3 border border-slate-200 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <div className="font-medium text-slate-900">{branch.name}</div>
                        {branch.isMainCenter && <span className="text-xs bg-violet-50 text-violet-700 px-2 py-0.5 rounded">Main Center</span>}
                      </div>
                      <div className="text-sm text-slate-600 space-y-1">
                        <div className="flex items-start gap-2"><MapPin className="w-3 h-3 mt-0.5" /><span>{branch.address}</span></div>
                        <div className="flex items-center gap-2"><User className="w-3 h-3" /><span>Medical Director: {branch.medicalDirectorName}</span></div>
                        <div className="text-xs text-slate-500">License: {branch.medicalCouncilLicenseNo}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {selectedLab.verificationStatus === 'REJECTED' && selectedLab.rejectionReason && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <div className="text-sm font-medium text-red-900 mb-1">Rejection Reason</div>
                  <div className="text-sm text-red-700">{selectedLab.rejectionReason}</div>
                </div>
              )}
            </div>

            {selectedLab.verificationStatus === 'PENDING' && (
              <div className="border-t border-slate-200 p-6 flex gap-3">
                <button
                  onClick={() => handleApprove(selectedLab.id)}
                  disabled={updating}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50"
                >
                  <CheckCircle className="w-4 h-4" />
                  Approve
                </button>
                <button
                  onClick={() => setShowRejectModal(true)}
                  disabled={updating}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                >
                  <XCircle className="w-4 h-4" />
                  Reject
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center">
          <div className="fixed inset-0 bg-black/50" onClick={() => setShowRejectModal(false)} />
          <div className="relative bg-white rounded-xl shadow-xl max-w-md w-full mx-4 p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Reject Laboratory</h3>
            <label className="block text-sm font-medium text-slate-700 mb-2">Rejection Reason</label>
            <textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
              rows={4}
              placeholder="Enter reason for rejection..."
            />
            <div className="flex gap-3 mt-4">
              <button onClick={() => setShowRejectModal(false)} className="flex-1 px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50">Cancel</button>
              <button onClick={handleReject} disabled={!rejectionReason.trim() || updating} className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50">Submit</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
