import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function base() {
  return process.env.PAYPAL_ENV === 'live' ? 'https://api-m.paypal.com' : 'https://api-m.sandbox.paypal.com'
}

async function token() {
  const id = process.env.PAYPAL_CLIENT_ID
  const secret = process.env.PAYPAL_CLIENT_SECRET
  if (!id || !secret) throw new Error('PayPal credentials are not configured.')
  const r = await fetch(base() + '/v1/oauth2/token', {
    method: 'POST',
    headers: { Authorization: 'Basic ' + Buffer.from(id + ':' + secret).toString('base64'), 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'grant_type=client_credentials',
    cache: 'no-store',
  })
  if (!r.ok) throw new Error('PayPal authentication failed.')
  return (await r.json()).access_token as string
}

export async function GET(req: Request) {
  try {
    const orderId = new URL(req.url).searchParams.get('token')
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const service = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!orderId) return NextResponse.json({ error: 'orderId is required.' }, { status: 400 })
    if (!url || !service) return NextResponse.json({ error: 'Server payment configuration is incomplete.' }, { status: 503 })

    const sb = createClient(url, service)
    const { data: payment, error } = await sb
      .from('payments')
      .select('id,amount,currency,status,user_id,provider,provider_payment_id')
      .eq('provider_payment_id', orderId)
      .eq('provider', 'paypal')
      .maybeSingle()

    if (error || !payment) return NextResponse.json({ error: 'Payment order not found.' }, { status: 404 })
    if (payment.status === 'completed') return NextResponse.json({ ok: true, status: 'completed' })

    const t = await token()
    const r = await fetch(base() + '/v2/checkout/orders/' + encodeURIComponent(orderId) + '/capture', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + t, 'Content-Type': 'application/json', 'PayPal-Request-Id': 'capture-' + payment.id },
      body: '{}',
    })
    const order = await r.json()
    if (!r.ok) return NextResponse.json({ error: 'PayPal capture failed.' }, { status: 502 })

    const unit = order.purchase_units?.[0]
    const capture = unit?.payments?.captures?.[0]
    const amount = capture?.amount
    if (
      order.status !== 'COMPLETED' ||
      capture?.status !== 'COMPLETED' ||
      amount?.currency_code !== payment.currency ||
      Number(amount?.value) !== Number(payment.amount)
    ) return NextResponse.json({ error: 'Payment could not be verified.' }, { status: 409 })

    const { error: processedError } = await sb.rpc('process_verified_paypal_payment', {
      p_payment_id: payment.id,
      p_provider_payment_id: orderId,
      p_capture_id: capture.id,
    })
    if (processedError) return NextResponse.json({ error: 'Payment captured but activation is still processing.' }, { status: 500 })

    return NextResponse.json({ ok: true, status: 'completed' })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Unexpected error.' }, { status: 500 })
  }
}
