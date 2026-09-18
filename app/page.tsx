'use client'

import { useEffect, useMemo, useState } from 'react'
import { ArrowUpRight, ChevronDown, CircleHelp, Flame, Menu, Search, ShieldCheck, Trophy, X, LogIn, LogOut, UserRound } from 'lucide-react'
import Link from 'next/link'
import { supabase } from '../lib/supabase'

type Entry = { id: string; playerId: string; tag: string; region: string; amount: number; verified: boolean; firstVerifiedAt?: string | null }

const regions = ['Overall', 'India', 'NA', 'EU', 'Pacific', 'Brazil', 'LATAM', 'Korea', 'Japan']

export default function Home() {
  const [entries, setEntries] = useState<Entry[]>([])
  const [amount, setAmount] = useState('100')
  const [riotId, setRiotId] = useState('')
  const [region, setRegion] = useState('Overall')
  const [tab, setTab] = useState('All-time')
  const [search, setSearch] = useState('')
  const [menu, setMenu] = useState(false)
  const [loading, setLoading] = useState(true)
  const [notice, setNotice] = useState('')
  const [userEmail, setUserEmail] = useState<string | null>(null)

  useEffect(() => {
    if (!supabase) {
      setLoading(false)
      setNotice('Supabase is not configured in this deployment.')
      return
    }

    let active = true
    let boardId = ''

    async function load() {
      const { data: board, error: boardError } = await supabase!
        .from('boards')
        .select('id')
        .eq('slug', 'valorant')
        .eq('active', true)
        .single()

      if (boardError || !board) {
        if (active) {
          setLoading(false)
          setNotice('VALBID board could not be loaded.')
        }
        return
      }

      boardId = board.id

      const { data, error } = await supabase!
        .from('board_entries')
        .select('player_id, paid_amount, first_verified_at, players(riot_game_name, riot_tag_line, region, verified)')
        .eq('board_id', board.id)
        .eq('active', true)
        .order('paid_amount', { ascending: false })
        .order('first_verified_at', { ascending: true })
        .limit(100)

      if (!active) return

      if (error) {
        setNotice('Live leaderboard is temporarily unavailable.')
      } else {
        setEntries((data ?? []).flatMap((row: any) => row.players ? [{
          id: row.players.riot_game_name,
          playerId: row.player_id,
          tag: row.players.riot_tag_line,
          region: row.players.region,
          amount: Number(row.paid_amount),
          verified: Boolean(row.players.verified),
          firstVerifiedAt: row.first_verified_at,
        }] : []))
        setNotice('')
      }

      setLoading(false)
    }

    load()

    supabase.auth.getUser().then(({ data }) => {
      if (active) setUserEmail(data.user?.email ?? null)
    })
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (active) setUserEmail(session?.user?.email ?? null)
    })

    const channel = supabase
      .channel('valbid-board-live')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'board_entries' },
        (payload) => {
          const changed = payload.new as { board_id?: string; active?: boolean }
          const old = payload.old as { board_id?: string }
          if (changed?.board_id === boardId || old?.board_id === boardId) load()
        }
      )
      .subscribe()

    return () => {
      active = false
      authListener.subscription.unsubscribe()
      supabase!.removeChannel(channel)
    }
  }, [])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return entries
      .filter(e => region === 'Overall' || e.region === region)
      .filter(e => !q || `${e.id}#${e.tag}`.toLowerCase().includes(q))
      .sort((a, b) => b.amount - a.amount || (a.firstVerifiedAt || '').localeCompare(b.firstVerifiedAt || ''))
      .map((e, i) => ({ ...e, rank: i + 1 }))
  }, [entries, region, search])

  async function claim() {
    const value = Number(amount)
    if (!riotId.trim() || !Number.isFinite(value) || value < 100) {
      setNotice('Enter a Riot ID and a bid of at least ₹100.')
      return
    }
    if (!userEmail || !supabase) {
      setNotice('Please sign in before claiming a spot.')
      return
    }

    const [gameName, tagLine] = riotId.trim().split('#')
    if (!gameName || !tagLine) {
      setNotice('Use your Riot ID in name#tag format.')
      return
    }

    const { data: board, error: boardError } = await supabase
      .from('boards')
      .select('id, min_bid')
      .eq('slug', 'valorant')
      .eq('active', true)
      .single()

    if (boardError || !board) {
      setNotice('VALBID board could not be loaded.')
      return
    }

    if (value < Number(board.min_bid)) {
      setNotice(`Minimum bid is ₹${Number(board.min_bid).toLocaleString('en-IN')}.`)
      return
    }

    const { data: auth } = await supabase.auth.getUser()
    if (!auth.user) {
      setNotice('Your session expired. Please sign in again.')
      return
    }

    const { error } = await supabase.from('claim_requests').insert({
      user_id: auth.user.id,
      board_id: board.id,
      riot_game_name: gameName.trim(),
      riot_tag_line: tagLine.trim(),
      region: region === 'Overall' ? 'Overall' : region,
      target_amount: value,
    })

    if (error) {
      setNotice('Could not save your claim request. Please try again.')
      return
    }

    setNotice('Claim request created. Your position becomes active only after payment is verified.')
  }

  return (
    <main>
      <header className="topbar">
        <a className="logo" href="#top">VAL<span>BID</span></a>
        <nav className="desktopNav"><a href="#leaderboard">Leaderboard</a><a href="#activity">Activity</a><a href="#about">About</a></nav>
        <div className="topActions"><div className="authArea">{userEmail ? <button className="authBtn" onClick={async () => { await supabase?.auth.signOut(); setNotice("Signed out.") }}><UserRound size={14}/>{userEmail.split("@")[0]}<LogOut size={14}/></button> : <Link className="authBtn" href="/login"><LogIn size={14}/>Sign in</Link>}</div>
          <div className="searchBox"><Search size={16}/><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search player" /></div>
          <button className="ghostBtn" onClick={() => setMenu(!menu)} aria-label="Menu">{menu ? <X size={18}/> : <Menu size={18}/>}</button>
        </div>
      </header>

      {menu && <div className="mobileMenu"><a href="#leaderboard">Leaderboard</a><a href="#activity">Activity</a><a href="#about">About & Rules</a></div>}

      <section id="top" className="hero">
        <div className="eyebrow"><span className="pulse"/> LIVE COMMUNITY BOARD</div>
        <h1>Pay to claim<br/><em>your spot.</em></h1>
        <p className="heroCopy">Put your VALORANT ID on the board. Your verified spend determines your public position.</p>

        <div className="claimCard">
          <div className="claimRow">
            <label><span>RIOT ID</span><input value={riotId} onChange={e => setRiotId(e.target.value)} placeholder="name#tag" /></label>
            <label><span>POSITION BUDGET</span><div className="money"><b>₹</b><input value={amount} onChange={e => setAmount(e.target.value.replace(/[^0-9]/g, ''))}/></div></label>
            <label><span>BOARD</span><select value={region} onChange={e => setRegion(e.target.value)}>{regions.map(r => <option key={r}>{r}</option>)}</select></label>
            <button className="claimBtn" onClick={claim}>Claim spot <ArrowUpRight size={18}/></button>
          </div>
          <div className="claimFoot"><span>Minimum bid ₹100</span><span>•</span><span>Verified payments only</span><span>•</span><span>Not an official Riot rank</span></div>
        </div>
        {notice && <div className="notice">{notice}</div>}
      </section>

      <section id="leaderboard" className="boardSection">
        <div className="sectionHead">
          <div><div className="eyebrow small"><Flame size={14}/> THE BOARD</div><h2>Leaderboard</h2></div>
          <div className="tabs">{['All-time', 'Today'].map(t => <button key={t} className={tab === t ? 'active' : ''} onClick={() => setTab(t)}>{t}</button>)}</div>
        </div>
        <div className="regionRail">{regions.map(r => <button key={r} className={region === r ? 'active' : ''} onClick={() => setRegion(r)}>{r}</button>)}</div>

        <div className="table">
          <div className="tableHead"><span>#</span><span>PLAYER</span><span>REGION</span><span>VERIFIED SPEND</span><span>MOVE</span></div>
          {loading && <div className="empty">Loading live board…</div>}
          {!loading && filtered.map((e, i) => <div className={`entry ${i < 3 ? 'topEntry' : ''}`} key={`${e.id}-${e.tag}`}>
            <div className="rank">{e.rank <= 3 ? <Trophy size={17}/> : String(e.rank).padStart(2, '0')}</div>
            <Link className="player playerLink" href={`/player/${e.playerId}`}><div className="avatar">{e.id[0].toUpperCase()}</div><div><strong>{e.id}<small>#{e.tag}</small></strong>{e.verified && <span className="verified"><ShieldCheck size={12}/> Verified</span>}</div></Link>
            <div className="regionCell">{e.region}</div>
            <div className="amountCell">₹{e.amount.toLocaleString('en-IN')}</div>
            <div className="move">—</div>
          </div>)}
          {!loading && !filtered.length && <div className="empty">No players found on this board.</div>}
        </div>
      </section>

      <section id="activity" className="activitySection"><div className="eyebrow small"><Flame size={14}/> RECENT ACTIVITY</div><div className="activityGrid"><div><strong>Live board</strong> updates after verified payment events<span>Realtime-ready</span></div><div><strong>Position engine</strong> ranks by verified spend<span>Difference-based rebids</span></div><div><strong>Verification</strong> separates paid position from Riot rank<span>Independent platform</span></div></div></section>

      <section className="infoSection"><div><CircleHelp size={18}/><h3>How it works</h3><p>Choose a board, enter your Riot ID and target position budget, then complete a verified payment. Existing players only pay the difference needed to reach their new target amount.</p></div><div><ChevronDown size={18}/><h3>Important</h3><p>VALBID is an independent community platform. Paid Position is a site ranking based on verified payments, not Riot Games competitive rank, MMR or leaderboard data.</p></div></section>

      <footer id="about"><div className="footerLogo">VALBID</div><p>Independent community platform for VALORANT players.</p><div className="footerLinks"><a href="#about">Rules</a><a href="#about">Terms</a><a href="#about">Privacy</a><a href="#about">FAQ</a></div><small>VALBID is not affiliated with, endorsed by, or sponsored by Riot Games. Paid Position is not an official competitive rank.</small></footer>
    </main>
  )
}
