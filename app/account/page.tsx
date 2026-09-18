'use client'

import { useEffect, useState } from 'react'
import { Check, LogOut, ShieldCheck, X } from 'lucide-react'
import Link from 'next/link'
import { supabase } from '../../lib/supabase'

type Claim = {
  id: string
  riot_game_name: string
  riot_tag_line: string
  region: string
  target_amount: number
  status: string
  created_at: string
}

export default function AccountPage() {
  const [email, setEmail] = useState('')
  const [claims, setClaims] = useState<Claim[]>([])
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState('')
  const [paymentLinks, setPaymentLinks] = useState<Record<string,string>>({})

  async function load() {
    if (!supabase) return
    const { data: auth } = await supabase.auth.getUser()
    if (!auth.user) {
      window.location.href = '/login'
      return
    }
    setEmail(auth.user.email ?? '')
    const { data, error } = await supabase
      .from('claim_requests')
      .select('id, riot_game_name, riot_tag_line, region, target_amount, status, created_at')
      .eq('user_id', auth.user.id)
      .order('created_at', { ascending: false })
    if (error) setMessage('Could not load your claims.')
    else setClaims((data ?? []) as Claim[])
  }

  useEffect(() => { load() }, [])

  async function startPayment(claimId: string) {
    if (!supabase) return
    setBusy(claimId)
    setMessage('')
    const { data, error } = await supabase.rpc('create_payment_intent', { p_claim_id: claimId })
    setBusy('')
    if (error) {
      setMessage(error.message)
      return
    }
    const payment = Array.isArray(data) ? data[0] : data
    setMessage(`Payment intent ${payment.payment_id} created for ₹${Number(payment.amount).toLocaleString('en-IN')}. PayPal checkout is the next connection step.`)
  }

  async function signOut() {
    await supabase?.auth.signOut()
    window.location.href = '/'
  }

  return (
    <main className="authPage">
      <div className="accountShell">
        <div className="accountHead">
          <div>
            <Link href="/" className="backLink">← Back to VALBID</Link>
            <div className="eyebrow small"><ShieldCheck size={14}/> MY ACCOUNT</div>
            <h1>My claims.</h1>
            <p>{email}</p>
          </div>
          <button className="signOutBtn" onClick={signOut}><LogOut size={15}/> Sign out</button>
        </div>

        {message && <div className="notice">{message}</div>}
        <div className="claimList">
          {claims.length === 0 ? <div className="empty">No claim requests yet. <Link href="/">Claim your first spot →</Link></div> :
            claims.map(c => (
              <div className="claimRow" key={c.id}>
                <div>
                  <strong>{c.riot_game_name}<small>#{c.riot_tag_line}</small></strong>
                  <span>{c.region} · ₹{Number(c.target_amount).toLocaleString('en-IN')} target</span>
                </div>
                <div className={`statusPill status-${c.status}`}>
                  {c.status === 'approved' ? <Check size={13}/> : c.status === 'rejected' ? <X size={13}/> : null}
                  {c.status}
                  {c.status === 'pending' && <button className="payBtn" onClick={() => startPayment(c.id)} disabled={busy === c.id}>{busy === c.id ? 'Preparing…' : 'Prepare payment'}</button>}
                </div>
              </div>
            ))}
        </div>
      </div>
    </main>
  )
}
