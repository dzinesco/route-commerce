// Shared AdminUser type — safe to import from both server and client components
export type AdminUser = {
  id?: string;
  user_id: string;
  brand_id: string | null;
  role: "platform_admin" | "brand_admin" | "store_employee" | "staff";
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