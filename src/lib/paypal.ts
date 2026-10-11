export interface PayPalOrderResponse {
  id: string;
  status: 'CREATED' | 'SAVED' | 'APPROVED' | 'VOIDED' | 'COMPLETED';
  createTime: string;
  amount: {
    currencyCode: string;
    value: string;
  };
  payee: {
    emailAddress?: string;
    merchantId?: string;
  };
}

export interface PayPalCaptureResponse {
  id: string;
  status: 'COMPLETED' | 'PENDING' | 'FAILED';
  captureId: string;
  amount: {
    currencyCode: string;
    value: string;
  };
  sellerProtection: {
    status: 'ELIGIBLE' | 'PARTIALLY_ELIGIBLE' | 'NOT_ELIGIBLE';
  };
}

export async function createPayPalOrder(params: {
  amount: number;
  currency?: string;
  merchantName: string;
  description: string;
}): Promise<PayPalOrderResponse> {
  // In production / hackathon, you configure PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET
  // In this sandbox engine, we simulate the PayPal Orders v2 API response with exact schemas
  const orderId = `PAYID-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;
  return {
    id: orderId,
    status: 'CREATED',
    createTime: new Date().toISOString(),
    amount: {
      currencyCode: params.currency || 'USD',
      value: params.amount.toFixed(2),
    },
    payee: {
      emailAddress: `vendor-sandbox@${params.merchantName.toLowerCase().replace(/[^a-z0-9]/g, '')}.com`,
      merchantId: `MERCH-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
    },
  };
}

export async function capturePayPalOrder(orderId: string, amount: number): Promise<PayPalCaptureResponse> {
  const captureId = `CAP-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
  return {
    id: orderId,
    status: 'COMPLETED',
    captureId,
    amount: {
      currencyCode: 'USD',
      value: amount.toFixed(2),
    },
    sellerProtection: {
      status: 'ELIGIBLE',
    },
  };
}

export function generatePayPalPaymentLink(email: string, amount: number, memo: string): string {
  const cleanEmail = encodeURIComponent(email);
  return `https://www.sandbox.paypal.com/myaccount/transfer/homepage/buy/details?recipient=${cleanEmail}&amount=${amount.toFixed(2)}&memo=${encodeURIComponent(memo)}`;
}
