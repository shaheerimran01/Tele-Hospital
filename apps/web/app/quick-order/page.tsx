'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import {
  uploadPrescriptionApi,
  getUserPrescriptionsApi,
  PrescriptionResponse,
} from '@/app/lib/api/prescriptions';

export default function QuickOrderPage() {
  const router = useRouter();
  const [user, setUser] = useState<{ id: string; email?: string; name?: string } | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [pastPrescriptions, setPastPrescriptions] = useState<PrescriptionResponse[]>([]);
  const [selectedPrescriptions, setSelectedPrescriptions] = useState<PrescriptionResponse[]>([]);

  const [showPastModal, setShowPastModal] = useState<boolean>(false);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);

  // User session aur past prescriptions load karein
  useEffect(() => {
    async function loadUserAndPast() {
      try {
        const rawUser =
          localStorage.getItem('tabibistan_user') ||
          localStorage.getItem('user') ||
          localStorage.getItem('userData');

        if (rawUser) {
          const parsed = JSON.parse(rawUser);
          const actualUser = parsed.user || parsed.data?.user || parsed;
          const extractedId = actualUser?.id || actualUser?._id || actualUser?.userId;

          if (extractedId) {
            setUser({ id: extractedId, name: actualUser.name || actualUser.firstName });
            const fetched = await getUserPrescriptionsApi(extractedId, false);
            setPastPrescriptions(fetched || []);
          }
        }
      } catch (err) {
        console.error('Error loading quick order data:', err);
      } finally {
        setLoading(false);
      }
    }

    loadUserAndPast();
  }, []);

  // Direct File Upload Handler
  const handleFileUpload = async (files: FileList | File[]) => {
    if (!files || files.length === 0) return;

    if (!user?.id) {
      setUploadError('Prescription upload karne ke liye pehle Login karein.');
      return;
    }

    setIsUploading(true);
    setUploadError(null);

    try {
      const uploadPromises = Array.from(files).map((file) =>
        uploadPrescriptionApi(user.id, file)
      );

      const results = await Promise.all(uploadPromises);
      setSelectedPrescriptions((prev) => [...prev, ...results]);
    } catch (err: any) {
      console.error('Upload Error:', err);
      setUploadError(err.message || 'File upload mein masla aaya.');
    } finally {
      setIsUploading(false);
    }
  };

  // Drag and Drop Handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileUpload(e.dataTransfer.files);
    }
  };

  // Past Prescription Toggle Selection
  const togglePastPrescription = (item: PrescriptionResponse) => {
    const exists = selectedPrescriptions.some((p) => p.id === item.id);
    if (exists) {
      setSelectedPrescriptions((prev) => prev.filter((p) => p.id !== item.id));
    } else {
      setSelectedPrescriptions((prev) => [...prev, item]);
    }
  };

  const handleContinue = () => {
    if (selectedPrescriptions.length === 0) return;
    // Checkout page par redirect karein
    router.push('/checkout');
  };

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Header />

      <main className="flex-grow py-10 px-4 sm:px-8 max-w-[1280px] mx-auto w-full">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* LEFT COLUMN */}
          <div className="lg:col-span-8 space-y-6">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
                Upload prescriptions
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                and let us arrange your medicines for you
              </p>
            </div>

            {/* DRAG AND DROP UPLOAD BOX */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-2xl p-8 sm:p-12 text-center transition ${
                isDragging ? 'border-[#ff6f61] bg-red-50/20' : 'border-gray-300 bg-white'
              }`}
            >
              <div className="flex flex-col items-center justify-center space-y-4">
                {/* Prescription Document Icon */}
                <div className="w-16 h-20 border-2 border-gray-300 rounded-lg bg-gray-50 relative flex flex-col items-center justify-center p-2 shadow-2xs">
                  <div className="text-xs font-bold text-gray-400">Rx</div>
                  <div className="w-8 h-0.5 bg-gray-300 my-1"></div>
                  <div className="w-6 h-0.5 bg-gray-300"></div>
                  <div className="absolute -bottom-2 -right-2 bg-amber-400 text-white rounded-full p-1 text-xs font-bold">
                    ⬆
                  </div>
                </div>

                <div>
                  <label className="inline-block border border-[#ff6f61] text-[#ff6f61] hover:bg-[#ff6f61] hover:text-white transition font-bold text-sm px-8 py-2.5 rounded-lg cursor-pointer">
                    {isUploading ? 'Uploading...' : 'Upload prescription'}
                    <input
                      type="file"
                      multiple
                      accept=".png,.jpg,.jpeg,.pdf"
                      disabled={isUploading}
                      onChange={(e) => e.target.files && handleFileUpload(e.target.files)}
                      className="hidden"
                    />
                  </label>
                </div>

                <p className="text-xs text-gray-500">
                  Drag files from your computer (JPG, PNG and PDF)
                </p>
              </div>
            </div>

            {uploadError && (
              <p className="text-xs font-bold text-red-600">⚠️ {uploadError}</p>
            )}

            {/* OR DIVIDER */}
            <div className="relative flex items-center justify-center my-6">
              <div className="border-t border-gray-200 w-full"></div>
              <span className="bg-white px-4 text-xs font-bold text-gray-400 uppercase absolute">
                OR
              </span>
            </div>

            {/* PAST PRESCRIPTIONS BOX */}
            <div className="border border-gray-200 rounded-xl p-5 flex items-center justify-between bg-white shadow-2xs">
              <span className="text-sm sm:text-base font-bold text-gray-800">
                Select from your past prescriptions
              </span>

              <button
                type="button"
                onClick={() => {
                  if (!user) {
                    alert('Select karne ke liye pehle login karein.');
                    return;
                  }
                  setShowPastModal(true);
                }}
                className="border border-[#ff6f61] text-[#ff6f61] hover:bg-[#ff6f61] hover:text-white transition font-bold text-xs sm:text-sm px-6 py-2 rounded-lg cursor-pointer shrink-0"
              >
                Select files
              </button>
            </div>

            {/* SELECTED FILES PREVIEW */}
            {selectedPrescriptions.length > 0 && (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl space-y-2">
                <h3 className="text-xs font-bold text-amber-900 uppercase tracking-wider">
                  Selected Prescriptions ({selectedPrescriptions.length}):
                </h3>
                <ul className="space-y-2">
                  {selectedPrescriptions.map((file) => (
                    <li
                      key={file.id}
                      className="flex items-center justify-between bg-white px-3 py-2 rounded-xl border border-amber-200 text-xs text-gray-800"
                    >
                      <span className="truncate max-w-[300px] font-medium">
                        📄 {file.fileName}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setSelectedPrescriptions((prev) =>
                            prev.filter((p) => p.id !== file.id)
                          )
                        }
                        className="text-red-500 font-bold hover:underline text-[11px]"
                      >
                        Remove
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* RIGHT COLUMN */}
          <div className="lg:col-span-4 border-t lg:border-t-0 lg:border-l border-gray-200 pt-6 lg:pt-0 lg:pl-8 space-y-6">
            <div>
              <button
                type="button"
                disabled={selectedPrescriptions.length === 0}
                onClick={handleContinue}
                className={`w-full py-3.5 rounded-lg text-sm font-bold text-white transition shadow-sm ${
                  selectedPrescriptions.length > 0
                    ? 'bg-[#ff6f61] hover:bg-[#e05b4f] cursor-pointer'
                    : 'bg-gray-300 cursor-not-allowed'
                }`}
              >
                Continue
              </button>
            </div>

            <div className="space-y-4 text-xs text-gray-600 leading-relaxed">
              <p>
                All uploads are encrypted & visible only to our pharmacists.
              </p>
              <p>
                Any prescription you upload is validated before processing the order.
              </p>

              <div>
                <a
                  href="#valid-prescription-info"
                  className="text-[#ff6f61] underline font-semibold hover:text-[#e05b4f]"
                >
                  What is a valid prescription?
                </a>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* PAST PRESCRIPTIONS SELECTION MODAL */}
      {showPastModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-sm font-bold text-gray-900 uppercase">
                Select Past Prescriptions
              </h3>
              <button
                type="button"
                onClick={() => setShowPastModal(false)}
                className="text-gray-400 hover:text-gray-600 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            {pastPrescriptions.length === 0 ? (
              <p className="text-xs text-gray-500 text-center py-6">
                Aap ki pichli koi prescription nahi mili.
              </p>
            ) : (
              <div className="max-h-60 overflow-y-auto space-y-2 pr-1 no-scrollbar">
                {pastPrescriptions.map((item) => {
                  const isSelected = selectedPrescriptions.some((p) => p.id === item.id);
                  return (
                    <div
                      key={item.id}
                      onClick={() => togglePastPrescription(item)}
                      className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition ${
                        isSelected
                          ? 'border-[#ff6f61] bg-red-50/40'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="min-w-0 pr-2">
                        <p className="text-xs font-bold text-gray-800 truncate">
                          📄 {item.fileName}
                        </p>
                        <p className="text-[10px] text-gray-400">
                          {new Date(item.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <span
                        className={`text-xs font-bold px-2.5 py-1 rounded-md ${
                          isSelected
                            ? 'bg-[#ff6f61] text-white'
                            : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {isSelected ? 'Selected ✓' : 'Select'}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="pt-2 border-t border-gray-100 flex justify-end">
              <button
                type="button"
                onClick={() => setShowPastModal(false)}
                className="bg-[#ff6f61] text-white text-xs font-bold px-6 py-2.5 rounded-xl hover:bg-[#e05b4f] cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}