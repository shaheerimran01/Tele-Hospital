let cachedProducts: any[] | null = null;
let cacheTimestamp = 0;
let inFlightFetch: Promise<any[]> | null = null;

export async function fetchAllProductsCached(): Promise<any[]> {
  const now = Date.now();
  // Return cached products if younger than 60 seconds
  if (cachedProducts && now - cacheTimestamp < 60_000) {
    return cachedProducts;
  }
  // Deduplicate simultaneous requests
  if (inFlightFetch) {
    return inFlightFetch;
  }

  inFlightFetch = (async () => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://tabibistan.org';
      const res = await fetch(`${apiUrl}/products`);
      if (!res.ok) return cachedProducts || [];
      const data = await res.json();
      const list = Array.isArray(data) ? data : Array.isArray(data.data) ? data.data : data.products || [];
      cachedProducts = list;
      cacheTimestamp = Date.now();
      return list;
    } catch (e) {
      console.error('Failed to fetch products:', e);
      return cachedProducts || [];
    } finally {
      inFlightFetch = null;
    }
  })();

  return inFlightFetch;
}
