'use client'

import { FormEvent, useEffect, useState } from 'react'
import { ArrowLeft, ArrowUpRight, LockKeyhole, Mail, ShieldCheck } from 'lucide-react'
import Link from 'next/link'
import { supabase } from '../../lib/supabase'

export default function LoginPage() {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    supabase?.auth.getUser().then(({ data }) => {
      if (data.user) window.location.href = '/'
    })
  }, [])

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!supabase) return setMessage('Supabase is not configured in this deployment.')
    if (!email.trim() || password.length < 6) {
      setMessage('Enter a valid email and a password of at least 6 characters.')
      return
    }

    setBusy(true)
    setMessage('')

    const result = mode === 'signin'
      ? await supabase.auth.signInWithPassword({ email: email.trim(), password })
      : await supabase.auth.signUp({ email: email.trim(), password })

    setBusy(false)

    if (result.error) {
      setMessage(result.error.message)
      return
    }

    if (mode === 'signup') {
      setMessage('Account created. Check your email if confirmation is required, then sign in.')
    } else {
      window.location.href = '/'
    }
  }

  return (
    <main className="authPage">
      <div className="authShell">
        <Link href="/" className="backLink"><ArrowLeft size={15}/> Back to VALBID</Link>
        <div className="authBrand">VAL<span>BID</span></div>
        <div className="authCard">
          <div className="eyebrow small"><ShieldCheck size={14}/> SECURE ACCOUNT</div>
          <h1>{mode === 'signin' ? 'Welcome back.' : 'Create your account.'}</h1>
          <p>Sign in to manage your VALBID player claims and future bids.</p>
          <form onSubmit={submit}>
            <label><span>EMAIL</span><div className="authInput"><Mail size={15}/><input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" /></div></label>
            <label><span>PASSWORD</span><div className="authInput"><LockKeyhole size={15}/><input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" autoComplete={mode === 'signin' ? 'current-password' : 'new-password'} /></div></label>
            <button className="claimBtn authSubmit" disabled={busy}>{busy ? 'Please wait…' : mode === 'signin' ? 'Sign in' : 'Create account'} <ArrowUpRight size={17}/></button>
          </form>
          {message && <div className="notice">{message}</div>}
          <button className="switchAuth" onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setMessage('') }}>{mode === 'signin' ? 'Need an account? Create one' : 'Already have an account? Sign in'}</button>
        </div>
      </div>
    </main>
  )
}
