import { Product } from './ProductSection';

export interface ApiProduct {
  id: string;
  name: string;
  slug: string;
  genericName?: string;
  brandName?: string;
  description?: string;
  uses?: string;
  benefits?: string;
  sideEffects?: string;
  howToUse?: string;
  working?: string;
  safetyAdvice?: string;
  quickTips?: string;
  storage?: string;
  category?: string;
  subCategory?: string;
  dosageForm?: string;
  strength?: string;
  packSize?: string;
  manufacturer?: string;
  prescriptionRequired?: boolean;
  imageUrl?: string;
  price?: number;
  originalPrice?: number;
  healthConditions?: string[] | string;
  tags?: string[] | string;
  isActive?: boolean | number | string;
}


/**
 * Dynamic Database Fetcher for Skin Care Products
 * Strictly filters products matching (category OR subCategory ~* 'skin care|skincare|derma care') AND tags ~* 'best-seller'
 */
export async function getSkinCareProducts(): Promise<Product[]> {
  try {
    const res = await fetch('http://localhost:4000/products', { cache: 'no-store' });

    if (!res.ok) {
      console.error(`Database Error: ${res.statusText}`);
      return [];
    }

    const data = await res.json();
    const products = Array.isArray(data)
      ? data
      : Array.isArray(data.data)
      ? data.data
      : data.products || [];

    if (!products.length) return [];

    const getSafeText = (val?: any): string => {
      if (!val) return '';
      if (Array.isArray(val)) return val.join(' ').toLowerCase();
      return String(val).toLowerCase();
    };

    const skinCareRegex = /skin\s*care|skincare|derma\s*care/i;
    const bestSellerRegex = /best-?seller|bestseller/i;

    const matchedProducts = products
      .filter((p: any) => {
        if (p.isActive === false) return false;

        const catText = getSafeText(p.category);
        const subCatText = getSafeText(p.subCategory);
        const tagsText = getSafeText(p.tags);

        // SQL Equivalent: (LOWER(category) ~* 'skin care|skincare|derma care' OR LOWER("subCategory") ~* 'skin care|skincare|derma care') AND tags ~* 'best-?seller'
        const matchesCategory = skinCareRegex.test(catText) || skinCareRegex.test(subCatText);
        const isBestSeller = bestSellerRegex.test(tagsText);

        return matchesCategory && isBestSeller;
      })
      .slice(0, 10); // Limit to top 10 for homepage carousel

    return matchedProducts.map((p: any) => {
      const origPrice = p.originalPrice || p.price;
      const discountVal =
        origPrice > p.price ? Math.round(((origPrice - p.price) / origPrice) * 100) : 0;

      return {
        id: p.id,
        name: p.name,
        size: p.packSize || p.size || '50ml',
        rating: p.rating || 4.4,
        reviewsCount: p.reviewsCount || 240,
        delivery: 'Get by 6pm, today',
        price: `Rs.${p.price}`,
        originalPrice: origPrice > p.price ? `Rs.${origPrice}` : undefined,
        discount: discountVal > 0 ? `${discountVal}% off` : undefined,
        image:
          p.imageUrl ||
          p.image ||
          'https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=300&q=80',
        slug:
          p.slug ||
          p.name
            .toLowerCase()
            .replace(/\s+/g, '-')
            .replace(/[^a-z0-9-]/g, ''),
      };
    });
  } catch (error) {
    console.error('Error fetching Skin Care Products:', error);
    return [];
  }
}




const COMBO_METADATA: Record<string, { title: string; image: string }> = {
  'combo-1': {
    title: 'Diabetes Monitor & Control',
    image: 'https://media.istockphoto.com/id/2129782295/photo/sugar-cubes-in-spoon-with-blood-glucose-meter-lancet-and-stethoscope-on-blue-background.jpg?s=612x612&w=0&k=20&c=RlKHR40vmxS1jGbIFaE6Jd8z4ntP65XV6r6ETQX_vz8=',
  },
  'combo-2': {
    title: 'Complete Acne Care',
    image: 'https://img.magnific.com/free-photo/portrait-young-woman-being-confident-with-her-acne_23-2148982603.jpg?semt=ais_hybrid&w=740&q=80',
  },
  'combo-3': {
    title: 'Hair Fall Rescue',
    image: 'https://www.uclahealth.org/sites/default/files/styles/landscape_16x9_030000_1200x675/public/images/6d/female-hair-loss.jpg?f=8529bd25&itok=rBvRHuno',
  },
  'combo-4': {
    title: 'Daily Brightening Skin',
    image: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTApHGGLCE1VNs0teiUXuAFFgv0P1dVHNY4ZrYkL9gvo6_i7ycZ5Gf4nRc&s=10',
  },
  'combo-5': {
    title: 'Cold & Cough Relief',
    image: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTWavYYyTVtQ-rO1rqxHJUvVC3KvbyMOnxNxOtRb3VKPJk4dylyHMe6eCI&s=10',
  },
  'combo-6': {
    title: 'Bone & Joint Support',
    image: 'https://images.unsplash.com/photo-1471864190281-a93a3070b6de?auto=format&fit=crop&w=300&q=80',
  },
  'combo-7': {
    title: 'Baby Essentials',
    image: 'https://static.emmasdiary.co.uk/images/default-source/affiliate/newborn-baby-essentials-checklist.jpg?sfvrsn=c2121287_0',
  },
  'combo-8': {
    title: 'Oral Care Daily',
    image: 'https://img.magnific.com/free-vector/oral-hygiene-dental-care-illustration_1308-181351.jpg?semt=ais_hybrid&w=740&q=80',
  },
  'combo-9': {
    title: "Men's Face Care",
    image: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQhuDo7e1Hwt8UMSg_dbc9uRB1ooeRO9ZFy6LwcCzOSnoTd1qIJk6BSqHU&s=10',
  },
  'combo-10': {
    title: 'Energy & Recovery',
    image: 'https://images.unsplash.com/photo-1584017911766-d451b3d0e843?auto=format&fit=crop&w=300&q=80',
  },
};

export async function getComboDeals(): Promise<Product[]> {
  try {
    const res = await fetch('http://localhost:4000/products', { cache: 'no-store' });

    if (!res.ok) {
      console.error(`Database Error fetching Combo Deals: ${res.statusText}`);
      return [];
    }

    const rawData = await res.json();
    const products = Array.isArray(rawData)
      ? rawData
      : Array.isArray(rawData.data)
      ? rawData.data
      : rawData.products || [];

    if (!products.length) return [];

    const comboBuckets: Record<string, any[]> = {};

    const cleanTags = (tagsVal: any): string[] => {
      if (!tagsVal) return [];
      let str = Array.isArray(tagsVal) ? tagsVal.join(',') : String(tagsVal);
      str = str.replace(/[\[\]{}"']/g, '');
      return str.split(',').map((t) => t.trim().toLowerCase());
    };

    products.forEach((p: any) => {
      if (p.isActive === false) return;

      const parsedTags = cleanTags(p.tags);

      parsedTags.forEach((tag) => {
        if (tag.startsWith('combo-')) {
          if (!comboBuckets[tag]) {
            comboBuckets[tag] = [];
          }
          comboBuckets[tag].push(p);
        }
      });
    });

    const comboList: Product[] = [];

    Object.keys(comboBuckets).forEach((comboTag) => {
      const items = comboBuckets[comboTag];
      if (!items || items.length === 0) return;

      const meta = COMBO_METADATA[comboTag] || {
        title: `${comboTag.toUpperCase().replace('-', ' ')} Bundle`,
        image: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=300&q=80',
      };

      const originalTotal = items.reduce((sum, item) => sum + (Number(item.price) || 0), 0);
      const discountedTotal = Math.round(originalTotal * 0.85);

      const medicineNames = items.map((item: any) => item.name).filter(Boolean);
      
      // 🛠️ Extract Real Database Product IDs
      const itemIds = items.map((item: any) => item.id).filter(Boolean);

      comboList.push({
        id: comboTag,
        itemIds: itemIds, // 👈 Real Product IDs Array Add Kiye
        name: meta.title,
        size: `${items.length} Items Combo Pack`,
        packSize: `${items.length} Items Combo Pack`,
        rating: 4.7,
        reviewsCount: 320,
        delivery: 'Get by 6pm, today',
        price: `Rs.${discountedTotal}`,
        originalPrice: `Rs.${originalTotal}`,
        discount: '15% off',
        image: meta.image,
        imageUrl: meta.image,
        slug: meta.title
          .toLowerCase()
          .replace(/\s+/g, '-')
          .replace(/[^a-z0-9-]/g, ''),
        includedProducts: medicineNames,
      } as any);
    });

    comboList.sort((a: any, b: any) => {
      const numA = parseInt(String(a.id).replace(/\D/g, ''), 10) || 0;
      const numB = parseInt(String(b.id).replace(/\D/g, ''), 10) || 0;
      return numA - numB;
    });

    return comboList;
  } catch (error) {
    console.error('Error fetching Combo Deals:', error);
    return [];
  }
}

/**
 * Dynamic Database Fetcher for Healthy Hair Products
 * Executes SQL logic:
 * (LOWER(healthConditions) ~* 'hair|scalp|dandruff|hair loss|hair fall'
 *  OR LOWER(category) ~* 'hair|hair care'
 *  OR LOWER(name) ~* 'hair|shampoo|oil|serum|biotin')
 * AND LOWER(tags) ~* 'best-?seller|popular'
 */
export async function getHealthyHairProducts(): Promise<Product[]> {
  try {
    const res = await fetch('http://localhost:4000/products', { cache: 'no-store' });

    if (!res.ok) {
      console.error(`Database Error fetching Healthy Hair products: ${res.statusText}`);
      return [];
    }

    const rawData = await res.json();

    // Safely unwrap response array payload
    const products = Array.isArray(rawData)
      ? rawData
      : Array.isArray(rawData.data)
      ? rawData.data
      : rawData.products || [];

    if (!products.length) return [];

    const getSafeText = (val?: any): string => {
      if (!val) return '';
      if (Array.isArray(val)) return val.join(',').toLowerCase();
      if (typeof val === 'object') return JSON.stringify(val).toLowerCase();
      return String(val).toLowerCase();
    };

    const hairConditionsRegex = /hair|scalp|dandruff|hair loss|hair fall/i;
    const hairCategoryRegex = /hair|hair care/i;
    const hairNameRegex = /hair|shampoo|oil|serum|biotin/i;
    const bestSellerPopularRegex = /best-?seller|bestseller|popular/i;

    const matchedProducts = products
      .filter((p: any) => {
        if (p.isActive === false) return false;

        const healthCondText = getSafeText(p.healthConditions);
        const categoryText = getSafeText(p.category);
        const nameText = getSafeText(p.name);
        const tagsText = getSafeText(p.tags);

        // 1. Matches healthConditions OR category OR name
        const matchesHairCriteria =
          hairConditionsRegex.test(healthCondText) ||
          hairCategoryRegex.test(categoryText) ||
          hairNameRegex.test(nameText);

        // 2. Matches tags containing best-seller OR popular
        const isBestSellerOrPopular = bestSellerPopularRegex.test(tagsText);

        return matchesHairCriteria && isBestSellerOrPopular;
      })
      .slice(0, 10); // LIMIT 10 for homepage carousel

    // Map DB fields to UI Product format
    return matchedProducts.map((p: any) => {
      const origPrice = p.originalPrice || p.price;
      const discountVal =
        origPrice > p.price ? Math.round(((origPrice - p.price) / origPrice) * 100) : 0;

      return {
        id: p.id,
        name: p.name,
        size: p.packSize || p.size || '300ml',
        rating: p.rating || 4.4,
        reviewsCount: p.reviewsCount || 850,
        delivery: 'Get by 6pm, today',
        price: `Rs.${p.price}`,
        originalPrice: origPrice > p.price ? `Rs.${origPrice}` : undefined,
        discount: discountVal > 0 ? `${discountVal}% off` : undefined,
        image:
          p.imageUrl ||
          p.image ||
          'https://images.unsplash.com/photo-1535585209827-a15fcdbc4c2d?auto=format&fit=crop&w=300&q=80',
        slug:
          p.slug ||
          p.name
            .toLowerCase()
            .replace(/\s+/g, '-')
            .replace(/[^a-z0-9-]/g, ''),
      };
    });
  } catch (error) {
    console.error('Error fetching Healthy Hair Products:', error);
    return [];
  }
}



/**
 * Dynamic Database Fetcher for Homeopathy Best Medicines
 * Executes SQL logic:
 * WHERE LOWER("systemOfMedicine") ~* 'homeo|homeopathy|homeopathic'
 */
export async function getHomeopathyBestMedicines(): Promise<Product[]> {
  try {
    const res = await fetch('http://localhost:4000/products', { cache: 'no-store' });

    if (!res.ok) {
      console.error(`Database Error fetching Homeopathy products: ${res.statusText}`);
      return [];
    }

    const rawData = await res.json();

    // Safely unwrap response array payload
    const products = Array.isArray(rawData)
      ? rawData
      : Array.isArray(rawData.data)
      ? rawData.data
      : rawData.products || [];

    if (!products.length) return [];

    const getSafeText = (val?: any): string => {
      if (!val) return '';
      if (Array.isArray(val)) return val.join(',').toLowerCase();
      if (typeof val === 'object') return JSON.stringify(val).toLowerCase();
      return String(val).toLowerCase();
    };

    const homeoRegex = /homeo|homeopathy|homeopathic/i;

    const matchedProducts = products
      .filter((p: any) => {
        if (p.isActive === false) return false;

        const sysMed = getSafeText(p.systemOfMedicine || p.systemofMedicine);
        const catText = getSafeText(p.category);
        const subCatText = getSafeText(p.subCategory);
        const tagsText = getSafeText(p.tags);

        return (
          homeoRegex.test(sysMed) ||
          homeoRegex.test(catText) ||
          homeoRegex.test(subCatText) ||
          homeoRegex.test(tagsText)
        );
      })
      .slice(0, 10); // Limits to 10 items for carousel

    // Map DB fields to UI Product format
    return matchedProducts.map((p: any) => {
      const origPrice = p.originalPrice || p.price;
      const discountVal =
        origPrice > p.price ? Math.round(((origPrice - p.price) / origPrice) * 100) : 0;

      return {
        id: p.id,
        name: p.name,
        size: p.packSize || p.size || '30ml bottle',
        rating: p.rating || 4.6,
        reviewsCount: p.reviewsCount || 450,
        delivery: 'Get by 7pm, Today',
        price: `Rs.${p.price}`,
        originalPrice: origPrice > p.price ? `Rs.${origPrice}` : undefined,
        discount: discountVal > 0 ? `${discountVal}% off` : undefined,
        image:
          p.imageUrl ||
          p.image ||
          'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=300&q=80',
        slug:
          p.slug ||
          p.name
            .toLowerCase()
            .replace(/\s+/g, '-')
            .replace(/[^a-z0-9-]/g, ''),
      };
    });
  } catch (error) {
    console.error('Error fetching Homeopathy Products:', error);
    return [];
  }
}


/**
 * Dynamic Database Fetcher for Allopathy Top Sellers
 * Strictly fetches Allopathy products tagged as 'best-seller' / 'bestseller' OR 'popular' (up to 10 products).
 */
export async function getAllopathyTopSellers(): Promise<Product[]> {
  try {
    const res = await fetch('http://localhost:4000/products', { cache: 'no-store' });

    if (!res.ok) return [];

    const data = await res.json();
    const products = Array.isArray(data)
      ? data
      : Array.isArray(data.data)
      ? data.data
      : data.products || [];

    if (!products.length) return [];

    // Helper to safely convert text fields / arrays to string
    const getSafeText = (val?: any): string => {
      if (!val) return '';
      if (Array.isArray(val)) return val.join(' ').toLowerCase();
      return String(val).toLowerCase();
    };

    // Filter strictly: Allopathy + (best-seller OR popular)
    const matchedProducts = products
      .filter((p: any) => {
        if (p.isActive === false) return false;

        const catLower = getSafeText(p.category);
        const subLower = getSafeText(p.subCategory);

        // Exclude Herbal, Homeopathy, Unani, Ayurvedic
        const isNonAllopathy = /herbal|unani|ayurvedic|homeopathy|homeopathic/i.test(
          `${catLower} ${subLower}`
        );
        if (isNonAllopathy) return false;

        // Strictly check for best-seller / bestseller OR popular
        const searchableText = `${getSafeText(p.tags)} ${getSafeText(p.subCategory)} ${getSafeText(
          p.healthConditions
        )}`;

        const hasBestSellerOrPopular = /bestseller|popular/i.test(searchableText);

        return hasBestSellerOrPopular;
      })
      .slice(0, 10);

    // Map database fields to UI Product format
    return matchedProducts.map((p: any) => {
      const origPrice = p.originalPrice || p.price;
      const discountVal =
        origPrice > p.price ? Math.round(((origPrice - p.price) / origPrice) * 100) : 0;

      return {
        id: p.id,
        name: p.name,
        size: p.packSize || p.size || 'Pack of 1',
        rating: p.rating || 4.6,
        reviewsCount: p.reviewsCount || 1500,
        delivery: 'Get by 7pm, Today',
        price: `Rs.${p.price}`,
        originalPrice: origPrice > p.price ? `Rs.${origPrice}` : undefined,
        discount: discountVal > 0 ? `${discountVal}% off` : undefined,
        image:
          p.imageUrl ||
          p.image ||
          'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=300&q=80',
        slug:
          p.slug ||
          p.name
            .toLowerCase()
            .replace(/\s+/g, '-')
            .replace(/[^a-z0-9-]/g, ''),
      };
    });
  } catch (error) {
    console.error('Error fetching Allopathy Top Sellers:', error);
    return [];
  }
}


/**
 * Dynamic Database Fetcher for Herbal Best Medicines
 * Strictly filters products where systemOfMedicine = 'herbal' OR category/subCategory/tags match 'herbal|unani|ayurvedic' (Limited to 10 for homepage)
 */
export async function getHerbalBestMedicines(): Promise<Product[]> {
  try {
    const res = await fetch('http://localhost:4000/products', { cache: 'no-store' });

    if (!res.ok) {
      console.error(`Database Error: ${res.statusText}`);
      return [];
    }

    const data = await res.json();
    const products = Array.isArray(data)
      ? data
      : Array.isArray(data.data)
      ? data.data
      : data.products || [];

    if (!products.length) return [];

    const getSafeText = (val?: any): string => {
      if (!val) return '';
      if (Array.isArray(val)) return val.join(' ').toLowerCase();
      return String(val).toLowerCase();
    };

    const herbalRegex = /herbal|unani|ayurvedic/i;

    const matchedProducts = products
      .filter((p: any) => {
        if (p.isActive === false) return false;

        const sysMed = getSafeText(p.systemOfMedicine || p.systemofMedicine);
        const catText = getSafeText(p.category);
        const subCatText = getSafeText(p.subCategory);
        const tagsText = getSafeText(p.tags);

        const isHerbalSys = sysMed === 'herbal';
        const isHerbalCategory =
          herbalRegex.test(catText) ||
          herbalRegex.test(subCatText) ||
          herbalRegex.test(tagsText);

        return isHerbalSys || isHerbalCategory;
      })
      .slice(0, 10); // 🎯 Limits to top 10 for homepage carousel

    return matchedProducts.map((p: any) => {
      const origPrice = p.originalPrice || p.price;
      const discountVal =
        origPrice > p.price ? Math.round(((origPrice - p.price) / origPrice) * 100) : 0;

      return {
        id: p.id,
        name: p.name,
        size: p.packSize || p.size || 'Pack of 1',
        rating: p.rating || 4.7,
        reviewsCount: p.reviewsCount || 1200,
        delivery: 'Get by 7pm, Today',
        price: `Rs.${p.price}`,
        originalPrice: origPrice > p.price ? `Rs.${origPrice}` : undefined,
        discount: discountVal > 0 ? `${discountVal}% off` : undefined,
        image:
          p.imageUrl ||
          p.image ||
          'https://images.unsplash.com/photo-1576602976047-174e57a47881?auto=format&fit=crop&w=300&q=80',
        slug:
          p.slug ||
          p.name
            .toLowerCase()
            .replace(/\s+/g, '-')
            .replace(/[^a-z0-9-]/g, ''),
      };
    });
  } catch (error) {
    console.error('Error fetching Herbal Best Medicines:', error);
    return [];
  }
}


/**
 * Dynamic Database Fetcher for Popular Products
 * Filters products strictly tagged/associated with 'popular' (Limited to 10).
 */
export async function getPopularProducts(): Promise<Product[]> {
  try {
    const res = await fetch('http://localhost:4000/products', { cache: 'no-store' });

    if (!res.ok) {
      console.error(`Database Error: ${res.statusText}`);
      return [];
    }

    const data = await res.json();
    const products = Array.isArray(data)
      ? data
      : Array.isArray(data.data)
      ? data.data
      : data.products || [];

    if (!products.length) return [];

    const matchedProducts = products
      .filter((p: any) => {
        if (p.isActive === false) return false;

        // Safe Array / String check for 'popular' keyword across tags, subCategory & healthConditions
        const tagsString = Array.isArray(p.tags)
          ? p.tags.join(' ').toLowerCase()
          : String(p.tags || '').toLowerCase();

        const subCatString = Array.isArray(p.subCategory)
          ? p.subCategory.join(' ').toLowerCase()
          : String(p.subCategory || '').toLowerCase();

        const healthCondString = Array.isArray(p.healthConditions)
          ? p.healthConditions.join(' ').toLowerCase()
          : String(p.healthConditions || '').toLowerCase();

        const fullSearchableText = `${tagsString} ${subCatString} ${healthCondString}`;

        return fullSearchableText.includes('popular');
      })
      .slice(0, 10); // 🎯 Limits matched popular products to 10

    // Map DB fields to UI Product Interface
    return matchedProducts.map((p: any) => {
      const origPrice = p.originalPrice || p.price;
      const discountVal =
        origPrice > p.price ? Math.round(((origPrice - p.price) / origPrice) * 100) : 0;

      return {
        id: p.id,
        name: p.name,
        size: p.packSize || p.size || 'Pack of 1',
        rating: p.rating || 4.7,
        reviewsCount: p.reviewsCount || 2500,
        delivery: 'Get by 7pm, Today',
        price: `Rs.${p.price}`,
        originalPrice: origPrice > p.price ? `Rs.${origPrice}` : undefined,
        discount: discountVal > 0 ? `${discountVal}% off` : undefined,
        image:
          p.imageUrl ||
          p.image ||
          'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=300&q=80',
        slug:
          p.slug ||
          p.name
            .toLowerCase()
            .replace(/\s+/g, '-')
            .replace(/[^a-z0-9-]/g, ''),
      };
    });
  } catch (error) {
    console.error('Error fetching Popular Products:', error);
    return [];
  }
}


/**
 * Dynamic Database Fetcher for "Explore Something new"
 * Executes SQL logic:
 * ORDER BY "createdAt" DESC LIMIT 10
 */
export async function getExploreSomethingNew(): Promise<Product[]> {
  try {
    const res = await fetch('http://localhost:4000/products', { cache: 'no-store' });

    if (!res.ok) {
      console.error(`Database Error fetching Explore Something New: ${res.statusText}`);
      return [];
    }

    const rawData = await res.json();

    // Safely unwrap response array payload
    const products = Array.isArray(rawData)
      ? rawData
      : Array.isArray(rawData.data)
      ? rawData.data
      : rawData.products || [];

    if (!products.length) return [];

    // Sort by createdAt DESC (newest additions first) and take top 10
    const sortedProducts = [...products]
      .filter((p: any) => p.isActive !== false)
      .sort((a: any, b: any) => {
        const dateA = new Date(a.createdAt || 0).getTime();
        const dateB = new Date(b.createdAt || 0).getTime();
        return dateB - dateA;
      })
      .slice(0, 10);

    // Map DB fields to UI Product format
    return sortedProducts.map((p: any) => {
      const origPrice = p.originalPrice || p.price;
      const discountVal =
        origPrice > p.price ? Math.round(((origPrice - p.price) / origPrice) * 100) : 0;

      return {
        id: p.id,
        name: p.name,
        size: p.packSize || p.size || 'Pack of 1',
        rating: p.rating || 4.7,
        reviewsCount: p.reviewsCount || 520,
        delivery: 'Get by 7pm, Today',
        price: `Rs.${p.price}`,
        originalPrice: origPrice > p.price ? `Rs.${origPrice}` : undefined,
        discount: discountVal > 0 ? `${discountVal}% off` : undefined,
        image:
          p.imageUrl ||
          p.image ||
          'https://images.unsplash.com/photo-1584017911766-d451b3d0e843?auto=format&fit=crop&w=300&q=80',
        slug:
          p.slug ||
          p.name
            .toLowerCase()
            .replace(/\s+/g, '-')
            .replace(/[^a-z0-9-]/g, ''),
      };
    });
  } catch (error) {
    console.error('Error fetching Explore Something New:', error);
    return [];
  }
}


/**
 * Dynamic Database Fetcher for "Trending Now"
 * Executes SQL logic:
 * WHERE LOWER(array_to_string(tags, ',')) ~* 'trending|viral|popular'
 * ORDER BY id DESC LIMIT 10
 */
export async function getTrendingNowProducts(): Promise<Product[]> {
  try {
    const res = await fetch('http://localhost:4000/products', { cache: 'no-store' });

    if (!res.ok) {
      console.error(`Database Error fetching Trending Now products: ${res.statusText}`);
      return [];
    }

    const rawData = await res.json();

    // Safely unwrap response array payload
    const products = Array.isArray(rawData)
      ? rawData
      : Array.isArray(rawData.data)
      ? rawData.data
      : rawData.products || [];

    if (!products.length) return [];

    const getSafeText = (val?: any): string => {
      if (!val) return '';
      if (Array.isArray(val)) return val.join(',').toLowerCase();
      if (typeof val === 'object') return JSON.stringify(val).toLowerCase();
      return String(val).toLowerCase();
    };

    const trendingRegex = /trending|viral|popular/i;

    const matchedProducts = products
      .filter((p: any) => {
        if (p.isActive === false) return false;
        const tagsText = getSafeText(p.tags);
        return trendingRegex.test(tagsText);
      })
      // ORDER BY id DESC
      .sort((a: any, b: any) =>
        String(b.id || 0).localeCompare(String(a.id || 0), undefined, { numeric: true })
      )
      .slice(0, 10); // LIMIT 10 for homepage carousel

    // Map DB fields to UI Product format
    return matchedProducts.map((p: any) => {
      const origPrice = p.originalPrice || p.price;
      const discountVal =
        origPrice > p.price ? Math.round(((origPrice - p.price) / origPrice) * 100) : 0;

      return {
        id: p.id,
        name: p.name,
        size: p.packSize || p.size || 'Pack of 1',
        rating: p.rating || 4.7,
        reviewsCount: p.reviewsCount || 3400,
        delivery: 'Get by 7pm, Today',
        price: `Rs.${p.price}`,
        originalPrice: origPrice > p.price ? `Rs.${origPrice}` : undefined,
        discount: discountVal > 0 ? `${discountVal}% off` : undefined,
        image:
          p.imageUrl ||
          p.image ||
          'https://images.unsplash.com/photo-1556228722-d0b5b1a03e67?auto=format&fit=crop&w=300&q=80',
        slug:
          p.slug ||
          p.name
            .toLowerCase()
            .replace(/\s+/g, '-')
            .replace(/[^a-z0-9-]/g, ''),
      };
    });
  } catch (error) {
    console.error('Error fetching Trending Now Products:', error);
    return [];
  }
}

/**
 * Pure database fetcher: Gets 5 Pain Relief + 5 Cold & Cough top deals directly from NestJS backend.
 */
export async function getTopDealsPainAndCough(): Promise<Product[]> {
  try {
    const res = await fetch('http://localhost:4000/products', {
      cache: 'no-store', // Ensures fresh database data on every request
    });

    if (!res.ok) {
      console.error(`Database Error: ${res.statusText}`);
      return [];
    }

    const data = await res.json();
    const products = Array.isArray(data)
      ? data
      : Array.isArray(data.data)
      ? data.data
      : data.products || [];

    if (!products.length) return [];

    const getSafeText = (val?: string | string[]): string => {
      if (!val) return '';
      return Array.isArray(val) ? val.join(' ').toLowerCase() : val.toLowerCase();
    };

    // 🎯 1. Filter Top 5 Pain Relief Deals from Database
    const painDeals = products
      .filter((p: any) => {
        if (p.isActive === false) return false;
        const cat = getSafeText(p.category);
        const sub = getSafeText(p.subCategory);
        const tags = getSafeText(p.tags);
        const name = getSafeText(p.name);

        const isPainCategory =
          cat === 'pain relief' ||
          cat.includes('pain') ||
          /analgesic|nsaid|pain/i.test(sub) ||
          /analgesic|nsaid|pain/i.test(tags) ||
          /pain|spray|gel|ointment/i.test(name);

        const hasDiscountOrFeatured =
          (p.originalPrice && p.originalPrice > p.price) || (p.discount && p.discount > 0) || p.isFeatured;

        return isPainCategory && hasDiscountOrFeatured;
      })
      .map((p: any) => {
        const orig = p.originalPrice || p.price;
        const discPct = orig > p.price ? Math.round(((orig - p.price) / orig) * 100) : 0;
        return { ...p, calculatedDiscount: discPct };
      })
      .sort((a: any, b: any) => b.calculatedDiscount - a.calculatedDiscount)
      .slice(0, 5);

    // 🎯 2. Filter Top 5 Cold & Cough Deals from Database
    const coldDeals = products
      .filter((p: any) => {
        if (p.isActive === false) return false;
        const cat = getSafeText(p.category);
        const sub = getSafeText(p.subCategory);
        const tags = getSafeText(p.tags);
        const name = getSafeText(p.name);

        const isColdCategory =
          ['cold & cough', 'cold and cough'].includes(cat) ||
          cat.includes('cough') ||
          cat.includes('cold') ||
          /cough|cold|decongestant|antihistamine/i.test(sub) ||
          /cough|cold|decongestant|antihistamine/i.test(tags) ||
          /cough|lozenge|syrup|sore throat/i.test(name);

        const hasDiscountOrFeatured =
          (p.originalPrice && p.originalPrice > p.price) || (p.discount && p.discount > 0) || p.isFeatured;

        return isColdCategory && hasDiscountOrFeatured;
      })
      .map((p: any) => {
        const orig = p.originalPrice || p.price;
        const discPct = orig > p.price ? Math.round(((orig - p.price) / orig) * 100) : 0;
        return { ...p, calculatedDiscount: discPct };
      })
      .sort((a: any, b: any) => b.calculatedDiscount - a.calculatedDiscount)
      .slice(0, 5);

    // 🔄 3. Combine into 10 balanced products and map database columns
    return [...painDeals, ...coldDeals].map((p: any) => {
      const origPrice = p.originalPrice || p.price;
      const discountVal = origPrice > p.price ? Math.round(((origPrice - p.price) / origPrice) * 100) : 0;

      return {
        id: p.id,
        name: p.name,
        size: p.packSize || p.size || 'Pack of 1',
        rating: p.rating || 4.2,
        reviewsCount: p.reviewsCount || 120,
        delivery: 'Get by 7pm, Today',
        price: `Rs. ${p.price}`,
        originalPrice: origPrice > p.price ? `Rs. ${origPrice}` : undefined,
        discount: discountVal > 0 ? `${discountVal}% off` : undefined,
        image:
          p.imageUrl ||
          p.image ||
          'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=300&q=80',
        slug:
          p.slug ||
          p.name
            .toLowerCase()
            .replace(/\s+/g, '-')
            .replace(/[^a-z0-9-]/g, ''),
      };
    });
  } catch (error) {
    console.error('Error fetching database deals:', error);
    return [];
  }
}


/**
 * Dynamic Database Fetcher for Collagen & Supplement Products
 * Strictly filters products where tags contain 'discount' or 'collagen'/'supplement' with active discounts.
 */
export async function getCollagenSupplements(): Promise<Product[]> {
  try {
    const res = await fetch('http://localhost:4000/products', { cache: 'no-store' });

    if (!res.ok) {
      console.error(`Database Error: ${res.statusText}`);
      return [];
    }

    const data = await res.json();
    const products = Array.isArray(data)
      ? data
      : Array.isArray(data.data)
      ? data.data
      : data.products || [];

    if (!products.length) return [];

    const getSafeText = (val?: any): string => {
      if (!val) return '';
      if (Array.isArray(val)) return val.join(' ').toLowerCase();
      return String(val).toLowerCase();
    };

    const matchedProducts = products
      .filter((p: any) => {
        if (p.isActive === false) return false;

        const tagsString = getSafeText(p.tags);
        const subCatString = getSafeText(p.subCategory);
        const categoryString = getSafeText(p.category);
        const nameString = getSafeText(p.name);

        const fullText = `${tagsString} ${subCatString} ${categoryString} ${nameString}`;

        // Strictly checks if tags contain 'discount' OR collagen/supplement keywords with price discount
        const hasDiscountTag = tagsString.includes('discount');
        const isCollagenOrSupplement = /collagen|supplement|biotin|vitamin/i.test(fullText);
        const hasActiveDiscount = (p.originalPrice && p.originalPrice > p.price) || (p.discount && p.discount > 0);

        return hasDiscountTag || (isCollagenOrSupplement && hasActiveDiscount);
      })
      .slice(0, 10);

    return matchedProducts.map((p: any) => {
      const origPrice = p.originalPrice || p.price;
      const discountVal =
        origPrice > p.price ? Math.round(((origPrice - p.price) / origPrice) * 100) : 0;

      return {
        id: p.id,
        name: p.name,
        size: p.packSize || p.size || 'Pack of 1',
        rating: p.rating || 4.5,
        reviewsCount: p.reviewsCount || 320,
        delivery: 'Get by 7pm, Today',
        price: `Rs.${p.price}`,
        originalPrice: origPrice > p.price ? `Rs.${origPrice}` : undefined,
        discount: discountVal > 0 ? `${discountVal}% off` : undefined,
        image:
          p.imageUrl ||
          p.image ||
          'https://images.unsplash.com/photo-1584017911766-d451b3d0e843?auto=format&fit=crop&w=300&q=80',
        slug:
          p.slug ||
          p.name
            .toLowerCase()
            .replace(/\s+/g, '-')
            .replace(/[^a-z0-9-]/g, ''),
      };
    });
  } catch (error) {
    console.error('Error fetching Collagen Supplements:', error);
    return [];
  }
}


/**
 * Dynamic Database Fetcher for "In the Spotlight" Products
 * Strictly filters products where isFeatured = true (limited to 10).
 */
export async function getInTheSpotlightProducts(): Promise<Product[]> {
  try {
    const res = await fetch('http://localhost:4000/products', { cache: 'no-store' });

    if (!res.ok) {
      console.error(`Database Error: ${res.statusText}`);
      return [];
    }

    const data = await res.json();
    const products = Array.isArray(data)
      ? data
      : Array.isArray(data.data)
      ? data.data
      : data.products || [];

    if (!products.length) return [];

    const matchedProducts = products
      .filter((p: any) => {
        if (p.isActive === false) return false;

        // Strictly check isFeatured (handles boolean true, integer 1, or string "true")
        return (
          p.isFeatured === true ||
          p.isFeatured === 1 ||
          String(p.isFeatured).toLowerCase() === 'true'
        );
      })
      .slice(0, 10); // Limit to top 10 featured products

    // Map DB fields to UI Product Interface
    return matchedProducts.map((p: any) => {
      const origPrice = p.originalPrice || p.price;
      const discountVal =
        origPrice > p.price ? Math.round(((origPrice - p.price) / origPrice) * 100) : 0;

      return {
        id: p.id,
        name: p.name,
        size: p.packSize || p.size || 'Pack of 1',
        rating: p.rating || 4.7,
        reviewsCount: p.reviewsCount || 1800,
        delivery: 'Get by 7pm, Today',
        price: `Rs.${p.price}`,
        originalPrice: origPrice > p.price ? `Rs.${origPrice}` : undefined,
        discount: discountVal > 0 ? `${discountVal}% off` : undefined,
        image:
          p.imageUrl ||
          p.image ||
          'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=300&q=80',
        slug:
          p.slug ||
          p.name
            .toLowerCase()
            .replace(/\s+/g, '-')
            .replace(/[^a-z0-9-]/g, ''),
      };
    });
  } catch (error) {
    console.error('Error fetching In The Spotlight Products:', error);
    return [];
  }
}
// Mapper: Converts NestJS API data to Frontend UI Product Card
export function mapApiProductToUiProduct(item: ApiProduct): Product {
  return {
    name: item.name,
    slug: item.slug,
    size: item.packSize || item.strength || 'Standard Pack',
    rating: 4.5,
    reviewsCount: 420,
    delivery: 'Get by 6pm, today',
    price: item.price ? `Rs${item.price}` : 'Rs250',
    originalPrice: item.originalPrice ? `Rs${item.originalPrice}` : undefined,
    discount:
      item.originalPrice && item.price
        ? `${Math.round(((item.originalPrice - item.price) / item.originalPrice) * 100)}% off`
        : undefined,
    image:
      item.imageUrl && item.imageUrl.trim() !== ''
        ? item.imageUrl
        : 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=300&q=80',
  };
}


/**
 * Dynamic Database Fetcher for Pain Relief Products
 * Executes exact SQL Query logic:
 * (LOWER(CAST("healthConditions" AS TEXT)) ~* 'pain relief|pain killer|analgesic'
 *  OR LOWER(category) ~* 'pain relief|pain'
 *  OR LOWER(name) ~* 'pain|relief|balm|spray')
 * AND LOWER(array_to_string(tags, ',')) ~* 'best-?seller'
 */
export async function getPainReliefProducts(): Promise<Product[]> {
  try {
    const res = await fetch('http://localhost:4000/products', { cache: 'no-store' });

    if (!res.ok) {
      console.error(`Database Error fetching Pain Relief: ${res.statusText}`);
      return [];
    }

    const rawData = await res.json();

    // Safely unwrap response array payload
    const products = Array.isArray(rawData)
      ? rawData
      : Array.isArray(rawData.data)
      ? rawData.data
      : rawData.products || [];

    if (!products.length) return [];

    const getSafeText = (val?: any): string => {
      if (!val) return '';
      if (Array.isArray(val)) return val.join(',').toLowerCase();
      if (typeof val === 'object') return JSON.stringify(val).toLowerCase();
      return String(val).toLowerCase();
    };

    const filteredProducts = products
      .filter((p: any) => {
        if (p.isActive === false) return false;

        const healthCondText = getSafeText(p.healthConditions);
        const categoryText = getSafeText(p.category);
        const nameText = getSafeText(p.name);
        const tagsText = getSafeText(p.tags);

        // 1. Target Condition Match: (healthConditions OR category OR name)
        const matchesPainRelief =
          /pain relief|pain killer|analgesic/i.test(healthCondText) ||
          /pain relief|pain/i.test(categoryText) ||
          /pain|relief|balm|spray/i.test(nameText);

        // 2. Bestseller Tag Match: array_to_string(tags, ',') ~* 'best-?seller'
        const isBestSeller = /best-?seller|bestseller/i.test(tagsText);

        return matchesPainRelief && isBestSeller;
      })
      .slice(0, 10); // Limit 10 for homepage carousel

    // Map DB fields to UI Product format
    return filteredProducts.map((p: any) => {
      const origPrice = p.originalPrice || p.price;
      const discountVal =
        origPrice > p.price ? Math.round(((origPrice - p.price) / origPrice) * 100) : 0;

      return {
        id: p.id,
        name: p.name,
        size: p.packSize || p.size || 'Pack of 1',
        rating: p.rating || 4.5,
        reviewsCount: p.reviewsCount || 1400,
        delivery: 'Get by 7pm, Today',
        price: `Rs.${p.price}`,
        originalPrice: origPrice > p.price ? `Rs.${origPrice}` : undefined,
        discount: discountVal > 0 ? `${discountVal}% off` : undefined,
        image:
          p.imageUrl ||
          p.image ||
          'https://images.unsplash.com/photo-1608248597359-54d9c79e6cf4?auto=format&fit=crop&w=300&q=80',
        slug:
          p.slug ||
          p.name
            .toLowerCase()
            .replace(/\s+/g, '-')
            .replace(/[^a-z0-9-]/g, ''),
      };
    });
  } catch (error) {
    console.error('Error fetching Pain Relief Products:', error);
    return [];
  }
}