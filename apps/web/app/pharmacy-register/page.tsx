'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  Building2, 
  FileText, 
  MapPin, 
  CreditCard, 
  UploadCloud, 
  CheckCircle2, 
  Search, 
  Crosshair, 
  ShieldCheck, 
  ChevronRight, 
  ChevronLeft,
  Info,
  Loader2,
  Home,
  FileSpreadsheet,
  Check
} from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function PharmacyRegisterPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  // Auto-redirect to dashboard after successful submission
  useEffect(() => {
    if (!isSubmitted) return;
    const timer = setTimeout(() => {
      router.push('/pharmacy-dashboard');
    }, 2500);
    return () => clearTimeout(timer);
  }, [isSubmitted, router]);

  // Form State across 4 Phases
  const [formData, setFormData] = useState({
    // Phase 1: Pharmacy & Owner
    pharmacyName: '',
    ownerName: '',
    pharmacyType: 'Retail', // Retail | Hospital | Chain | Online
    pharmacistName: '',
    pharmacistRegNum: '',
    pharmacyLogo: null as File | null,
    whatsappNumber: '',

    // Phase 2: Documents
    drugLicenseNumber: '',
    drugLicensePhoto: null as File | null,
    cnicNtnNumber: '',
    cnicFrontPhoto: null as File | null,
    cnicBackPhoto: null as File | null,

    // Phase 3: Location & Hours
    city: '',
    isOpen247: false,
    fullAddress: '',
    lat: null as number | null,
    lng: null as number | null,

    // Phase 4: Payout, Products CSV & Agreement
    paymentMethod: 'JazzCash', // JazzCash | Easypaisa | Bank
    accountTitle: '',
    accountNumber: '',
    productsCsv: null as File | null, // Optional CSV
    coldChainStorage: false,
    referralCode: '',
    agreedToTerms: false,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateWhatsApp = (value: string) => {
    const digits = value.replace(/\D/g, '');
    if (digits.length === 0) return '';
    if (digits.length < 11) return 'WhatsApp number must be exactly 11 digits.';
    if (digits.length > 11) return 'WhatsApp number cannot exceed 11 digits.';
    if (!/^\d{11}$/.test(digits)) return 'WhatsApp number must contain digits only.';
    return '';
  };

  const validateCNIC = (value: string) => {
    if (!value) return '';
    if (!/^\d{5}-\d{7}-\d{1}$/.test(value)) return 'CNIC must be in format: 12345-1234567-1';
    return '';
  };

  const validatePharmacistReg = (value: string) => {
    if (!value) return '';
    if (!/^[A-Za-z]-\d{4,6}$/.test(value)) return 'Format must be like A-12345 or P-123456';
    return '';
  };

  // OpenStreetMap States
  const [mapSearchQuery, setMapSearchQuery] = useState('');
  const [isSearchingMap, setIsSearchingMap] = useState(false);
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);

  // Dynamically Load Leaflet OpenStreetMap when Phase 3 is active
  useEffect(() => {
    if (currentStep !== 3) return;

    if (!document.getElementById('leaflet-css')) {
      const link = document.createElement('link');
      link.id = 'leaflet-css';
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
    }

    const initMap = () => {
      if (typeof window === 'undefined' || !(window as any).L) return;
      const L = (window as any).L;

      const mapContainer = document.getElementById('pharmacy-osm-map');
      if (!mapContainer) return;

      if ((mapContainer as any)._leaflet_id) {
        (mapContainer as any)._leaflet_id = null;
      }

      const defaultLat = formData.lat || 33.6844; // Default Islamabad
      const defaultLng = formData.lng || 73.0479;

      const map = L.map('pharmacy-osm-map').setView([defaultLat, defaultLng], 13);
      mapRef.current = map;

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap contributors',
      }).addTo(map);

      const customIcon = L.icon({
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
      });

      if (formData.lat && formData.lng) {
        markerRef.current = L.marker([formData.lat, formData.lng], { icon: customIcon }).addTo(map);
      }

      map.on('click', async (e: any) => {
        const { lat, lng } = e.latlng;
        setFormData((prev) => ({ ...prev, lat, lng }));

        if (markerRef.current) {
          markerRef.current.setLatLng([lat, lng]);
        } else {
          markerRef.current = L.marker([lat, lng], { icon: customIcon }).addTo(map);
        }

        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
          if (res.ok) {
            const data = await res.json();
            if (data && data.display_name) {
              setFormData((prev) => ({ ...prev, fullAddress: data.display_name }));
            }
          }
        } catch (err) {
          console.error('Reverse Geocode Error:', err);
        }
      });
    };

    if ((window as any).L) {
      initMap();
    } else {
      const script = document.createElement('script');
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      script.onload = () => initMap();
      document.body.appendChild(script);
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        markerRef.current = null;
      }
    };
  }, [currentStep]);

  // OpenStreetMap Search Handler
  const handleMapSearch = async () => {
    if (!mapSearchQuery.trim()) return;
    setIsSearchingMap(true);
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(mapSearchQuery)}&countrycodes=pk`);
      if (res.ok) {
        const data = await res.json();
        if (data && data.length > 0) {
          const first = data[0];
          const lat = parseFloat(first.lat);
          const lng = parseFloat(first.lon);

          setFormData((prev) => ({
            ...prev,
            lat,
            lng,
            fullAddress: first.display_name,
          }));

          if (mapRef.current && (window as any).L) {
            const L = (window as any).L;
            mapRef.current.setView([lat, lng], 16);

            const customIcon = L.icon({
              iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
              iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
              shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
              iconSize: [25, 41],
              iconAnchor: [12, 41],
            });

            if (markerRef.current) {
              markerRef.current.setLatLng([lat, lng]);
            } else {
              markerRef.current = L.marker([lat, lng], { icon: customIcon }).addTo(mapRef.current);
            }
          }
        } else {
          alert('Address nahi mila. Mazaid wazeh search karein.');
        }
      }
    } catch (err) {
      console.error('Map Search Error:', err);
    } finally {
      setIsSearchingMap(false);
    }
  };

  // Get User GPS Location
  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert('Aapke browser mein Geolocation support nahi hai.');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setFormData((prev) => ({ ...prev, lat, lng }));

        if (mapRef.current && (window as any).L) {
          const L = (window as any).L;
          mapRef.current.setView([lat, lng], 16);

          const customIcon = L.icon({
            iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
            iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
            shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
            iconSize: [25, 41],
            iconAnchor: [12, 41],
          });

          if (markerRef.current) {
            markerRef.current.setLatLng([lat, lng]);
          } else {
            markerRef.current = L.marker([lat, lng], { icon: customIcon }).addTo(mapRef.current);
          }
        }

        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
          if (res.ok) {
            const data = await res.json();
            if (data && data.display_name) {
              setFormData((prev) => ({ ...prev, fullAddress: data.display_name }));
            }
          }
        } catch (err) {
          console.error(err);
        }
      },
      () => {
        alert('Location access permission denied.');
      }
    );
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData((prev) => ({ ...prev, [name]: checked }));
    } else {
      setFormData((prev) => {
        const next = { ...prev, [name]: value };
        if (name === 'whatsappNumber') {
          const digits = value.replace(/\D/g, '').slice(0, 11);
          setErrors((prev) => ({ ...prev, whatsappNumber: validateWhatsApp(digits) }));
          return { ...next, whatsappNumber: digits };
        }
        if (name === 'cnicNtnNumber') {
          const formatted = value.replace(/[^\d-]/g, '').slice(0, 15);
          setErrors((prev) => ({ ...prev, cnicNtnNumber: validateCNIC(formatted) }));
          return { ...next, cnicNtnNumber: formatted };
        }
        if (name === 'pharmacistRegNum') {
          const formatted = value.replace(/[^A-Za-z0-9-]/g, '').slice(0, 8);
          setErrors((prev) => ({ ...prev, pharmacistRegNum: validatePharmacistReg(formatted) }));
          return { ...next, pharmacistRegNum: formatted };
        }
        return next;
      });
    }
  };

  const handleFileChange = (field: string, file: File | null) => {
    setFormData((prev) => ({ ...prev, [field]: file }));
  };

  const getFilePreview = (file: File | null) => {
    if (!file) return null;
    return URL.createObjectURL(file);
  };

  // Phase Validation Rules
  const isPhase1Valid = () => {
    const wa = formData.whatsappNumber.replace(/\D/g, '');
    const cnic = validateCNIC(formData.cnicNtnNumber);
    const reg = validatePharmacistReg(formData.pharmacistRegNum);
    return (
      formData.pharmacyName.trim() !== '' &&
      formData.ownerName.trim() !== '' &&
      formData.pharmacyType !== '' &&
      formData.pharmacistName.trim() !== '' &&
      formData.pharmacistRegNum.trim() !== '' &&
      reg === '' &&
      (formData.whatsappNumber.trim() === '' || wa.length === 11)
    );
  };

  const isPhase2Valid = () => {
    const cnic = validateCNIC(formData.cnicNtnNumber);
    return (
      formData.drugLicenseNumber.trim() !== '' &&
      formData.drugLicensePhoto !== null &&
      formData.cnicNtnNumber.trim() !== '' &&
      cnic === '' &&
      formData.cnicFrontPhoto !== null &&
      formData.cnicBackPhoto !== null
    );
  };

  const isPhase3Valid = () => {
    return (
      formData.fullAddress.trim() !== ''
    );
  };

  const isPhase4Valid = () => {
    return (
      formData.accountTitle.trim() !== '' &&
      formData.accountNumber.trim() !== '' &&
      formData.agreedToTerms === true
    );
  };

  const canMoveToNext = () => {
    if (currentStep === 1) return isPhase1Valid();
    if (currentStep === 2) return isPhase2Valid();
    if (currentStep === 3) return isPhase3Valid();
    if (currentStep === 4) return isPhase4Valid();
    return false;
  };

  // BACKEND API SUBMISSION HANDLER WITH GUARANTEED PHONE & EMAIL MAPPING
  const handleSubmitApplication = async () => {
    const wa = formData.whatsappNumber.replace(/\D/g, '');
    const cnic = validateCNIC(formData.cnicNtnNumber);
    const reg = validatePharmacistReg(formData.pharmacistRegNum);
    const newErrors: Record<string, string> = {};
    if (reg) newErrors.pharmacistRegNum = reg;
    if (formData.whatsappNumber && wa.length !== 11) newErrors.whatsappNumber = 'WhatsApp number must be exactly 11 digits.';
    if (cnic) newErrors.cnicNtnNumber = cnic;
    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      alert('Please fix the validation errors before submitting.');
      return;
    }

    if (!isPhase4Valid()) return;
    setIsSubmitting(true);

    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
      const bodyData = new FormData();

      // Retrieve verified phone & email from localStorage saved during Auth modal step
      const savedPhone = typeof window !== 'undefined' 
        ? (sessionStorage.getItem('pharmacyPhone') || sessionStorage.getItem('verifiedPhone') || '')
        : '';
      const savedEmail = typeof window !== 'undefined' 
        ? (sessionStorage.getItem('pharmacyEmail') || '')
        : '';

      if (!savedPhone) {
        alert('Session expired or phone number missing! Kripya pehle mobile number se OTP verify karein.');
        setIsSubmitting(false);
        return;
      }

      // 👈 Send Phone & Email strictly to Backend
      bodyData.append('phone', savedPhone);
      if (savedEmail) bodyData.append('email', savedEmail);

      bodyData.append('name', formData.pharmacyName);
      bodyData.append('ownerName', formData.ownerName);
      bodyData.append('pharmacyType', formData.pharmacyType);
      bodyData.append('pharmacistName', formData.pharmacistName);
      bodyData.append('pharmacistRegNum', formData.pharmacistRegNum);
      if (formData.whatsappNumber) {
        bodyData.append('whatsappNumber', formData.whatsappNumber);
      }

      bodyData.append('drugLicenseNumber', formData.drugLicenseNumber);
      bodyData.append('cnicNtnNumber', formData.cnicNtnNumber);

      bodyData.append('city', formData.city);
      bodyData.append('address', formData.fullAddress);
      if (formData.lat !== null) bodyData.append('latitude', formData.lat.toString());
      if (formData.lng !== null) bodyData.append('longitude', formData.lng.toString());
      bodyData.append('isOpen247', String(formData.isOpen247));

      bodyData.append('paymentMethod', formData.paymentMethod);
      bodyData.append('accountTitle', formData.accountTitle);
      bodyData.append('accountNumber', formData.accountNumber);
      bodyData.append('coldChainStorage', String(formData.coldChainStorage));
      if (formData.referralCode) bodyData.append('referralCode', formData.referralCode);
      bodyData.append('agreedToTerms', String(formData.agreedToTerms));

      // Append Document Files
      if (formData.pharmacyLogo) bodyData.append('logo', formData.pharmacyLogo);
      if (formData.drugLicensePhoto) bodyData.append('drugLicensePhoto', formData.drugLicensePhoto);
      if (formData.cnicFrontPhoto) bodyData.append('cnicFrontPhoto', formData.cnicFrontPhoto);
      if (formData.cnicBackPhoto) bodyData.append('cnicBackPhoto', formData.cnicBackPhoto);

      // STEP 1: Submit Main Pharmacy Registration
      const res = await fetch(`${baseUrl}/pharmacies/register`, {
        method: 'POST',
        body: bodyData,
      });

      const resData = await res.json();

      if (res.ok) {
        const createdPharmacyId = resData?.pharmacy?.id || resData?.id;

        // Save generated pharmacy ID locally for future dashboard requests
        if (createdPharmacyId && typeof window !== 'undefined') {
          sessionStorage.setItem('pharmacyId', createdPharmacyId);
        }

        // STEP 2: If CSV file is attached, upload it to pharmacy-products endpoint
        if (formData.productsCsv && createdPharmacyId) {
          try {
            const csvFormData = new FormData();
            csvFormData.append('productsCsv', formData.productsCsv);

            const csvRes = await fetch(`${baseUrl}/pharmacy-products/${createdPharmacyId}/upload-csv`, {
              method: 'POST',
              body: csvFormData,
            });

            if (!csvRes.ok) {
              console.warn('Pharmacy registered, but CSV products processing faced an issue.');
            }
          } catch (csvErr) {
            console.error('CSV Upload Error:', csvErr);
          }
        }

        setIsSubmitted(true);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        alert(resData?.message || 'Application submit karne mein masla aaya. Dobara koshish karein.');
      }
    } catch (err) {
      console.error('Pharmacy submission error:', err);
      alert('Server Error! Backend API se connect nahi ho saka.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNextStep = () => {
    if (currentStep === 4) {
      handleSubmitApplication();
    } else if (canMoveToNext() && currentStep < 4) {
      setCurrentStep((prev) => prev + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handlePrevStep = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const getCompletedFieldsCount = () => {
    let count = 0;
    if (formData.pharmacyName) count++;
    if (formData.ownerName) count++;
    if (formData.pharmacyType) count++;
    if (formData.pharmacistName) count++;
    if (formData.pharmacistRegNum) count++;
    if (formData.drugLicenseNumber) count++;
    if (formData.drugLicensePhoto) count++;
    if (formData.cnicNtnNumber) count++;
    if (formData.cnicFrontPhoto) count++;
    if (formData.cnicBackPhoto) count++;
    if (formData.fullAddress) count++;
    if (formData.paymentMethod) count++;
    if (formData.accountTitle) count++;
    if (formData.accountNumber) count++;
    if (formData.agreedToTerms) count++;
    return count;
  };

  const totalRequiredFields = 15;
  const completedFields = getCompletedFieldsCount();
  const progressPercentage = Math.round((completedFields / totalRequiredFields) * 100);

  // SUCCESS SUBMISSION VIEW
  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-[#F4F7FB] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-3xl border border-slate-200 p-8 text-center shadow-xl space-y-6">
          <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
            <CheckCircle2 className="w-10 h-10" />
          </div>

          <div>
            <h2 className="text-xl font-black text-slate-900">Application Submitted!</h2>
            <p className="text-xs text-slate-500 mt-2 leading-relaxed">
              Your pharmacy registration request has been submitted successfully. The Tabibistan Admin team will verify the documents and activate your account.
            </p>
          </div>

          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 text-left text-xs space-y-1.5">
            <p className="font-bold text-slate-700">Pharmacy: {formData.pharmacyName}</p>
            <p className="text-slate-500">Owner: {formData.ownerName}</p>
            {formData.productsCsv && (
              <p className="text-blue-600 font-semibold">Products CSV: Uploaded & Processed ({formData.productsCsv.name})</p>
            )}
            <p className="text-emerald-600 font-semibold pt-1">Status: Under Verification (PENDING)</p>
          </div>

          {/* Auto-redirect notice */}
          <div className="flex items-center justify-center gap-2 text-xs text-slate-500 font-medium">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-500" />
            Redirecting to your dashboard automatically...
          </div>

          <button
            onClick={() => router.push('/pharmacy-dashboard')}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition flex items-center justify-center gap-2 shadow-md cursor-pointer"
          >
            <Home className="w-4 h-4" />
            Go to Pharmacy Dashboard Now
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F4F7FB] text-slate-800 font-sans pb-24">
      {/* Top Application Progress Banner */}
      <div className="bg-white border-b border-slate-200 py-4 px-4 sm:px-8 sticky top-0 z-30 shadow-2xs">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-blue-600 block">
              YOUR APPLICATION
            </span>
            <h1 className="text-sm font-bold text-slate-900">
              Phase {currentStep} of 4 - {
                currentStep === 1 ? 'Pharmacy & Owner' :
                currentStep === 2 ? 'Documents' :
                currentStep === 3 ? 'Location & Hours' : 'Payout & Agreement'
              }
            </h1>
          </div>
          <span className="text-xs font-semibold text-slate-500">
            {currentStep - 1} of 4 phases complete
          </span>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 pt-6 space-y-6">
        {/* Stepper Card */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-6 shadow-2xs">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className={`flex items-center gap-3 p-3 rounded-xl border transition ${
              currentStep === 1 ? 'bg-blue-50/80 border-blue-200' :
              currentStep > 1 ? 'bg-emerald-50/50 border-emerald-200' : 'bg-slate-50 border-slate-100'
            }`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                currentStep === 1 ? 'bg-blue-600 text-white' :
                currentStep > 1 ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-600'
              }`}>
                {currentStep > 1 ? <CheckCircle2 className="w-4 h-4" /> : '01'}
              </div>
              <div className="min-w-0">
                <span className="text-[10px] font-bold uppercase text-slate-400 block">PHASE 01</span>
                <span className="text-xs font-bold text-slate-800 truncate block">Pharmacy & Owner</span>
              </div>
            </div>

            <div className={`flex items-center gap-3 p-3 rounded-xl border transition ${
              currentStep === 2 ? 'bg-blue-50/80 border-blue-200' :
              currentStep > 2 ? 'bg-emerald-50/50 border-emerald-200' : 'bg-slate-50 border-slate-100'
            }`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                currentStep === 2 ? 'bg-blue-600 text-white' :
                currentStep > 2 ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-600'
              }`}>
                {currentStep > 2 ? <CheckCircle2 className="w-4 h-4" /> : '02'}
              </div>
              <div className="min-w-0">
                <span className="text-[10px] font-bold uppercase text-slate-400 block">PHASE 02</span>
                <span className="text-xs font-bold text-slate-800 truncate block">Documents</span>
              </div>
            </div>

            <div className={`flex items-center gap-3 p-3 rounded-xl border transition ${
              currentStep === 3 ? 'bg-blue-50/80 border-blue-200' :
              currentStep > 3 ? 'bg-emerald-50/50 border-emerald-200' : 'bg-slate-50 border-slate-100'
            }`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                currentStep === 3 ? 'bg-blue-600 text-white' :
                currentStep > 3 ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-600'
              }`}>
                {currentStep > 3 ? <CheckCircle2 className="w-4 h-4" /> : '03'}
              </div>
              <div className="min-w-0">
                <span className="text-[10px] font-bold uppercase text-slate-400 block">PHASE 03</span>
                <span className="text-xs font-bold text-slate-800 truncate block">Location & Hours</span>
              </div>
            </div>

            <div className={`flex items-center gap-3 p-3 rounded-xl border transition ${
              currentStep === 4 ? 'bg-blue-50/80 border-blue-200' : 'bg-slate-50 border-slate-100'
            }`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                currentStep === 4 ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-600'
              }`}>
                04
              </div>
              <div className="min-w-0">
                <span className="text-[10px] font-bold uppercase text-slate-400 block">PHASE 04</span>
                <span className="text-xs font-bold text-slate-800 truncate block">Payout & Agreement</span>
              </div>
            </div>
          </div>
        </div>

        {/* Phase 1: Pharmacy & Owner */}
        {currentStep === 1 && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-6">
            <div className="flex items-start gap-3 border-b border-slate-100 pb-5">
              <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-blue-600">STEP 01</span>
                <h2 className="text-base font-bold text-slate-900">Pharmacy and Owner</h2>
                <p className="text-xs text-slate-500 mt-0.5">Start with your pharmacy details and WhatsApp number.</p>
              </div>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Pharmacy Name *</label>
                <input
                  type="text"
                  name="pharmacyName"
                  value={formData.pharmacyName}
                  onChange={handleInputChange}
                  placeholder="e.g. Al-Shifa Pharmacy"
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Owner Name *</label>
                <input
                  type="text"
                  name="ownerName"
                  value={formData.ownerName}
                  onChange={handleInputChange}
                  placeholder="Full name of the owner"
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Type *</label>
                <div className="flex flex-wrap gap-2">
                  {['Retail', 'Hospital', 'Chain', 'Online'].map((typeOption) => (
                    <button
                      key={typeOption}
                      type="button"
                      onClick={() => setFormData((prev) => ({ ...prev, pharmacyType: typeOption }))}
                      className={`px-4 py-2 rounded-xl font-bold transition cursor-pointer border ${
                        formData.pharmacyType === typeOption
                          ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {typeOption}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Qualified Pharmacist Name *</label>
                <input
                  type="text"
                  name="pharmacistName"
                  value={formData.pharmacistName}
                  onChange={handleInputChange}
                  placeholder="As per registration certificate"
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Pharmacist Registration Number *</label>
                <input
                  type="text"
                  name="pharmacistRegNum"
                  value={formData.pharmacistRegNum}
                  onChange={handleInputChange}
                  placeholder="e.g. A-12345"
                  maxLength={8}
                  className={`w-full px-3.5 py-2.5 border rounded-xl bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono ${errors.pharmacistRegNum ? 'border-red-400' : 'border-slate-200'}`}
                />
                {errors.pharmacistRegNum && (
                  <p className="text-red-600 text-[11px] mt-1 font-medium">{errors.pharmacistRegNum}</p>
                )}
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="font-bold text-slate-700">Pharmacy Logo</label>
                  <span className="text-[11px] text-slate-400">Optional</span>
                </div>
                {formData.pharmacyLogo ? (
                  <div className="flex items-center gap-3 p-3 border border-slate-200 rounded-xl bg-slate-50">
                    <img
                      src={getFilePreview(formData.pharmacyLogo) || ''}
                      alt="Logo preview"
                      className="w-16 h-16 object-cover rounded-lg border border-slate-200"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-slate-700 truncate">{formData.pharmacyLogo.name}</p>
                      <p className="text-[10px] text-slate-400">{(formData.pharmacyLogo.size / 1024).toFixed(1)} KB</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleFileChange('pharmacyLogo', null)}
                      className="text-red-600 hover:text-red-700 text-xs font-bold px-2 py-1"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <label className="border-2 border-dashed border-blue-200 hover:border-blue-400 bg-blue-50/20 rounded-2xl p-6 text-center block cursor-pointer transition">
                    <UploadCloud className="w-6 h-6 text-blue-500 mx-auto mb-2" />
                    <span className="text-xs font-bold text-blue-600 block">Tap to upload logo</span>
                    <span className="text-[10px] text-slate-400 block mt-0.5">PNG, JPG, PDF - Max 5 MB</span>
                    <input
                      type="file"
                      accept="image/*,.pdf"
                      className="hidden"
                      onChange={(e) => handleFileChange('pharmacyLogo', e.target.files?.[0] || null)}
                    />
                  </label>
                )}
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="font-bold text-slate-700">WhatsApp Number</label>
                  <span className="text-[11px] text-slate-400 font-normal">Optional</span>
                </div>
                <input
                  type="text"
                  name="whatsappNumber"
                  value={formData.whatsappNumber}
                  onChange={handleInputChange}
                  placeholder="03001234567"
                  maxLength={11}
                  className={`w-full px-3.5 py-2.5 border rounded-xl bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.whatsappNumber ? 'border-red-400' : 'border-slate-200'}`}
                />
                {errors.whatsappNumber && (
                  <p className="text-red-600 text-[11px] mt-1 font-medium">{errors.whatsappNumber}</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Phase 2: Documents */}
        {currentStep === 2 && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-6">
            <div className="flex items-start gap-3 border-b border-slate-100 pb-5">
              <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-blue-600">STEP 02</span>
                <h2 className="text-base font-bold text-slate-900">Documents</h2>
                <p className="text-xs text-slate-500 mt-0.5">Upload your license and both sides of your CNIC.</p>
              </div>
            </div>

            <div className="space-y-5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Pharmacist License Number *</label>
                <input
                  type="text"
                  name="drugLicenseNumber"
                  value={formData.drugLicenseNumber}
                  onChange={handleInputChange}
                  placeholder="Enter license number"
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Pharmacist License Photo *</label>
                {formData.drugLicensePhoto ? (
                  <div className="flex items-center gap-3 p-3 border border-slate-200 rounded-xl bg-slate-50">
                    <img
                      src={getFilePreview(formData.drugLicensePhoto) || ''}
                      alt="License preview"
                      className="w-16 h-16 object-cover rounded-lg border border-slate-200"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-slate-700 truncate">{formData.drugLicensePhoto.name}</p>
                      <p className="text-[10px] text-slate-400">{(formData.drugLicensePhoto.size / 1024).toFixed(1)} KB</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleFileChange('drugLicensePhoto', null)}
                      className="text-red-600 hover:text-red-700 text-xs font-bold px-2 py-1"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <label className="border-2 border-dashed border-blue-200 hover:border-blue-400 bg-blue-50/20 rounded-2xl p-6 text-center block cursor-pointer transition">
                    <UploadCloud className="w-6 h-6 text-blue-500 mx-auto mb-2" />
                    <span className="text-xs font-bold text-blue-600 block">Tap to upload document</span>
                    <span className="text-[10px] text-slate-400 block mt-0.5">PNG, JPG, PDF - Max 5 MB</span>
                    <input
                      type="file"
                      accept="image/*,.pdf"
                      className="hidden"
                      onChange={(e) => handleFileChange('drugLicensePhoto', e.target.files?.[0] || null)}
                    />
                  </label>
                )}
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">CNIC / NTN Number *</label>
                <input
                  type="text"
                  name="cnicNtnNumber"
                  value={formData.cnicNtnNumber}
                  onChange={handleInputChange}
                  placeholder="37201-1234567-1"
                  maxLength={15}
                  className={`w-full px-3.5 py-2.5 border rounded-xl bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono ${errors.cnicNtnNumber ? 'border-red-400' : 'border-slate-200'}`}
                />
                {errors.cnicNtnNumber && (
                  <p className="text-red-600 text-[11px] mt-1 font-medium">{errors.cnicNtnNumber}</p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">CNIC Front Side Photo *</label>
                  {formData.cnicFrontPhoto ? (
                    <div className="flex items-center gap-3 p-3 border border-slate-200 rounded-xl bg-slate-50">
                      <img
                        src={getFilePreview(formData.cnicFrontPhoto) || ''}
                        alt="CNIC front preview"
                        className="w-16 h-16 object-cover rounded-lg border border-slate-200"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-slate-700 truncate">{formData.cnicFrontPhoto.name}</p>
                        <p className="text-[10px] text-slate-400">{(formData.cnicFrontPhoto.size / 1024).toFixed(1)} KB</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleFileChange('cnicFrontPhoto', null)}
                        className="text-red-600 hover:text-red-700 text-xs font-bold px-2 py-1"
                      >
                        Remove
                      </button>
                    </div>
                  ) : (
                    <label className="border-2 border-dashed border-blue-200 hover:border-blue-400 bg-blue-50/20 rounded-2xl p-5 text-center block cursor-pointer transition">
                      <UploadCloud className="w-5 h-5 text-blue-500 mx-auto mb-1.5" />
                      <span className="text-xs font-bold text-blue-600 block">Tap to upload document</span>
                      <span className="text-[10px] text-slate-400 block mt-0.5">PNG, JPG, PDF - Max 5 MB</span>
                      <input
                        type="file"
                        accept="image/*,.pdf"
                        className="hidden"
                        onChange={(e) => handleFileChange('cnicFrontPhoto', e.target.files?.[0] || null)}
                      />
                    </label>
                  )}
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">CNIC Back Side Photo *</label>
                  {formData.cnicBackPhoto ? (
                    <div className="flex items-center gap-3 p-3 border border-slate-200 rounded-xl bg-slate-50">
                      <img
                        src={getFilePreview(formData.cnicBackPhoto) || ''}
                        alt="CNIC back preview"
                        className="w-16 h-16 object-cover rounded-lg border border-slate-200"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-slate-700 truncate">{formData.cnicBackPhoto.name}</p>
                        <p className="text-[10px] text-slate-400">{(formData.cnicBackPhoto.size / 1024).toFixed(1)} KB</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleFileChange('cnicBackPhoto', null)}
                        className="text-red-600 hover:text-red-700 text-xs font-bold px-2 py-1"
                      >
                        Remove
                      </button>
                    </div>
                  ) : (
                    <label className="border-2 border-dashed border-blue-200 hover:border-blue-400 bg-blue-50/20 rounded-2xl p-5 text-center block cursor-pointer transition">
                      <UploadCloud className="w-5 h-5 text-blue-500 mx-auto mb-1.5" />
                      <span className="text-xs font-bold text-blue-600 block">Tap to upload document</span>
                      <span className="text-[10px] text-slate-400 block mt-0.5">PNG, JPG, PDF - Max 5 MB</span>
                      <input
                        type="file"
                        accept="image/*,.pdf"
                        className="hidden"
                        onChange={(e) => handleFileChange('cnicBackPhoto', e.target.files?.[0] || null)}
                      />
                    </label>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Phase 3: Location & Hours with Real OpenStreetMap */}
        {currentStep === 3 && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-6">
            <div className="flex items-start gap-3 border-b border-slate-100 pb-5">
              <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
                <MapPin className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-blue-600">STEP 03</span>
                <h2 className="text-base font-bold text-slate-900">Location and Hours</h2>
                <p className="text-xs text-slate-500 mt-0.5">Make it easy for patients to find you.</p>
              </div>
            </div>

            <div className="space-y-5 text-xs">
            {/* REAL OPENSTREETMAP INTERACTIVE PICKER */}
              <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50/50 space-y-3">
                <div className="flex items-center justify-between text-[11px] font-bold text-slate-600">
                  <span className="flex items-center gap-1.5 uppercase tracking-wider">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> INTERACTIVE OPENSTREETMAP PICKER
                  </span>
                  <span className="text-slate-400">Pakistan only</span>
                </div>

                <div className="relative flex items-center gap-2">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={mapSearchQuery}
                      onChange={(e) => setMapSearchQuery(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleMapSearch()}
                      placeholder="Search location on OpenStreetMap (e.g. F-7 Markaz Islamabad)"
                      className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl bg-white text-xs focus:outline-none"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleMapSearch}
                    disabled={isSearchingMap}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs transition shrink-0"
                  >
                    {isSearchingMap ? 'Searching...' : 'Search'}
                  </button>
                </div>

                <div
                  id="pharmacy-osm-map"
                  className="h-64 rounded-xl border border-slate-300 z-10 overflow-hidden shadow-2xs"
                ></div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <button
                    type="button"
                    onClick={handleUseCurrentLocation}
                    className="w-full py-2.5 px-3 bg-blue-600 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 hover:bg-blue-700 transition cursor-pointer"
                  >
                    <Crosshair className="w-3.5 h-3.5" />
                    Use Current Location (GPS)
                  </button>

                  <div className="text-[11px] text-slate-500 flex items-center justify-center px-3 py-2 bg-white rounded-xl border border-slate-200 font-mono">
                    {formData.lat && formData.lng ? (
                      <span className="text-emerald-700 font-bold">
                        📍 Pin Set: {formData.lat.toFixed(4)}, {formData.lng.toFixed(4)}
                      </span>
                    ) : (
                      <span className="text-slate-400">Tap map to set pin</span>
                    )}
                  </div>
                </div>
              </div>

              {/* 24/7 Toggle */}
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-200">
                <div>
                  <span className="font-bold text-slate-800 block">Open 24/7</span>
                  <span className="text-[11px] text-slate-500 block mt-0.5">Let patients know you&apos;re always available</span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    name="isOpen247"
                    checked={formData.isOpen247}
                    onChange={handleInputChange}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Full Address *</label>
                <input
                  type="text"
                  name="fullAddress"
                  value={formData.fullAddress}
                  onChange={handleInputChange}
                  placeholder="Street, area, city, postal code"
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>
        )}

        {/* Phase 4: Payout, Products CSV & Agreement */}
        {currentStep === 4 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Card 1: Payout Details */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-5">
              <div className="flex items-start gap-3 border-b border-slate-100 pb-4">
                <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-blue-600">STEP 04</span>
                  <h2 className="text-base font-bold text-slate-900">Payout Details</h2>
                  <p className="text-xs text-slate-500 mt-0.5">Set up how you&apos;ll receive your payments.</p>
                </div>
              </div>

              <div className="space-y-4 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Payment Method *</label>
                  <div className="flex flex-wrap gap-2">
                    {['JazzCash', 'Easypaisa', 'Bank'].map((method) => (
                      <button
                        key={method}
                        type="button"
                        onClick={() => setFormData((prev) => ({ ...prev, paymentMethod: method }))}
                        className={`px-4 py-2 rounded-xl font-bold transition cursor-pointer border ${
                          formData.paymentMethod === method
                            ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        {method}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Account Title *</label>
                  <input
                    type="text"
                    name="accountTitle"
                    value={formData.accountTitle}
                    onChange={handleInputChange}
                    placeholder="Name on the account"
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Account Number *</label>
                  <input
                    type="text"
                    name="accountNumber"
                    value={formData.accountNumber}
                    onChange={handleInputChange}
                    placeholder="Enter account or mobile number"
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                  />
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center gap-2 text-[11px] text-slate-500">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Payout information is handled with care and encryption.</span>
                </div>
              </div>
            </div>

            {/* Card 2: Storage, Products CSV & Agreement */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-5">
              <div className="flex items-start gap-3 border-b border-slate-100 pb-4">
                <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-blue-600">STEP 04</span>
                  <h2 className="text-base font-bold text-slate-900">Products Catalog & Agreement</h2>
                  <p className="text-xs text-slate-500 mt-0.5">Upload inventory CSV and complete agreement.</p>
                </div>
              </div>

              <div className="space-y-4 text-xs">
                {/* OPTIONAL PRODUCTS CSV UPLOAD FIELD */}
                <div className="p-3.5 bg-emerald-50/50 rounded-2xl border border-emerald-100 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="font-bold text-slate-800 flex items-center gap-1.5">
                      <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                      Import Products Catalog (CSV)
                    </label>
                    <span className="text-[10px] bg-emerald-100 text-emerald-700 font-extrabold px-2 py-0.5 rounded-full">
                      OPTIONAL
                    </span>
                  </div>
                  <label className="border border-dashed border-emerald-300 hover:border-emerald-500 bg-white rounded-xl p-3 text-center block cursor-pointer transition">
                    <span className="text-xs font-bold text-emerald-600 block">
                      {formData.productsCsv ? (
                        <span className="flex items-center justify-center gap-1">
                          <Check className="w-3.5 h-3.5 text-emerald-600" /> {formData.productsCsv.name}
                        </span>
                      ) : (
                        'Upload Inventory CSV File'
                      )}
                    </span>
                    <span className="text-[10px] text-slate-400 block mt-0.5">.csv format (Product, Brand, Price, Stock)</span>
                    <input
                      type="file"
                      accept=".csv,text/csv,application/vnd.ms-excel"
                      className="hidden"
                      onChange={(e) => handleFileChange('productsCsv', e.target.files?.[0] || null)}
                    />
                  </label>
                </div>

                <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
                  <div>
                    <span className="font-bold text-slate-800 block">Cold-chain storage</span>
                    <span className="text-[10px] text-slate-500 block mt-0.5">Enable only if you have cold storage.</span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      name="coldChainStorage"
                      checked={formData.coldChainStorage}
                      onChange={handleInputChange}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="font-bold text-slate-700">Referral Code</label>
                    <span className="text-[11px] text-slate-400">Optional</span>
                  </div>
                  <input
                    type="text"
                    name="referralCode"
                    value={formData.referralCode}
                    onChange={handleInputChange}
                    placeholder="Enter code if you have one"
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                  />
                </div>

                <label className="flex items-start gap-2.5 pt-2 cursor-pointer">
                  <input
                    type="checkbox"
                    name="agreedToTerms"
                    checked={formData.agreedToTerms}
                    onChange={handleInputChange}
                    className="mt-0.5 w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300"
                  />
                  <span className="text-slate-600 leading-tight">
                    I agree to the <span className="text-blue-600 font-bold hover:underline">Terms</span>, <span className="text-blue-600 font-bold hover:underline">Privacy Policy</span> and <span className="text-blue-600 font-bold hover:underline">Drug Sale Policy</span>.
                  </span>
                </label>

                <div className="p-3 bg-blue-50/70 border border-blue-100 rounded-xl flex items-start gap-2 text-[11px] text-blue-700">
                  <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                  <span>Complete the required details and we&apos;ll automatically take you to verification.</span>
                </div>
              </div>
            </div>
          </div>
        )}

        <p className="text-center text-xs text-slate-400 font-medium pt-2 flex items-center justify-center gap-1">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          Built for better healthcare access across Pakistan
        </p>
      </div>

      {/* Bottom Sticky Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 py-3 px-4 sm:px-8 z-30 shadow-lg">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-32 sm:w-48 bg-slate-100 h-2 rounded-full overflow-hidden">
              <div
                className="bg-blue-600 h-full transition-all duration-300"
                style={{ width: `${progressPercentage}%` }}
              ></div>
            </div>
            <div className="text-[11px] font-bold text-slate-700">
              <span>{progressPercentage}% complete</span>
              <span className="hidden sm:inline text-slate-400 font-normal ml-2">
                Phase {currentStep} of 4 ({totalRequiredFields - completedFields} required fields remaining)
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {currentStep > 1 && (
              <button
                type="button"
                onClick={handlePrevStep}
                disabled={isSubmitting}
                className="px-4 py-2 border border-slate-200 rounded-xl bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition flex items-center gap-1 cursor-pointer disabled:opacity-50"
              >
                <ChevronLeft className="w-4 h-4" />
                Back
              </button>
            )}

            <button
              type="button"
              onClick={handleNextStep}
              disabled={!canMoveToNext() || isSubmitting}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold rounded-xl transition flex items-center gap-1 cursor-pointer shadow-xs"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Submitting...</span>
                </>
              ) : (
                <>
                  <span>{currentStep === 4 ? 'Submit Application' : 'Continue Phase'}</span>
                  <ChevronRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
