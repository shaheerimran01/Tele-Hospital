'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { useCart } from '@/app/components/cart/CartContext';
import {
  analyzePrescriptionApi,
  analyzeExistingPrescriptionApi,
  getUserPrescriptionsApi,
  PrescriptionResponse,
} from '@/app/lib/api/prescriptions';

interface ExtractedMedicine {
  product: any;
  quantity: number;
  selected: boolean;
}

export default function QuickOrderPage() {
  const router = useRouter();
  const { addProductToCart } = useCart();

  const [user, setUser] = useState<{ id: string; email?: string; name?: string } | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [pastPrescriptions, setPastPrescriptions] = useState<PrescriptionResponse[]>([]);
  const [selectedPrescriptions, setSelectedPrescriptions] = useState<PrescriptionResponse[]>([]);

  // Extracted Medicines State
  const [extractedMedicines, setExtractedMedicines] = useState<ExtractedMedicine[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);

  const [showPastModal, setShowPastModal] = useState<boolean>(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);

  // User session & past prescriptions load
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
      setUploadError('Please login to upload prescriptions.');
      return;
    }

    setIsAnalyzing(true);
    setUploadError(null);

    try {
      const file = files[0];
      const result = await analyzePrescriptionApi(user.id, file);

      // Unique deduplicated insertion
      setSelectedPrescriptions((prev) => {
        if (prev.some((p) => p.id === result.prescription.id)) return prev;
        return [...prev, result.prescription];
      });

      if (result.detectedProducts && result.detectedProducts.length > 0) {
        const mapped: ExtractedMedicine[] = result.detectedProducts.map((prod: any) => ({
          product: prod,
          quantity: 1,
          selected: true,
        }));

        setExtractedMedicines((prev) => {
          const existingIds = new Set(prev.map((m) => m.product.id));
          const newItems = mapped.filter((m) => !existingIds.has(m.product.id));
          return [...prev, ...newItems];
        });
      }
    } catch (err: any) {
      console.error('Analysis Error:', err);
      setUploadError(err.message || 'Please login to upload prescriptions.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Past Prescription Selection Handler
  const togglePastPrescription = async (item: PrescriptionResponse) => {
    const isAlreadySelected = selectedPrescriptions.some((p) => p.id === item.id);

    if (isAlreadySelected) {
      removeSelectedPrescription(item.id);
    } else {
      if (!user?.id) return;

      setIsAnalyzing(true);
      try {
        const result = await analyzeExistingPrescriptionApi(item.id, user.id);

        setSelectedPrescriptions((prev) => {
          if (prev.some((p) => p.id === result.prescription.id)) return prev;
          return [...prev, result.prescription];
        });

        if (result.detectedProducts && result.detectedProducts.length > 0) {
          const mapped: ExtractedMedicine[] = result.detectedProducts.map((prod: any) => ({
            product: prod,
            quantity: 1,
            selected: true,
          }));

          setExtractedMedicines((prev) => {
            const existingIds = new Set(prev.map((m) => m.product.id));
            const newItems = mapped.filter((m) => !existingIds.has(m.product.id));
            return [...prev, ...newItems];
          });
        }
      } catch (err) {
        setUploadError('Please login to upload prescriptions.');
        console.error('Error analyzing past prescription:', err);
      } finally {
        setIsAnalyzing(false);
      }
    }
  };

  const removeSelectedPrescription = (id: string) => {
    setSelectedPrescriptions((prev) => {
      const updated = prev.filter((p) => p.id !== id);
      if (updated.length === 0) {
        setExtractedMedicines([]);
      }
      return updated;
    });
  };

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

  const toggleMedicineSelection = (index: number) => {
    setExtractedMedicines((prev) =>
      prev.map((item, idx) =>
        idx === index ? { ...item, selected: !item.selected } : item
      )
    );
  };

  const updateQuantity = (index: number, change: number) => {
    setExtractedMedicines((prev) =>
      prev.map((item, idx) =>
        idx === index
          ? { ...item, quantity: Math.max(1, item.quantity + change) }
          : item
      )
    );
  };

  const handleContinue = async () => {
    if (selectedPrescriptions.length === 0) return;

    const activeItems = extractedMedicines.filter((item) => item.selected);
    for (const item of activeItems) {
      await addProductToCart(item.product.id, item.quantity);
    }

    router.push('/checkout');
  };

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Header />

      <main className="flex-grow py-8 px-4 sm:px-8 max-w-[1280px] mx-auto w-full">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* LEFT COLUMN: UPLOAD BOX OR ATTACHED PRESCRIPTION CARD */}
          <div className="lg:col-span-7 space-y-6">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
                Upload prescriptions
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                and let us arrange your medicines for you
              </p>
            </div>

            {/* IF NO PRESCRIPTION SELECTED -> SHOW UPLOAD DROPZONE */}
            {selectedPrescriptions.length === 0 ? (
              <>
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`border-2 border-dashed rounded-2xl p-8 sm:p-12 text-center transition ${
                    isDragging ? 'border-[#ff6f61] bg-red-50/20' : 'border-gray-300 bg-white'
                  }`}
                >
                  <div className="flex flex-col items-center justify-center space-y-4">
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
                        {isAnalyzing ? 'Extracting Medicines...' : 'Upload prescription'}
                        <input
                          type="file"
                          multiple
                          accept=".png,.jpg,.jpeg,.pdf"
                          disabled={isAnalyzing}
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

                {/* PAST PRESCRIPTIONS BUTTON */}
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
              </>
            ) : (
              /* IF PRESCRIPTION IS ATTACHED -> SHOW ATTACHED PREVIEW CARD */
              <div className="space-y-4">
                <div className="flex items-center justify-between bg-green-50 border border-green-200 p-4 rounded-2xl">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">✓</span>
                    <span className="text-xs font-bold text-green-900 uppercase tracking-wider">
                      Prescription Attached ({selectedPrescriptions.length})
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <label className="text-xs font-bold text-[#ff6f61] underline cursor-pointer hover:text-[#e05b4f]">
                      + Add Another
                      <input
                        type="file"
                        multiple
                        accept=".png,.jpg,.jpeg,.pdf"
                        disabled={isAnalyzing}
                        onChange={(e) => e.target.files && handleFileUpload(e.target.files)}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>

                {/* PREVIEW CARDS */}
                <div className="grid grid-cols-1 gap-3">
                  {selectedPrescriptions.map((file) => {
                    const fullFileUrl = file.fileUrl.startsWith('http')
                      ? file.fileUrl
                      : `http://localhost:4000${file.fileUrl}`;

                    const isPdf =
                      file.fileType?.includes('pdf') ||
                      file.fileName.toLowerCase().endsWith('.pdf');

                    return (
                      <div
                        key={file.id}
                        className="bg-white border border-gray-200 rounded-2xl p-4 flex items-center justify-between gap-4 shadow-2xs"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-xl shrink-0 overflow-hidden">
                            {isPdf ? (
                              '📕'
                            ) : (
                              /* eslint-disable-next-line @next/next/no-img-element */
                              <img
                                src={fullFileUrl}
                                alt={file.fileName}
                                className="w-full h-full object-cover"
                              />
                            )}
                          </div>
                          <div className="min-w-0">
                            <h4 className="text-xs font-bold text-gray-900 truncate">
                              {file.fileName}
                            </h4>
                            <a
                              href={fullFileUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[10px] text-[#ff6f61] font-bold hover:underline"
                            >
                              🔍 View Document
                            </a>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => removeSelectedPrescription(file.id)}
                          className="text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-lg transition"
                        >
                          Remove
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* RIGHT COLUMN: RECOMMENDED/EXTRACTED MEDICINES WITH PRODUCT IMAGES & CONTINUE BUTTON */}
          <div className="lg:col-span-5 border-t lg:border-t-0 lg:border-l border-gray-200 pt-6 lg:pt-0 lg:pl-8 space-y-6 flex flex-col justify-between min-h-[420px]">
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider border-b border-gray-100 pb-2">
                Medicines in Prescription
              </h3>

              {isAnalyzing ? (
                <div className="p-8 bg-gray-50 rounded-2xl text-center space-y-2">
                  <div className="animate-spin text-2xl">⏳</div>
                  <p className="text-xs font-bold text-gray-600">
                    Scanning prescription & matching medicines...
                  </p>
                </div>
              ) : extractedMedicines.length > 0 ? (
                <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
                  {extractedMedicines.map((item, idx) => {
                    const rawImg =
                      item.product.imageUrl ||
                      item.product.image ||
                      item.product.images?.[0];

                    const fullProdImgUrl = rawImg
                      ? rawImg.startsWith('http')
                        ? rawImg
                        : `http://localhost:4000${rawImg}`
                      : null;

                    return (
                      <div
                        key={idx}
                        className={`p-3 rounded-xl border flex items-center justify-between gap-3 transition ${
                          item.selected
                            ? 'bg-white border-green-300 shadow-2xs'
                            : 'bg-gray-50 border-gray-200 opacity-60'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <input
                            type="checkbox"
                            checked={item.selected}
                            onChange={() => toggleMedicineSelection(idx)}
                            className="accent-[#ff6f61] w-4 h-4 cursor-pointer shrink-0"
                          />

                          {/* PRODUCT IMAGE THUMBNAIL */}
                          <div className="w-10 h-10 rounded-lg bg-gray-50 border border-gray-200 flex items-center justify-center shrink-0 overflow-hidden">
                            {fullProdImgUrl ? (
                              /* eslint-disable-next-line @next/next/no-img-element */
                              <img
                                src={fullProdImgUrl}
                                alt={item.product.name}
                                className="w-full h-full object-contain p-0.5"
                              />
                            ) : (
                              <span className="text-base">💊</span>
                            )}
                          </div>

                          <div className="min-w-0">
                            <h4 className="text-xs font-bold text-gray-900 truncate">
                              {item.product.name}
                            </h4>
                            <p className="text-[10px] text-gray-500">
                              Rs. {item.product.price || 180}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden bg-white shrink-0">
                          <button
                            type="button"
                            onClick={() => updateQuantity(idx, -1)}
                            className="px-2 py-0.5 text-xs font-bold bg-gray-100 hover:bg-gray-200 text-gray-600"
                          >
                            -
                          </button>
                          <span className="px-2.5 py-0.5 text-xs font-bold text-gray-800">
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => updateQuantity(idx, 1)}
                            className="px-2 py-0.5 text-xs font-bold bg-gray-100 hover:bg-gray-200 text-gray-600"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : selectedPrescriptions.length > 0 ? (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-900 leading-relaxed">
                  Prescription attached! Pharmacist orders verify karke aapko call karenge. Continue button daba kar order place karein.
                </div>
              ) : (
                <p className="text-xs text-gray-400 italic">
                  Prescription upload karne par extracted medicines yahan show hongi.
                </p>
              )}
            </div>

            {/* CONTINUE BUTTON AT BOTTOM */}
            <div className="pt-4 border-t border-gray-100 space-y-4">
              <button
                type="button"
                disabled={selectedPrescriptions.length === 0}
                onClick={handleContinue}
                className={`w-full py-3.5 rounded-xl text-xs font-bold text-white transition shadow-md uppercase tracking-wider ${
                  selectedPrescriptions.length > 0
                    ? 'bg-[#ff6f61] hover:bg-[#e05b4f] cursor-pointer'
                    : 'bg-gray-300 cursor-not-allowed'
                }`}
              >
                Continue
              </button>

              <div className="space-y-2 text-[11px] text-gray-500 leading-relaxed">
                <p>🔒 All uploads are encrypted & visible only to certified pharmacists.</p>
                <p>Any prescription you upload is validated before processing the order.</p>
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
                className="text-gray-400 hover:text-gray-600 text-lg font-bold p-1 cursor-pointer"
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
                className="bg-[#ff6f61] text-white text-xs font-bold px-6 py-2.5 rounded-xl hover:bg-[#e05b4f] cursor-pointer uppercase"
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