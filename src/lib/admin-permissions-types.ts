// Shared AdminUser type — safe to import from both server and client components
//
// `brand_id` is the active brand (one of `brand_ids`, or null for platform_admin).
// `brand_ids` is the full list of brands the admin can act in.
//   - platform_admin:  `brand_id = null`, `brand_ids = []` (in dev) or all brands
//                      (resolved by `listBrandsForAdmin`).
//   - multi_brand_admin: `brand_id` = selected/cookie brand, `brand_ids` = 2+.
//   - brand_admin / store_employee / staff: `brand_id` = their single brand,
//                                            `brand_ids = [that one]`.
export type AdminUser = {
  id?: string;
  user_id: string;
  brand_id: string | null;
  brand_ids: string[];
  role: "platform_admin" | "brand_admin" | "multi_brand_admin" | "store_employee" | "staff";
  active: boolean;
  can_manage_products: boolean;
  can_manage_stops: boolean;
  can_manage_orders: boolean;
  can_manage_pickup: boolean;
  can_manage_messages: boolean;
  can_manage_refunds: boolean;
  can_manage_users: boolean;
  can_manage_water_log: boolean;
  can_manage_reports: boolean;
  can_manage_settings: boolean;
  must_change_password?: boolean;
};
