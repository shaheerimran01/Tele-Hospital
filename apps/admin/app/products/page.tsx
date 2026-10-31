'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { 
  LayoutDashboard, 
  Bell, 
  ShoppingBag, 
  Package, 
  Users, 
  Settings, 
  Search,
  RefreshCw,
  Plus,
  Edit,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Filter,
  AlertCircle,
  Star,
  X,
  Boxes,
  Building2,
  Globe,
} from 'lucide-react';
import { fetchAdminProducts } from '@/lib/api/products';
import { Product } from '@/types/product';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://tabibistan.org';

const initialFormState = {
  name: '',
  slug: '',
  genericName: '',
  brandName: '',
  price: '',
  originalPrice: '',
  description: '',
  uses: '',
  benefits: '',
  sideEffects: '',
  howToUse: '',
  working: '',
  safetyAdvice: '',
  quickTips: '',
  storage: '',
  category: '',
  subCategory: '',
  systemOfMedicine: 'Allopathy',
  healthConditions: '',
  ingredients: '',
  tags: '',
  isFeatured: false,
  dosageForm: '',
  strength: '',
  packSize: '',
  manufacturer: '',
  prescriptionRequired: false,
  imageUrl: '',
  isActive: true,
};

// Auto Slug Helper Generator Function
const createSlug = (text: string) => {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/[\s_-]+/g, '-') // Replace spaces and underscores with single hyphen
    .replace(/^-+|-+$/g, ''); // Trim leading and trailing hyphens
};

// Smart Pagination Helper Function (Ellipsis '...' ke sath)
const getPaginationPages = (currentPage: number, totalPages: number) => {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  if (currentPage <= 3) {
    return [1, 2, 3, 4, '...', totalPages];
  }

  if (currentPage >= totalPages - 2) {
    return [1, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
  }

  return [1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages];
};

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filters State
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedSystem, setSelectedSystem] = useState<string>('All');
  const [selectedRx, setSelectedRx] = useState<string>('All');
  const [selectedStatus, setSelectedStatus] = useState<string>('All');
  const [minPrice, setMinPrice] = useState<string>('');
  const [maxPrice, setMaxPrice] = useState<string>('');
  const [sortBy, setSortBy] = useState<string>('Default');

  // Pagination State
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 15;

  // Add / Edit Modal State
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [formData, setFormData] = useState(initialFormState);
  const [submitting, setSubmitting] = useState<boolean>(false);

  useEffect(() => {
    loadProductsData();
  }, []);

  const loadProductsData = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchAdminProducts();
      setProducts(data);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Database se products load nahi ho sake.');
    } finally {
      setLoading(false);
    }
  };

  // Open Add Product Modal
  const handleOpenAddModal = () => {
    setModalMode('add');
    setSelectedProductId(null);
    setFormData(initialFormState);
    setIsModalOpen(true);
  };

  // Open Edit Product Modal with Pre-filled DB Data
  const handleOpenEditModal = (prod: Product) => {
    setModalMode('edit');
    setSelectedProductId(prod.id);
    setFormData({
      name: prod.name || '',
      slug: prod.slug || '',
      genericName: prod.genericName || '',
      brandName: prod.brandName || '',
      price: prod.price !== undefined ? String(prod.price) : '',
      originalPrice: prod.originalPrice !== undefined ? String(prod.originalPrice) : '',
      description: prod.description || '',
      uses: prod.uses || '',
      benefits: prod.benefits || '',
      sideEffects: prod.sideEffects || '',
      howToUse: prod.howToUse || '',
      working: prod.working || '',
      safetyAdvice: prod.safetyAdvice || '',
      quickTips: prod.quickTips || '',
      storage: prod.storage || '',
      category: prod.category || '',
      subCategory: prod.subCategory || '',
      systemOfMedicine: prod.systemOfMedicine || 'Allopathy',
      healthConditions: Array.isArray(prod.healthConditions) ? prod.healthConditions.join(', ') : '',
      ingredients: Array.isArray(prod.ingredients) ? prod.ingredients.join(', ') : '',
      tags: Array.isArray(prod.tags) ? prod.tags.join(', ') : '',
      isFeatured: Boolean(prod.isFeatured),
      dosageForm: prod.dosageForm || '',
      strength: prod.strength || '',
      packSize: prod.packSize || '',
      manufacturer: prod.manufacturer || '',
      prescriptionRequired: Boolean(prod.prescriptionRequired),
      imageUrl: prod.imageUrl || '',
      isActive: prod.isActive !== undefined ? Boolean(prod.isActive) : true,
    });
    setIsModalOpen(true);
  };

  // Handle Form Change
  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData((prev) => ({ ...prev, [name]: checked }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  // Automatic Slug Generator on Name Change
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const nameVal = e.target.value;
    setFormData((prev) => ({
      ...prev,
      name: nameVal,
      slug: createSlug(nameVal), // Automatically updates slug from name
    }));
  };

  // Submit Handler (Add + Edit)
  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    const payload = {
      ...formData,
      price: formData.price ? parseFloat(formData.price) : null,
      originalPrice: formData.originalPrice ? parseFloat(formData.originalPrice) : null,
      healthConditions: formData.healthConditions ? formData.healthConditions.split(',').map((s) => s.trim()).filter(Boolean) : [],
      ingredients: formData.ingredients ? formData.ingredients.split(',').map((s) => s.trim()).filter(Boolean) : [],
      tags: formData.tags ? formData.tags.split(',').map((s) => s.trim()).filter(Boolean) : [],
    };

    try {
      if (modalMode === 'add') {
        const res = await fetch(`${API_BASE_URL}/products`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error('Product create karne me issue aaya.');
      } else {
        const res = await fetch(`${API_BASE_URL}/products/${selectedProductId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error('Product update karne me issue aaya.');
      }

      setIsModalOpen(false);
      await loadProductsData();
    } catch (err: any) {
      alert(err.message || 'Operation failed!');
    } finally {
      setSubmitting(false);
    }
  };

  // Delete Product Handler
  const handleDeleteProduct = async (id: string, name: string) => {
    if (!confirm(`Kya aap "${name}" ko database se delete karna chahte hain?`)) return;

    try {
      const res = await fetch(`${API_BASE_URL}/products/${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Product delete nahi ho saka.');
      await loadProductsData();
    } catch (err: any) {
      alert(err.message || 'Delete operation fail ho gaya.');
    }
  };

  // Filter Logic over Real Prisma Database Items
  const filteredProducts = products.filter((prod) => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchName = prod.name.toLowerCase().includes(q);
      const matchCat = prod.category?.toLowerCase().includes(q);
      const matchSub = prod.subCategory?.toLowerCase().includes(q);
      const matchMan = prod.manufacturer?.toLowerCase().includes(q);
      const matchGen = prod.genericName?.toLowerCase().includes(q);
      const matchBrand = prod.brandName?.toLowerCase().includes(q);
      if (!matchName && !matchCat && !matchSub && !matchMan && !matchGen && !matchBrand) return false;
    }

    if (selectedCategory !== 'All' && prod.category !== selectedCategory) {
      return false;
    }

    if (selectedSystem !== 'All' && prod.systemOfMedicine !== selectedSystem) {
      return false;
    }

    if (selectedRx !== 'All') {
      if (selectedRx === 'Required' && !prod.prescriptionRequired) return false;
      if (selectedRx === 'Not Required' && prod.prescriptionRequired) return false;
    }

    if (selectedStatus !== 'All') {
      if (selectedStatus === 'Active' && !prod.isActive) return false;
      if (selectedStatus === 'Inactive' && prod.isActive) return false;
    }

    if (minPrice && (prod.price ?? 0) < parseFloat(minPrice)) return false;
    if (maxPrice && (prod.price ?? 0) > parseFloat(maxPrice)) return false;

    return true;
  });

  const sortedProducts = [...filteredProducts].sort((a, b) => {
    if (sortBy === 'price-low') return (a.price ?? 0) - (b.price ?? 0);
    if (sortBy === 'price-high') return (b.price ?? 0) - (a.price ?? 0);
    if (sortBy === 'name') return a.name.localeCompare(b.name);
    return 0;
  });

  const totalPages = Math.ceil(sortedProducts.length / itemsPerPage) || 1;
  const paginatedProducts = sortedProducts.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const categoriesList = Array.from(
    new Set(products.map((p) => p.category).filter(Boolean))
  ) as string[];

  const systemList = Array.from(
    new Set(products.map((p) => p.systemOfMedicine).filter(Boolean))
  ) as string[];

  return (
    <div className="flex min-h-screen bg-[#F8FAFC] text-slate-800 font-sans">
      {/* Sidebar */}
      <aside className="w-64 bg-[#0F2942] text-white flex flex-col shrink-0">
        <div className="flex items-center gap-2 p-6 font-bold text-xl tracking-wide">
          <span className="text-2xl font-black text-white">+</span> Tabibistan
        </div>

        <nav className="flex-1 px-4 space-y-1">
          <Link href="/" className="flex items-center gap-3 px-4 py-3 text-slate-300 hover:bg-[#1A3A5C]/50 rounded-lg text-sm transition">
            <LayoutDashboard className="w-5 h-5" />
            Dashboard
          </Link>
          <Link href="/notifications" className="flex items-center justify-between px-4 py-3 text-slate-300 hover:bg-[#1A3A5C]/50 rounded-lg text-sm transition">
            <div className="flex items-center gap-3">
              <Bell className="w-5 h-5" />
              Notifications
            </div>
          </Link>
          <Link href="/orders" className="flex items-center justify-between px-4 py-3 text-slate-300 hover:bg-[#1A3A5C]/50 rounded-lg text-sm transition">
            <div className="flex items-center gap-3">
              <ShoppingBag className="w-5 h-5" />
              Orders
            </div>
          </Link>
          <Link href="/products" className="flex items-center gap-3 px-4 py-3 bg-[#1A3A5C] text-white rounded-lg font-medium text-sm">
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
          <Link href="/pharmacies" className="flex items-center gap-3 px-4 py-3 text-slate-300 hover:bg-[#1A3A5C]/50 rounded-lg text-sm transition">
            <Building2 className="w-5 h-5" />
            Pharmacies
          </Link>
          <Link href="/users" className="flex items-center gap-3 px-4 py-3 text-slate-300 hover:bg-[#1A3A5C]/50 rounded-lg text-sm transition">
            <Users className="w-5 h-5" />
            Users
          </Link>
          <Link href="/settings" className="flex items-center gap-3 px-4 py-3 text-slate-300 hover:bg-[#1A3A5C]/50 rounded-lg text-sm transition">
            <Settings className="w-5 h-5" />
            Settings
          </Link>
        </nav>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 p-6 overflow-y-auto">
        {/* Top Header Actions */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
          <button 
            type="button"
            onClick={handleOpenAddModal}
            className="inline-flex items-center gap-2 bg-[#1A3A5C] hover:bg-[#0F2942] text-white px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer shadow-xs"
          >
            <Plus className="w-4 h-4" />
            Add Product
          </button>

          <div className="flex items-center gap-3 ml-auto">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search by name, brand, formula, category..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-4 py-1.5 text-xs border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 w-72"
              />
            </div>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-3 py-1.5 text-xs border border-slate-200 rounded-xl bg-white text-slate-700 font-medium focus:outline-none"
            >
              <option value="Default">Default Order</option>
              <option value="price-low">Price: Low to High</option>
              <option value="price-high">Price: High to Low</option>
              <option value="name">Name: A to Z</option>
            </select>

            <button
              onClick={loadProductsData}
              className="p-1.5 border border-slate-200 rounded-xl bg-white hover:bg-slate-50 text-slate-600 transition cursor-pointer"
              title="Refresh Products"
            >
              <RefreshCw className="w-4 h-4" />
            </button>

            <span className="text-xs font-semibold text-slate-500">
              {sortedProducts.length} products
            </span>
          </div>
        </div>

        {/* Filters Toolbar */}
        <div className="flex flex-wrap items-center gap-2 mb-4 bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs text-xs">
          <div className="flex items-center gap-1.5 font-bold text-slate-700 mr-1">
            <Filter className="w-3.5 h-3.5 text-blue-600" />
            <span>Filters:</span>
            <button
              onClick={() => {
                setSelectedCategory('All');
                setSelectedSystem('All');
                setSelectedRx('All');
                setSelectedStatus('All');
                setMinPrice('');
                setMaxPrice('');
              }}
              className="bg-[#1A3A5C] hover:bg-[#0F2942] text-white px-2 py-0.5 rounded text-[11px] font-bold cursor-pointer transition"
            >
              Reset
            </button>
          </div>

          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-2.5 py-1 border border-slate-200 rounded-md bg-white text-slate-700 font-medium focus:outline-none"
          >
            <option value="All">Category: All</option>
            {categoriesList.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>

          <select
            value={selectedSystem}
            onChange={(e) => setSelectedSystem(e.target.value)}
            className="px-2.5 py-1 border border-slate-200 rounded-md bg-white text-slate-700 font-medium focus:outline-none"
          >
            <option value="All">Medicine System: All</option>
            {systemList.map((sys) => (
              <option key={sys} value={sys}>{sys}</option>
            ))}
          </select>

          <select
            value={selectedRx}
            onChange={(e) => setSelectedRx(e.target.value)}
            className="px-2.5 py-1 border border-slate-200 rounded-md bg-white text-slate-700 font-medium focus:outline-none"
          >
            <option value="All">Prescription: All</option>
            <option value="Required">Required</option>
            <option value="Not Required">Not Required</option>
          </select>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-2.5 py-1 border border-slate-200 rounded-md bg-white text-slate-700 font-medium focus:outline-none"
          >
            <option value="All">Status: All</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </select>

          <div className="flex items-center gap-1">
            <input
              type="number"
              placeholder="Min Rs."
              value={minPrice}
              onChange={(e) => setMinPrice(e.target.value)}
              className="w-20 px-2 py-1 border border-slate-200 rounded-md bg-white text-slate-700 focus:outline-none"
            />
            <span className="text-slate-400">-</span>
            <input
              type="number"
              placeholder="Max Rs."
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value)}
              className="w-20 px-2 py-1 border border-slate-200 rounded-md bg-white text-slate-700 focus:outline-none"
            />
          </div>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold rounded-xl flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* 32 Prisma Schema Columns Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[3200px]">
              <thead>
                <tr className="border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider bg-slate-50/80">
                  <th className="py-3.5 px-3 sticky left-0 bg-slate-50 z-10 border-r border-slate-200 shadow-2xs">ID</th>
                  <th className="py-3.5 px-4 min-w-[220px]">Product Name & Slug</th>
                  <th className="py-3.5 px-3 min-w-[180px]">Generic Name (Salt)</th>
                  <th className="py-3.5 px-3 min-w-[150px]">Brand Name</th>
                  <th className="py-3.5 px-3">Price</th>
                  <th className="py-3.5 px-3">Original Price</th>
                  <th className="py-3.5 px-3 min-w-[150px]">Category</th>
                  <th className="py-3.5 px-3 min-w-[150px]">Sub Category</th>
                  <th className="py-3.5 px-3">System of Medicine</th>
                  <th className="py-3.5 px-3">Dosage Form</th>
                  <th className="py-3.5 px-3">Strength</th>
                  <th className="py-3.5 px-3">Pack Size</th>
                  <th className="py-3.5 px-3 min-w-[150px]">Manufacturer</th>
                  <th className="py-3.5 px-3">Rx Required</th>
                  <th className="py-3.5 px-3">Featured</th>
                  <th className="py-3.5 px-3">Status</th>
                  <th className="py-3.5 px-3 min-w-[180px]">Health Conditions</th>
                  <th className="py-3.5 px-3 min-w-[180px]">Ingredients</th>
                  <th className="py-3.5 px-3 min-w-[180px]">Tags</th>
                  <th className="py-3.5 px-3 min-w-[200px]">Storage</th>
                  <th className="py-3.5 px-3 min-w-[250px]">Description</th>
                  <th className="py-3.5 px-3 min-w-[200px]">Uses</th>
                  <th className="py-3.5 px-3 min-w-[200px]">Benefits</th>
                  <th className="py-3.5 px-3 min-w-[200px]">Side Effects</th>
                  <th className="py-3.5 px-3 min-w-[200px]">How To Use</th>
                  <th className="py-3.5 px-3 min-w-[200px]">Working</th>
                  <th className="py-3.5 px-3 min-w-[200px]">Safety Advice</th>
                  <th className="py-3.5 px-3 min-w-[200px]">Quick Tips</th>
                  <th className="py-3.5 px-3 min-w-[150px]">Image URL</th>
                  <th className="py-3.5 px-3">Created At</th>
                  <th className="py-3.5 px-3">Updated At</th>
                  <th className="py-3.5 px-4 text-center sticky right-0 bg-slate-50 z-10 border-l border-slate-200 shadow-2xs">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                {loading ? (
                  <tr>
                    <td colSpan={32} className="py-12 text-center text-slate-400 font-medium">
                      Database se products load ho rahe hain...
                    </td>
                  </tr>
                ) : paginatedProducts.length === 0 ? (
                  <tr>
                    <td colSpan={32} className="py-12 text-center text-slate-400 font-medium">
                      Database mein koi product nahi mila.
                    </td>
                  </tr>
                ) : (
                  paginatedProducts.map((prod) => (
                    <tr key={prod.id} className="hover:bg-blue-50/20 transition">
                      <td className="py-3.5 px-3 font-mono text-[11px] text-slate-500 sticky left-0 bg-white z-10 border-r border-slate-100 font-bold">
                        #{prod.id.slice(0, 8).toUpperCase()}
                      </td>

                      <td className="py-3.5 px-4 font-bold text-slate-900 whitespace-nowrap">
                        <div>
                          <p className="text-xs font-bold text-slate-900">{prod.name}</p>
                          <p className="text-[10px] text-blue-600 font-mono font-normal">
                            /{prod.slug}
                          </p>
                        </div>
                      </td>

                      <td className="py-3.5 px-3 text-slate-600 font-medium">{prod.genericName}</td>
                      <td className="py-3.5 px-3 text-slate-700 font-semibold">{prod.brandName}</td>
                      <td className="py-3.5 px-3 font-bold text-slate-900">Rs. {prod.price?.toLocaleString()}</td>
                      <td className="py-3.5 px-3 text-slate-400 line-through">Rs. {prod.originalPrice?.toLocaleString()}</td>
                      <td className="py-3.5 px-3 text-slate-700 font-medium">{prod.category}</td>
                      <td className="py-3.5 px-3 text-slate-500">{prod.subCategory}</td>
                      <td className="py-3.5 px-3 text-slate-600 font-medium">{prod.systemOfMedicine}</td>
                      <td className="py-3.5 px-3 text-slate-600">{prod.dosageForm}</td>
                      <td className="py-3.5 px-3 text-slate-600">{prod.strength}</td>
                      <td className="py-3.5 px-3 text-slate-600">{prod.packSize}</td>
                      <td className="py-3.5 px-3 text-slate-700">{prod.manufacturer}</td>

                      <td className="py-3.5 px-3">
                        {prod.prescriptionRequired ? (
                          <span className="bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded text-[10px] font-bold">Required</span>
                        ) : (
                          <span className="bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded text-[10px] font-bold">Not Required</span>
                        )}
                      </td>

                      <td className="py-3.5 px-3">
                        {prod.isFeatured ? (
                          <span className="bg-purple-50 text-purple-700 border border-purple-200 px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1 w-max">
                            <Star className="w-3 h-3 fill-purple-600" /> Featured
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[11px]">No</span>
                        )}
                      </td>

                      <td className="py-3.5 px-3">
                        <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold border ${
                          prod.isActive ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-slate-100 text-slate-600 border-slate-200'
                        }`}>
                          {prod.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>

                      <td className="py-3.5 px-3">
                        <div className="flex flex-wrap gap-1 max-w-[180px]">
                          {prod.healthConditions.length > 0 ? prod.healthConditions.map((c, i) => (
                            <span key={i} className="bg-slate-100 text-slate-700 text-[9px] font-medium px-1.5 py-0.5 rounded">{c}</span>
                          )) : <span className="text-slate-400 text-[11px]">None</span>}
                        </div>
                      </td>

                      <td className="py-3.5 px-3">
                        <div className="flex flex-wrap gap-1 max-w-[180px]">
                          {prod.ingredients.length > 0 ? prod.ingredients.map((ing, i) => (
                            <span key={i} className="bg-indigo-50 text-indigo-700 text-[9px] font-medium px-1.5 py-0.5 rounded">{ing}</span>
                          )) : <span className="text-slate-400 text-[11px]">None</span>}
                        </div>
                      </td>

                      <td className="py-3.5 px-3">
                        <div className="flex flex-wrap gap-1 max-w-[180px]">
                          {prod.tags.length > 0 ? prod.tags.map((t, i) => (
                            <span key={i} className="bg-amber-50 text-amber-700 text-[9px] font-medium px-1.5 py-0.5 rounded">#{t}</span>
                          )) : <span className="text-slate-400 text-[11px]">None</span>}
                        </div>
                      </td>

                      <td className="py-3.5 px-3 text-slate-600 truncate max-w-[200px]" title={prod.storage}>{prod.storage}</td>
                      <td className="py-3.5 px-3 text-slate-500 truncate max-w-[250px]" title={prod.description}>{prod.description}</td>
                      <td className="py-3.5 px-3 text-slate-500 truncate max-w-[200px]" title={prod.uses}>{prod.uses}</td>
                      <td className="py-3.5 px-3 text-slate-500 truncate max-w-[200px]" title={prod.benefits}>{prod.benefits}</td>
                      <td className="py-3.5 px-3 text-slate-500 truncate max-w-[200px]" title={prod.sideEffects}>{prod.sideEffects}</td>
                      <td className="py-3.5 px-3 text-slate-500 truncate max-w-[200px]" title={prod.howToUse}>{prod.howToUse}</td>
                      <td className="py-3.5 px-3 text-slate-500 truncate max-w-[200px]" title={prod.working}>{prod.working}</td>
                      <td className="py-3.5 px-3 text-slate-500 truncate max-w-[200px]" title={prod.safetyAdvice}>{prod.safetyAdvice}</td>
                      <td className="py-3.5 px-3 text-slate-500 truncate max-w-[200px]" title={prod.quickTips}>{prod.quickTips}</td>
                      <td className="py-3.5 px-3 text-slate-400 font-mono text-[10px] truncate max-w-[150px]">{prod.imageUrl || 'No image'}</td>
                      <td className="py-3.5 px-3 text-slate-500 text-[11px]">{prod.createdAt}</td>
                      <td className="py-3.5 px-3 text-slate-500 text-[11px]">{prod.updatedAt}</td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-center sticky right-0 bg-white z-10 border-l border-slate-100">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(prod)}
                            className="p-1 border border-slate-200 rounded-lg hover:bg-slate-100 text-slate-600 transition cursor-pointer"
                            title="Edit Product"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteProduct(prod.id, prod.name)}
                            className="p-1 border border-rose-200 rounded-lg hover:bg-rose-50 text-rose-600 transition cursor-pointer"
                            title="Delete Product"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          <div className="p-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-4 bg-slate-50/50 text-xs text-slate-500 font-medium">
            {/* Left Side Text with whitespace-nowrap */}
            <div className="whitespace-nowrap font-medium text-slate-600">
              Page <span className="font-bold text-slate-800">{currentPage}</span> of{' '}
              <span className="font-bold text-slate-800">{totalPages}</span> —{' '}
              <span className="font-bold text-slate-800">{sortedProducts.length}</span> products in Database
            </div>

            {/* Right Side Smart Pagination Buttons */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                type="button"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 transition cursor-pointer"
                title="Previous Page"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              {getPaginationPages(currentPage, totalPages).map((page, idx) => {
                if (page === '...') {
                  return (
                    <span key={`dots-${idx}`} className="px-2 py-1 text-slate-400 font-bold select-none">
                      ...
                    </span>
                  );
                }

                return (
                  <button
                    key={page}
                    type="button"
                    onClick={() => setCurrentPage(Number(page))}
                    className={`min-w-[32px] h-8 px-2.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center justify-center ${
                      currentPage === page
                        ? 'bg-[#1A3A5C] text-white shadow-2xs'
                        : 'bg-white border border-slate-200 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    {page}
                  </button>
                );
              })}

              <button
                type="button"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 transition cursor-pointer"
                title="Next Page"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* ============================================================ */}
        {/* ADD & EDIT PRODUCT MODAL (WITH AUTO SLUG GENERATOR)          */}
        {/* ============================================================ */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 my-auto">
              {/* Modal Header */}
              <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50 rounded-t-2xl">
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    {modalMode === 'add' ? '➕ Add New Product' : '✏️ Edit Product Details'}
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {modalMode === 'add' ? 'Fill product details. Slug will be configured automatically.' : `Editing ID: #${selectedProductId}`}
                  </p>
                </div>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-lg transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Form Body */}
              <form onSubmit={handleSubmitForm} className="p-6 overflow-y-auto space-y-5 text-xs">
                {/* Basic Section */}
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4">
                  <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider">Basic Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Product Name *</label>
                      <input
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleNameChange}
                        required
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                        placeholder="e.g. Dolo 650mg Tablet"
                      />
                    </div>

                    {/* READONLY AUTO-CONFIGURED SLUG FIELD */}
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">
                        Auto-Configured Slug <span className="text-[10px] text-blue-600 font-normal">(Generated automatically)</span>
                      </label>
                      <input
                        type="text"
                        name="slug"
                        value={formData.slug}
                        readOnly
                        required
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-slate-100 text-slate-500 font-mono text-[11px] cursor-not-allowed select-none"
                        placeholder="auto-generated-slug"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Generic Name (Formula/Salt)</label>
                      <input
                        type="text"
                        name="genericName"
                        value={formData.genericName}
                        onChange={handleFormChange}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                        placeholder="e.g. Paracetamol 650mg"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Brand Name / Marketer</label>
                      <input
                        type="text"
                        name="brandName"
                        value={formData.brandName}
                        onChange={handleFormChange}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                        placeholder="e.g. Micro Labs Ltd"
                      />
                    </div>
                  </div>
                </div>

                {/* Pricing & Category */}
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4">
                  <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider">Pricing & Classification</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Price (Rs.) *</label>
                      <input
                        type="number"
                        step="0.01"
                        name="price"
                        value={formData.price}
                        onChange={handleFormChange}
                        required
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                        placeholder="35.00"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Original Price (Rs.)</label>
                      <input
                        type="number"
                        step="0.01"
                        name="originalPrice"
                        value={formData.originalPrice}
                        onChange={handleFormChange}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                        placeholder="40.00"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Category</label>
                      <input
                        type="text"
                        name="category"
                        value={formData.category}
                        onChange={handleFormChange}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                        placeholder="e.g. Medicines"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Sub Category</label>
                      <input
                        type="text"
                        name="subCategory"
                        value={formData.subCategory}
                        onChange={handleFormChange}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                        placeholder="e.g. Fever & Pain Relief"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1">System of Medicine</label>
                      <select
                        name="systemOfMedicine"
                        value={formData.systemOfMedicine}
                        onChange={handleFormChange}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white font-medium"
                      >
                        <option value="Allopathy">Allopathy</option>
                        <option value="Homeopathy">Homeopathy</option>
                        <option value="Herbal">Herbal</option>
                        <option value="Ayurveda">Ayurveda</option>
                        <option value="Unani">Unani</option>
                      </select>
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Manufacturer</label>
                      <input
                        type="text"
                        name="manufacturer"
                        value={formData.manufacturer}
                        onChange={handleFormChange}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                        placeholder="e.g. Micro Labs"
                      />
                    </div>
                  </div>
                </div>

                {/* Specs */}
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4">
                  <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider">Specifications & Image</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Dosage Form</label>
                      <input
                        type="text"
                        name="dosageForm"
                        value={formData.dosageForm}
                        onChange={handleFormChange}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                        placeholder="Tablet / Syrup / Capsule"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Strength</label>
                      <input
                        type="text"
                        name="strength"
                        value={formData.strength}
                        onChange={handleFormChange}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                        placeholder="650mg"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Pack Size</label>
                      <input
                        type="text"
                        name="packSize"
                        value={formData.packSize}
                        onChange={handleFormChange}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                        placeholder="15 tablets in 1 strip"
                      />
                    </div>

                    <div className="md:col-span-3">
                      <label className="block font-bold text-slate-700 mb-1">Image URL</label>
                      <input
                        type="text"
                        name="imageUrl"
                        value={formData.imageUrl}
                        onChange={handleFormChange}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white font-mono"
                        placeholder="https://example.com/image.jpg"
                      />
                    </div>
                  </div>
                </div>

                {/* Arrays: Conditions, Ingredients, Tags */}
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4">
                  <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider">Tags & Filtering (Comma Separated)</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Health Conditions</label>
                      <input
                        type="text"
                        name="healthConditions"
                        value={formData.healthConditions}
                        onChange={handleFormChange}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                        placeholder="fever, headache, body-pain"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Ingredients</label>
                      <input
                        type="text"
                        name="ingredients"
                        value={formData.ingredients}
                        onChange={handleFormChange}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                        placeholder="paracetamol, caffeine"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Tags</label>
                      <input
                        type="text"
                        name="tags"
                        value={formData.tags}
                        onChange={handleFormChange}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                        placeholder="bestseller, trending"
                      />
                    </div>
                  </div>
                </div>

                {/* Textarea Detailed Fields */}
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4">
                  <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider">Medical Details</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Description</label>
                      <textarea
                        name="description"
                        rows={2}
                        value={formData.description}
                        onChange={handleFormChange}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Uses</label>
                      <textarea
                        name="uses"
                        rows={2}
                        value={formData.uses}
                        onChange={handleFormChange}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Benefits</label>
                      <textarea
                        name="benefits"
                        rows={2}
                        value={formData.benefits}
                        onChange={handleFormChange}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Side Effects</label>
                      <textarea
                        name="sideEffects"
                        rows={2}
                        value={formData.sideEffects}
                        onChange={handleFormChange}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1">How To Use</label>
                      <textarea
                        name="howToUse"
                        rows={2}
                        value={formData.howToUse}
                        onChange={handleFormChange}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Safety Advice</label>
                      <textarea
                        name="safetyAdvice"
                        rows={2}
                        value={formData.safetyAdvice}
                        onChange={handleFormChange}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                      />
                    </div>
                  </div>
                </div>

                {/* Flags Checkboxes */}
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-wrap gap-6 font-bold text-slate-800">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      name="prescriptionRequired"
                      checked={formData.prescriptionRequired}
                      onChange={handleFormChange}
                      className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                    />
                    <span>Prescription Required</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      name="isFeatured"
                      checked={formData.isFeatured}
                      onChange={handleFormChange}
                      className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500"
                    />
                    <span>Featured Product</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      name="isActive"
                      checked={formData.isActive}
                      onChange={handleFormChange}
                      className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
                    />
                    <span>Is Active</span>
                  </label>
                </div>

                {/* Submit Actions */}
                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 border border-slate-300 rounded-xl bg-white hover:bg-slate-100 text-slate-700 font-bold transition cursor-pointer"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-5 py-2 bg-[#1A3A5C] hover:bg-[#0F2942] text-white rounded-xl font-bold transition cursor-pointer shadow-xs disabled:opacity-50"
                  >
                    {submitting ? 'Saving...' : modalMode === 'add' ? 'Create Product' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}