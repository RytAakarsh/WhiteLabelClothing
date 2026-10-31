import QRCode from 'qrcode';
import { createAdminClient } from '@/lib/supabase/admin';

export interface DirectUpiConfig {
  is_enabled: boolean;
  receiving_upi_id: string;
  payee_name: string;
  payment_instructions: string;
  allow_customer_utr: boolean;
}

export const DEFAULT_DIRECT_UPI_CONFIG: DirectUpiConfig = {
  is_enabled: true,
  receiving_upi_id: 'moinusman0302@oksbi',
  payee_name: 'MOHAMMED MOIN',
  payment_instructions:
    'Scan the dynamic QR code with any UPI app (GPay, PhonePe, Paytm, BHIM). After payment, enter your 12-digit Bank UTR / Reference number below to verify your order.',
  allow_customer_utr: true,
};

/**
 * Fetches the active Direct UPI settings from Supabase database (with fallback).
 */
export async function getDirectUpiSettings(): Promise<DirectUpiConfig> {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from('payment_settings')
      .select('is_enabled, receiving_upi_id, payee_name, payment_instructions, allow_customer_utr')
      .eq('gateway_name', 'direct_upi')
      .maybeSingle();

    if (error || !data) {
      return DEFAULT_DIRECT_UPI_CONFIG;
    }

    return {
      is_enabled: Boolean(data.is_enabled),
      receiving_upi_id: data.receiving_upi_id || DEFAULT_DIRECT_UPI_CONFIG.receiving_upi_id,
      payee_name: data.payee_name || DEFAULT_DIRECT_UPI_CONFIG.payee_name,
      payment_instructions: data.payment_instructions || DEFAULT_DIRECT_UPI_CONFIG.payment_instructions,
      allow_customer_utr: data.allow_customer_utr !== false,
    };
  } catch (err) {
    console.error('Error fetching direct UPI settings:', err);
    return DEFAULT_DIRECT_UPI_CONFIG;
  }
}

/**
 * Generates an immutable, standard NPCI-compliant UPI URI.
 */
export function buildUpiUri(params: {
  upiId: string;
  payeeName: string;
  amountPaise: number;
  orderNumber: string;
  note?: string;
}): string {
  const amountRupees = (params.amountPaise / 100).toFixed(2);
  const note = params.note || `WLC Order ${params.orderNumber}`;

  // Standard NPCI UPI URI Specification:
  // pa = Payee VPA / UPI ID
  // pn = Payee Name
  // am = Transaction Amount (immutable)
  // cu = Currency (INR)
  // tr = Transaction / Order Reference ID
  // tn = Transaction Note
  const searchParams = new URLSearchParams({
    pa: params.upiId.trim(),
    pn: params.payeeName.trim(),
    am: amountRupees,
    cu: 'INR',
    tr: params.orderNumber.trim(),
    tn: note.trim(),
  });

  return `upi://pay?${searchParams.toString()}`;
}

/**
 * Generates dynamic high-resolution QR code data URL (PNG base64).
 */
export async function generateQrDataUrl(upiUri: string): Promise<string> {
  return await QRCode.toDataURL(upiUri, {
    width: 360,
    margin: 2,
    errorCorrectionLevel: 'M',
    color: {
      dark: '#000000',
      light: '#FFFFFF',
    },
  });
}
