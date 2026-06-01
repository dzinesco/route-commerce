export type Brand = {
  id: string;
  name: string;
  slug: string;
};

export type Product = {
  id: string;
  brand_id: string;
  name: string;
  description: string;
  price: number;
  type: string;
  active: boolean;
  brands: { name: string } | null;
};

export type Stop = {
  id: string;
  brand_id: string;
  slug: string;
  city: string;
  state: string;
  date: string;
  time: string;
  location: string;
  active: boolean;
  brands: { name: string } | null;
};

export type CartItem = {
  id: string;
  name: string;
  price: string;
  quantity: number;
  fulfillment?: "pickup" | "ship";
  brand_id: string;
  brand_slug: string;
  is_taxable?: boolean;
  pickup_type?: "scheduled_stop" | "shed";
  description?: string;
};