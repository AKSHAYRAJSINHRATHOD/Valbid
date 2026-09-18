'use client'

import { useEffect, useState } from 'react'
import { ArrowLeft, ArrowUpRight, ShieldCheck, Trophy } from 'lucide-react'
import Link from 'next/link'
import { supabase } from '../../../lib/supabase'

export default function PlayerPage({ params }: { params: Promise<{ id: string }> }) {
  const [player, setPlayer] = useState<any>(null)
  const [rank, setRank] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      if (!supabase) return setLoading(false)
      const { id } = await params
      const { data: board } = await supabase.from('boards').select('id').eq('slug', 'valorant').eq('active', true).single()
      if (!board) return setLoading(false)

      const { data: entry } = await supabase
        .from('board_entries')
        .select('player_id, paid_amount, first_verified_at, players(riot_game_name, riot_tag_line, region, verified)')
        .eq('board_id', board.id).eq('player_id', id).eq('active', true).maybeSingle()

      if (!entry) return setLoading(false)

      const { count } = await supabase
        .from('board_entries')
        .select('id', { count: 'exact', head: true })
        .eq('board_id', board.id).eq('active', true)
        .gt('paid_amount', entry.paid_amount)

      setPlayer({ ...entry.players, amount: Number(entry.paid_amount), firstVerifiedAt: entry.first_verified_at })
      setRank((count ?? 0) + 1)
      setLoading(false)
    }
    load()
  }, [params])

  if (loading) return <main className="authPage"><div className="empty">Loading player profile…</div></main>
  if (!player) return <main className="authPage"><div className="authShell"><Link href="/" className="backLink"><ArrowLeft size={15}/> Back to VALBID</Link><div className="authCard"><h1>Player not found.</h1><p>This player does not have an active verified VALBID position.</p></div></div></main>

  return <main className="authPage"><div className="profileShell">
    <Link href="/" className="backLink"><ArrowLeft size={15}/> Back to leaderboard</Link>
    <div className="profileCard">
      <div className="profileTop"><div className="profileAvatar">{player.riot_game_name[0].toUpperCase()}</div><div><div className="eyebrow small">VALBID PLAYER</div><h1>{player.riot_game_name}<small>#{player.riot_tag_line}</small></h1>{player.verified && <span className="verified"><ShieldCheck size={12}/> Verified</span>}</div></div>
      <div className="profileStats"><div><span>POSITION</span><strong><Trophy size={15}/> #{rank}</strong></div><div><span>VERIFIED SPEND</span><strong>₹{player.amount.toLocaleString('en-IN')}</strong></div><div><span>REGION</span><strong>{player.region}</strong></div></div>
      <div className="profileNote">Paid Position is a VALBID community ranking based on verified payments, not Riot Games competitive rank or MMR.</div>
      <Link href="/#top" className="claimBtn profileBtn">Outbid this player <ArrowUpRight size={17}/></Link>
    </div>
  </div></main>
}
