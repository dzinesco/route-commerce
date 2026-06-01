// Mock data for UI review without Supabase
// Enable by setting NEXT_PUBLIC_USE_MOCK_DATA=true in .env.local

export const mockBrands = [
  { id: "brand-tuxedo", name: "Tuxedo Corn", slug: "tuxedo", accent_color: "#22c55e", active: true },
  { id: "brand-ird", name: "Indian River Direct", slug: "indian-river-direct", accent_color: "#f97316", active: true },
];

export const mockProducts = [
  // Tuxedo Corn products
  { id: "prod-tux-1", name: "Olathe Sweet Dozen", price: 35.00, description: "Twelve ears of our signature Olathe Sweet corn, hand-picked at peak ripeness.", type: "corn", image_url: "https://images.unsplash.com/photo-1551754655-cd27e38d2076?w=600&h=600&fit=crop", shipping_type: "all", brand_id: "brand-tuxedo", is_active: true, pickup_type: "shed" },
  { id: "prod-tux-2", name: "Family Bundle", price: 95.00, description: "Thirty-six ears of premium Olathe Sweet, perfect for large gatherings.", type: "corn", image_url: "https://images.unsplash.com/photo-1601493700631-2b16ec4b4716?w=600&h=600&fit=crop", shipping_type: "all", brand_id: "brand-tuxedo", is_active: true, pickup_type: "shed" },
  { id: "prod-tux-3", name: "Cooler Box — 18 Ears", price: 58.00, description: "Pre-cooled, pre-packed cooler box ready for pickup at any stop.", type: "corn", image_url: "https://images.unsplash.com/photo-1601493700631-2b16ec4b4716?w=600&h=600&fit=crop", shipping_type: "pickup", brand_id: "brand-tuxedo", is_active: true, pickup_type: "scheduled_stop" },
  { id: "prod-tux-4", name: "Corn & Peach Combo", price: 75.00, description: "Six ears of Olathe Sweet paired with tree-ripened peaches.", type: "combo", image_url: "https://images.unsplash.com/photo-1464305795204-6f5bbfc7fb81?w=600&h=600&fit=crop", shipping_type: "all", brand_id: "brand-tuxedo", is_active: true, pickup_type: "shed" },
  
  // Indian River Direct products
  { id: "prod-ird-peach-2026", name: "Peaches - 2026 Pre-Order", price: 55.00, description: "25 lb box of Freestone Peaches from Titan Farms.", type: "peaches", image_url: "https://cdn.shopify.com/s/files/1/0506/2908/3294/files/Untitleddesign.png", shipping_type: "pickup", brand_id: "brand-ird", is_active: true, pickup_type: "scheduled_stop", seasonal: true, season_start: "June", season_end: "August", preorder: true },
  { id: "prod-ird-pecans", name: "Pecans", price: 13.00, description: "Premium 1 lb bag of pecans from Ellis Brothers Pecans, Georgia.", type: "nuts", image_url: "https://cdn.shopify.com/s/files/1/0506/2908/3294/files/Pecans---INDIANRIVER-42.jpg", shipping_type: "pickup", brand_id: "brand-ird", is_active: true, pickup_type: "scheduled_stop", pickup_only: true },
  { id: "prod-ird-citrus-box", name: "Citrus Truckload Box", price: 45.00, description: "Navel oranges, ruby red grapefruit, and tangerines.", type: "citrus", image_url: "https://images.unsplash.com/photo-1547514701-42782101795e?w=600&h=600&fit=crop", shipping_type: "pickup", brand_id: "brand-ird", is_active: true, pickup_type: "scheduled_stop", seasonal: true, season_start: "November", season_end: "April" },
];

export const mockStops = [
  // Tuxedo Corn stops
  { id: "stop-1", city: "Denver", state: "CO", date: "2026-06-01", time: "10:00 AM - 2:00 PM", location: "Union Station Plaza", slug: "denver-union-station", brand_id: "brand-tuxedo", is_public: true, active: true },
  { id: "stop-2", city: "Boulder", state: "CO", date: "2026-06-02", time: "9:00 AM - 1:00 PM", location: "Pearl Street Mall", slug: "boulder-pearl", brand_id: "brand-tuxedo", is_public: true, active: true },
  { id: "stop-3", city: "Colorado Springs", state: "CO", date: "2026-06-03", time: "10:00 AM - 3:00 PM", location: "Garden of the Gods", slug: "cos-garden-of-gods", brand_id: "brand-tuxedo", is_public: true, active: true },
  { id: "stop-4", city: "Fort Collins", state: "CO", date: "2026-06-04", time: "11:00 AM - 4:00 PM", location: "Old Town Square", slug: "fort-collins-old-town", brand_id: "brand-tuxedo", is_public: true, active: true },
  // Indian River Direct stops
  { id: "stop-5", city: "Miami", state: "FL", date: "2026-06-05", time: "8:00 AM - 12:00 PM", location: "Cocoanut Grove Market", slug: "miami-coconut-grove", brand_id: "brand-ird", is_public: true, active: true },
  { id: "stop-6", city: "West Palm Beach", state: "FL", date: "2026-06-06", time: "9:00 AM - 1:00 PM", location: "Antique Row", slug: "west-palm-beach", brand_id: "brand-ird", is_public: true, active: true },
  { id: "stop-7", city: "Fort Lauderdale", state: "FL", date: "2026-06-07", time: "10:00 AM - 2:00 PM", location: "Las Olas Boulevard", slug: "ft-lauderdale", brand_id: "brand-ird", is_public: true, active: true },
];

export const mockOrders = [
  {
    id: "order-1",
    customer_name: "John Smith",
    customer_email: "john@example.com",
    customer_phone: "+1-555-0101",
    status: "pending",
    subtotal: 140.00,
    pickup_complete: false,
    created_at: "2026-05-28T10:00:00Z",
    payment_processor: "stripe",
    stop_id: "stop-1",
    brand_id: "brand-tuxedo",
    order_items: [{ id: "item-1", product_id: "prod-tux-1", quantity: 2, price: 35.00, products: mockProducts[0] }],
    stops: mockStops[0],
  },
  {
    id: "order-2",
    customer_name: "Jane Doe",
    customer_email: "jane@example.com",
    customer_phone: "+1-555-0102",
    status: "pending",
    subtotal: 80.00,
    pickup_complete: false,
    created_at: "2026-05-28T11:30:00Z",
    payment_processor: "stripe",
    stop_id: "stop-1",
    brand_id: "brand-tuxedo",
    order_items: [{ id: "item-2", product_id: "prod-tux-3", quantity: 1, price: 58.00, products: mockProducts[2] }],
    stops: mockStops[0],
  },
  {
    id: "order-3",
    customer_name: "Bob Wilson",
    customer_email: "bob@example.com",
    customer_phone: "+1-555-0103",
    status: "picked_up",
    subtotal: 210.00,
    pickup_complete: true,
    pickup_completed_at: "2026-05-27T14:00:00Z",
    created_at: "2026-05-27T09:00:00Z",
    payment_processor: "stripe",
    stop_id: "stop-2",
    brand_id: "brand-tuxedo",
    order_items: [{ id: "item-3", product_id: "prod-tux-2", quantity: 2, price: 95.00, products: mockProducts[1] }],
    stops: mockStops[1],
  },
  {
    id: "order-4",
    customer_name: "Sarah Johnson",
    customer_email: "sarah@example.com",
    customer_phone: "+1-555-0104",
    status: "paid",
    subtotal: 55.00,
    pickup_complete: false,
    created_at: "2026-05-29T08:00:00Z",
    payment_processor: "stripe",
    stop_id: "stop-5",
    brand_id: "brand-ird",
    order_items: [{ id: "item-4", product_id: "prod-ird-peach-2026", quantity: 1, price: 55.00, products: mockProducts[4] }],
    stops: mockStops[4],
  },
];

export const mockWorkers = [
  { id: "worker-1", name: "Mike Johnson", pin: "1234", role: "worker", is_active: true, language: "en", brand_id: "brand-tuxedo" },
  { id: "worker-2", name: "Maria Garcia", pin: "5678", role: "time_admin", is_active: true, language: "es", brand_id: "brand-tuxedo" },
  { id: "worker-3", name: "James Wilson", pin: "9012", role: "worker", is_active: true, language: "en", brand_id: "brand-tuxedo" },
];

export const mockTasks = [
  { id: "task-1", name_en: "Picking", name_es: "Recoleccion", unit: "hours", sort_order: 1, brand_id: "brand-tuxedo" },
  { id: "task-2", name_en: "Packing", name_es: "Empacado", unit: "pieces", sort_order: 2, brand_id: "brand-tuxedo" },
  { id: "task-3", name_en: "Loading", name_es: "Carga", unit: "hours", sort_order: 3, brand_id: "brand-tuxedo" },
];

export const mockTimeEntries = [
  { id: "time-1", worker_id: "worker-1", task_id: "task-1", hours: 4.5, date: "2026-05-28", brand_id: "brand-tuxedo" },
  { id: "time-2", worker_id: "worker-1", task_id: "task-2", hours: 3, date: "2026-05-28", brand_id: "brand-tuxedo" },
  { id: "time-3", worker_id: "worker-2", task_id: "task-1", hours: 6, date: "2026-05-28", brand_id: "brand-tuxedo" },
];

export const mockCustomers = [
  { id: "cust-1", name: "Fresh Foods Co", email: "orders@freshfoods.com", company: "Fresh Foods Co", is_wholesale: true, brand_id: "brand-tuxedo" },
  { id: "cust-2", name: "Farm Market", email: "buy@farmmarket.com", company: "Farm Market", is_wholesale: true, brand_id: "brand-tuxedo" },
];

export const mockBrandSettings = {
  brand_name: "Tuxedo Corn",
  pay_period: "weekly",
  daily_overtime_threshold: 8,
  weekly_overtime_threshold: 40,
  notification_emails: ["admin@tuxedocorn.com"],
  notification_phones: [],
  brand_id: "brand-tuxedo",
  logo_url: null,
  logo_url_dark: null,
  hero_image_url: null,
  hero_tagline: null,
  custom_footer_text: null,
  email: "admin@tuxedocorn.com",
  phone: "970-555-1234",
  show_zip_search: true,
  show_schedule_pdf: true,
  show_wholesale_link: true,
  about_headline: "Tuxedo Corn",
  about_subheadline: "Premium Olathe Sweet Sweet Corn — Grown in Colorado Since 1982",
  invoice_business_name: "Tuxedo Corn LLC",
  invoice_business_address: "123 Farm Road, Olathe, CO 81425",
  invoice_business_phone: "970-555-1234",
  invoice_business_email: "orders@tuxedocorn.com",
  invoice_business_website: "www.tuxedocorn.com",
};

export const mockUsers = [
  { id: "user-1", email: "admin@tuxedocorn.com", role: "brand_admin", brand_id: "brand-tuxedo" },
  { id: "user-2", email: "worker@tuxedocorn.com", role: "store_employee", brand_id: "brand-tuxedo" },
];

export const mockCommunications = {
  campaigns: [
    { id: "camp-1", name: "Summer Kickoff", subject: "Corn Season is Here!", status: "sent", sent_count: 150, created_at: "2026-05-01T10:00:00Z" },
    { id: "camp-2", name: "Peach Pre-Order", subject: "Pre-order Your Peaches Now", status: "draft", sent_count: 0, created_at: "2026-05-28T10:00:00Z" },
  ],
  templates: [
    { id: "temp-1", name: "Stop Reminder", subject: "Pickup Reminder", content: "Don't forget your pickup tomorrow!", created_at: "2026-01-01T10:00:00Z" },
    { id: "temp-2", name: "Order Confirmation", subject: "Your Order is Confirmed", content: "Thank you for your order!", created_at: "2026-01-01T10:00:00Z" },
  ],
  contacts: [
    { id: "contact-1", email: "customer1@example.com", name: "Alice Brown", subscribed: true, brand_id: "brand-tuxedo" },
    { id: "contact-2", email: "customer2@example.com", name: "Bob Green", subscribed: true, brand_id: "brand-tuxedo" },
    { id: "contact-3", email: "customer3@example.com", name: "Carol White", subscribed: false, brand_id: "brand-tuxedo" },
  ],
  segments: [
    { id: "seg-1", name: "Active Customers", description: "Customers who ordered in the last 30 days", count: 45 },
    { id: "seg-2", name: "Wholesale Buyers", description: "All wholesale customers", count: 12 },
  ],
};

export const mockReports = {
  sales: [
    { date: "2026-05-25", revenue: 1250.00, orders: 18 },
    { date: "2026-05-26", revenue: 980.00, orders: 14 },
    { date: "2026-05-27", revenue: 2100.00, orders: 28 },
    { date: "2026-05-28", revenue: 1750.00, orders: 22 },
    { date: "2026-05-29", revenue: 890.00, orders: 11 },
  ],
};

// Helper to get data by table name
const tableDataMap: Record<string, unknown[]> = {
  brands: mockBrands,
  products: mockProducts,
  stops: mockStops,
  orders: mockOrders,
  workers: mockWorkers,
  tasks: mockTasks,
  time_entries: mockTimeEntries,
  customers: mockCustomers,
  brand_settings: [mockBrandSettings],
  users: mockUsers,
};

export function getMockTableData(tableName: string): unknown[] {
  return tableDataMap[tableName] || [];
}
