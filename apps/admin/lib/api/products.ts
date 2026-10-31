import { Product } from '@/types/product';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://tabibistan.org';

export async function fetchAdminProducts(): Promise<Product[]> {
  const res = await fetch(`${API_BASE_URL}/products`, {
    cache: 'no-store',
  });

  if (!res.ok) {
    throw new Error(`Database se products fetch nahi ho sake (Status: ${res.status})`);
  }

  const rawProducts = await res.json();

  if (!Array.isArray(rawProducts)) {
    return [];
  }

  return rawProducts.map((prod: any) => ({
    id: prod.id,
    name: prod.name || 'Unnamed Product',
    slug: prod.slug || '',
    genericName: prod.genericName || 'N/A',
    brandName: prod.brandName || 'N/A',
    price: prod.price !== null && prod.price !== undefined ? Number(prod.price) : 0,
    originalPrice: prod.originalPrice !== null && prod.originalPrice !== undefined ? Number(prod.originalPrice) : 0,
    description: prod.description || 'N/A',
    uses: prod.uses || 'N/A',
    benefits: prod.benefits || 'N/A',
    sideEffects: prod.sideEffects || 'N/A',
    howToUse: prod.howToUse || 'N/A',
    working: prod.working || 'N/A',
    safetyAdvice: prod.safetyAdvice || 'N/A',
    quickTips: prod.quickTips || 'N/A',
    storage: prod.storage || 'N/A',
    category: prod.category || prod.categoryName || 'Uncategorized',
    subCategory: prod.subCategory || 'N/A',
    systemOfMedicine: prod.systemOfMedicine || 'Allopathy',
    healthConditions: Array.isArray(prod.healthConditions) ? prod.healthConditions : [],
    ingredients: Array.isArray(prod.ingredients) ? prod.ingredients : [],
    tags: Array.isArray(prod.tags) ? prod.tags : [],
    isFeatured: Boolean(prod.isFeatured),
    dosageForm: prod.dosageForm || 'N/A',
    strength: prod.strength || 'N/A',
    packSize: prod.packSize || 'N/A',
    manufacturer: prod.manufacturer || 'N/A',
    prescriptionRequired: Boolean(prod.prescriptionRequired),
    imageUrl: prod.imageUrl || '',
    isActive: prod.isActive !== undefined ? Boolean(prod.isActive) : true,
    createdAt: prod.createdAt ? new Date(prod.createdAt).toLocaleDateString('en-GB') : 'N/A',
    updatedAt: prod.updatedAt ? new Date(prod.updatedAt).toLocaleDateString('en-GB') : 'N/A',
  }));
}