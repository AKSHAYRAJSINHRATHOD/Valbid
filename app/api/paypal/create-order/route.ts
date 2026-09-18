import { NextResponse } from 'next/server'

// PayPal secrets must stay server-side. This endpoint is intentionally gated
// until PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET are configured in Vercel.
export async function POST() {
  if (!process.env.PAYPAL_CLIENT_ID || !process.env.PAYPAL_CLIENT_SECRET) {
    return NextResponse.json({ error: 'PayPal is not configured yet.' }, { status: 503 })
  }
  return NextResponse.json({ error: 'PayPal order creation will be enabled after merchant credentials are configured.' }, { status: 501 })
}
