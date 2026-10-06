'use client';

import React, { useEffect, useState, use } from 'react';
import { 
  LayoutDashboard, 
  Bell, 
  ShoppingBag, 
  Package, 
  Users, 
  Settings, 
  Building2,
  ChevronLeft,
  CheckCircle2,
  FileText,
  ExternalLink,
  Check,
  MapPin,
  X,
  Send,
  Eye,
  Boxes,
  Globe,
  Trash2,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { fetchPharmacyById, updatePharmacyStatus, sendPharmacyNotification } from '@/lib/api/pharmacies';
import { deleteNotification } from '@/lib/api/notifications';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export default function PharmacyDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const router = useRouter();
  
  const [pharmacy, setPharmacy] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [updating, setUpdating] = useState<boolean>(false);

  // Document Verification States
  const [verifiedDocs, setVerifiedDocs] = useState<{
    cnicFront: boolean;
    cnicBack: boolean;
    drugLicense: boolean;
  }>({
    cnicFront: false,
    cnicBack: false,
    drugLicense: false,
  });

  // Modal State for Document Preview
  const [selectedDocModal, setSelectedDocModal] = useState<{ url: string; title: string } | null>(null);

  // Notification Form State
  const [notificationMessage, setNotificationMessage] = useState<string>('');
  const [sendingNotification, setSendingNotification] = useState<boolean>(false);
  const [notificationSentSuccess, setNotificationSentSuccess] = useState<boolean>(false);

  // Sent Notifications List State
  const [notificationsList, setNotificationsList] = useState<Array<{ id: string; message: string; createdAt: string }>>([]);
  const [loadingNotifications, setLoadingNotifications] = useState<boolean>(false);

  useEffect(() => {
    if (resolvedParams?.id) {
      loadDetails(resolvedParams.id);
    }
  }, [resolvedParams?.id]);

  const loadDetails = async (id: string) => {
    try {
      setLoading(true);
      const data = await fetchPharmacyById(id);
      setPharmacy(data);
      await loadNotifications(id);
    } catch (err) {
      console.error('Failed to load pharmacy details:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (status: 'APPROVED' | 'REJECTED') => {
    if (!pharmacy?.id) return;
    setUpdating(true);
    try {
      const success = await updatePharmacyStatus(pharmacy.id, status);
      if (success) {
        setPharmacy((prev: any) => ({
          ...prev,
          status,
          isActive: status === 'APPROVED',
        }));
      } else {
        alert('Status update karne me masla aaya.');
      }
    } catch (err) {
      console.error(err);
      alert('Server Connection Error!');
    } finally {
      setUpdating(false);
    }
  };

  const toggleDocVerification = (docType: 'cnicFront' | 'cnicBack' | 'drugLicense') => {
    setVerifiedDocs((prev) => ({
      ...prev,
      [docType]: !prev[docType],
    }));
  };

  const formatDate = (dateStr?: string | Date) => {
    if (!dateStr) return 'Recent';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return 'N/A';
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const loadNotifications = async (id: string) => {
    setLoadingNotifications(true);
    try {
      const res = await fetch(`${API_BASE_URL}/notifications?pharmacyId=${id}`, { cache: 'no-store' });
      if (!res.ok) throw new Error('Failed to fetch notifications');
      const raw = await res.json();
      const filtered = Array.isArray(raw)
        ? raw
            .filter((n: any) => n.pharmacyId === id)
            .map((n: any) => ({
              id: n.id,
              message: n.message,
              createdAt: formatDate(n.createdAt),
            }))
        : [];
      setNotificationsList(filtered);
    } catch (err) {
      console.error('Failed to load notifications:', err);
    } finally {
      setLoadingNotifications(false);
    }
  };

  const handleDeleteNotification = async (notifId: string) => {
    try {
      await deleteNotification(notifId);
      setNotificationsList((prev) => prev.filter((n) => n.id !== notifId));
    } catch (err) {
      console.error('Failed to delete notification:', err);
      alert('Notification delete karne mein masla aaya.');
    }
  };

  const handleSendNotification = async () => {
    if (!notificationMessage.trim() || !pharmacy?.id) return;
    setSendingNotification(true);
    setNotificationSentSuccess(false);

    try {
      const success = await sendPharmacyNotification(pharmacy.id, notificationMessage);
      if (success) {
        setNotificationSentSuccess(true);
        setNotificationMessage('');
        setTimeout(() => setNotificationSentSuccess(false), 4000);
        loadNotifications(pharmacy.id);
      } else {
        alert('Notification send karne mein masla aaya.');
      }
    } catch (err) {
      console.error('Failed to send notification:', err);
      alert('Server Connection Error!');
    } finally {
      setSendingNotification(false);
    }
  };

  const getInitials = (name?: string) => {
    if (!name) return 'PH';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  const getImageUrl = (url?: string) => {
    if (!url) return null;
    return url.startsWith('http') ? url : `${API_BASE_URL}${url.startsWith('/') ? '' : '/'}${url}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center text-slate-400 text-sm">
        Pharmacy details load ho rahi hain...
      </div>
    );
  }

  if (!pharmacy) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center gap-4 text-slate-500">
        <p>Pharmacy details nahi milen.</p>
        <button 
          onClick={() => router.push('/pharmacies')}
          className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-xs font-bold"
        >
          Back to Pharmacies
        </button>
      </div>
    );
  }

  const isPending = pharmacy.status === 'PENDING' || !pharmacy.isActive;

  return (
    <div className="flex min-h-screen bg-[#F8FAFC] text-slate-800 font-sans">
      {/* Sidebar Navigation */}
      <aside className="w-64 bg-[#0F2942] text-white flex flex-col shrink-0">
        <div className="flex items-center gap-2 p-6 font-bold text-xl tracking-wide">
          <span className="text-2xl font-black text-white">+</span> TABIBISTAN
        </div>

        <nav className="flex-1 px-4 space-y-1">
          <Link href="/" className="flex items-center gap-3 px-4 py-3 text-slate-300 hover:bg-[#1A3A5C]/50 rounded-lg text-sm transition">
            <LayoutDashboard className="w-5 h-5" />
            Dashboard
          </Link>
          <Link href="/notifications" className="flex items-center gap-3 px-4 py-3 text-slate-300 hover:bg-[#1A3A5C]/50 rounded-lg text-sm transition">
            <Bell className="w-5 h-5" />
            Notifications
          </Link>
          <Link href="/orders" className="flex items-center gap-3 px-4 py-3 text-slate-300 hover:bg-[#1A3A5C]/50 rounded-lg text-sm transition">
            <ShoppingBag className="w-5 h-5" />
            Orders
          </Link>
          <Link href="/products" className="flex items-center gap-3 px-4 py-3 text-slate-300 hover:bg-[#1A3A5C]/50 rounded-lg text-sm transition">
            <Package className="w-5 h-5" />
            Products
          </Link>
          <Link href="/pharmacy-products" className="flex items-center gap-3 px-4 py-3 text-slate-300 hover:bg-[#1A3A5C]/50 rounded-lg text-sm transition">
            <Boxes className="w-5 h-5" />
            Pharmacy Products
          </Link>
          <Link href="/global-catalog" className="flex items-center gap-3 px-4 py-3 text-slate-300 hover:bg-[#1A3A5C]/50 rounded-lg text-sm transition">
            <Globe className="w-5 h-5" />
            Global Catalog
          </Link>
          <Link href="/users" className="flex items-center gap-3 px-4 py-3 text-slate-300 hover:bg-[#1A3A5C]/50 rounded-lg text-sm transition">
            <Users className="w-5 h-5" />
            Users
          </Link>
          <Link href="/pharmacies" className="flex items-center gap-3 px-4 py-3 bg-[#1A3A5C] text-white rounded-lg font-medium text-sm">
            <Building2 className="w-5 h-5" />
            Pharmacies
          </Link>
          <Link href="/settings" className="flex items-center gap-3 px-4 py-3 text-slate-300 hover:bg-[#1A3A5C]/50 rounded-lg text-sm transition">
            <Settings className="w-5 h-5" />
            Settings
          </Link>
        </nav>
      </aside>

      {/* Main Details Body */}
      <main className="flex-1 p-8 overflow-y-auto">
        {/* Top Header Breadcrumb */}
        <div className="mb-4">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            TABIBISTAN / PHARMACIES
          </span>
          <h1 className="text-xl font-bold text-slate-900 mt-0.5">Pharmacy Details</h1>
        </div>

        {/* Action Header Card */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 mb-6 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/pharmacies')}
              className="px-3 py-1.5 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 text-xs font-semibold flex items-center gap-1 transition cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
              Back
            </button>

            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-teal-800 text-white flex items-center justify-center font-bold text-sm shrink-0 shadow-2xs">
                {getInitials(pharmacy.name)}
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900">{pharmacy.name}</h2>
                <p className="text-xs text-slate-500 font-medium">
                  Owned by {pharmacy.ownerName} · {pharmacy.pharmacyCode}
                </p>
                <span className={`inline-block px-2.5 py-0.5 rounded text-[10px] font-bold mt-1 ${
                  isPending ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
                }`}>
                  {pharmacy.status}
                </span>
              </div>
            </div>
          </div>

          {/* Top Actions & Primary Pharmacist Info */}
          <div className="flex flex-col md:items-end gap-2">
            <div className="flex items-center gap-2">
              <button
                disabled={updating}
                onClick={() => handleStatusChange('REJECTED')}
                className="px-4 py-2 border border-rose-200 text-rose-600 hover:bg-rose-50 rounded-lg text-xs font-bold transition cursor-pointer disabled:opacity-50"
              >
                Decline
              </button>
              <button
                disabled={updating}
                onClick={() => handleStatusChange('APPROVED')}
                className="px-4 py-2 bg-teal-800 hover:bg-teal-900 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-2xs disabled:opacity-50"
              >
                <Check className="w-4 h-4" />
                Approve Registration
              </button>
            </div>
            <div className="text-[11px] text-right">
              <span className="text-slate-400 block">Primary pharmacist</span>
              <span className="font-bold text-slate-800 block">{pharmacy.pharmacistName}</span>
              <span className="text-slate-400 font-mono text-[10px]">{pharmacy.pharmacistRegNum}</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column (Registration & Documents Info) */}
          <div className="lg:col-span-2 space-y-6">
            {/* Registration & Contact Information Card */}
            <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-2xs">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-5 border-b border-slate-100 pb-3">
                Registration & Contact Information
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-y-5 gap-x-8 text-xs">
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-400 block mb-1">PHARMACY ID</span>
                  <span className="font-bold text-slate-800 font-mono">{pharmacy.pharmacyCode}</span>
                </div>

                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-400 block mb-1">BUSINESS TYPE</span>
                  <span className="font-bold text-slate-800">{pharmacy.pharmacyType || 'Retail Pharmacy'}</span>
                </div>

                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-400 block mb-1">OWNER NAME</span>
                  <span className="font-bold text-slate-800">{pharmacy.ownerName}</span>
                </div>

                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-400 block mb-1">PHARMACIST NAME</span>
                  <span className="font-bold text-slate-800">{pharmacy.pharmacistName}</span>
                </div>

                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-400 block mb-1">PHONE</span>
                  <span className="font-bold text-slate-800 font-mono">{pharmacy.phone}</span>
                </div>

                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-400 block mb-1">EMAIL</span>
                  <span className="font-bold text-slate-800">{pharmacy.email}</span>
                </div>

                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-400 block mb-1">CNIC NUMBER</span>
                  <span className="font-bold text-slate-800 font-mono">{pharmacy.cnicNtnNumber}</span>
                </div>

                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-400 block mb-1">DRUG LICENCE NUMBER</span>
                  <span className="font-bold text-slate-800 font-mono">{pharmacy.drugLicenseNumber}</span>
                </div>

                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-400 block mb-1">PHARMACIST REGISTRATION</span>
                  <span className="font-bold text-slate-800 font-mono">{pharmacy.pharmacistRegNum}</span>
                </div>

                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-400 block mb-1">REGISTERED ON</span>
                  <span className="font-bold text-slate-800">
                    {pharmacy.createdAt ? new Date(pharmacy.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Recently'}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-400 block mb-1">BUSINESS HOURS</span>
                  <span className="font-bold text-slate-800">
                    {pharmacy.isOpen247 ? 'Open 24/7' : 'Monday–Sunday, 8:00 AM–11:00 PM'}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-400 block mb-1">FULL ADDRESS</span>
                  <span className="font-bold text-slate-800 leading-normal block">{pharmacy.address}</span>
                </div>
              </div>
            </div>

            {/* Uploaded Documents Section */}
            <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-2xs">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-5 border-b border-slate-100 pb-3">
                Uploaded Documents
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* CNIC Front */}
                <div className="border border-slate-200 rounded-xl p-3 bg-slate-50/50 flex flex-col justify-between">
                  <div 
                    onClick={() => {
                      const url = getImageUrl(pharmacy.cnicFrontPhotoUrl);
                      if (url) setSelectedDocModal({ url, title: 'CNIC — Front' });
                    }}
                    className="h-32 rounded-lg bg-emerald-50/40 border border-emerald-100 p-2 flex flex-col items-center justify-center relative overflow-hidden group cursor-pointer"
                  >
                    {pharmacy.cnicFrontPhotoUrl ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img 
                        src={getImageUrl(pharmacy.cnicFrontPhotoUrl)!} 
                        alt="CNIC Front" 
                        className="w-full h-full object-cover rounded group-hover:scale-105 transition duration-200" 
                      />
                    ) : (
                      <div className="text-center text-slate-400">
                        <FileText className="w-8 h-8 mx-auto mb-1 text-slate-300" />
                        <span className="text-[10px] font-semibold">Document Attached</span>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white text-xs font-bold gap-1">
                      <Eye className="w-4 h-4" /> View Full
                    </div>
                  </div>

                  <div className="pt-3 flex items-center justify-between gap-2">
                    <div>
                      <span className="font-bold text-xs text-slate-800 block">CNIC — Front</span>
                      <span className="text-[10px] text-slate-400 font-mono block">{pharmacy.cnicNtnNumber}</span>
                    </div>

                    <button
                      type="button"
                      onClick={() => toggleDocVerification('cnicFront')}
                      className={`px-2.5 py-1 text-[10px] font-bold rounded-md transition cursor-pointer border flex items-center gap-1 ${
                        verifiedDocs.cnicFront
                          ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                          : 'bg-amber-50 hover:bg-emerald-50 text-amber-800 hover:text-emerald-800 border-amber-200 hover:border-emerald-300'
                      }`}
                    >
                      {verifiedDocs.cnicFront ? (
                        <>
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Verified
                        </>
                      ) : (
                        'Verify'
                      )}
                    </button>
                  </div>
                </div>

                {/* CNIC Back */}
                <div className="border border-slate-200 rounded-xl p-3 bg-slate-50/50 flex flex-col justify-between">
                  <div 
                    onClick={() => {
                      const url = getImageUrl(pharmacy.cnicBackPhotoUrl);
                      if (url) setSelectedDocModal({ url, title: 'CNIC — Back' });
                    }}
                    className="h-32 rounded-lg bg-emerald-50/40 border border-emerald-100 p-2 flex flex-col items-center justify-center relative overflow-hidden group cursor-pointer"
                  >
                    {pharmacy.cnicBackPhotoUrl ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img 
                        src={getImageUrl(pharmacy.cnicBackPhotoUrl)!} 
                        alt="CNIC Back" 
                        className="w-full h-full object-cover rounded group-hover:scale-105 transition duration-200" 
                      />
                    ) : (
                      <div className="text-center text-slate-400">
                        <FileText className="w-8 h-8 mx-auto mb-1 text-slate-300" />
                        <span className="text-[10px] font-semibold">Owner identity document</span>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white text-xs font-bold gap-1">
                      <Eye className="w-4 h-4" /> View Full
                    </div>
                  </div>

                  <div className="pt-3 flex items-center justify-between gap-2">
                    <div>
                      <span className="font-bold text-xs text-slate-800 block">CNIC — Back</span>
                      <span className="text-[10px] text-slate-400 font-mono block">Owner Identity</span>
                    </div>

                    <button
                      type="button"
                      onClick={() => toggleDocVerification('cnicBack')}
                      className={`px-2.5 py-1 text-[10px] font-bold rounded-md transition cursor-pointer border flex items-center gap-1 ${
                        verifiedDocs.cnicBack
                          ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                          : 'bg-amber-50 hover:bg-emerald-50 text-amber-800 hover:text-emerald-800 border-amber-200 hover:border-emerald-300'
                      }`}
                    >
                      {verifiedDocs.cnicBack ? (
                        <>
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Verified
                        </>
                      ) : (
                        'Verify'
                      )}
                    </button>
                  </div>
                </div>

                {/* Drug Licence */}
                <div className="border border-slate-200 rounded-xl p-3 bg-amber-50/30 flex flex-col justify-between">
                  <div 
                    onClick={() => {
                      const url = getImageUrl(pharmacy.drugLicensePhotoUrl);
                      if (url) setSelectedDocModal({ url, title: 'Drug Licence' });
                    }}
                    className="h-32 rounded-lg bg-amber-100/40 border border-amber-200 p-2 flex flex-col items-center justify-center relative overflow-hidden group cursor-pointer"
                  >
                    {pharmacy.drugLicensePhotoUrl ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img 
                        src={getImageUrl(pharmacy.drugLicensePhotoUrl)!} 
                        alt="Drug Licence" 
                        className="w-full h-full object-cover rounded group-hover:scale-105 transition duration-200" 
                      />
                    ) : (
                      <div className="text-center text-amber-700">
                        <FileText className="w-8 h-8 mx-auto mb-1 text-amber-500" />
                        <span className="text-[10px] font-semibold">Licence Document</span>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white text-xs font-bold gap-1">
                      <Eye className="w-4 h-4" /> View Full
                    </div>
                  </div>

                  <div className="pt-3 flex items-center justify-between gap-2">
                    <div>
                      <span className="font-bold text-xs text-slate-800 block">Drug Licence</span>
                      <span className="text-[10px] text-slate-400 font-mono block">{pharmacy.drugLicenseNumber}</span>
                    </div>

                    <button
                      type="button"
                      onClick={() => toggleDocVerification('drugLicense')}
                      className={`px-2.5 py-1 text-[10px] font-bold rounded-md transition cursor-pointer border flex items-center gap-1 ${
                        verifiedDocs.drugLicense
                          ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                          : 'bg-amber-50 hover:bg-emerald-50 text-amber-800 hover:text-emerald-800 border-amber-200 hover:border-emerald-300'
                      }`}
                    >
                      {verifiedDocs.drugLicense ? (
                        <>
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Verified
                        </>
                      ) : (
                        'Verify'
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Sent Notifications List */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs space-y-3">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <Bell className="w-4 h-4 text-slate-500" />
                Sent Notifications
              </h3>

              {loadingNotifications ? (
                <p className="text-[11px] text-slate-400 font-medium">Notifications load ho rahi hain...</p>
              ) : notificationsList.length === 0 ? (
                <p className="text-[11px] text-slate-400 font-medium">Abhi tak koi notification nahi bheja gaya.</p>
              ) : (
                <ul className="space-y-2">
                  {notificationsList.map((notif) => (
                    <li
                      key={notif.id}
                      className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 bg-slate-50/60 text-xs"
                    >
                      <span className="font-medium text-slate-800 break-words flex-1 min-w-0">{notif.message}</span>
                      <span className="text-[10px] text-slate-400 font-mono shrink-0">{notif.createdAt}</span>
                      <button
                        type="button"
                        onClick={() => handleDeleteNotification(notif.id)}
                        className="shrink-0 p-1.5 text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-md transition cursor-pointer border border-transparent hover:border-rose-200"
                        title="Delete notification"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* Right Column (Address Info, Checklist & Notification Form) */}
          <div className="space-y-6">
            {/* Registered Address */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-slate-500" />
                Registered Address
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-100 font-medium">
                {pharmacy.address}
              </p>
            </div>

            {/* Verification Checklist */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-3">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-4">
                Verification Checklist
              </h3>

              <div className="space-y-2.5 text-xs font-semibold">
                <div className={`flex items-center gap-2 ${verifiedDocs.cnicFront && verifiedDocs.cnicBack ? 'text-emerald-700' : 'text-slate-400'}`}>
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>Owner CNIC verified</span>
                </div>

                <div className={`flex items-center gap-2 ${verifiedDocs.drugLicense ? 'text-emerald-700' : 'text-slate-400'}`}>
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>Drug licence verified</span>
                </div>

                <div className="flex items-center gap-2 text-emerald-700">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>Pharmacist registration provided</span>
                </div>

                <div className="flex items-center gap-2 text-emerald-700">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>Location address provided</span>
                </div>
              </div>
            </div>

            {/* Send Notification Card */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-3">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <Send className="w-4 h-4 text-slate-500" />
                Send Notification to Pharmacy
              </h3>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Send a direct notification message to the pharmacy owner regarding status or required document re-submission.
              </p>

              <textarea
                rows={3}
                value={notificationMessage}
                onChange={(e) => setNotificationMessage(e.target.value)}
                placeholder="Type your message here (e.g. Please re-upload clear CNIC photo)..."
                className="w-full p-2.5 text-xs border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-teal-700 resize-none"
              />

              <button
                type="button"
                disabled={!notificationMessage.trim() || sendingNotification}
                onClick={handleSendNotification}
                className="w-full py-2 bg-teal-800 hover:bg-teal-900 text-white rounded-lg text-xs font-bold transition flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer shadow-2xs"
              >
                <Send className="w-3.5 h-3.5" />
                {sendingNotification ? 'Sending...' : 'Send Notification'}
              </button>

              {notificationSentSuccess && (
                <p className="text-[11px] text-emerald-600 font-medium flex items-center gap-1 pt-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Notification sent successfully!
                </p>
              )}
            </div>
          </div>
        </div>

        {/* FULL DOCUMENT PREVIEW MODAL */}
        {selectedDocModal && (
          <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-xs animate-in fade-in">
            <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">
              <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
                <div className="flex items-center gap-2">
                  <span className="text-lg">📄</span>
                  <h3 className="font-bold text-slate-800 text-sm">{selectedDocModal.title}</h3>
                </div>
                <div className="flex items-center gap-3">
                  <a
                    href={selectedDocModal.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-teal-800 text-white rounded-lg text-xs font-bold hover:bg-teal-900 transition shadow-xs"
                  >
                    Open Original File
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                  <button
                    onClick={() => setSelectedDocModal(null)}
                    className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-lg transition cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="p-6 overflow-auto flex-1 flex justify-center items-center bg-slate-900/10 min-h-[450px]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={selectedDocModal.url}
                  alt={selectedDocModal.title}
                  className="max-w-full max-h-[70vh] object-contain rounded-xl shadow-lg border border-slate-200 bg-white"
                />
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}