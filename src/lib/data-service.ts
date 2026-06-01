// Data service that falls back to mock data when Supabase is unavailable
// Set NEXT_PUBLIC_USE_MOCK_DATA=true in .env.local to enable

import { mockProducts, mockStops, mockOrders, mockWorkers, mockTasks, mockCustomers, mockBrandSettings, mockBrands } from "./mock-data";

const useMockData = () => process.env.NEXT_PUBLIC_USE_MOCK_DATA === "true" || !process.env.NEXT_PUBLIC_SUPABASE_URL?.includes("supabase.co");

export async function getProducts(brandId?: string | null) {
  if (useMockData()) {
    return brandId ? mockProducts.filter(p => p.brand_id === brandId) : mockProducts;
  }
  // Real Supabase implementation would go here
  return [];
}

export async function getStops(brandId?: string | null) {
  if (useMockData()) {
    return brandId ? mockStops.filter(s => s.brand_id === brandId) : mockStops;
  }
  return [];
}

export async function getOrders(brandId?: string | null) {
  if (useMockData()) {
    return brandId ? mockOrders.filter(o => o.stops?.brand_id === brandId || !brandId) : mockOrders;
  }
  return [];
}

export async function getWorkers(brandId?: string | null) {
  if (useMockData()) {
    return mockWorkers;
  }
  return [];
}

export async function getTasks(brandId?: string | null) {
  if (useMockData()) {
    return mockTasks;
  }
  return [];
}

export async function getCustomers(brandId?: string | null) {
  if (useMockData()) {
    return mockCustomers;
  }
  return [];
}

export async function getBrandSettings(brandId?: string) {
  if (useMockData()) {
    return { ...mockBrandSettings, brand_id: brandId ?? "brand-tuxedo" };
  }
  return null;
}

export async function getBrands() {
  if (useMockData()) {
    return mockBrands;
  }
  return [];
}