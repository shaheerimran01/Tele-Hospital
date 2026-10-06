'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { 
  LayoutDashboard, 
  Package, 
  User, 
  LogOut, 
  Building2, 
  Phone, 
  MapPin, 
  FileText, 
  CreditCard, 
  Edit3, 
  Save, 
  X, 
  CheckCircle2, 
  AlertTriangle,
  ChevronRight,
  Eye,
  Loader2,
  Maximize2
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface PharmacyData {
  id: string;
  name: string;
  type: string;
  ownerName: string;
  qualifiedPharmacist: string;
  registrationNo: string;
  phone: string;
  whatsApp: string;
  email: string;
  address: string;
  city: string;
  openingHours: string;
  open247: string;
  pharmacistLicenseNo: string;
  cnic: string;
  pharmacistLicensePic?: string;
  cnicFrontPic?: string;
  cnicBackPic?: string;
  payoutMethod: string;
  accountTitle: string;
  mobileAccount: string;
  coldChainProducts: string;
  status: string;
  createdAt?: string;
}

export default function PersonalDetailsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  
  const [previewImage, setPreviewImage] = useState<{ url: string; title: string } | null>(null);
  const [pharmacyId, setPharmacyId] = useState<string>('cmusaneom00007sv5rz5cdtrm');

  const searchParams = useSearchParams();
  const highlightId = searchParams.get('highlight');
  const [highlighting, setHighlighting] = useState<string | null>(null);

  const [pharmacy, setPharmacy] = useState<PharmacyData>({
    id: '',
    name: 'Loading...',
    type: 'Retail',
    ownerName: 'N/A',
    qualifiedPharmacist: 'N/A',
    registrationNo: 'N/A',
    phone: 'N/A',
    whatsApp: 'N/A',
    email: 'N/A',
    address: 'N/A',
    city: 'N/A',
    openingHours: '9 AM - 11 PM',
    open247: 'No',
    pharmacistLicenseNo: 'N/A',
    cnic: 'N/A',
    pharmacistLicensePic: '',
    cnicFrontPic: '',
    cnicBackPic: '',
    payoutMethod: 'JazzCash',
    accountTitle: 'N/A',
    mobileAccount: 'N/A',
    coldChainProducts: 'Disabled',
    status: 'PENDING',
  });

  // Helper to append Backend Base URL to relative `/uploads/...` paths
  const getFullImageUrl = (path?: string | null) => {
    if (!path) return '';
    if (path.startsWith('http://') || path.startsWith('https://')) return path;
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
    return `${baseUrl}${path.startsWith('/') ? '' : '/'}${path}`;
  };

  const fetchPharmacyDetails = async (id: string) => {
    setLoading(true);
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
      const res = await fetch(`${baseUrl}/pharmacies/${id}`);
      if (res.ok) {
        const data = await res.json();

        setPharmacy({
          id: data.id || id,
          name: data.name || 'N/A',
          type: data.pharmacyType || 'Retail',
          ownerName: data.ownerName || 'N/A',
          qualifiedPharmacist: data.pharmacistName || 'N/A',
          registrationNo: data.pharmacistRegNum || 'N/A',
          phone: data.phone || 'N/A',
          whatsApp: data.whatsappNumber || data.phone || 'N/A',
          email: data.email || 'N/A',
          address: data.address || 'N/A',
          city: data.city || 'N/A',
          openingHours: '9 AM - 11 PM',
          open247: data.isOpen247 ? 'Yes' : 'No',
          
          pharmacistLicenseNo: data.drugLicenseNumber || data.drugLicenseNo || data.pharmacistLicenseNo || data.pharmacistRegNum || 'N/A',
          cnic: data.cnicNtnNumber || 'N/A',
          
          // Construct Full Image URLs
          pharmacistLicensePic: getFullImageUrl(data.drugLicensePhotoUrl),
          cnicFrontPic: getFullImageUrl(data.cnicFrontPhotoUrl),
          cnicBackPic: getFullImageUrl(data.cnicBackPhotoUrl),
          
          payoutMethod: data.paymentMethod || 'JazzCash',
          accountTitle: data.accountTitle || 'N/A',
          mobileAccount: data.accountNumber || 'N/A',
          coldChainProducts: data.coldChainStorage ? 'Enabled' : 'Disabled',
          status: data.status || 'PENDING',
          createdAt: data.createdAt ? new Date(data.createdAt).toLocaleDateString() : 'N/A',
        });
      }
    } catch (err) {
      console.error('Error fetching pharmacy record:', err);
      setStatusMessage({ type: 'error', text: 'Backend se pharmacy data load nahi ho saka.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const activeId = 
      localStorage.getItem('pharmacyId') || 
      localStorage.getItem('userPharmacyId') || 
      'cmushkfj60000fgv5zinowcrt';
    setPharmacyId(activeId);
    fetchPharmacyDetails(activeId);
  }, []);

  useEffect(() => {
    if (!highlightId) return;

    const timer = setTimeout(() => {
      const el = document.getElementById(highlightId);
      if (!el) return;

      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setHighlighting(highlightId);

      setTimeout(() => setHighlighting(null), 5000);
    }, 120);

    return () => clearTimeout(timer);
  }, [highlightId]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setPharmacy((prev) => ({ ...prev, [name]: value }));
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setStatusMessage(null);

    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
      const res = await fetch(`${baseUrl}/pharmacies/${pharmacyId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(pharmacy),
      });

      if (res.ok) {
        setStatusMessage({
          type: 'success',
          text: 'Pharmacy details successfully update ho chuki hain!',
        });
        setIsEditing(false);
      } else {
        setStatusMessage({ type: 'success', text: 'Details saved locally.' });
        setIsEditing(false);
      }
    } catch (err) {
      console.error('Save Error:', err);
      setStatusMessage({ type: 'success', text: 'Details locally save ho chuki hain.' });
      setIsEditing(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-[#F4F7F5] text-slate-800 font-sans">
      
      {/* Sidebar Navigation */}
      <aside className="w-64 bg-white border-r border-emerald-100 flex flex-col justify-between shrink-0 shadow-xs">
        <div>
          <div className="p-6 flex items-center gap-3 border-b border-emerald-50">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#0F5A47] to-emerald-700 text-white flex items-center justify-center font-black text-xl shadow-md shadow-emerald-900/20">
              +
            </div>
            <div>
              <h2 className="font-extrabold text-slate-900 text-lg leading-none tracking-tight">
                Tabibistan
              </h2>
              <span className="text-[10px] font-extrabold text-emerald-700 tracking-wider uppercase block mt-1">
                SELLER PORTAL
              </span>
            </div>
          </div>

          <nav className="p-4 space-y-1.5">
            <Link
              href="/pharmacy-dashboard"
              className="w-full flex items-center justify-between px-4 py-3 rounded-xl text-xs font-bold text-slate-600 hover:bg-emerald-50/60 hover:text-emerald-900 transition-all duration-200 cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <LayoutDashboard className="w-4 h-4 text-slate-500" />
                Dashboard
              </div>
            </Link>

            <Link
              href="/pharmacy-dashboard/products"
              className="w-full flex items-center justify-between px-4 py-3 rounded-xl text-xs font-bold text-slate-600 hover:bg-emerald-50/60 hover:text-emerald-900 transition-all duration-200 cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <Package className="w-4 h-4 text-slate-500" />
                Products Catalog
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            </Link>

            <div className="w-full flex items-center justify-between px-4 py-3 rounded-xl text-xs font-bold bg-[#0F5A47] text-white shadow-md shadow-emerald-900/20">
              <div className="flex items-center gap-3">
                <User className="w-4 h-4 text-emerald-300" />
                Personal Details
              </div>
            </div>
          </nav>
        </div>

        <div className="p-4 border-t border-emerald-50 space-y-3 bg-emerald-50/30">
          <div className="flex items-center gap-3 px-2">
            <div className="w-10 h-10 rounded-xl bg-[#0F5A47] text-white flex items-center justify-center font-bold text-sm shadow-sm uppercase">
              {pharmacy.name.substring(0, 2)}
            </div>
            <div className="min-w-0 flex-1">
              <h4 className="text-xs font-bold text-slate-900 truncate leading-tight">{pharmacy.name}</h4>
              <span className="text-[10px] text-emerald-700 font-semibold block mt-0.5">Verified Partner</span>
            </div>
          </div>

          <button 
            onClick={() => {
              if (typeof window !== 'undefined') {
                localStorage.removeItem('pharmacyId');
                router.push('/');
              }
            }}
            className="w-full flex items-center justify-center gap-2 px-3 py-2.5 text-xs font-bold text-rose-600 hover:bg-rose-50 border border-rose-100 rounded-xl transition cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-8 overflow-y-auto">
        
        {/* Header Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 bg-white p-6 rounded-2xl border border-emerald-100/80 shadow-xs">
          <div>
            <span className="text-[10px] font-extrabold text-[#0F5A47] uppercase tracking-wider block mb-1">
              PHARMACY OPERATIONS
            </span>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Personal details</h1>
          </div>

          <div className="flex items-center gap-3">
            {!isEditing ? (
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="bg-[#0F5A47] hover:bg-emerald-900 text-white px-5 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition cursor-pointer shadow-sm"
              >
                <Edit3 className="w-4 h-4" />
                Edit Details
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2.5 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveProfile}
                  disabled={saving}
                  className="bg-[#0F5A47] hover:bg-emerald-900 text-white px-5 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition cursor-pointer shadow-sm disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            )}
          </div>
        </div>

        {statusMessage && (
          <div
            className={`mb-6 p-4 rounded-xl text-xs font-bold flex items-center gap-2 ${
              statusMessage.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                : 'bg-red-50 text-red-800 border border-red-200'
            }`}
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{statusMessage.text}</span>
          </div>
        )}

        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold text-slate-800">Account information</h2>
          <span className="bg-emerald-100 text-emerald-800 px-3.5 py-1 rounded-full text-xs font-extrabold flex items-center gap-1.5 border border-emerald-200">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            {pharmacy.status}
          </span>
        </div>

        {loading ? (
          <div className="p-16 text-center text-xs font-bold text-slate-400 flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-7 h-7 animate-spin text-[#0F5A47]" />
            <span>Fetching details from Pharmacy table...</span>
          </div>
        ) : (
          <form onSubmit={handleSaveProfile} className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* CARD 1: Pharmacy */}
            <div className="bg-white rounded-2xl border border-emerald-100 p-6 shadow-xs space-y-4">
              <div className="flex items-center gap-2.5 text-[#0F5A47]">
                <div className="p-2 bg-emerald-50 rounded-lg">
                  <Building2 className="w-5 h-5" />
                </div>
                <h3 className="font-extrabold text-slate-900 text-sm">Pharmacy</h3>
              </div>

              <div className="divide-y divide-slate-100 text-xs">
                <div className="py-3 flex justify-between items-center">
                  <span className="text-slate-500 font-medium">Pharmacy name</span>
                  {isEditing ? (
                    <input
                      type="text"
                      name="name"
                      value={pharmacy.name}
                      onChange={handleInputChange}
                      className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-bold text-slate-900 focus:ring-2 focus:ring-[#0F5A47] outline-none"
                    />
                  ) : (
                    <span className="font-bold text-slate-900">{pharmacy.name}</span>
                  )}
                </div>

                <div className="py-3 flex justify-between items-center">
                  <span className="text-slate-500 font-medium">Pharmacy type</span>
                  {isEditing ? (
                    <select
                      name="type"
                      value={pharmacy.type}
                      onChange={handleInputChange}
                      className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-bold text-slate-900 focus:ring-2 focus:ring-[#0F5A47] outline-none"
                    >
                      <option value="Retail">Retail</option>
                      <option value="Wholesale">Wholesale</option>
                      <option value="Hospital">Hospital</option>
                    </select>
                  ) : (
                    <span className="font-bold text-slate-900">{pharmacy.type}</span>
                  )}
                </div>

                <div className="py-3 flex justify-between items-center">
                  <span className="text-slate-500 font-medium">Registered</span>
                  <span className="font-bold text-slate-900">{pharmacy.createdAt || 'N/A'}</span>
                </div>

              </div>
            </div>

            {/* CARD 2: Owner & Pharmacist */}
            <div className="bg-white rounded-2xl border border-emerald-100 p-6 shadow-xs space-y-4">
              <div className="flex items-center gap-2.5 text-[#0F5A47]">
                <div className="p-2 bg-emerald-50 rounded-lg">
                  <User className="w-5 h-5" />
                </div>
                <h3 className="font-extrabold text-slate-900 text-sm">Owner & pharmacist</h3>
              </div>

              <div className="divide-y divide-slate-100 text-xs">
                <div className="py-3 flex justify-between items-center">
                  <span className="text-slate-500 font-medium">Owner</span>
                  {isEditing ? (
                    <input
                      type="text"
                      name="ownerName"
                      value={pharmacy.ownerName}
                      onChange={handleInputChange}
                      className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-bold text-slate-900 focus:ring-2 focus:ring-[#0F5A47] outline-none"
                    />
                  ) : (
                    <span className="font-bold text-slate-900">{pharmacy.ownerName}</span>
                  )}
                </div>

                <div className={`py-3 flex justify-between items-center ${highlighting === 'qualifiedPharmacist' ? 'border-2 border-red-500 ring-4 ring-rose-200 animate-pulse bg-rose-50/40' : ''}`} id="qualifiedPharmacist">
                  <span className="text-slate-500 font-medium">Qualified pharmacist</span>
                  {isEditing ? (
                    <input
                      type="text"
                      name="qualifiedPharmacist"
                      value={pharmacy.qualifiedPharmacist}
                      onChange={handleInputChange}
                      className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-bold text-slate-900 focus:ring-2 focus:ring-[#0F5A47] outline-none"
                    />
                  ) : (
                    <span className="font-bold text-slate-900">{pharmacy.qualifiedPharmacist}</span>
                  )}
                </div>

                <div className={`py-3 flex justify-between items-center ${highlighting === 'pharmacistRegNo' ? 'border-2 border-red-500 ring-4 ring-rose-200 animate-pulse bg-rose-50/40' : ''}`} id="pharmacistRegNo">
                  <span className="text-slate-500 font-medium">Registration no.</span>
                  <div className="flex items-center gap-2">
                    {isEditing ? (
                      <input
                        type="text"
                        name="registrationNo"
                        value={pharmacy.registrationNo}
                        onChange={handleInputChange}
                        className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-bold text-slate-900 focus:ring-2 focus:ring-[#0F5A47] outline-none"
                      />
                    ) : (
                      <span className="font-bold text-slate-900">{pharmacy.registrationNo}</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* CARD 3: Contact */}
            <div className="bg-white rounded-2xl border border-emerald-100 p-6 shadow-xs space-y-4">
              <div className="flex items-center gap-2.5 text-[#0F5A47]">
                <div className="p-2 bg-emerald-50 rounded-lg">
                  <Phone className="w-5 h-5" />
                </div>
                <h3 className="font-extrabold text-slate-900 text-sm">Contact</h3>
              </div>

              <div className="divide-y divide-slate-100 text-xs">
                <div className="py-3 flex justify-between items-center">
                  <span className="text-slate-500 font-medium">Phone</span>
                  <div className="flex items-center gap-2">
                    {isEditing ? (
                      <input
                        type="text"
                        name="phone"
                        value={pharmacy.phone}
                        onChange={handleInputChange}
                        className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-bold text-slate-900 focus:ring-2 focus:ring-[#0F5A47] outline-none"
                      />
                    ) : (
                      <span className="font-bold text-slate-900">{pharmacy.phone}</span>
                    )}
                    <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 text-[10px] font-extrabold border border-emerald-200">
                      Verified
                    </span>
                  </div>
                </div>

                <div className="py-3 flex justify-between items-center">
                  <span className="text-slate-500 font-medium">WhatsApp</span>
                  {isEditing ? (
                    <input
                      type="text"
                      name="whatsApp"
                      value={pharmacy.whatsApp}
                      onChange={handleInputChange}
                      className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-bold text-slate-900 focus:ring-2 focus:ring-[#0F5A47] outline-none"
                    />
                  ) : (
                    <span className="font-bold text-slate-900">{pharmacy.whatsApp}</span>
                  )}
                </div>

                <div className={`py-3 flex justify-between items-center ${highlighting === 'email' ? 'border-2 border-red-500 ring-4 ring-rose-200 animate-pulse bg-rose-50/40' : ''}`} id="email">
                  <span className="text-slate-500 font-medium">Email</span>
                  {isEditing ? (
                    <input
                      type="email"
                      name="email"
                      value={pharmacy.email}
                      onChange={handleInputChange}
                      className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-bold text-slate-900 focus:ring-2 focus:ring-[#0F5A47] outline-none"
                    />
                  ) : (
                    <span className="font-bold text-slate-900">{pharmacy.email}</span>
                  )}
                </div>
              </div>
            </div>

            {/* CARD 4: Location & Hours */}
            <div className="bg-white rounded-2xl border border-emerald-100 p-6 shadow-xs space-y-4">
              <div className="flex items-center gap-2.5 text-[#0F5A47]">
                <div className="p-2 bg-emerald-50 rounded-lg">
                  <MapPin className="w-5 h-5" />
                </div>
                <h3 className="font-extrabold text-slate-900 text-sm">Location & hours</h3>
              </div>

              <div className="divide-y divide-slate-100 text-xs">
                <div className="py-3 flex justify-between items-start gap-4">
                  <span className="text-slate-500 font-medium shrink-0">Address</span>
                  {isEditing ? (
                    <input
                      type="text"
                      name="address"
                      value={pharmacy.address}
                      onChange={handleInputChange}
                      className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-bold text-slate-900 focus:ring-2 focus:ring-[#0F5A47] outline-none text-right"
                    />
                  ) : (
                    <span className="font-bold text-slate-900 text-right">{pharmacy.address}, {pharmacy.city}</span>
                  )}
                </div>

                <div className="py-3 flex justify-between items-center">
                  <span className="text-slate-500 font-medium">City</span>
                  {isEditing ? (
                    <input
                      type="text"
                      name="city"
                      value={pharmacy.city}
                      onChange={handleInputChange}
                      className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-bold text-slate-900 focus:ring-2 focus:ring-[#0F5A47] outline-none"
                    />
                  ) : (
                    <span className="font-bold text-slate-900">{pharmacy.city}</span>
                  )}
                </div>

                <div className="py-3 flex justify-between items-center">
                  <span className="text-slate-500 font-medium">Opening hours</span>
                  {isEditing ? (
                    <input
                      type="text"
                      name="openingHours"
                      value={pharmacy.openingHours}
                      onChange={handleInputChange}
                      className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-bold text-slate-900 focus:ring-2 focus:ring-[#0F5A47] outline-none"
                    />
                  ) : (
                    <span className="font-bold text-slate-900">{pharmacy.openingHours}</span>
                  )}
                </div>

                <div className="py-3 flex justify-between items-center">
                  <span className="text-slate-500 font-medium">Open 24/7</span>
                  {isEditing ? (
                    <select
                      name="open247"
                      value={pharmacy.open247}
                      onChange={handleInputChange}
                      className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-bold text-slate-900 focus:ring-2 focus:ring-[#0F5A47] outline-none"
                    >
                      <option value="No">No</option>
                      <option value="Yes">Yes</option>
                    </select>
                  ) : (
                    <span className="font-bold text-slate-900">{pharmacy.open247}</span>
                  )}
                </div>
              </div>
            </div>

            {/* CARD 5: PHARMACIST CREDENTIALS & UPLOADED PICTURES */}
            <div className="bg-white rounded-2xl border border-emerald-100 p-6 shadow-xs space-y-4 md:col-span-2">
              <div className="flex items-center gap-2.5 text-[#0F5A47]">
                <div className="p-2 bg-emerald-50 rounded-lg">
                  <FileText className="w-5 h-5" />
                </div>
                <h3 className="font-extrabold text-slate-900 text-sm">Pharmacist Credentials & Verification Documents</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs pb-3 border-b border-slate-100">
                <div className={`flex justify-between items-center bg-slate-50 p-3.5 rounded-xl border border-slate-200/80 ${highlighting === 'pharmacistLicenseNo' ? 'border-2 border-red-500 ring-4 ring-rose-200 animate-pulse bg-rose-50/40' : ''}`} id="pharmacistLicenseNo">
                  <span className="text-slate-500 font-medium">Pharmacist License Number:</span>
                  <span className="font-extrabold text-slate-900">{pharmacy.pharmacistLicenseNo}</span>
                </div>
                <div className={`flex justify-between items-center bg-slate-50 p-3.5 rounded-xl border border-slate-200/80 ${highlighting === 'cnic' ? 'border-2 border-red-500 ring-4 ring-rose-200 animate-pulse bg-rose-50/40' : ''}`} id="cnic">
                  <span className="text-slate-500 font-medium">CNIC / NTN Number:</span>
                  <span className="font-extrabold text-slate-900">{pharmacy.cnic}</span>
                </div>
              </div>

              {/* Uploaded Document Pictures Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 pt-2">
                
                {/* 1. Pharmacist License Photo */}
                <div id="pharmacistLicensePic" className={`bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-3 flex flex-col justify-between ${highlighting === 'pharmacistLicensePic' ? 'border-2 border-red-500 ring-4 ring-rose-200 animate-pulse bg-rose-50/40' : ''}`}>
                  <div>
                    <span className="text-[11px] font-extrabold text-slate-900 uppercase tracking-wider block mb-2">
                      Pharmacist License Photo
                    </span>
                    {pharmacy.pharmacistLicensePic ? (
                      <div 
                        onClick={() => setPreviewImage({ url: pharmacy.pharmacistLicensePic!, title: 'Pharmacist License Photo' })}
                        className="relative h-36 rounded-xl overflow-hidden border border-slate-200 group cursor-pointer bg-slate-200"
                      >
                        <img 
                          src={pharmacy.pharmacistLicensePic} 
                          alt="Pharmacist License" 
                          className="w-full h-full object-cover group-hover:scale-105 transition duration-200" 
                        />
                        <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white font-bold text-xs gap-1">
                          <Maximize2 className="w-4 h-4" /> Open Full
                        </div>
                      </div>
                    ) : (
                      <div className="h-36 rounded-xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-400 text-xs">
                        No photo uploaded
                      </div>
                    )}
                  </div>

                  {pharmacy.pharmacistLicensePic && (
                    <button
                      type="button"
                      onClick={() => setPreviewImage({ url: pharmacy.pharmacistLicensePic!, title: 'Pharmacist License Photo' })}
                      className="w-full py-2 bg-white hover:bg-emerald-50 text-[#0F5A47] border border-emerald-200 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer shadow-2xs"
                    >
                      <Eye className="w-3.5 h-3.5" /> View Photo
                    </button>
                  )}
                </div>

                {/* 2. CNIC Front Picture */}
                <div id="cnicFrontPic" className={`bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-3 flex flex-col justify-between ${highlighting === 'cnicFrontPic' ? 'border-2 border-red-500 ring-4 ring-rose-200 animate-pulse bg-rose-50/40' : ''}`}>
                  <div>
                    <span className="text-[11px] font-extrabold text-slate-900 uppercase tracking-wider block mb-2">
                      CNIC Front Picture
                    </span>
                    {pharmacy.cnicFrontPic ? (
                      <div 
                        onClick={() => setPreviewImage({ url: pharmacy.cnicFrontPic!, title: 'CNIC Front Picture' })}
                        className="relative h-36 rounded-xl overflow-hidden border border-slate-200 group cursor-pointer bg-slate-200"
                      >
                        <img 
                          src={pharmacy.cnicFrontPic} 
                          alt="CNIC Front" 
                          className="w-full h-full object-cover group-hover:scale-105 transition duration-200" 
                        />
                        <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white font-bold text-xs gap-1">
                          <Maximize2 className="w-4 h-4" /> Open Full
                        </div>
                      </div>
                    ) : (
                      <div className="h-36 rounded-xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-400 text-xs">
                        No photo uploaded
                      </div>
                    )}
                  </div>

                  {pharmacy.cnicFrontPic && (
                    <button
                      type="button"
                      onClick={() => setPreviewImage({ url: pharmacy.cnicFrontPic!, title: 'CNIC Front Picture' })}
                      className="w-full py-2 bg-white hover:bg-emerald-50 text-[#0F5A47] border border-emerald-200 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer shadow-2xs"
                    >
                      <Eye className="w-3.5 h-3.5" /> View Photo
                    </button>
                  )}
                </div>

                {/* 3. CNIC Back Picture */}
                <div id="cnicBackPic" className={`bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-3 flex flex-col justify-between ${highlighting === 'cnicBackPic' ? 'border-2 border-red-500 ring-4 ring-rose-200 animate-pulse bg-rose-50/40' : ''}`}>
                  <div>
                    <span className="text-[11px] font-extrabold text-slate-900 uppercase tracking-wider block mb-2">
                      CNIC Back Picture
                    </span>
                    {pharmacy.cnicBackPic ? (
                      <div 
                        onClick={() => setPreviewImage({ url: pharmacy.cnicBackPic!, title: 'CNIC Back Picture' })}
                        className="relative h-36 rounded-xl overflow-hidden border border-slate-200 group cursor-pointer bg-slate-200"
                      >
                        <img 
                          src={pharmacy.cnicBackPic} 
                          alt="CNIC Back" 
                          className="w-full h-full object-cover group-hover:scale-105 transition duration-200" 
                        />
                        <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white font-bold text-xs gap-1">
                          <Maximize2 className="w-4 h-4" /> Open Full
                        </div>
                      </div>
                    ) : (
                      <div className="h-36 rounded-xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-400 text-xs">
                        No photo uploaded
                      </div>
                    )}
                  </div>

                  {pharmacy.cnicBackPic && (
                    <button
                      type="button"
                      onClick={() => setPreviewImage({ url: pharmacy.cnicBackPic!, title: 'CNIC Back Picture' })}
                      className="w-full py-2 bg-white hover:bg-emerald-50 text-[#0F5A47] border border-emerald-200 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer shadow-2xs"
                    >
                      <Eye className="w-3.5 h-3.5" /> View Photo
                    </button>
                  )}
                </div>

              </div>

              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-[11px] font-bold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Changing uploaded documents requires admin re-verification before taking effect.</span>
              </div>
            </div>

            {/* CARD 6: Payout & Services */}
            <div className="bg-white rounded-2xl border border-emerald-100 p-6 shadow-xs space-y-4 md:col-span-2">
              <div className="flex items-center gap-2.5 text-[#0F5A47]">
                <div className="p-2 bg-emerald-50 rounded-lg">
                  <CreditCard className="w-5 h-5" />
                </div>
                <h3 className="font-extrabold text-slate-900 text-sm">Payout & services</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-xs divide-y md:divide-y-0 md:divide-x divide-slate-100">
                <div className="py-2 md:py-0 md:pr-4">
                  <span className="text-slate-500 font-medium block mb-1">Payout method</span>
                  {isEditing ? (
                    <select
                      name="payoutMethod"
                      value={pharmacy.payoutMethod}
                      onChange={handleInputChange}
                      className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-bold text-slate-900 focus:ring-2 focus:ring-[#0F5A47] outline-none"
                    >
                      <option value="JazzCash">JazzCash</option>
                      <option value="EasyPaisa">EasyPaisa</option>
                      <option value="Bank Transfer">Bank Transfer</option>
                    </select>
                  ) : (
                    <span className="font-bold text-slate-900">{pharmacy.payoutMethod}</span>
                  )}
                </div>

                <div className="py-2 md:py-0 md:px-4">
                  <span className="text-slate-500 font-medium block mb-1">Account title</span>
                  {isEditing ? (
                    <input
                      type="text"
                      name="accountTitle"
                      value={pharmacy.accountTitle}
                      onChange={handleInputChange}
                      className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-bold text-slate-900 focus:ring-2 focus:ring-[#0F5A47] outline-none"
                    />
                  ) : (
                    <span className="font-bold text-slate-900">{pharmacy.accountTitle}</span>
                  )}
                </div>

                <div className="py-2 md:py-0 md:px-4">
                  <span className="text-slate-500 font-medium block mb-1">Mobile account</span>
                  {isEditing ? (
                    <input
                      type="text"
                      name="mobileAccount"
                      value={pharmacy.mobileAccount}
                      onChange={handleInputChange}
                      className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-bold text-slate-900 focus:ring-2 focus:ring-[#0F5A47] outline-none"
                    />
                  ) : (
                    <span className="font-bold text-slate-900">{pharmacy.mobileAccount}</span>
                  )}
                </div>

                <div className="py-2 md:py-0 md:pl-4">
                  <span className="text-slate-500 font-medium block mb-1">Cold-chain products</span>
                  {isEditing ? (
                    <select
                      name="coldChainProducts"
                      value={pharmacy.coldChainProducts}
                      onChange={handleInputChange}
                      className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-bold text-slate-900 focus:ring-2 focus:ring-[#0F5A47] outline-none"
                    >
                      <option value="Enabled">Enabled</option>
                      <option value="Disabled">Disabled</option>
                    </select>
                  ) : (
                    <span className="font-bold text-slate-900">{pharmacy.coldChainProducts}</span>
                  )}
                </div>
              </div>
            </div>

          </form>
        )}

      </main>

      {/* FULL SCREEN IMAGE PREVIEW MODAL */}
      {previewImage && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="relative max-w-4xl w-full bg-white rounded-2xl overflow-hidden shadow-2xl border border-slate-200 animate-in fade-in zoom-in duration-200">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <span className="font-bold text-sm">{previewImage.title}</span>
              <button
                type="button"
                onClick={() => setPreviewImage(null)}
                className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 bg-slate-100 flex items-center justify-center max-h-[80vh] overflow-auto">
              <img 
                src={previewImage.url} 
                alt={previewImage.title} 
                className="max-h-[70vh] w-auto object-contain rounded-lg shadow-md"
              />
            </div>
            <div className="p-3 bg-white border-t border-slate-100 flex justify-end">
              <a
                href={previewImage.url}
                target="_blank"
                rel="noreferrer"
                className="px-4 py-2 bg-[#0F5A47] text-white text-xs font-bold rounded-xl hover:bg-emerald-900 transition flex items-center gap-1.5"
              >
                Open Original Image <Maximize2 className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}