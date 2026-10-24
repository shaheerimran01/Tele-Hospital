import React from 'react';
import ProductDetailView from '@/components/products/ProductDetailView';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function ProductPage({ params }: PageProps) {
  // Next.js App Router mein params resolution
  const resolvedParams = await params;

  return <ProductDetailView slug={resolvedParams.slug} />;
}
