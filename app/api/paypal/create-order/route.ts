import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function paypalBase() {
  return process.env.PAYPAL_ENV === 'live' ? 'https://api-m.paypal.com' : 'https://api-m.sandbox.paypal.com'
}

async function accessToken() {
  const id = process.env.PAYPAL_CLIENT_ID
  const secret = process.env.PAYPAL_CLIENT_SECRET
  if (!id || !secret) throw new Error('PayPal merchant credentials are not configured.')
  const auth = Buffer.from(id + ':' + secret).toString('base64')
  const res = await fetch(paypalBase() + '/v1/oauth2/token', {
    method: 'POST', headers: { Authorization: 'Basic ' + auth, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'grant_type=client_credentials', cache: 'no-store'
  })
  if (!res.ok) throw new Error('PayPal authentication failed.')
  return (await res.json()).access_token as string
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const paymentId = typeof body?.paymentId === 'string' ? body.paymentId : ''
    if (!paymentId) return NextResponse.json({ error: 'paymentId is required.' }, { status: 400 })
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
    if (!url || !key) return NextResponse.json({ error: 'Supabase is not configured.' }, { status: 503 })
    const authHeader = req.headers.get('authorization')
    if (!authHeader) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 })
    const supabase = createClient(url, key, { global: { headers: { Authorization: authHeader } } })
    const { data: auth } = await supabase.auth.getUser()
    if (!auth.user) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 })
    const { data: payment, error } = await supabase.from('payments').select('id,amount,currency,status,user_id,provider,claim_id').eq('id', paymentId).eq('user_id', auth.user.id).eq('provider','paypal').eq('status','pending').maybeSingle()
    if (error || !payment) return NextResponse.json({ error: 'Payment intent not found or no longer payable.' }, { status: 404 })
    if (payment.currency !== 'USD') return NextResponse.json({ error: 'PayPal checkout is currently configured for USD. INR checkout is not enabled in this build.' }, { status: 400 })
    const token = await accessToken()
    const orderRes = await fetch(paypalBase() + '/v2/checkout/orders', { method:'POST', headers:{ Authorization:'Bearer '+token, 'Content-Type':'application/json','PayPal-Request-Id':'valbid-'+payment.id }, body:JSON.stringify({ intent:'CAPTURE', purchase_units:[{ reference_id:payment.id, custom_id:payment.claim_id, amount:{currency_code:'USD',value:Number(payment.amount).toFixed(2)}}]}) })
    const order=await orderRes.json()
    if(!orderRes.ok) return NextResponse.json({error:'PayPal could not create the order.',details:order},{status:502})
    const { error:updateError }=await supabase.from('payments').update({provider_payment_id:order.id,metadata:{paypal_order_id:order.id}}).eq('id',payment.id).eq('user_id',auth.user.id).eq('status','pending')
    if(updateError) return NextResponse.json({error:'Order created but payment record could not be updated.'},{status:500})
    return NextResponse.json({orderId:order.id,status:order.status})
  } catch (e) { return NextResponse.json({error:e instanceof Error?e.message:'Unexpected error.'},{status:500}) }
}
