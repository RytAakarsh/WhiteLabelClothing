# White Label Clothing — Production E-Commerce Platform

> **“More than just a label. Made to be remembered.”**

A production-grade, monochromatic luxury e-commerce platform and administrative console engineered for **White Label Clothing**. Built with Next.js (App Router, TypeScript, Tailwind CSS) and connected directly to **Supabase PostgreSQL** with Row Level Security (RLS), atomic transactional inventory decrementing, and persistent shopping cart synchronization.

---

## 1. Architecture & Technologies

- **Storefront & Admin**: Next.js (App Router, React 19, TypeScript)
- **Styling**: Monochromatic Luxury Design System (`#FFFFFF`, `#000000`, `#F7F7F7`, `#E5E5E5`) using Tailwind CSS with editorial serif headers (`Playfair Display`) and interface typography (`Inter`).
- **Database**: Supabase PostgreSQL 17 with strict Row Level Security (RLS) policies.
- **Authentication**: Supabase Auth (Email/Password & Google OAuth ready).
- **Media & Asset Storage**: Supabase Storage bucket `product-images` with admin-only upload policies and public CDN distribution.
- **Cart & State**: Seamless hybrid persistence (client-side `localStorage` for guests, merging atomically with `carts` and `cart_items` tables upon login).
- **Checkout & Inventory**: Atomic inventory locking and order creation executed through a PostgreSQL function `create_order_with_inventory` preventing overselling.

---

## 2. Brand Assets Configured

All four supplied official brand campaign assets are integrated in `public/images/`:
- Brand Logo: `/images/brand-logo.png`
- Hero Banner 1: `/images/hero-winter-collection.png` (Winter Collection — Monochrome Luxe)
- Hero Banner 2: `/images/hero-jacket-sale.png` (Premium Jacket Sale — Up to 40% Off)
- Hero Banner 3: `/images/hero-sweatshirt-sale.png` (Premium Sweatshirt Sale — Up to 40% Off)

---

## 3. Storefront Routes

| Route | Purpose |
|---|---|
| `/` | Editorial Homepage featuring 5-second responsive hero carousel, category tiles, featured products, new arrivals, active offers, brand statement, and concierge footer. |
| `/collections` | Complete archive of published garments with live search, category pills, size filters, and price sorting. |
| `/collections/sweatshirts` | Dedicated collection for luxury heavyweight sweatshirts (Sizes: M, L, XL). |
| `/collections/jackets` | Dedicated collection for architectural outerwear and jackets (Sizes: L, XL, XXL). |
| `/product/[slug]` | Individual garment page with up to 5-image gallery, variant size selector, stock indicator, Add to Bag, and Buy Now checkout flow. |
| `/offers` | Dedicated promotional page for discounted winter items. |
| `/cart` | Full shopping bag with quantity adjuster, shipping threshold tracker, and order summary. |
| `/checkout` | 3-step checkout with address validation (Indian PIN & phone), payment method selection, and atomic order creation. |
| `/checkout/confirmation/[orderNumber]` | Live database order receipt and status overview. |
| `/account` | Customer account dashboard with saved details and order count. |
| `/account/orders` | Customer order history with live fulfillment tracking. |
| `/search` | Real-time catalog search. |
| `/about` | Brand philosophy and craftsmanship story. |
| `/contact` | Concierge details (Phone: `+91 88518 72245`, WhatsApp: `+91 88518 72245`, Email: `info.whitelabelclothing@gmail.com`). |
| `/shipping-policy` | Pan-India delivery timelines and complimentary shipping rules. |
| `/return-refund-policy` | 7-day return and size exchange policy. |
| `/privacy-policy` | Customer data protection policy. |
| `/terms-and-conditions` | Legal and purchasing terms. |

---

## 4. Administrative Gateway (`/admin-main`)

Secure internal control panel restricted to verified administrators:

- **Admin Login**: `/admin-main`
- **Dashboard Telemetry**: `/admin-main/dashboard` (Computes all 14 database telemetry metrics: published products, total saved, sweatshirt designs, jacket designs, orders placed today in `Asia/Kolkata`, total orders, pending, shipped, delivered, cancelled, registered customers, low stock variants, out-of-stock variants, active offers, plus gross order value).
- **Product Management**: `/admin-main/products` (Full CRUD, draft/published/archived status toggling, variant sizes & stock, up to 5 image uploads via Supabase Storage).
- **Categories**: `/admin-main/categories` (Manage taxonomy, edit descriptions, change sort order).
- **Inventory Controller**: `/admin-main/inventory` (Variant-level real-time stock editor with low-stock and out-of-stock highlights).
- **Order Management**: `/admin-main/orders` (Inspector modal, update fulfillment status from `pending` -> `processing` -> `shipped` -> `delivered` -> `cancelled`, enter courier AWB tracking numbers, write internal audit notes).
- **Customer Directory**: `/admin-main/customers` (Client list with lifetime orders and verified order spend).
- **Promotions & Offers**: `/admin-main/offers` (Percentage or fixed discounts with date ranges and eligible product selection).
- **Homepage Management**: `/admin-main/homepage` (Reorder and toggle hero slides, edit announcement bar, change brand statement).
- **Store Settings**: `/admin-main/settings` (Customer support numbers, email, shipping thresholds).

---

## 5. Database Setup & Migrations

The database schema has been migrated directly into your connected Supabase PostgreSQL instance:

```bash
# To rerun or inspect migration:
node scripts/run-migration.js

# To re-bootstrap administrator credentials:
node scripts/bootstrap-admin.js

# To seed 12 initial draft design records (6 Sweatshirts with M/L/XL and 6 Jackets with L/XL/XXL):
node scripts/seed-initial-templates.js
```

### Initial Administrator Credentials:
- **Email**: `info.whitelabelclothing@gmail.com`
- **Access Route**: `/admin-main`

---

## 6. Google OAuth Configuration Guide

To enable "Continue with Google" in production:

1. Go to the [Google Cloud Console](https://console.cloud.google.com/) -> **APIs & Services** -> **Credentials**.
2. Create an **OAuth 2.0 Client ID** (Web Application).
3. Add the Supabase Auth callback URL under **Authorized redirect URIs**:
   ```
   https://qtvzxezxyzsvgbauyytt.supabase.co/auth/v1/callback
   ```
4. Copy the **Client ID** and **Client Secret**.
5. Open your [Supabase Dashboard](https://supabase.com/dashboard/project/qtvzxezxyzsvgbauyytt) -> **Authentication** -> **Providers** -> **Google**.
6. Toggle **Enable Google provider**, paste the Client ID and Client Secret, and save.
7. Under **Authentication** -> **URL Configuration**, set:
   - **Site URL**: `http://localhost:3000` (or your production Vercel domain e.g. `https://whitelabelclothing.com`)
   - **Redirect URLs**:
     ```
     http://localhost:3000/**
     https://whitelabelclothing.com/**
     ```

---

## 7. Running the Application Locally

```bash
# 1. Install dependencies (if needed)
npm install

# 2. Run local development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) for the storefront and [http://localhost:3000/admin-main](http://localhost:3000/admin-main) for the admin console.

---

## 8. Production Build Verification

```bash
npm run build
```
Builds an optimized production bundle with type validation and server-rendered routes.
