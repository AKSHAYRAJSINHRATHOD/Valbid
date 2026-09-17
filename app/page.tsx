'use client'

import { useMemo, useState } from 'react'
import { ArrowUpRight, ChevronDown, CircleHelp, Flame, Menu, Search, ShieldCheck, Trophy, X } from 'lucide-react'

type Entry = { rank: number; id: string; tag: string; region: string; amount: number; change?: number; verified: boolean }

const seed: Entry[] = [
  { rank: 1, id: 'tenz', tag: 'NA1', region: 'NA', amount: 48200, change: 1, verified: true },
  { rank: 2, id: 'something', tag: 'KR1', region: 'Korea', amount: 39100, change: -1, verified: true },
  { rank: 3, id: 'aspas', tag: '001', region: 'Brazil', amount: 32500, verified: true },
  { rank: 4, id: 'demon1', tag: 'NA1', region: 'NA', amount: 27400, change: 2, verified: true },
  { rank: 5, id: 'boaster', tag: 'EUW', region: 'EU', amount: 22100, change: 0, verified: true },
  { rank: 6, id: 'chronicle', tag: 'EU1', region: 'EU', amount: 18500, change: -2, verified: true },
  { rank: 7, id: 'something2', tag: 'JP1', region: 'Japan', amount: 14900, verified: true },
  { rank: 8, id: 'royal', tag: 'IN1', region: 'India', amount: 12700, change: 1, verified: true },
]

const regions = ['Overall', 'India', 'NA', 'EU', 'Pacific', 'Brazil', 'LATAM', 'Korea', 'Japan']

export default function Home() {
  const [entries, setEntries] = useState(seed)
  const [amount, setAmount] = useState('100')
  const [riotId, setRiotId] = useState('')
  const [region, setRegion] = useState('Overall')
  const [tab, setTab] = useState('All-time')
  const [search, setSearch] = useState('')
  const [menu, setMenu] = useState(false)
  const [notice, setNotice] = useState('')

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return entries
      .filter(e => region === 'Overall' || e.region === region)
      .filter(e => !q || `${e.id}#${e.tag}`.toLowerCase().includes(q))
      .sort((a, b) => b.amount - a.amount)
      .map((e, i) => ({ ...e, rank: i + 1 }))
  }, [entries, region, search])

  function claim() {
    const value = Number(amount)
    if (!riotId.trim() || !Number.isFinite(value) || value < 100) {
      setNotice('Enter a Riot ID and a bid of at least ₹100.')
      return
    }
    const [id, tag = 'IN1'] = riotId.trim().split('#')
    const existing = entries.find(e => e.id.toLowerCase() === id.toLowerCase() && e.tag.toLowerCase() === tag.toLowerCase())
    const paid = existing ? Math.max(existing.amount, value) : value
    setEntries(prev => existing
      ? prev.map(e => e === existing ? { ...e, amount: paid, region: region === 'Overall' ? e.region : region } : e)
      : [...prev, { rank: 0, id, tag, region: region === 'Overall' ? 'India' : region, amount: paid, verified: true }]
    )
    setNotice(`Demo claim created for ${id}#${tag}. Payment verification will be connected next.`)
    setRiotId('')
  }

  return (
    <main>
      <header className="topbar">
        <a className="logo" href="#top">VAL<span>BID</span></a>
        <nav className="desktopNav">
          <a href="#leaderboard">Leaderboard</a><a href="#activity">Activity</a><a href="#about">About</a>
        </nav>
        <div className="topActions">
          <div className="searchBox"><Search size={16}/><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search player" /></div>
          <button className="ghostBtn" onClick={() => setMenu(!menu)}>{menu ? <X size={18}/> : <Menu size={18}/>}</button>
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
          {filtered.map((e, i) => <div className={`entry ${i < 3 ? 'topEntry' : ''}`} key={`${e.id}-${e.tag}`}>
            <div className="rank">{e.rank <= 3 ? <Trophy size={17}/> : String(e.rank).padStart(2, '0')}</div>
            <div className="player"><div className="avatar">{e.id[0].toUpperCase()}</div><div><strong>{e.id}<small>#{e.tag}</small></strong>{e.verified && <span className="verified"><ShieldCheck size={12}/> Verified</span>}</div></div>
            <div className="regionCell">{e.region}</div>
            <div className="amountCell">₹{e.amount.toLocaleString('en-IN')}</div>
            <div className={`move ${e.change && e.change > 0 ? 'up' : e.change && e.change < 0 ? 'down' : ''}`}>{e.change ? `${e.change > 0 ? '↑' : '↓'} ${Math.abs(e.change)}` : '—'}</div>
          </div>)}
          {!filtered.length && <div className="empty">No players found on this board.</div>}
        </div>
      </section>

      <section id="activity" className="activitySection"><div className="eyebrow small"><Flame size={14}/> RECENT ACTIVITY</div><div className="activityGrid"><div><strong>Something</strong> raised their position to <b>₹39,100</b><span>2 min ago</span></div><div><strong>Royal#IN1</strong> entered the board at <b>₹12,700</b><span>8 min ago</span></div><div><strong>Demon1</strong> moved up two spots<span>14 min ago</span></div></div></section>

      <footer id="about"><div className="footerLogo">VALBID</div><p>Independent community platform for VALORANT players.</p><div className="footerLinks"><a href="#about">Rules</a><a href="#about">Terms</a><a href="#about">Privacy</a><a href="#about">FAQ</a></div><small>VALBID is not affiliated with, endorsed by, or sponsored by Riot Games. Paid Position is not an official competitive rank.</small></footer>
    </main>
  )
}
