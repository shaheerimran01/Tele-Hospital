export interface ApiProduct {
  id: string;
  name: string;
  slug: string;
  genericName?: string;
  brandName?: string;
  description?: string;
  category: string;
  subCategory?: string;
  dosageForm?: string;
  strength?: string;
  packSize?: string;
  manufacturer?: string;
  prescriptionRequired?: boolean;
  imageUrl?: string;
  price?: number;
  originalPrice?: number;
  createdAt?: string;
  updatedAt?: string;
}

export async function getApiProducts(): Promise<ApiProduct[]> {
  try {
    const res = await fetch('http://localhost:4000/products', {
      cache: 'no-store',
    });
    if (!res.ok) {
      throw new Error(`Failed to fetch products: ${res.statusText}`);
    }
    return await res.json();
  } catch (error) {
    console.error('API Fetch Error:', error);
    return [];
  }
}