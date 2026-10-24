'use client';

// /lab-tests/checkout?labPackageId=&selectedLabId=&selectedBranchId=
// Review of the lab cart at the chosen partner lab: fresh prices from the lab,
// branch choice, patient details, appointment schedule, and order placement.

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  AlertCircle,
  ArrowLeft,
  Building2,
  Calendar,
  CheckCircle2,
  CircleAlert,
  Clock,
  House,
  LoaderCircle,
  MapPin,
  Phone,
  Trash2,
  User,
} from 'lucide-react';
import { API_BASE, apiFileUrl, formatKm, formatPkr, getLabsForTestApi, type LabPartner } from '@/app/lib/api/lab-tests';
import { readPatientSession } from '@/app/lib/patient-session';
import { useLabCart } from './lab-cart';
import { checkoutHref } from './SelectLabModal';

const COORDS_KEY = 'tabibistan_user_coords';
const readCoords = () => {
  try {
    const v = JSON.parse(sessionStorage.getItem(COORDS_KEY) ?? 'null');
    return v && typeof v.lat === 'number' ? (v as { lat: number; lng: number }) : null;
  } catch {
    return null;
  }
};

type Fresh = Record<string, LabPartner | null>;

const TIME_SLOTS = [
  '07:00 AM - 09:00 AM (Fasting)',
  '09:00 AM - 11:00 AM',
  '11:00 AM - 01:00 PM',
  '02:00 PM - 04:00 PM',
  '04:00 PM - 06:00 PM',
];

export default function LabCheckout() {
  const router = useRouter();
  const params = useSearchParams();
  const cart = useLabCart();
  const labId = params.get('selectedLabId') ?? '';
  const focusId = params.get('labPackageId') ?? '';
  const branchParam = params.get('selectedBranchId') ?? '';

  const items = useMemo(() => cart.items.filter((x) => x.laboratoryId === labId), [cart.items, labId]);
  const itemKey = items.map((x) => x.id).join(',');
  const [fresh, setFresh] = useState<Fresh | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [collection, setCollection] = useState<'home' | 'branch'>('home');

  // Form Fields State
  const [patientName, setPatientName] = useState('');
  const [patientPhone, setPatientPhone] = useState('');
  const [patientAge, setPatientAge] = useState('');
  const [patientGender, setPatientGender] = useState<'MALE' | 'FEMALE' | 'OTHER' | ''>('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('Rawalpindi/Islamabad');
  const [scheduledDate, setScheduledDate] = useState(() => {
    // Default scheduled date = tomorrow
    const d = new Date(Date.now() + 86400000);
    return d.toISOString().split('T')[0];
  });
  const [timeSlot, setTimeSlot] = useState(TIME_SLOTS[0]);
  const [specialInstructions, setSpecialInstructions] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('CASH_ON_COLLECTION');

  // Order Submission State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Autofill user details from existing patient session / storage
  useEffect(() => {
    const session = readPatientSession();
    if (session) {
      if (session.name && session.name !== 'You') setPatientName(session.name);
      if (session.phone) setPatientPhone(session.phone);
    }
    try {
      const savedAddress = sessionStorage.getItem('tabibistan_user_address') || localStorage.getItem('user_address');
      if (savedAddress) setAddress(savedAddress);
    } catch {
      // ignore
    }
  }, []);

  // Latest price and details of each item at this lab
  useEffect(() => {
    if (!itemKey) return;
    let cancelled = false;
    setError(null);
    const coords = readCoords();
    Promise.all(
      itemKey.split(',').map((id) =>
        getLabsForTestApi(id, coords)
          .then((r) => [id, r.data.find((p) => p.laboratoryId === labId) ?? null] as const)
          .catch(() => [id, undefined] as const),
      ),
    ).then((rows) => {
      if (cancelled) return;
      if (rows.some(([, p]) => p === undefined))
        setError('Could not refresh the latest prices. The prices below are from when you chose the lab.');
      const next: Fresh = {};
      rows.forEach(([id, p]) => {
        if (p !== undefined) next[id] = p;
      });
      setFresh(next);
      // keep the cart in line with the lab's current prices
      cart.update((x) => {
        const p = next[x.id];
        return x.laboratoryId === labId && p
          ? {
              ...x,
              price: p.offeredPrice,
              mrp: p.originalPrice,
              hasHomeSample: p.hasHomeSample,
              homeSampleFee: p.homeSampleFee,
              labName: p.labName,
            }
          : x;
      });
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemKey, labId]);

  const lab = fresh ? Object.values(fresh).find((p): p is LabPartner => Boolean(p)) ?? null : null;
  const branches = lab?.branches ?? [];
  const branch =
    branches.find((b) => b.id === branchParam) ??
    branches.find((b) => b.id === items[0]?.branchId) ??
    branches[0] ??
    null;
  const homeAvailable = lab ? lab.hasHomeSample : items[0]?.hasHomeSample ?? false;
  const mode = homeAvailable ? collection : 'branch';
  const unavailable = items.filter((x) => fresh && fresh[x.id] === null);
  const bookable = items.filter((x) => !(fresh && fresh[x.id] === null));
  const subtotal = bookable.reduce((n, x) => n + x.price, 0);
  const savings = bookable.reduce((n, x) => n + Math.max(0, x.mrp - x.price), 0);
  const homeFee = mode === 'home' ? Math.round(lab?.homeSampleFee ?? items[0]?.homeSampleFee ?? 0) : 0;
  const total = subtotal + homeFee;

  const chooseBranch = (id: string) => {
    const b = branches.find((x) => x.id === id);
    if (!b) return;
    cart.update((x) => (x.laboratoryId === labId ? { ...x, branchId: b.id, branchName: b.name } : x));
    router.replace(checkoutHref(focusId || items[0]?.id || '', labId, b.id), { scroll: false });
  };

  // Validation: Check that required fields are present
  const isAddressValid = mode === 'branch' || address.trim().length > 0;
  const isFormValid =
    patientName.trim().length > 0 &&
    patientPhone.trim().length >= 10 &&
    isAddressValid &&
    Boolean(scheduledDate) &&
    Boolean(timeSlot) &&
    Boolean(labId) &&
    bookable.length > 0 &&
    unavailable.length === 0;

  // Order Placement Submit Handler
  const handleConfirmBooking = async () => {
    if (!isFormValid || isSubmitting) return;

    try {
      setIsSubmitting(true);
      setSubmitError(null);

      const session = readPatientSession();
      const coords = readCoords();

      const finalAddress =
        mode === 'home'
          ? address.trim()
          : branch
            ? `${branch.name}, ${branch.address}`
            : 'At Partner Laboratory';

      const payload = {
        userId: session?.id || undefined,
        laboratoryId: labId,
        collectionType: mode === 'home' ? 'HOME_COLLECTION' : 'LAB_WALK_IN',
        scheduledDate,
        timeSlot,
        patientName: patientName.trim(),
        patientPhone: patientPhone.trim(),
        patientAge: patientAge ? parseInt(patientAge, 10) : undefined,
        patientGender: patientGender || undefined,
        address: finalAddress,
        city: city.trim() || 'Rawalpindi/Islamabad',
        latitude: coords?.lat,
        longitude: coords?.lng,
        specialInstructions: specialInstructions.trim() || undefined,
        paymentMethod: paymentMethod || 'CASH_ON_COLLECTION',
        homeSampleFee: homeFee,
        discount: savings,
        totalAmount: total,
        items: bookable.map((item) => ({
          labPackageId: item.id,
          itemTitle: item.title,
          itemType: item.itemType || 'INDIVIDUAL_TEST',
          price: item.price,
        })),
      };

      // Call order creation endpoint
      let res = await fetch(`${API_BASE}/labs/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        res = await fetch(`${API_BASE}/orders/lab-orders`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }

      if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        throw new Error(errorData?.message || 'Failed to place booking. Please check all details and try again.');
      }

      const orderData = await res.json();

      // Clear lab cart items on success
      cart.clear();

      // Redirect to Order tracking / details view
      const targetId = orderData?.id || orderData?.orderNumber;
      if (targetId) {
        router.push(`/orders/${targetId}`);
      } else {
        router.push('/my-orders');
      }
    } catch (err: any) {
      console.error('Lab booking error:', err);
      setSubmitError(err.message || 'Something went wrong while confirming your booking. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (items.length === 0) {
    return (
      <div className="mx-auto w-full max-w-xl px-4 py-16 text-center">
        <h1 className="text-xl font-bold text-gray-900">Your lab cart is empty</h1>
        <p className="mt-1 text-sm text-gray-600">Choose a test or health package and select a lab to continue.</p>
        <Link
          href="/lab-tests"
          className="mt-5 inline-flex items-center gap-1.5 rounded-xl bg-[#ff574d] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#e8453b]"
        >
          <ArrowLeft className="h-4 w-4" /> Browse lab tests
        </Link>
      </div>
    );
  }

  const logo = apiFileUrl(lab?.logoUrl);

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
      <Link
        href="/lab-tests"
        className="inline-flex items-center gap-1 text-xs font-semibold text-gray-600 hover:text-[#ff574d]"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Continue browsing
      </Link>
      <h1 className="mt-2 text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">Checkout</h1>

      {submitError && (
        <div className="mt-4 flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs font-medium text-rose-800">
          <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
          <span>{submitError}</span>
        </div>
      )}

      <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0 space-y-5">
          {/* Lab & Branch Selection */}
          <section className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-5" aria-labelledby="lab-title">
            <div className="flex items-center gap-3">
              {logo ? (
                <img src={logo} alt="" className="h-12 w-12 rounded-xl border border-gray-100 object-contain p-0.5" />
              ) : (
                <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#fff1ef] text-lg font-bold text-[#d9443b]">
                  {items[0].labName.charAt(0).toUpperCase()}
                </span>
              )}
              <div className="min-w-0">
                <p className="text-xs text-gray-500">Diagnostic partner</p>
                <h2 id="lab-title" className="text-base font-bold text-gray-900">
                  {lab?.labName ?? items[0].labName}
                </h2>
              </div>
            </div>

            {!fresh ? (
              <p className="mt-4 flex items-center gap-2 text-sm text-gray-500">
                <LoaderCircle className="h-4 w-4 animate-spin text-[#ff574d]" /> Checking the latest prices…
              </p>
            ) : (
              <>
                {branches.length > 0 && (
                  <fieldset className="mt-4">
                    <legend className="mb-2 text-sm font-semibold text-gray-900">Branch</legend>
                    <div className="space-y-2">
                      {branches.map((b) => (
                        <label
                          key={b.id}
                          className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 ${
                            branch?.id === b.id ? 'border-[#ff574d] bg-[#fff6f5]' : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <input
                            type="radio"
                            name="branch"
                            checked={branch?.id === b.id}
                            onChange={() => chooseBranch(b.id)}
                            className="mt-1 accent-[#ff574d]"
                          />
                          <span className="min-w-0 text-sm">
                            <span className="font-semibold text-gray-900">{b.name}</span>
                            {b.distanceKm != null && (
                              <span className="text-gray-500"> · {formatKm(b.distanceKm)} away</span>
                            )}
                            <span className="mt-0.5 flex items-start gap-1 text-xs text-gray-600">
                              <MapPin className="mt-0.5 h-3 w-3 shrink-0 text-gray-400" /> {b.address}
                            </span>
                          </span>
                        </label>
                      ))}
                    </div>
                  </fieldset>
                )}

                <fieldset className="mt-5">
                  <legend className="mb-2 text-sm font-semibold text-gray-900">Sample collection</legend>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <label
                      className={`flex items-start gap-3 rounded-xl border p-3 ${
                        !homeAvailable ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'
                      } ${mode === 'home' ? 'border-[#ff574d] bg-[#fff6f5]' : 'border-gray-200'}`}
                    >
                      <input
                        type="radio"
                        name="collection"
                        disabled={!homeAvailable}
                        checked={mode === 'home'}
                        onChange={() => setCollection('home')}
                        className="mt-1 accent-[#ff574d]"
                      />
                      <span className="text-sm">
                        <span className="flex items-center gap-1.5 font-semibold text-gray-900">
                          <House className="h-4 w-4 text-[#ff574d]" /> Home sample collection
                        </span>
                        <span className="text-xs text-gray-600">
                          {homeAvailable
                            ? homeFee || lab?.homeSampleFee
                              ? `${formatPkr(lab?.homeSampleFee ?? 0)} collection fee`
                              : 'Free'
                            : 'Not offered by this lab'}
                        </span>
                      </span>
                    </label>
                    <label
                      className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 ${
                        mode === 'branch' ? 'border-[#ff574d] bg-[#fff6f5]' : 'border-gray-200'
                      }`}
                    >
                      <input
                        type="radio"
                        name="collection"
                        checked={mode === 'branch'}
                        onChange={() => setCollection('branch')}
                        className="mt-1 accent-[#ff574d]"
                      />
                      <span className="text-sm">
                        <span className="flex items-center gap-1.5 font-semibold text-gray-900">
                          <Building2 className="h-4 w-4 text-[#ff574d]" /> Visit the branch
                        </span>
                        <span className="text-xs text-gray-600">{branch ? branch.name : 'At the lab'}</span>
                      </span>
                    </label>
                  </div>
                </fieldset>
              </>
            )}
          </section>

          {/* Patient Details Section */}
          <section className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-5" aria-labelledby="patient-title">
            <h2 id="patient-title" className="mb-4 flex items-center gap-2 text-sm font-semibold text-gray-900">
              <User className="h-4 w-4 text-[#ff574d]" /> Patient Information
            </h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Patient Full Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Muhammad Ali"
                  value={patientName}
                  onChange={(e) => setPatientName(e.target.value)}
                  className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-[#ff574d] focus:outline-hidden focus:ring-1 focus:ring-[#ff574d]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Patient Phone Number <span className="text-rose-500">*</span>
                </label>
                <input
                  type="tel"
                  placeholder="e.g. 03001234567"
                  value={patientPhone}
                  onChange={(e) => setPatientPhone(e.target.value)}
                  className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-[#ff574d] focus:outline-hidden focus:ring-1 focus:ring-[#ff574d]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Age (Years)</label>
                <input
                  type="number"
                  min="1"
                  max="120"
                  placeholder="e.g. 32"
                  value={patientAge}
                  onChange={(e) => setPatientAge(e.target.value)}
                  className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-[#ff574d] focus:outline-hidden focus:ring-1 focus:ring-[#ff574d]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Gender</label>
                <select
                  value={patientGender}
                  onChange={(e) => setPatientGender(e.target.value as any)}
                  className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-[#ff574d] focus:outline-hidden focus:ring-1 focus:ring-[#ff574d]"
                >
                  <option value="">Select Gender</option>
                  <option value="MALE">Male</option>
                  <option value="FEMALE">Female</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>
            </div>
          </section>

          {/* Schedule & Timing Section */}
          <section className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-5" aria-labelledby="schedule-title">
            <h2 id="schedule-title" className="mb-4 flex items-center gap-2 text-sm font-semibold text-gray-900">
              <Calendar className="h-4 w-4 text-[#ff574d]" /> Appointment Schedule
            </h2>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Scheduled Date <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  min={new Date().toISOString().split('T')[0]}
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                  className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-[#ff574d] focus:outline-hidden focus:ring-1 focus:ring-[#ff574d]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Preferred Time Slot <span className="text-rose-500">*</span>
                </label>
                <select
                  value={timeSlot}
                  onChange={(e) => setTimeSlot(e.target.value)}
                  className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-[#ff574d] focus:outline-hidden focus:ring-1 focus:ring-[#ff574d]"
                >
                  {TIME_SLOTS.map((slot) => (
                    <option key={slot} value={slot}>
                      {slot}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </section>

          {/* Location & Address Section */}
          {mode === 'home' ? (
            <section className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-5" aria-labelledby="address-title">
              <h2 id="address-title" className="mb-4 flex items-center gap-2 text-sm font-semibold text-gray-900">
                <MapPin className="h-4 w-4 text-[#ff574d]" /> Home Sample Collection Address
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Street Address / House / Flat No. <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    rows={2}
                    placeholder="e.g. House # 12, Street 4, Sector F-7/2"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full rounded-xl border border-gray-300 p-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-[#ff574d] focus:outline-hidden focus:ring-1 focus:ring-[#ff574d]"
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">City</label>
                    <input
                      type="text"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-[#ff574d] focus:outline-hidden focus:ring-1 focus:ring-[#ff574d]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Special Instructions</label>
                    <input
                      type="text"
                      placeholder="e.g. Ring bell twice, 2nd floor"
                      value={specialInstructions}
                      onChange={(e) => setSpecialInstructions(e.target.value)}
                      className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-[#ff574d] focus:outline-hidden focus:ring-1 focus:ring-[#ff574d]"
                    />
                  </div>
                </div>
              </div>
            </section>
          ) : (
            <section className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-5" aria-labelledby="walkin-title">
              <h2 id="walkin-title" className="mb-2 flex items-center gap-2 text-sm font-semibold text-gray-900">
                <Building2 className="h-4 w-4 text-[#ff574d]" /> Walk-In Collection Location
              </h2>
              <p className="text-xs text-gray-600">
                Please visit the selected branch at your scheduled time slot:
              </p>
              <div className="mt-3 rounded-xl bg-gray-50 p-3.5 border border-gray-100 text-xs">
                <p className="font-bold text-gray-900">{branch?.name || lab?.labName}</p>
                <p className="text-gray-500 mt-0.5">{branch?.address}</p>
              </div>
            </section>
          )}

          {/* Items */}
          <section className="rounded-2xl border border-gray-200 bg-white" aria-labelledby="items-title">
            <h2 id="items-title" className="border-b border-gray-100 px-4 py-3 text-sm font-semibold text-gray-900 sm:px-5">
              Tests &amp; packages ({items.length})
            </h2>
            <ul className="divide-y divide-gray-100">
              {items.map((x) => {
                const p = fresh?.[x.id];
                const gone = fresh && p === null;
                return (
                  <li
                    key={x.id}
                    className={`flex items-start gap-3 px-4 py-3 sm:px-5 ${gone ? 'bg-rose-50/50' : ''} ${
                      x.id === focusId ? 'bg-[#fff6f5]/60' : ''
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold leading-snug text-gray-900">{x.title}</p>
                      <p className="text-xs text-gray-500">
                        {x.itemType === 'PACKAGE' ? `Health package · ${x.totalTestsCount} tests` : 'Single test'}
                      </p>
                      {p && p.unavailableTests.length > 0 && (
                        <p className="mt-1 text-xs text-amber-800">Not done at this lab: {p.unavailableTests.join(', ')}</p>
                      )}
                      {gone && (
                        <p className="mt-1 text-xs font-semibold text-rose-700">
                          This lab no longer offers this. Remove it, or choose another lab for it.
                        </p>
                      )}
                    </div>
                    {!gone && (
                      <div className="shrink-0 text-right">
                        <p className="text-sm font-bold tabular-nums text-gray-900">{formatPkr(x.price)}</p>
                        {x.mrp > x.price && (
                          <p className="text-xs tabular-nums text-gray-400 line-through">{formatPkr(x.mrp)}</p>
                        )}
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => cart.remove(x.id)}
                      aria-label={`Remove ${x.title}`}
                      className="rounded-lg p-1.5 text-gray-400 hover:bg-rose-50 hover:text-rose-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        </div>

        {/* Summary & Confirm Button */}
        <aside
          className="h-fit space-y-4 rounded-2xl border border-gray-200 bg-white p-4 sm:p-5 lg:sticky lg:top-24"
          aria-labelledby="summary-title"
        >
          <h2 id="summary-title" className="text-sm font-semibold text-gray-900">
            Order summary
          </h2>
          {error && (
            <p className="flex items-start gap-1.5 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900">
              <CircleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {error}
            </p>
          )}
          <dl className="space-y-1.5 text-sm">
            <div className="flex justify-between">
              <dt className="text-gray-600">Tests ({bookable.length})</dt>
              <dd className="tabular-nums text-gray-900">{formatPkr(subtotal + savings)}</dd>
            </div>
            {savings > 0 && (
              <div className="flex justify-between text-emerald-700">
                <dt>Lab discount</dt>
                <dd className="tabular-nums">−{formatPkr(savings)}</dd>
              </div>
            )}
            {mode === 'home' && (
              <div className="flex justify-between">
                <dt className="text-gray-600">Home collection</dt>
                <dd className="tabular-nums text-gray-900">{homeFee ? formatPkr(homeFee) : 'Free'}</dd>
              </div>
            )}
            <div className="flex justify-between border-t border-gray-100 pt-2 text-base font-bold text-gray-900">
              <dt>Total</dt>
              <dd className="tabular-nums text-[#ff574d]">{formatPkr(total)}</dd>
            </div>
          </dl>

          {/* Payment Method Notice */}
          <div className="rounded-xl bg-gray-50 p-3 text-xs text-gray-600 border border-gray-100">
            <p className="font-semibold text-gray-800">Payment: Cash on Collection</p>
            <p className="mt-0.5 text-gray-500">
              Pay upon sample collection or when you visit the laboratory branch.
            </p>
          </div>

          {unavailable.length > 0 && (
            <p className="text-xs text-rose-700">Remove the items this lab no longer offers to continue.</p>
          )}

          {/* Validation Helpers */}
          {!isFormValid && (
            <div className="space-y-1 text-xs text-amber-700 bg-amber-50/70 p-3 rounded-xl border border-amber-200">
              <p className="font-bold">Please complete to confirm:</p>
              {!patientName.trim() && <p>• Enter patient name</p>}
              {patientPhone.trim().length < 10 && <p>• Enter valid 11-digit phone number</p>}
              {mode === 'home' && !address.trim() && <p>• Enter home collection address</p>}
            </div>
          )}

          {/* CONFIRM BOOKING BUTTON */}
          <button
            type="button"
            disabled={!isFormValid || isSubmitting}
            onClick={handleConfirmBooking}
            className={`inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3.5 text-sm font-bold text-white shadow-sm transition ${
              !isFormValid || isSubmitting
                ? 'cursor-not-allowed bg-gray-300 text-gray-500'
                : 'bg-[#ff574d] hover:bg-[#e8453b] active:scale-[0.99] cursor-pointer'
            }`}
          >
            {isSubmitting ? (
              <>
                <LoaderCircle className="h-4 w-4 animate-spin" />
                <span>Confirming Booking...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4" />
                <span>Confirm Booking • {formatPkr(total)}</span>
              </>
            )}
          </button>

          <p className="text-center text-[11px] text-gray-400">
            Safe &amp; certified laboratory testing. You will receive booking updates via SMS.
          </p>
        </aside>
      </div>
    </div>
  );
}
