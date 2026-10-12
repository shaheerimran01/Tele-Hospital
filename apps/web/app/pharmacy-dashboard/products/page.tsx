'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  LayoutDashboard, 
  Package, 
  User, 
  LogOut, 
  Plus, 
  Upload, 
  Search, 
  Edit3, 
  Trash2, 
  Loader2, 
  CheckCircle, 
  AlertCircle,
  RefreshCw,
  X,
  ChevronDown
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { PharmacySidebar } from '@/components/pharmacy/Sidebar';

interface ProductItem {
  id: string;
  name: string;
  slug: string;
  genericName: string;
  brandName: string;
  price: number;
  originalPrice: number;
  stock: number;
  isAvailable: boolean;
  approvalStatus: string;
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

export default function ProductsPage() {
  const router = useRouter();
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [pharmacyId, setPharmacyId] = useState<string>('cmusaneom00007sv5rz5cdtrm');
  const [pharmacyName, setPharmacyName] = useState<string>('Pharmacy Partner');
  const [isUploading, setIsUploading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Modal & Form States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [productForm, setProductForm] = useState({
    name: '',
    slug: '',
    genericName: '',
    brandName: '',
    price: '',
    originalPrice: '',
    stock: '',
    category: '',
    subCategory: '',
    systemOfMedicine: 'Allopathy',
    manufacturer: '',
    dosageForm: '',
    strength: '',
    packSize: '',
    imageUrl: '',
    healthConditions: '',
    ingredients: '',
    tags: '',
    description: '',
    uses: '',
    benefits: '',
    sideEffects: '',
    howToUse: '',
    safetyAdvice: '',
    prescriptionRequired: false,
    isFeatured: false,
    isActive: true,
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  const slugify = (text: string) => {
    return text
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  };

  const handleProductNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setProductForm((prev) => ({
      ...prev,
      name: val,
      slug: slugify(val),
    }));
  };

  const handleFormInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setProductForm((prev) => ({ ...prev, [name]: checked }));
    } else {
      setProductForm((prev) => ({ ...prev, [name]: value }));
    }
  };

  // Open Add Product Modal
  const handleOpenAddModal = () => {
    setEditingProductId(null);
    setProductForm({
      name: '',
      slug: '',
      genericName: '',
      brandName: '',
      price: '',
      originalPrice: '',
      stock: '',
      category: '',
      subCategory: '',
      systemOfMedicine: 'Allopathy',
      manufacturer: '',
      dosageForm: '',
      strength: '',
      packSize: '',
      imageUrl: '',
      healthConditions: '',
      ingredients: '',
      tags: '',
      description: '',
      uses: '',
      benefits: '',
      sideEffects: '',
      howToUse: '',
      safetyAdvice: '',
      prescriptionRequired: false,
      isFeatured: false,
      isActive: true,
    });
    setIsModalOpen(true);
  };

  // Open Edit Product Modal with Pre-filled Data
  const handleOpenEditModal = (item: ProductItem) => {
    setEditingProductId(item.id);
    setProductForm({
      name: item.name || '',
      slug: item.slug || '',
      genericName: item.genericName === 'N/A' ? '' : item.genericName,
      brandName: item.brandName === 'N/A' ? '' : item.brandName,
      price: item.price ? item.price.toString() : '',
      originalPrice: item.originalPrice ? item.originalPrice.toString() : '',
      stock: item.stock ? item.stock.toString() : '0',
      category: item.category === 'General Pharmacy' ? '' : item.category,
      subCategory: item.subCategory === 'N/A' ? '' : item.subCategory,
      systemOfMedicine: item.systemOfMedicine || 'Allopathy',
      manufacturer: item.manufacturer === 'N/A' ? '' : item.manufacturer,
      dosageForm: item.dosageForm || '',
      strength: item.strength === 'N/A' ? '' : item.strength,
      packSize: item.packSize === 'N/A' ? '' : item.packSize,
      imageUrl: item.imageUrl.includes('placeholder') ? '' : item.imageUrl,
      healthConditions: item.healthConditions.join(', '),
      ingredients: item.ingredients.join(', '),
      tags: item.tags.join(', '),
      description: item.description === 'N/A' ? '' : item.description,
      uses: item.uses === 'N/A' ? '' : item.uses,
      benefits: item.benefits === 'N/A' ? '' : item.benefits,
      sideEffects: item.sideEffects === 'N/A' ? '' : item.sideEffects,
      howToUse: item.howToUse === 'N/A' ? '' : item.howToUse,
      safetyAdvice: item.safetyAdvice === 'N/A' ? '' : item.safetyAdvice,
      prescriptionRequired: item.prescriptionRequired,
      isFeatured: item.isFeatured,
      isActive: item.status === 'Active',
    });
    setIsModalOpen(true);
  };

  // Fetch Live Products from Backend
  const fetchPharmacyProducts = async (targetId: string) => {
    setLoading(true);
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
      const res = await fetch(`${baseUrl}/pharmacy-products/${targetId}`);
      const data = await res.json();

      if (res.ok && data.products) {
        if (data.pharmacyName) setPharmacyName(data.pharmacyName);

        const formattedProducts: ProductItem[] = data.products.map((item: any) => ({
          id: item.id,
          name: item.product?.name || 'Unnamed Medicine',
          slug: item.product?.slug || '',
          genericName: item.product?.genericName || 'N/A',
          brandName: item.product?.brandName || 'N/A',
          price: Number(item.price ?? item.product?.price ?? 0),
          originalPrice: Number(item.mrp ?? item.product?.originalPrice ?? 0),
          stock: Number(item.stock ?? 0),
          isAvailable: Boolean(item.isAvailable),
          category: item.product?.category || 'General Pharmacy',
          subCategory: item.product?.subCategory || 'N/A',
          systemOfMedicine: item.product?.systemOfMedicine || 'Allopathy',
          dosageForm: item.product?.dosageForm || 'Tablet',
          strength: item.product?.strength || 'N/A',
          packSize: item.product?.packSize || 'N/A',
          manufacturer: item.product?.brandName || 'N/A',
          prescriptionRequired: Boolean(item.product?.prescriptionRequired),
          isFeatured: Boolean(item.product?.isFeatured),
          status: item.isAvailable ? 'Active' : 'Out of Stock',
          approvalStatus: item.approvalStatus || 'PENDING',
          healthConditions: Array.isArray(item.product?.healthConditions) ? item.product.healthConditions : [],
          ingredients: Array.isArray(item.product?.ingredients) ? item.product.ingredients : [],
          tags: Array.isArray(item.product?.tags) ? item.product.tags : [],
          storage: item.product?.storage || 'Store in dry place',
          description: item.product?.description || 'N/A',
          uses: item.product?.uses || 'N/A',
          benefits: item.product?.benefits || 'N/A',
          sideEffects: item.product?.sideEffects || 'N/A',
          howToUse: item.product?.howToUse || 'N/A',
          working: item.product?.working || 'N/A',
          safetyAdvice: item.product?.safetyAdvice || 'N/A',
          quickTips: item.product?.quickTips || 'N/A',
          imageUrl: item.product?.imageUrl || 'https://via.placeholder.com/150',
          createdAt: item.createdAt ? new Date(item.createdAt).toLocaleDateString() : 'N/A',
          updatedAt: item.updatedAt ? new Date(item.updatedAt).toLocaleDateString() : 'N/A',
        }));

        setProducts(formattedProducts);
      } else {
        setProducts([]);
      }
    } catch (err) {
      console.error('Products Fetch Error:', err);
      setStatusMessage({ type: 'error', text: 'Backend API se products load nahi ho sake.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const activeId = 
        sessionStorage.getItem('pharmacyId') ||
        sessionStorage.getItem('userPharmacyId') ||
        'cmusaneom00007sv5rz5cdtrm';
        
      setPharmacyId(activeId);
      fetchPharmacyProducts(activeId);
    }
  }, []);

  // Delete Product Handler
  const handleDeleteProduct = async (productId: string, productName: string) => {
    if (!window.confirm(`Kya aap "${productName}" ko delete karna chahte hain?`)) return;

    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
      const res = await fetch(`${baseUrl}/pharmacy-products/${pharmacyId}/product/${productId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        setProducts((prev) => prev.filter((p) => p.id !== productId));
        setStatusMessage({
          type: 'success',
          text: `Product "${productName}" kamyabi se delete ho gaya.`,
        });
      } else {
        setStatusMessage({ type: 'error', text: 'Product delete karne me masla aaya.' });
      }
    } catch (err) {
      console.error('Delete Error:', err);
      setStatusMessage({ type: 'error', text: 'Backend se connection fail ho gaya.' });
    }
  };

  // Submit Add / Edit Form Handler
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productForm.name || !productForm.price) {
      alert('Product Name aur Price required hain!');
      return;
    }

    setIsSubmitting(true);
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

    try {
      if (editingProductId) {
        // EDIT MODE (PUT)
        const res = await fetch(`${baseUrl}/pharmacy-products/${pharmacyId}/product/${editingProductId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(productForm),
        });

        const data = await res.json();

        if (res.ok) {
          setStatusMessage({
            type: 'success',
            text: `Product "${productForm.name}" kamyabi se update ho gaya!`,
          });
          fetchPharmacyProducts(pharmacyId);
        } else {
          setStatusMessage({
            type: 'error',
            text: Array.isArray(data.message) ? data.message.join(', ') : data.message || 'Update fail ho gaya!',
          });
        }
      } else {
        // ADD NEW PRODUCT (POST)
        const res = await fetch(`${baseUrl}/pharmacy-products/${pharmacyId}/products`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(productForm),
        });

        const data = await res.json();

        if (res.ok) {
          setStatusMessage({
            type: 'success',
            text: `Product "${productForm.name}" add ho gaya hai!`,
          });
          fetchPharmacyProducts(pharmacyId);
        } else {
          setStatusMessage({
            type: 'error',
            text: Array.isArray(data.message) ? data.message.join(', ') : data.message || 'Product add karne me masla aaya.',
          });
        }
      }

      setIsModalOpen(false);
    } catch (err) {
      console.error('Submit Error:', err);
      setStatusMessage({ type: 'error', text: 'Server connection error.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleImportClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  const handleCsvFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.csv')) {
      setStatusMessage({ type: 'error', text: 'Kripya sirf .csv format ki file select karein.' });
      return;
    }

    setIsUploading(true);
    setStatusMessage(null);

    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch(`${baseUrl}/pharmacy-products/upload-csv/${pharmacyId}`, {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (res.ok) {
        setStatusMessage({
          type: 'success',
          text: `CSV Success! ${data.stats?.importedCount || 0} products process ho chuke hain.`,
        });
        fetchPharmacyProducts(pharmacyId);
      } else {
        setStatusMessage({ type: 'error', text: data.message || 'CSV upload fail ho gaya!' });
      }
    } catch (err) {
      console.error('Import Error:', err);
      setStatusMessage({ type: 'error', text: 'Backend server se connection nahi ho saka.' });
    } finally {
      setIsUploading(false);
    }
  };

  const filteredProducts = products.filter((item) => 
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.brandName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.genericName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex min-h-screen bg-[#F4F7F5] text-slate-800 font-sans">
      
      <input
        type="file"
        ref={fileInputRef}
        accept=".csv"
        className="hidden"
        onChange={handleCsvFileChange}
      />

      {/* Sidebar Navigation */}
      <PharmacySidebar 
        pharmacyName={pharmacyName} 
        pharmacyStatus="" 
        pharmacyId={pharmacyId} 
      />

      {/* Main Area */}
      <main className="flex-1 p-8 overflow-y-auto">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 bg-white p-6 rounded-2xl border border-emerald-100/80 shadow-xs">
          <div>
            <span className="text-[10px] font-extrabold text-[#0F5A47] uppercase tracking-wider block mb-1">
              INVENTORY MANAGEMENT
            </span>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Products Catalog</h1>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <button
              type="button"
              onClick={() => fetchPharmacyProducts(pharmacyId)}
              className="p-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-xl transition cursor-pointer"
              title="Refresh Products"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-[#0F5A47]' : ''}`} />
            </button>

            <button
              type="button"
              onClick={handleImportClick}
              disabled={isUploading}
              className="bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition cursor-pointer shadow-2xs shrink-0 disabled:opacity-50"
            >
              {isUploading ? (
                <Loader2 className="w-4 h-4 animate-spin text-[#0F5A47]" />
              ) : (
                <Upload className="w-4 h-4 text-slate-600" />
              )}
              {isUploading ? 'Importing CSV...' : 'Import Products CSV'}
            </button>

            <button
              type="button"
              onClick={handleOpenAddModal}
              className="bg-[#0F5A47] hover:bg-emerald-900 text-white px-5 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition cursor-pointer shadow-sm"
            >
              <Plus className="w-4 h-4" />
              Add Product
            </button>
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
            {statusMessage.type === 'success' ? (
              <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            )}
            <span>{statusMessage.text}</span>
          </div>
        )}

        {/* Filter Bar */}
        <div className="bg-white p-4 rounded-2xl border border-emerald-100 shadow-xs mb-6 flex items-center justify-between gap-4 flex-wrap text-xs">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by name, salt, brand, or category..."
              className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl bg-slate-50/50 focus:bg-white text-xs focus:outline-none focus:ring-2 focus:ring-[#0F5A47]"
            />
          </div>

          <div className="flex items-center gap-3">
            <span className="text-slate-500 font-semibold">{filteredProducts.length} products listed</span>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl border border-emerald-100 shadow-xs overflow-hidden">
          {loading ? (
            <div className="p-16 text-center text-xs font-bold text-slate-400 flex flex-col items-center justify-center gap-3">
              <Loader2 className="w-7 h-7 animate-spin text-[#0F5A47]" />
              <span>Fetching live products from database...</span>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="p-16 text-center text-xs text-slate-500 font-bold space-y-2">
              <p className="text-sm font-extrabold text-slate-800">No products found</p>
              <p className="text-slate-400 font-normal">Kripya "Add Product" ya CSV upload karein.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700 min-w-[3200px]">
                <thead className="bg-emerald-50/40 border-b border-emerald-100 font-extrabold uppercase text-slate-600 tracking-wider">
                  <tr>
                    <th className="p-4 sticky left-0 bg-emerald-50 z-10 shadow-2xs">ID</th>
                    <th className="p-4 min-w-[220px]">Product Name & Slug</th>
                    <th className="p-4 min-w-[200px]">Generic Name (Salt)</th>
                    <th className="p-4 min-w-[150px]">Brand Name</th>
                    <th className="p-4 min-w-[110px]">Price</th>
                    <th className="p-4 min-w-[110px]">MRP Price</th>
                    <th className="p-4 min-w-[100px]">Stock</th>
                    <th className="p-4 min-w-[130px]">Category</th>
                    <th className="p-4 min-w-[130px]">Sub Category</th>
                    <th className="p-4 min-w-[130px]">Dosage Form</th>
                    <th className="p-4 min-w-[110px]">Strength</th>
                    <th className="p-4 min-w-[120px]">Pack Size</th>
                    <th className="p-4 min-w-[110px]">Rx Required</th>
                    <th className="p-4 min-w-[100px]">Status</th>
                    <th className="p-4 min-w-[180px]">Health Conditions</th>
                    <th className="p-4 min-w-[160px]">Ingredients</th>
                    <th className="p-4 min-w-[150px]">Storage</th>
                    <th className="p-4 min-w-[220px]">Description</th>
                    <th className="p-4 min-w-[200px]">Uses</th>
                    <th className="p-4 min-w-[200px]">Benefits</th>
                    <th className="p-4 min-w-[200px]">Side Effects</th>
                    <th className="p-4 min-w-[120px]">Created At</th>
                    <th className="p-4 sticky right-0 bg-emerald-50 z-10 text-center shadow-2xs min-w-[110px]">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredProducts.map((item) => (
                    <tr key={item.id} className="hover:bg-emerald-50/20 transition font-medium">
                      <td className="p-4 sticky left-0 bg-white font-bold text-slate-900 shadow-2xs font-mono text-[11px]">
                        {item.id.substring(0, 8)}...
                      </td>
                      <td className="p-4">
                        <span className="font-bold text-slate-900 block">{item.name}</span>
                        <span className="text-[11px] text-slate-400 font-mono">/{item.slug}</span>
                      </td>
                      <td className="p-4 text-slate-600 font-medium">{item.genericName}</td>
                      <td className="p-4 text-slate-900 font-bold">{item.brandName}</td>
                      <td className="p-4 font-black text-[#0F5A47]">Rs {item.price}</td>
                      <td className="p-4 text-slate-400 line-through">Rs {item.originalPrice}</td>
                      <td className="p-4">
                        <span className={`font-bold ${item.stock > 0 ? 'text-slate-700' : 'text-rose-600'}`}>
                          {item.stock}
                        </span>
                      </td>
                      <td className="p-4 font-semibold">{item.category}</td>
                      <td className="p-4">{item.subCategory}</td>
                      <td className="p-4">{item.dosageForm}</td>
                      <td className="p-4 font-mono">{item.strength}</td>
                      <td className="p-4">{item.packSize}</td>
                      <td className="p-4">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                          item.prescriptionRequired ? 'bg-rose-50 text-rose-600 border border-rose-100' : 'bg-slate-100 text-slate-500'
                        }`}>
                          {item.prescriptionRequired ? 'Rx Required' : 'OTC'}
                        </span>
                      </td>
<td className="p-4">
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-50 text-emerald-800 border border-emerald-200">
                            {item.status}
                          </span>
                          <span className={`block mt-1 px-2.5 py-0.5 w-fit rounded-full text-[10px] font-extrabold ${
                            item.approvalStatus === 'APPROVED'
                              ? 'bg-sky-50 text-sky-700 border border-sky-100'
                              : 'bg-amber-50 text-amber-700 border border-amber-100'
                          }`}>
                            {item.approvalStatus === 'APPROVED' ? 'In Catalog' : 'Pending Approval'}
                          </span>
                        </td>
                      <td className="p-4 truncate max-w-[180px]">{item.healthConditions.join(', ')}</td>
                      <td className="p-4 truncate max-w-[160px]">{item.ingredients.join(', ')}</td>
                      <td className="p-4">{item.storage}</td>
                      <td className="p-4 truncate max-w-[220px]">{item.description}</td>
                      <td className="p-4 truncate max-w-[200px]">{item.uses}</td>
                      <td className="p-4 truncate max-w-[200px]">{item.benefits}</td>
                      <td className="p-4 truncate max-w-[200px]">{item.sideEffects}</td>
                      <td className="p-4 text-slate-400 font-mono text-[11px]">{item.createdAt}</td>
                      <td className="p-4 sticky right-0 bg-white z-10 shadow-2xs text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button 
                            type="button" 
                            onClick={() => handleOpenEditModal(item)}
                            className="p-1.5 hover:bg-emerald-50 rounded-lg text-emerald-700 transition cursor-pointer"
                            title="Edit Product"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button 
                            type="button" 
                            onClick={() => handleDeleteProduct(item.id, item.name)}
                            className="p-1.5 hover:bg-rose-50 rounded-lg text-rose-600 transition cursor-pointer"
                            title="Delete Product"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* ADD / EDIT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-4xl w-full shadow-2xl border border-slate-200 overflow-hidden my-8 animate-in fade-in zoom-in duration-200">
            
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-emerald-50 text-[#0F5A47] rounded-lg">
                  <Edit3 className="w-5 h-5 font-bold" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900">
                    {editingProductId ? 'Edit Product Details' : 'Add New Product'}
                  </h3>
                  <p className="text-xs text-slate-500">Fill or update product details below.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
              
              {/* BASIC INFORMATION */}
              <div className="p-5 bg-slate-50/50 rounded-xl border border-slate-200/80 space-y-4">
                <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">BASIC INFORMATION</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Product Name *</label>
                    <input
                      type="text"
                      required
                      name="name"
                      value={productForm.name}
                      onChange={handleProductNameChange}
                      placeholder="e.g. Dolo 650mg Tablet"
                      className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[#0F5A47]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Auto-Configured Slug</label>
                    <input
                      type="text"
                      readOnly
                      name="slug"
                      value={productForm.slug}
                      placeholder="auto-generated-slug"
                      className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs bg-slate-100/80 text-slate-500 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Generic Name (Formula/Salt)</label>
                    <input
                      type="text"
                      name="genericName"
                      value={productForm.genericName}
                      onChange={handleFormInputChange}
                      placeholder="e.g. Paracetamol 650mg"
                      className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[#0F5A47]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Brand Name / Marketer</label>
                    <input
                      type="text"
                      name="brandName"
                      value={productForm.brandName}
                      onChange={handleFormInputChange}
                      placeholder="e.g. Micro Labs Ltd"
                      className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[#0F5A47]"
                    />
                  </div>
                </div>
              </div>

              {/* PRICING & CLASSIFICATION */}
              <div className="p-5 bg-slate-50/50 rounded-xl border border-slate-200/80 space-y-4">
                <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">PRICING & CLASSIFICATION</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Price (Rs.) *</label>
                    <input
                      type="number"
                      required
                      name="price"
                      value={productForm.price}
                      onChange={handleFormInputChange}
                      placeholder="35.00"
                      className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[#0F5A47]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Original Price (Rs.)</label>
                    <input
                      type="number"
                      name="originalPrice"
                      value={productForm.originalPrice}
                      onChange={handleFormInputChange}
                      placeholder="40.00"
                      className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[#0F5A47]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Stock Quantity</label>
                    <input
                      type="number"
                      name="stock"
                      min="0"
                      step="1"
                      value={productForm.stock}
                      onChange={handleFormInputChange}
                      placeholder="0"
                      className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[#0F5A47]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Category</label>
                    <input
                      type="text"
                      name="category"
                      value={productForm.category}
                      onChange={handleFormInputChange}
                      placeholder="e.g. Medicines"
                      className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[#0F5A47]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Sub Category</label>
                    <input
                      type="text"
                      name="subCategory"
                      value={productForm.subCategory}
                      onChange={handleFormInputChange}
                      placeholder="e.g. Fever & Pain Relief"
                      className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[#0F5A47]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">System of Medicine</label>
                    <div className="relative">
                      <select
                        name="systemOfMedicine"
                        value={productForm.systemOfMedicine}
                        onChange={handleFormInputChange}
                        className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs bg-white appearance-none focus:outline-none focus:ring-2 focus:ring-[#0F5A47]"
                      >
                        <option value="Allopathy">Allopathy</option>
                        <option value="Homeopathy">Homeopathy</option>
                        <option value="Herbal">Herbal</option>
                        <option value="Nutraceutical">Nutraceutical</option>
                      </select>
                      <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Manufacturer</label>
                    <input
                      type="text"
                      name="manufacturer"
                      value={productForm.manufacturer}
                      onChange={handleFormInputChange}
                      placeholder="e.g. Micro Labs"
                      className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[#0F5A47]"
                    />
                  </div>
                </div>
              </div>

              {/* SPECIFICATIONS & IMAGE */}
              <div className="p-5 bg-slate-50/50 rounded-xl border border-slate-200/80 space-y-4">
                <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">SPECIFICATIONS & IMAGE</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Dosage Form</label>
                    <input
                      type="text"
                      name="dosageForm"
                      value={productForm.dosageForm}
                      onChange={handleFormInputChange}
                      placeholder="Tablet / Syrup / Capsule"
                      className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[#0F5A47]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Strength</label>
                    <input
                      type="text"
                      name="strength"
                      value={productForm.strength}
                      onChange={handleFormInputChange}
                      placeholder="650mg"
                      className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[#0F5A47]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Pack Size</label>
                    <input
                      type="text"
                      name="packSize"
                      value={productForm.packSize}
                      onChange={handleFormInputChange}
                      placeholder="15 tablets in 1 strip"
                      className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[#0F5A47]"
                    />
                  </div>

                  <div className="md:col-span-3">
                    <label className="block text-xs font-bold text-slate-700 mb-1">Image URL</label>
                    <input
                      type="text"
                      name="imageUrl"
                      value={productForm.imageUrl}
                      onChange={handleFormInputChange}
                      placeholder="https://example.com/image.jpg"
                      className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[#0F5A47]"
                    />
                  </div>
                </div>
              </div>

              {/* TAGS & FILTERING */}
              <div className="p-5 bg-slate-50/50 rounded-xl border border-slate-200/80 space-y-4">
                <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">TAGS & FILTERING (COMMA SEPARATED)</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Health Conditions</label>
                    <input
                      type="text"
                      name="healthConditions"
                      value={productForm.healthConditions}
                      onChange={handleFormInputChange}
                      placeholder="fever, headache, body-pain"
                      className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[#0F5A47]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Ingredients</label>
                    <input
                      type="text"
                      name="ingredients"
                      value={productForm.ingredients}
                      onChange={handleFormInputChange}
                      placeholder="paracetamol, caffeine"
                      className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[#0F5A47]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Tags</label>
                    <input
                      type="text"
                      name="tags"
                      value={productForm.tags}
                      onChange={handleFormInputChange}
                      placeholder="bestseller, trending"
                      className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[#0F5A47]"
                    />
                  </div>
                </div>
              </div>

              {/* MEDICAL DETAILS */}
              <div className="p-5 bg-slate-50/50 rounded-xl border border-slate-200/80 space-y-4">
                <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">MEDICAL DETAILS</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Description</label>
                    <textarea
                      rows={3}
                      name="description"
                      value={productForm.description}
                      onChange={handleFormInputChange}
                      className="w-full p-3 border border-slate-200 rounded-xl text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[#0F5A47]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Uses</label>
                    <textarea
                      rows={3}
                      name="uses"
                      value={productForm.uses}
                      onChange={handleFormInputChange}
                      className="w-full p-3 border border-slate-200 rounded-xl text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[#0F5A47]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Benefits</label>
                    <textarea
                      rows={3}
                      name="benefits"
                      value={productForm.benefits}
                      onChange={handleFormInputChange}
                      className="w-full p-3 border border-slate-200 rounded-xl text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[#0F5A47]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Side Effects</label>
                    <textarea
                      rows={3}
                      name="sideEffects"
                      value={productForm.sideEffects}
                      onChange={handleFormInputChange}
                      className="w-full p-3 border border-slate-200 rounded-xl text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[#0F5A47]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">How To Use</label>
                    <textarea
                      rows={3}
                      name="howToUse"
                      value={productForm.howToUse}
                      onChange={handleFormInputChange}
                      className="w-full p-3 border border-slate-200 rounded-xl text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[#0F5A47]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Safety Advice</label>
                    <textarea
                      rows={3}
                      name="safetyAdvice"
                      value={productForm.safetyAdvice}
                      onChange={handleFormInputChange}
                      className="w-full p-3 border border-slate-200 rounded-xl text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[#0F5A47]"
                    />
                  </div>
                </div>
              </div>

              {/* CHECKBOXES */}
              <div className="p-4 bg-slate-50/50 rounded-xl border border-slate-200/80 flex flex-wrap items-center gap-6">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700">
                  <input
                    type="checkbox"
                    name="prescriptionRequired"
                    checked={productForm.prescriptionRequired}
                    onChange={handleFormInputChange}
                    className="w-4 h-4 text-[#0F5A47] rounded border-slate-300 focus:ring-[#0F5A47]"
                  />
                  Prescription Required
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700">
                  <input
                    type="checkbox"
                    name="isFeatured"
                    checked={productForm.isFeatured}
                    onChange={handleFormInputChange}
                    className="w-4 h-4 text-[#0F5A47] rounded border-slate-300 focus:ring-[#0F5A47]"
                  />
                  Featured Product
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700">
                  <input
                    type="checkbox"
                    name="isActive"
                    checked={productForm.isActive}
                    onChange={handleFormInputChange}
                    className="w-4 h-4 text-[#0F5A47] rounded border-slate-300 focus:ring-[#0F5A47]"
                  />
                  Is Active
                </label>
              </div>

              {/* BUTTONS */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2.5 bg-[#0F5A47] hover:bg-emerald-900 text-white rounded-xl text-xs font-bold transition shadow-md cursor-pointer flex items-center gap-2 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Saving...
                    </>
                  ) : editingProductId ? (
                    'Update Product'
                  ) : (
                    'Create Product'
                  )}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
