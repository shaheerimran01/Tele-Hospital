'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  Plus, 
  Upload, 
  Search, 
  Edit3, 
  Trash2, 
  Loader2, 
  CheckCircle, 
  AlertCircle 
} from 'lucide-react';

interface ProductItem {
  id: string;
  name: string;
  slug: string;
  genericName: string;
  brandName: string;
  price: number;
  originalPrice: number;
  category: string;
  subCategory: string;
  systemOfMedicine: string;
  dosageForm: string;
  strength: string;
  packSize: string;
  manufacturer: string;
  prescriptionRequired: boolean;
  isFeatured: boolean;
  status: string;
  healthConditions: string[];
  ingredients: string[];
  tags: string[];
  storage: string;
  description: string;
  uses: string;
  benefits: string;
  sideEffects: string;
  howToUse: string;
  working: string;
  safetyAdvice: string;
  quickTips: string;
  imageUrl: string;
  createdAt: string;
  updatedAt: string;
}

const initialProducts: ProductItem[] = [
  {
    id: '1048',
    name: 'Panadol Extra',
    slug: 'panadol-extra',
    genericName: 'Paracetamol + Caffeine',
    brandName: 'Panadol',
    price: 220,
    originalPrice: 240,
    category: 'Pain Relief',
    subCategory: 'Analgesics',
    systemOfMedicine: 'Allopathy',
    dosageForm: 'Tablet',
    strength: '500mg/65mg',
    packSize: '100 Tablets',
    manufacturer: 'GSK Consumer Healthcare',
    prescriptionRequired: false,
    isFeatured: true,
    status: 'Active',
    healthConditions: ['Fever', 'Headache', 'Body Pain'],
    ingredients: ['Paracetamol', 'Caffeine'],
    tags: ['Bestseller', 'Trending'],
    storage: 'Store below 30°C',
    description: 'Effective relief for tough headaches and fever.',
    uses: 'Headache, Toothache, Backache, Fever',
    benefits: 'Fast action formula with caffeine boost.',
    sideEffects: 'Mild nausea if taken on empty stomach.',
    howToUse: '1-2 tablets every 4-6 hours.',
    working: 'Blocks pain signal synthesis in brain.',
    safetyAdvice: 'Do not exceed 8 tablets in 24 hours.',
    quickTips: 'Take after meals for best comfort.',
    imageUrl: 'https://via.placeholder.com/150',
    createdAt: '2026-09-01',
    updatedAt: '2026-09-10',
  },
  {
    id: '1047',
    name: 'Augmentin 625mg',
    slug: 'augmentin-625mg',
    genericName: 'Amoxicillin + Clavulanate',
    brandName: 'Augmentin',
    price: 1280,
    originalPrice: 1300,
    category: 'Antibiotics',
    subCategory: 'Penicillins',
    systemOfMedicine: 'Allopathy',
    dosageForm: 'Tablet',
    strength: '625mg',
    packSize: '10 Tablets',
    manufacturer: 'GSK',
    prescriptionRequired: true,
    isFeatured: false,
    status: 'Active',
    healthConditions: ['Bacterial Infections', 'ENT Infections'],
    ingredients: ['Amoxicillin', 'Clavulanic Acid'],
    tags: ['Prescription Required'],
    storage: 'Store in cool and dry place',
    description: 'Broad spectrum antibiotic for severe bacterial infections.',
    uses: 'Respiratory tract infection, Sinusitis, Ear infection',
    benefits: 'Fights resistant bacterial strains.',
    sideEffects: 'Diarrhea, Skin rash, Vomiting',
    howToUse: '1 tablet twice daily as prescribed by doctor.',
    working: 'Inhibits bacterial cell wall synthesis.',
    safetyAdvice: 'Complete full dose course.',
    quickTips: 'Take at start of a meal.',
    imageUrl: 'https://via.placeholder.com/150',
    createdAt: '2026-09-05',
    updatedAt: '2026-09-12',
  },
  {
    id: '1046',
    name: 'Brufen 400mg',
    slug: 'brufen-400mg',
    genericName: 'Ibuprofen',
    brandName: 'Brufen',
    price: 310,
    originalPrice: 330,
    category: 'Pain Relief',
    subCategory: 'NSAIDs',
    systemOfMedicine: 'Allopathy',
    dosageForm: 'Tablet',
    strength: '400mg',
    packSize: '30 Tablets',
    manufacturer: 'Abbott Laboratories',
    prescriptionRequired: false,
    isFeatured: true,
    status: 'Active',
    healthConditions: ['Inflammation', 'Dental Pain'],
    ingredients: ['Ibuprofen'],
    tags: ['Pain Specialist'],
    storage: 'Store below 25°C',
    description: 'Anti-inflammatory medicine for joint and muscle pain.',
    uses: 'Arthritis, Muscle ache, Period cramps',
    benefits: 'Reduces both pain and swelling quickly.',
    sideEffects: 'Stomach irritation, Dizziness',
    howToUse: '1 tablet 3 times daily after meals.',
    working: 'Inhibits COX enzymes causing inflammation.',
    safetyAdvice: 'Avoid if you have stomach ulcers.',
    quickTips: 'Always take with food or milk.',
    imageUrl: 'https://via.placeholder.com/150',
    createdAt: '2026-08-20',
    updatedAt: '2026-09-02',
  },
];

export default function ProductsPage() {
  const [products] = useState<ProductItem[]>(initialProducts);
  const [searchTerm, setSearchTerm] = useState('');
  const [pharmacyId, setPharmacyId] = useState<string | null>('cmusaneom00007sv5rz5cdtrm');
  const [isUploading, setIsUploading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch Logged-In Pharmacy ID from localStorage if available
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const activeId = 
        localStorage.getItem('pharmacyId') || 
        localStorage.getItem('userPharmacyId') || 
        localStorage.getItem('currentPharmacyId');
        
      if (activeId) {
        setPharmacyId(activeId);
      }
    }
  }, []);

  // Trigger File Picker
  const handleImportClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  // CSV Import Trigger Handler
  const handleCsvFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.csv')) {
      setStatusMessage({ type: 'error', text: 'Kripya sirf .csv format ki file select karein.' });
      return;
    }

    // Dynamic Pharmacy ID Check with hardcoded target fallback ID
    const targetPharmacyId = 
      pharmacyId || 
      (typeof window !== 'undefined' ? localStorage.getItem('pharmacyId') : null) ||
      'cmusaneom00007sv5rz5cdtrm';

    setIsUploading(true);
    setStatusMessage(null);

    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

      const formData = new FormData();
      formData.append('productsCsv', file);

      const res = await fetch(`${baseUrl}/pharmacy-products/${targetPharmacyId}/upload-csv`, {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (res.ok) {
        setStatusMessage({
          type: 'success',
          text: `CSV Success! ${data.stats?.importedCount || 0} products process ho chuke hain.`,
        });
      } else {
        setStatusMessage({
          type: 'error',
          text: data.message || 'CSV upload fail ho gaya! Server se error aaya.',
        });
      }
    } catch (err) {
      console.error('Import Error:', err);
      setStatusMessage({
        type: 'error',
        text: 'Backend server se connection nahi ho saka.',
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="p-6 bg-[#F4F7FB] min-h-screen font-sans text-slate-800">
      
      {/* Hidden File Input */}
      <input
        type="file"
        ref={fileInputRef}
        accept=".csv"
        className="hidden"
        onChange={handleCsvFileChange}
      />

      {/* TOP CONTROLS */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 mb-6">
        <button
          type="button"
          onClick={() => alert('Add Product feature coming soon.')}
          className="bg-[#0F5A47] hover:bg-[#0b4536] text-white px-5 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition cursor-pointer shadow-sm w-fit"
        >
          <Plus className="w-4 h-4" />
          Add Product
        </button>

        <div className="flex items-center gap-3 flex-1 max-w-2xl justify-end">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by name, category, manufacturer"
              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl bg-white text-xs focus:outline-none focus:ring-2 focus:ring-[#0F5A47]"
            />
          </div>

          <button
            type="button"
            onClick={handleImportClick}
            disabled={isUploading}
            className="bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-2 transition cursor-pointer shadow-2xs shrink-0 disabled:opacity-50"
          >
            {isUploading ? (
              <Loader2 className="w-4 h-4 animate-spin text-[#0F5A47]" />
            ) : (
              <Upload className="w-4 h-4 text-slate-600" />
            )}
            {isUploading ? 'Importing...' : 'Import Products'}
          </button>
        </div>
      </div>

      {/* STATUS NOTIFICATION BANNER */}
      {statusMessage && (
        <div
          className={`mb-4 p-3.5 rounded-xl text-xs font-semibold flex items-center gap-2 ${
            statusMessage.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}
        >
          {statusMessage.type === 'success' ? (
            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
          )}
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* FILTER BAR CONTAINER */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs mb-6 flex items-center justify-between gap-4 flex-wrap text-xs">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="font-bold text-slate-700">Filters:</span>
          <span className="px-3 py-1 bg-emerald-50 text-[#0F5A47] font-bold rounded-lg cursor-pointer">
            All
          </span>
          <select className="border border-slate-200 rounded-lg px-2.5 py-1 bg-white text-slate-600 focus:outline-none">
            <option value="">Category</option>
            <option value="Pain Relief">Pain Relief</option>
            <option value="Antibiotics">Antibiotics</option>
          </select>
          <select className="border border-slate-200 rounded-lg px-2.5 py-1 bg-white text-slate-600 focus:outline-none">
            <option value="">Prescription</option>
            <option value="Rx">Rx Required</option>
            <option value="Non-Rx">Non-Rx</option>
          </select>
          <select className="border border-slate-200 rounded-lg px-2.5 py-1 bg-white text-slate-600 focus:outline-none">
            <option value="">Status</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </select>

          <div className="flex items-center gap-1.5 text-slate-400">
            <input
              type="number"
              placeholder="Min Rs."
              className="w-20 px-2 py-1 border border-slate-200 rounded-lg text-slate-700 bg-white"
            />
            <span>—</span>
            <input
              type="number"
              placeholder="Max Rs."
              className="w-20 px-2 py-1 border border-slate-200 rounded-lg text-slate-700 bg-white"
            />
          </div>
        </div>

        <span className="text-slate-400 font-semibold">{products.length} products</span>
      </div>

      {/* TABLE WITH HORIZONTAL SCROLL */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700 min-w-[3400px]">
            <thead className="bg-slate-50 border-b border-slate-200 font-bold uppercase text-slate-500 tracking-wider">
              <tr>
                <th className="p-3.5 px-4 sticky left-0 bg-slate-50 z-10 shadow-2xs">ID</th>
                <th className="p-3.5 px-4 min-w-[200px]">Product Name & Slug</th>
                <th className="p-3.5 px-4 min-w-[180px]">Generic Name (Salt)</th>
                <th className="p-3.5 px-4 min-w-[140px]">Brand Name</th>
                <th className="p-3.5 px-4 min-w-[100px]">Price</th>
                <th className="p-3.5 px-4 min-w-[110px]">Original Price</th>
                <th className="p-3.5 px-4 min-w-[130px]">Category</th>
                <th className="p-3.5 px-4 min-w-[130px]">Sub Category</th>
                <th className="p-3.5 px-4 min-w-[140px]">System of Medicine</th>
                <th className="p-3.5 px-4 min-w-[120px]">Dosage Form</th>
                <th className="p-3.5 px-4 min-w-[110px]">Strength</th>
                <th className="p-3.5 px-4 min-w-[120px]">Pack Size</th>
                <th className="p-3.5 px-4 min-w-[160px]">Manufacturer</th>
                <th className="p-3.5 px-4 min-w-[110px]">Rx Required</th>
                <th className="p-3.5 px-4 min-w-[100px]">Featured</th>
                <th className="p-3.5 px-4 min-w-[100px]">Status</th>
                <th className="p-3.5 px-4 min-w-[180px]">Health Conditions</th>
                <th className="p-3.5 px-4 min-w-[160px]">Ingredients</th>
                <th className="p-3.5 px-4 min-w-[160px]">Tags</th>
                <th className="p-3.5 px-4 min-w-[150px]">Storage</th>
                <th className="p-3.5 px-4 min-w-[220px]">Description</th>
                <th className="p-3.5 px-4 min-w-[200px]">Uses</th>
                <th className="p-3.5 px-4 min-w-[200px]">Benefits</th>
                <th className="p-3.5 px-4 min-w-[200px]">Side Effects</th>
                <th className="p-3.5 px-4 min-w-[200px]">How To Use</th>
                <th className="p-3.5 px-4 min-w-[200px]">Working</th>
                <th className="p-3.5 px-4 min-w-[200px]">Safety Advice</th>
                <th className="p-3.5 px-4 min-w-[200px]">Quick Tips</th>
                <th className="p-3.5 px-4 min-w-[160px]">Image URL</th>
                <th className="p-3.5 px-4 min-w-[120px]">Created At</th>
                <th className="p-3.5 px-4 min-w-[120px]">Updated At</th>
                <th className="p-3.5 px-4 sticky right-0 bg-slate-50 z-10 text-center shadow-2xs min-w-[110px]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {products.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/70 transition font-medium">
                  <td className="p-3.5 px-4 sticky left-0 bg-white font-bold text-slate-900 shadow-2xs">
                    {item.id}
                  </td>
                  <td className="p-3.5 px-4">
                    <span className="font-bold text-slate-900 block">{item.name}</span>
                    <span className="text-[11px] text-slate-400 font-mono">/{item.slug}</span>
                  </td>
                  <td className="p-3.5 px-4 text-slate-600">{item.genericName}</td>
                  <td className="p-3.5 px-4 text-slate-800 font-semibold">{item.brandName}</td>
                  <td className="p-3.5 px-4 font-bold text-slate-900">Rs {item.price}</td>
                  <td className="p-3.5 px-4 text-slate-400 line-through">Rs {item.originalPrice}</td>
                  <td className="p-3.5 px-4">{item.category}</td>
                  <td className="p-3.5 px-4">{item.subCategory}</td>
                  <td className="p-3.5 px-4">{item.systemOfMedicine}</td>
                  <td className="p-3.5 px-4">{item.dosageForm}</td>
                  <td className="p-3.5 px-4 font-mono">{item.strength}</td>
                  <td className="p-3.5 px-4">{item.packSize}</td>
                  <td className="p-3.5 px-4">{item.manufacturer}</td>
                  <td className="p-3.5 px-4">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      item.prescriptionRequired ? 'bg-red-50 text-red-600' : 'bg-slate-100 text-slate-500'
                    }`}>
                      {item.prescriptionRequired ? 'Rx Yes' : 'No'}
                    </span>
                  </td>
                  <td className="p-3.5 px-4">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      item.isFeatured ? 'bg-amber-50 text-amber-600' : 'bg-slate-100 text-slate-500'
                    }`}>
                      {item.isFeatured ? 'Yes' : 'No'}
                    </span>
                  </td>
                  <td className="p-3.5 px-4">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700">
                      {item.status}
                    </span>
                  </td>
                  <td className="p-3.5 px-4 truncate max-w-[180px]">{item.healthConditions.join(', ')}</td>
                  <td className="p-3.5 px-4 truncate max-w-[160px]">{item.ingredients.join(', ')}</td>
                  <td className="p-3.5 px-4 truncate max-w-[160px]">{item.tags.join(', ')}</td>
                  <td className="p-3.5 px-4">{item.storage}</td>
                  <td className="p-3.5 px-4 truncate max-w-[220px]">{item.description}</td>
                  <td className="p-3.5 px-4 truncate max-w-[200px]">{item.uses}</td>
                  <td className="p-3.5 px-4 truncate max-w-[200px]">{item.benefits}</td>
                  <td className="p-3.5 px-4 truncate max-w-[200px]">{item.sideEffects}</td>
                  <td className="p-3.5 px-4 truncate max-w-[200px]">{item.howToUse}</td>
                  <td className="p-3.5 px-4 truncate max-w-[200px]">{item.working}</td>
                  <td className="p-3.5 px-4 truncate max-w-[200px]">{item.safetyAdvice}</td>
                  <td className="p-3.5 px-4 truncate max-w-[200px]">{item.quickTips}</td>
                  <td className="p-3.5 px-4 text-blue-600 truncate max-w-[160px]">{item.imageUrl}</td>
                  <td className="p-3.5 px-4 text-slate-400 font-mono text-[11px]">{item.createdAt}</td>
                  <td className="p-3.5 px-4 text-slate-400 font-mono text-[11px]">{item.updatedAt}</td>
                  <td className="p-3.5 px-4 sticky right-0 bg-white z-10 shadow-2xs">
                    <div className="flex items-center justify-center gap-1.5">
                      <button 
                        type="button" 
                        className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-600 transition cursor-pointer"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button 
                        type="button" 
                        className="p-1.5 hover:bg-red-50 rounded-lg text-red-500 transition cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}