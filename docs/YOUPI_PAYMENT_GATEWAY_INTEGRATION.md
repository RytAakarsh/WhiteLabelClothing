# White Label Clothing — YouPI PG UPI Payment Gateway Integration

This document outlines the complete architecture, security model, database schema, storefront checkout flow, webhook reconciliation lifecycle, and production deployment guide for integrating the self-hosted **YouPI PG** sovereign UPI payment gateway with **White Label Clothing**.

---

## 1. Executive Summary & Repository Audit

### Repository Details
- **Gateway Repository**: `https://github.com/youpi-pg/YouPI-PG.git`
- **Audit Commit**: `e7a9dc08d55ad5afd3bf882cef5752fb9c53080d`
- **Owner / Author**: Antigravity Systems
- **License**: `"license": "Commercial"`, `"private": true`
- **Engine Requirements**: Node.js `>=24.22.1`

> [!IMPORTANT]
> **Commercial License Notice**:
> The `package.json` of YouPI-PG declares `"license": "Commercial"` and `"private": true`. There is no permissive open-source license (such as MIT or Apache 2.0). Before running in a commercial production environment, ensure you have explicit written authorization or a commercial license agreement from the copyright holder (Antigravity Systems).

> [!WARNING]
> **Experimental Sovereign Gateway Warning**:
> The official documentation specifies that YouPI-PG is an independent, experimental research software. It is **not** an NPCI-certified or bank-partnered payment aggregator. It relies on passive banking observation (SMS / push notifications / statement reconciliation). NPCI and banks actively monitor transaction patterns on personal/retail UPI handles. Adhere strictly to the conservative volume recommendations (e.g. initial testing under 20 transactions/day) and review Section 8 on reconciliation.

---

## 2. Separate Deployment Architecture

```
                    ┌──────────────────────────────────────────────┐
                    │          Customer Browser / Device           │
                    └──────────────┬───────────────────────────────┘
                                   │
               ┌───────────────────┴───────────────────┐
               ▼                                       ▼
 ┌───────────────────────────┐           ┌───────────────────────────┐
 │ Cloudflare Pages Storefront│           │  Ubuntu 24.04 Linux VPS   │
 │ www.whitelabelclothing.in │           │ pay.whitelabelclothing.in │
 └─────────────┬─────────────┘           └─────────────┬─────────────┘
               │                                       │
     (Serverless Next.js 16)                     (Node.js 24 Runtime)
               │                                       │
               ├─► POST /api/payments/youpi/create ────┤
               │   (Server-to-Server Session Init)     ├─► Port 7000 (Checkout Portal)
               │                                       ├─► Port 6100 (Payment Core API)
               │◄─ Signed Webhook Delivery ────────────┤   (X-Gateway-Signature HMAC)
               │   (POST /api/payments/youpi/webhook)  │
               ▼                                       ├─► Banking Observers (SMS / Gmail)
 ┌───────────────────────────┐                         └─► Native SQLite WAL (DatabaseSync)
 │ Supabase Postgres Database│
 │ Orders / Payments / RLS   │
 └───────────────────────────┘
```

### Why YouPI-PG Cannot Run Directly inside Cloudflare Pages
1. **Node Engine Requirement**: YouPI-PG requires Node.js `>=24.22.1` with native `node:sqlite` (`DatabaseSync` WAL mode) and system-level crypto. Cloudflare Pages runs a V8 isolate serverless runtime that cannot execute native C++ node modules or SQLite WAL database engines.
2. **Persistent Daemon Processes**: YouPI-PG relies on persistent listener daemons (Android SMS observer, Gmail push listener, and WhatsApp Baileys bot sessions). Serverless runtimes shut down immediately between HTTP requests.
3. **Decoupled Architecture**: White Label Clothing storefront remains on Cloudflare Pages for worldwide Edge CDN caching and static asset speed. YouPI-PG runs independently on a dedicated Linux VPS under `pay.whitelabelclothing.in`.

---

## 3. VPS Host Provisioning Guide (`pay.whitelabelclothing.in`)

### Recommended Server Specifications
- **Provider**: DigitalOcean / Hetzner / AWS EC2 / Linode
- **OS**: Ubuntu 24.04 LTS (x64)
- **Specs**: 2 vCPU, 4 GB RAM, 40 GB NVMe SSD
- **Domain**: DNS `A` record pointing `pay.whitelabelclothing.in` to VPS public IP.

### Step-by-Step Installation

```bash
# 1. Update system packages
sudo apt update && sudo apt upgrade -y
sudo apt install -y git curl nginx certbot python3-certbot-nginx build-essential

# 2. Install Node.js 24.x LTS
curl -fsSL https://deb.nodesource.com/setup_24.x | sudo -E bash -
sudo apt install -y nodejs
node -v # Verify: must be >= 24.22.1

# 3. Clone YouPI-PG on the server
sudo mkdir -p /var/www/youpi
sudo chown -R $USER:$USER /var/www/youpi
cd /var/www/youpi
git clone https://github.com/youpi-pg/YouPI-PG.git .
npm install

# 4. Configure Production Environment
cp .env.example .env
nano .env
```

### Production `.env` for White Label Clothing Gateway
```env
# Gateway Ports & Topology
PORT=7000
PAYMENT_API_PORT=6100
MERCHANT_ADMIN_PORT=6001
BASE_URL=https://pay.whitelabelclothing.in
BASE_PAYMENT_API_URL=https://pay.whitelabelclothing.in

# White Label Clothing White-Label Customization
DEFAULT_MERCHANT_NAME="White Label Clothing"
DEFAULT_PRIMARY_COLOR="#000000"
DEFAULT_ACCENT_COLOR="#171717"
DEFAULT_LOGO_URL="https://www.whitelabelclothing.in/white-label-logo.png"
DEFAULT_SUPPORT_EMAIL="info.whitelabelclothing@gmail.com"
DEFAULT_SUPPORT_PHONE="+91 8851872245"
DEFAULT_HIDE_POWERED_BY=true

# Security Secrets (Must be generated via `openssl rand -hex 32`)
GATEWAY_MASTER_KEY=generate_64_character_hex_key_here
MERCHANT_API_KEY=generate_64_character_hex_key_here
WEBHOOK_SECRET=generate_64_character_hex_key_here

# SQLite WAL database path
DATABASE_PATH=/var/www/youpi/data/gateway.sqlite
```

### Nginx Reverse Proxy Configuration
Create `/etc/nginx/sites-available/pay.whitelabelclothing.in`:
```nginx
server {
    server_name pay.whitelabelclothing.in;

    # Core Payment API & Webhooks
    location /api/ {
        proxy_pass http://127.0.0.1:6100;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Hosted Checkout Portal & QR UI
    location / {
        proxy_pass http://127.0.0.1:7000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

```bash
# Enable site & obtain SSL certificate
sudo ln -s /etc/nginx/sites-available/pay.whitelabelclothing.in /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
sudo certbot --nginx -d pay.whitelabelclothing.in
```

### Process Management with PM2
```bash
sudo npm install -g pm2
pm2 start "npm start" --name "youpi-pg"
pm2 save
pm2 startup
```

---

## 4. WhatsApp OTP ("Pre-Gateway Auth View") Analysis

### Mechanism
In `apps/checkout-portal`, YouPI-PG enforces a **Pre-Gateway Identity Check** before revealing the dynamic UPI QR code or intent triggers:
1. When a customer reaches `https://pay.whitelabelclothing.in/checkout/[paymentId]`, they are presented with an identity verification screen.
2. The customer provides their 10-digit mobile number.
3. The gateway initiates a 6-digit WhatsApp OTP over the Berry / Baileys protocol to their phone number.
4. Once verified, the profile is securely remembered in the browser's `localStorage` so returning customers skip this screen on subsequent purchases.

### WhatsApp Bot Pairing
- In production, log into the Merchant Admin at `http://127.0.0.1:6001` (or via SSH port forward).
- Scan the WhatsApp QR code to link your business WhatsApp number.
- In staging / sandbox testing, set `YOUPI_EXPOSE_DEV_OTP=true` in `.env` to output the OTP directly into the developer console for automated testing.

---

## 5. White Label Clothing Storefront Integration

### Files Added / Modified
| File | Action | Purpose |
|------|--------|---------|
| `supabase/migrations/20261031010000_youpi_payment_gateway.sql` | Added | Schema migration adding gateway fields, `payment_attempts`, and `webhook_events`. |
| `src/lib/payments/youpi.ts` | Added | YouPI PG SDK client and cryptographic HMAC-SHA256 signature verifier. |
| `src/app/api/payments/youpi/create/route.ts` | Added | Server-side payment session creator with atomic inventory lock and ₹99/unit delivery charge. |
| `src/app/api/payments/youpi/webhook/route.ts` | Added | Webhook handler with timing-safe HMAC verification, delivery deduplication, and strict settlement rules. |
| `src/app/api/orders/status/[orderId]/route.ts` | Added | Secure order status inquiry endpoint for checkout return screen. |
| `src/app/checkout/complete/page.tsx` | Added | Dedicated return page displaying verified reconciliation status. |
| `src/app/checkout/page.tsx` | Modified | Added "Pay Online — Instant UPI & QR" option; COD strictly preserved. |
| `src/app/account/orders/page.tsx` | Modified | Added UPI gateway status badge and UTR reference number display. |
| `src/app/admin-main/orders/page.tsx` | Modified | Added banking audit block (UTR, Gateway ID, Settlement status). |
| `.env.local` & `.env.example` | Modified | Added YouPI environment variables (`YOUPI_ENABLED=false` by default). |

---

## 6. Strict Settlement State Machine

> [!CAUTION]
> **Zero Fake Settlements Rule**:
> An observer SMS or notification match is **not** a bank settlement!

```
                ┌─────────────────────────────────┐
                │        Customer Checkout        │
                └────────────────┬────────────────┘
                                 │
                                 ▼
                  [Payment Status: pending]
                  [Settlement Status: pending]
                                 │
                ┌────────────────┴────────────────┐
                │                                 │
        Observer Alert (SMS/Push)         Bank Statement CSV Match
                │                                 │
                ▼                                 ▼
         OBSERVED_SUCCESS                     RECONCILED
                │                                 │
  [Status: awaiting_verification]       [Status: paid & confirmed]
  [Settlement: observed]                [Settlement: reconciled]
  (DO NOT SHIP OR RELEASE)              (SAFE TO FULFILL GARMENT)
```

1. **`OBSERVED_SUCCESS`**:
   - Bank SMS or push alert received matching order amount.
   - YouPI PG sets `settlementState: "NOT_RECONCILED"`.
   - Storefront transitions order to `payment_status = 'awaiting_verification'`, `settlement_status = 'observed'`.
   - Order history records note: *"Observer alert matched. Awaiting bank statement reconciliation."*
   - **CRITICAL**: Garments are **not** released or marked paid on `OBSERVED_SUCCESS`.
2. **`RECONCILED`**:
   - Merchant imports daily bank statement CSV into YouPI PG.
   - Gateway performs authoritative matching on receiving account, amount in paise, and 12-digit UTR.
   - Gateway dispatches `RECONCILED` event with `method: "UPI"`, `settlementState: "RECONCILED"`.
   - Webhook verifies amount matches `order.total_amount`.
   - Storefront transitions order to `payment_status = 'paid'`, `status = 'confirmed'`, `settlement_status = 'reconciled'`, `payment_verified_at = now()`.
   - Garments are now marked paid and released for fulfillment.
3. **`MANUAL_REVIEW`**:
   - Discrepancy detected (amount mismatch or multiple concurrent orders sharing identical paise amount).
   - Order set to `payment_status = 'manual_review'`. Administrator inspects in `/admin-main/orders`.
4. **`FAILED` / `EXPIRED` / `CANCELLED`**:
   - Order transitions to corresponding terminal status.

---

## 7. Webhook Signature Verification (`POST /api/payments/youpi/webhook`)

- **Header**: `X-Gateway-Signature: sha256=<hex_digest>`
- **Deduplication**: `X-Gateway-Delivery-Id` (or `deliveryId` in payload)
- **Signature Calculation**:
  ```ts
  const computedHmac = crypto
    .createHmac('sha256', process.env.YOUPI_WEBHOOK_SECRET)
    .update(rawBodyText, 'utf8')
    .digest('hex');

  const matches = crypto.timingSafeEqual(
    Buffer.from(computedHmac, 'hex'),
    Buffer.from(actualSignatureHex, 'hex')
  );
  ```
- **Replay Protection**: Replays of identical delivery IDs are deduplicated via PostgreSQL `public.webhook_events` primary key check and immediately return HTTP 200 `{ received: true, deduplicated: true }`.

---

## 8. Activating Live Payments (`YOUPI_ENABLED=true`)

When you are ready to switch the storefront to live YouPI payments:

1. In your Cloudflare Pages dashboard (or `.env.local` for local testing):
   ```env
   YOUPI_ENABLED=true
   YOUPI_API_URL=https://pay.whitelabelclothing.in
   YOUPI_MERCHANT_ID=wlc_live_merchant
   YOUPI_MERCHANT_KEY=<YOUR_GENERATED_MERCHANT_KEY>
   YOUPI_WEBHOOK_SECRET=<YOUR_GENERATED_WEBHOOK_SECRET>
   ```
2. In YouPI Merchant Admin (`https://pay.whitelabelclothing.in/admin`):
   - Set Merchant Webhook URL to: `https://www.whitelabelclothing.in/api/payments/youpi/webhook`
   - Set Webhook Secret to match `YOUPI_WEBHOOK_SECRET`.
3. Test a ₹10 test garment transaction end-to-end to verify that:
   - Dynamic vector QR code renders with White Label Clothing branding.
   - Bank SMS observer dispatches `OBSERVED_SUCCESS` (`awaiting_verification`).
   - Daily statement upload dispatches `RECONCILED` (`paid` & `confirmed`).
   - Cash on Delivery orders remain completely functional.
