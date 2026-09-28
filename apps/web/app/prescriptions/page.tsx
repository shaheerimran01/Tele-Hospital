'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import {
  getUserPrescriptionsApi,
  uploadPrescriptionApi,
  deletePrescriptionApi,
  PrescriptionResponse,
} from '@/app/lib/api/prescriptions';

export default function MyPrescriptionsPage() {
  const [user, setUser] = useState<{ id: string; email?: string; name?: string } | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [prescriptions, setPrescriptions] = useState<PrescriptionResponse[]>([]);

  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Active User session load karein & Prescriptions fetch karein
  useEffect(() => {
    async function loadData() {
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

            // User ki TAMAM prescriptions (attached + unattached) fetch karein
            const fetched = await getUserPrescriptionsApi(extractedId, false);
            setPrescriptions(fetched || []);
          }
        }
      } catch (err) {
        console.error('Error loading prescriptions:', err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  // Upload New Prescription(s)
  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !user?.id) return;

    setIsUploading(true);
    setUploadError(null);

    try {
      const uploadPromises = Array.from(files).map((file) =>
        uploadPrescriptionApi(user.id, file)
      );

      const uploadedResults = await Promise.all(uploadPromises);
      setPrescriptions((prev) => [...uploadedResults, ...prev]);
    } catch (err: any) {
      console.error('Upload Error:', err);
      setUploadError(err.message || 'Prescription file upload nahi ho saki.');
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  // Delete Prescription
  const handleDelete = async (id: string) => {
    if (!user?.id) return;
    if (!confirm('Kya aap is prescription ko delete karna chahte hain?')) return;

    setDeletingId(id);
    try {
      await deletePrescriptionApi(id, user.id);
      setPrescriptions((prev) => prev.filter((p) => p.id !== id));
    } catch (err: any) {
      alert(err.message || 'Delete karne me masla aaya.');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#f8f9fa]">
      <Header />

      <main className="flex-grow py-8 px-4 sm:px-6">
        <div className="mx-auto max-w-[1000px] space-y-6">
          {/* Breadcrumb */}
          <nav className="text-xs text-gray-500 flex items-center gap-1.5">
            <Link href="/" className="hover:underline text-[#ff6f61]">
              Home
            </Link>
            <span>/</span>
            <span className="text-gray-500">My Prescriptions</span>
          </nav>

          {/* Page Header Banner */}
          <div className="bg-white border border-gray-200 rounded-3xl p-6 sm:p-8 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
                <span>📄 My Uploaded Prescriptions</span>
              </h1>
              <p className="text-xs text-gray-500 mt-1">
                Aap ki saari uploaded doctor prescriptions yahan mehfooz hain. Aap nayi prescription upload bhi kar sakte hain.
              </p>
            </div>

            {user && (
              <label className="shrink-0 bg-[#ff6f61] hover:bg-[#e05b4f] text-white text-xs font-bold px-5 py-3 rounded-xl cursor-pointer transition shadow-md uppercase tracking-wider flex items-center gap-2">
                <span>{isUploading ? 'Uploading...' : '📁 Upload New Prescription'}</span>
                <input
                  type="file"
                  multiple
                  accept=".png,.jpg,.jpeg,.pdf"
                  disabled={isUploading}
                  onChange={handleUpload}
                  className="hidden"
                />
              </label>
            )}
          </div>

          {/* Upload Error Alert */}
          {uploadError && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-xs font-bold text-red-600">
              ⚠️ {uploadError}
            </div>
          )}

          {/* Content Loading State */}
          {loading ? (
            <div className="bg-white rounded-3xl p-12 text-center text-xs font-bold text-gray-400">
              Prescriptions Load Ho Rahi Hain...
            </div>
          ) : !user ? (
            /* Not Logged In State */
            <div className="bg-white rounded-3xl p-12 text-center space-y-3 border border-gray-200">
              <span className="text-4xl block">🔒</span>
              <h2 className="text-lg font-bold text-gray-800">Login Required</h2>
              <p className="text-xs text-gray-500 max-w-sm mx-auto">
                Apni uploaded prescriptions dekhne ke liye pehle apne account mein login karein.
              </p>
              <Link
                href="/auth/login"
                className="inline-block bg-[#ff6f61] text-white text-xs font-bold px-6 py-2.5 rounded-xl hover:bg-[#e05b4f] transition shadow-xs uppercase"
              >
                Login Now
              </Link>
            </div>
          ) : prescriptions.length === 0 ? (
            /* Empty State */
            <div className="bg-white rounded-3xl p-12 text-center space-y-3 border border-gray-200">
              <span className="text-4xl block">📄</span>
              <h2 className="text-lg font-bold text-gray-800">Koi Prescription Nahi Mili</h2>
              <p className="text-xs text-gray-500 max-w-sm mx-auto">
                Aap ne abhi tak koi prescription upload nahi ki. Upar diye gaye button se upload karein.
              </p>
            </div>
          ) : (
            /* Prescriptions Grid / List */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {prescriptions.map((file) => {
                const fullFileUrl = file.fileUrl.startsWith('http')
                  ? file.fileUrl
                  : `http://localhost:4000${file.fileUrl}`;

                const isPdf =
                  file.fileType?.includes('pdf') ||
                  file.fileName.toLowerCase().endsWith('.pdf');

                return (
                  <div
                    key={file.id}
                    className="bg-white border border-gray-200 rounded-3xl p-4 shadow-xs hover:shadow-md transition flex flex-col justify-between overflow-hidden"
                  >
                    {/* INLINE IMAGE / PDF PREVIEW BOX */}
                    <div className="relative w-full h-44 bg-gray-50 rounded-2xl overflow-hidden border border-gray-100 mb-3 flex items-center justify-center group">
                      {isPdf ? (
                        <div className="w-full h-full relative">
                          <iframe
                            src={`${fullFileUrl}#toolbar=0&navpanes=0&scrollbar=0`}
                            className="w-full h-full pointer-events-none select-none border-none scale-100"
                            title={file.fileName}
                          />
                          <div className="absolute top-2 left-2 bg-red-600 text-white text-[9px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider shadow-xs">
                            PDF Document
                          </div>
                        </div>
                      ) : (
                        <div className="w-full h-full relative">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={fullFileUrl}
                            alt={file.fileName}
                            className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                          />
                          <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-xs text-white text-[9px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider">
                            Image
                          </div>
                        </div>
                      )}
                    </div>

                    {/* DETAILS SECTION */}
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="text-xs font-bold text-gray-900 truncate flex-1">
                          {file.fileName}
                        </h3>

                        {file.orderId ? (
                          <span className="text-[9px] bg-green-50 text-green-700 border border-green-200 font-bold px-2 py-0.5 rounded-full shrink-0">
                            Orders Attached ✓
                          </span>
                        ) : (
                          <span className="text-[9px] bg-amber-50 text-amber-700 border border-amber-200 font-bold px-2 py-0.5 rounded-full shrink-0">
                            Orders Unattached
                          </span>
                        )}
                      </div>

                      <p className="text-[10px] text-gray-400">
                        Uploaded on: {new Date(file.createdAt).toLocaleDateString()}
                      </p>
                    </div>

                    {/* ACTION BUTTONS */}
                    <div className="pt-3 mt-3 border-t border-gray-100 flex items-center justify-between gap-2">
                      <a
                        href={fullFileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[11px] font-bold text-[#ff6f61] hover:underline flex items-center gap-1"
                      >
                        <span>🔍 Open Full</span>
                      </a>

                      <button
                        type="button"
                        disabled={deletingId === file.id}
                        onClick={() => handleDelete(file.id)}
                        className="text-[11px] font-bold text-red-600 hover:text-red-800 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-xl transition cursor-pointer disabled:opacity-50"
                      >
                        {deletingId === file.id ? 'Deleting...' : '🗑️ Delete'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}