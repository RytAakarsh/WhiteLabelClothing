export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image_path: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProductVariant {
  id: string;
  product_id: string;
  size: string;
  sku: string | null;
  stock_quantity: number;
  price_adjustment: number; // in paise
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProductImage {
  id: string;
  product_id: string;
  storage_path: string;
  alt_text: string | null;
  sort_order: number;
  is_primary: boolean;
  variant_size: string | null;
  created_at: string;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  sku: string | null;
  short_description: string | null;
  description: string | null;
  category_id: string | null;
  status: 'draft' | 'published' | 'archived';
  base_price: number; // in paise
  compare_at_price: number | null; // in paise
  is_featured: boolean;
  is_new_arrival: boolean;
  is_best_seller: boolean;
  is_offer_eligible: boolean;
  sort_order: number;
  search_title: string | null;
  search_description: string | null;
  created_at: string;
  updated_at: string;
  category?: Category;
  variants?: ProductVariant[];
  images?: ProductImage[];
}

export interface Offer {
  id: string;
  name: string;
  description: string | null;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  starts_at: string | null;
  ends_at: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string | null;
  variant_id: string | null;
  product_name_snapshot: string;
  sku_snapshot: string | null;
  size_snapshot: string;
  unit_price_snapshot: number;
  quantity: number;
  discount_snapshot: number;
  line_total: number;
}

export interface Order {
  id: string;
  order_number: string;
  user_id: string | null;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  payment_status: 'pending' | 'paid' | 'failed' | 'refunded';
  subtotal: number;
  discount_total: number;
  delivery_charge: number;
  total_amount: number;
  shipping_address_snapshot: {
    full_name: string;
    phone: string;
    address_line1: string;
    address_line2?: string;
    city: string;
    state: string;
    postal_code: string;
    country: string;
    delivery_instructions?: string;
  };
  notes: string | null;
  tracking_number: string | null;
  created_at: string;
  updated_at: string;
  items?: OrderItem[];
}

export interface CartItemType {
  variant_id: string;
  product_id: string;
  product_name: string;
  product_slug: string;
  size: string;
  sku: string | null;
  price: number; // in paise
  compare_at_price: number | null;
  image: string;
  quantity: number;
  max_stock: number;
}

export interface StoreSettings {
  brand_name: string;
  tagline: string;
  support_phone: string;
  whatsapp_number: string;
  support_email: string;
  currency: string;
  currency_symbol: string;
  free_shipping_threshold: number; // in paise
  default_shipping_fee: number; // in paise
}
