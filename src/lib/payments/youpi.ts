import crypto from 'crypto';

export interface YoupiCustomer {
  name?: string;
  email?: string;
  phoneNumber?: string;
}

export interface CreatePaymentParams {
  orderId: string;
  amountPaise: number; // in integer paise (e.g. 199900 for ₹1,999.00)
  currency?: string;
  returnUrl: string;
  customer: YoupiCustomer;
  metadata?: Record<string, any>;
  idempotencyKey?: string;
}

export interface YoupiPaymentSession {
  paymentId: string;
  orderId: string;
  amount: string;
  amountPaise: string | number;
  currency: string;
  status: string;
  checkoutUrl: string;
  queuePosition?: number;
}

export interface YoupiWebhookEvent {
  event: 'OBSERVED_SUCCESS' | 'RECONCILED' | 'MANUAL_REVIEW' | 'SUCCESS' | 'FAILED' | 'EXPIRED' | 'CANCELLED' | string;
  paymentId: string;
  orderId: string;
  amount?: string;
  amountPaise?: number;
  currency?: string;
  method?: string;
  settlementState?: 'RECONCILED' | 'NOT_RECONCILED' | 'NOT_BANK_SETTLEMENT' | string;
  utr?: string;
  completedAt?: string;
  metadata?: Record<string, any>;
  deliveryId?: string;
  timestamp?: number | string;
}

export function isYoupiEnabled(): boolean {
  return process.env.YOUPI_ENABLED === 'true';
}

export function getYoupiConfig() {
  const enabled = isYoupiEnabled();
  const apiUrl = (process.env.YOUPI_API_URL || 'https://pay.whitelabelclothing.in').replace(/\/+$/, '');
  const merchantId = process.env.YOUPI_MERCHANT_ID || '';
  const merchantKey = process.env.YOUPI_MERCHANT_KEY || '';
  const webhookSecret = process.env.YOUPI_WEBHOOK_SECRET || '';
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://www.whitelabelclothing.in').replace(/\/+$/, '');

  return {
    enabled,
    apiUrl,
    merchantId,
    merchantKey,
    webhookSecret,
    siteUrl,
  };
}

/**
 * Creates a payment session with YouPI PG.
 */
export async function createYoupiPayment(params: CreatePaymentParams): Promise<YoupiPaymentSession> {
  const config = getYoupiConfig();

  if (!config.enabled) {
    throw new Error('YOUPI payment gateway is not enabled. Please check configuration.');
  }

  const url = `${config.apiUrl}/api/v1/payments`;
  const amountInRupees = (params.amountPaise / 100).toFixed(2);

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (config.merchantId) {
    headers['X-Merchant-Id'] = config.merchantId;
  }
  if (config.merchantKey) {
    headers['X-Merchant-Key'] = config.merchantKey;
  }
  if (params.idempotencyKey) {
    headers['Idempotency-Key'] = params.idempotencyKey;
  }

  const payload = {
    orderId: params.orderId,
    amount: amountInRupees,
    currency: params.currency || 'INR',
    returnUrl: params.returnUrl,
    customer: {
      name: params.customer.name || '',
      email: params.customer.email || '',
      phoneNumber: params.customer.phoneNumber || '',
    },
    metadata: {
      ...params.metadata,
      brand: 'White Label Clothing',
      amount_paise: params.amountPaise,
    },
  };

  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`YouPI PG create payment failed [HTTP ${res.status}]: ${errorText}`);
  }

  return await res.json();
}

/**
 * Queries payment status from YouPI PG.
 */
export async function getYoupiPayment(paymentId: string) {
  const config = getYoupiConfig();
  const url = `${config.apiUrl}/api/v1/payments/${encodeURIComponent(paymentId)}`;
  const headers: Record<string, string> = {};

  if (config.merchantKey) {
    headers['X-Merchant-Key'] = config.merchantKey;
  }

  const res = await fetch(url, { headers });
  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`YouPI PG get payment failed [HTTP ${res.status}]: ${errorText}`);
  }

  return await res.json();
}

/**
 * Timing-safe HMAC-SHA256 signature verification for YouPI webhooks.
 * Supports raw body verification and timestamp-bound verification.
 */
export function verifyYoupiWebhook(
  rawPayload: string,
  signatureHeader: string | null,
  timestampHeader?: string | null,
  secretOverride?: string
): YoupiWebhookEvent {
  const config = getYoupiConfig();
  const secret = secretOverride || config.webhookSecret;

  if (!secret) {
    throw new Error('Webhook verification failed: YOUPI_WEBHOOK_SECRET is not configured.');
  }

  if (!signatureHeader || !signatureHeader.startsWith('sha256=')) {
    throw new Error('Webhook verification failed: invalid signature header format. Expected sha256=...');
  }

  const actualSig = signatureHeader.slice('sha256='.length).trim();

  // Helper function to compute HMAC hex
  const computeHmac = (data: string): string => {
    return crypto.createHmac('sha256', secret).update(data, 'utf8').digest('hex');
  };

  // Helper for timing-safe comparison
  const safeCompare = (a: string, b: string): boolean => {
    try {
      const bufA = Buffer.from(a, 'hex');
      const bufB = Buffer.from(b, 'hex');
      if (bufA.length !== bufB.length) return false;
      return crypto.timingSafeEqual(bufA, bufB);
    } catch {
      return false;
    }
  };

  const expectedSigRaw = computeHmac(rawPayload);
  let matches = safeCompare(expectedSigRaw, actualSig);

  // If timestamp header is present, YouPI may sign `${timestamp}.${rawPayload}`
  if (!matches && timestampHeader) {
    const expectedSigTimestamped = computeHmac(`${timestampHeader}.${rawPayload}`);
    matches = safeCompare(expectedSigTimestamped, actualSig);
  }

  if (!matches) {
    throw new Error('Webhook verification failed: signature mismatch.');
  }

  const parsed = JSON.parse(rawPayload) as YoupiWebhookEvent;
  return parsed;
}
