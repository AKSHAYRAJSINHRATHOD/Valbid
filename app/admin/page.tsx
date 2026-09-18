'use client'

import { useEffect, useState } from 'react'
import { Check, ShieldCheck, X } from 'lucide-react'
import { supabase } from '../../lib/supabase'

type Claim = { id:string; user_id:string; riot_game_name:string; riot_tag_line:string; region:string; target_amount:number; status:string; created_at:string }

export default function AdminPage(){
 const [claims,setClaims]=useState<Claim[]>([])
 const [allowed,setAllowed]=useState(false)
 const [message,setMessage]=useState('')
 const [busy,setBusy]=useState('')
 async function load(){
  if(!supabase) return
  const {data:auth}=await supabase.auth.getUser()
  if(!auth.user){window.location.href='/login';return}
  const {data:admin}=await supabase.from('admin_users').select('user_id').eq('user_id',auth.user.id).maybeSingle()
  if(!admin){setMessage('Admin access required.');return}
  setAllowed(true)
  const {data,error}=await supabase.from('claim_requests').select('id,user_id,riot_game_name,riot_tag_line,region,target_amount,status,created_at').order('created_at',{ascending:false})
  if(error)setMessage('Could not load claim requests.')
  else setClaims((data??[]) as Claim[])
 }
 useEffect(()=>{load()},[])
 async function update(id:string,status:'approved'|'rejected'){
  if(!supabase)return
  setBusy(id)
  const {error}=await supabase.from('claim_requests').update({status,updated_at:new Date().toISOString()}).eq('id',id)
  setBusy('')
  if(error)setMessage('Update failed. Only authorized admins can change claims.')
  else {setMessage('Claim updated.');load()}
 }
 if(!allowed)return <main className="authPage"><div className="authShell"><div className="authCard"><div className="eyebrow small"><ShieldCheck size={14}/> ADMIN</div><h1>Admin access.</h1><p>{message||'Checking permissions…'}</p></div></div></main>
 return <main className="authPage"><div className="adminShell"><div className="eyebrow small"><ShieldCheck size={14}/> VALBID ADMIN</div><h1>Claim review.</h1><p>Review pending player claims before payment activation.</p><div className="adminList">{claims.length===0?<div className="empty">No claim requests.</div>:claims.map(c=><div className="adminRow" key={c.id}><div><strong>{c.riot_game_name}<small>#{c.riot_tag_line}</small></strong><span>{c.region} · ₹{Number(c.target_amount).toLocaleString('en-IN')} · {c.status}</span></div><div className="adminActions">{c.status==='pending'&&<><button onClick={()=>update(c.id,'approved')} disabled={busy===c.id}><Check size={14}/> Approve</button><button onClick={()=>update(c.id,'rejected')} disabled={busy===c.id}><X size={14}/> Reject</button></>}</div></div>)}</div></div></main>
}
