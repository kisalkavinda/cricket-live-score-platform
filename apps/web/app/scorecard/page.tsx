'use client';

import { useState } from 'react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

interface BatterDetail {
  name: string;
  dismissal: string;
  runs: number;
  balls: number;
  fours: number;
  sixes: number;
  sr: string;
  isStriker?: boolean;
}

interface BowlerDetail {
  name: string;
  overs: string;
  maidens: number;
  runs: number;
  wickets: number;
  econ: string;
  wides: number;
  noBalls: number;
}

interface InningsScorecard {
  teamName: string;
  teamFlag: string;
  score: string;
  overs: string;
  extras: string;
  total: string;
  batting: BatterDetail[];
  bowling: BowlerDetail[];
  fallOfWickets: string[];
  didNotBat: string[];
}

interface MatchScore {
  id: string;
  status: 'LIVE' | 'UPCOMING' | 'COMPLETED';
  matchName: string;
  stage: string;
  venue: string;
  toss: string;
  umpires: string;
  date: string;
  team1: { name: string; shortName: string; flag: string; score: string; overs: string };
  team2: { name: string; shortName: string; flag: string; score: string; overs: string };
  statusNote: string;
  target?: string;
  crr?: string;
  rrr?: string;
  innings1: InningsScorecard;
  innings2: InningsScorecard;
}

const mockMatch: MatchScore = {
  id: 'match-1',
  status: 'LIVE',
  matchName: 'Match 05 — Group Stage',
  stage: 'Innings 2 • Over 17.2',
  venue: 'R. Premadasa International Cricket Stadium, Colombo',
  toss: 'Kandy Tigers won the toss and elected to field first',
  umpires: 'Kumar Dharmasena & Ruchira Palliyaguruge',
  date: 'August 09, 2026',
  team1: { name: 'Colombo Lions', shortName: 'LIONS', flag: '🦁', score: '178/6', overs: '20.0' },
  team2: { name: 'Kandy Tigers', shortName: 'TIGERS', flag: '🐯', score: '154/4', overs: '17.2' },
  statusNote: 'Kandy Tigers need 25 runs in 16 balls to win (RRR: 9.38)',
  target: 'Target: 179',
  crr: '8.88',
  rrr: '9.38',
  innings1: {
    teamName: 'Colombo Lions',
    teamFlag: '🦁',
    score: '178/6',
    overs: '20.0',
    extras: '12 (b 2, lb 4, w 5, nb 1)',
    total: '178/6 (20.0 Overs)',
    batting: [
      { name: 'P. Nissanka', dismissal: 'c Mendis b Pathirana', runs: 34, balls: 22, fours: 4, sixes: 1, sr: '154.55' },
      { name: 'K. Mendis (wk)', dismissal: 'b Rajitha', runs: 18, balls: 14, fours: 2, sixes: 0, sr: '128.57' },
      { name: 'C. Asalanka (c)', dismissal: 'c Shanaka b Hasaranga', runs: 45, balls: 28, fours: 5, sixes: 2, sr: '160.71' },
      { name: 'A. Fernando', dismissal: 'run out (Rajitha)', runs: 22, balls: 16, fours: 2, sixes: 0, sr: '137.50' },
      { name: 'D. de Silva', dismissal: 'b Pathirana', runs: 29, balls: 19, fours: 3, sixes: 1, sr: '152.63' },
      { name: 'D. Chameera', dismissal: 'not out', runs: 12, balls: 10, fours: 1, sixes: 0, sr: '120.00' },
      { name: 'M. Theekshana', dismissal: 'run out (Perera)', runs: 6, balls: 5, fours: 0, sixes: 0, sr: '120.00' },
      { name: 'D. Madushanka', dismissal: 'not out', runs: 0, balls: 6, fours: 0, sixes: 0, sr: '0.00' },
    ],
    bowling: [
      { name: 'K. Rajitha', overs: '4.0', maidens: 0, runs: 36, wickets: 1, econ: '9.00', wides: 1, noBalls: 0 },
      { name: 'M. Pathirana', overs: '4.0', maidens: 0, runs: 32, wickets: 2, econ: '8.00', wides: 3, noBalls: 1 },
      { name: 'W. Hasaranga', overs: '4.0', maidens: 0, runs: 28, wickets: 1, econ: '7.00', wides: 0, noBalls: 0 },
      { name: 'C. Karunaratne', overs: '4.0', maidens: 0, runs: 42, wickets: 0, econ: '10.50', wides: 1, noBalls: 0 },
      { name: 'M. Theekshana', overs: '4.0', maidens: 0, runs: 34, wickets: 0, econ: '8.50', wides: 0, noBalls: 0 },
    ],
    fallOfWickets: [
      '1-42 (K. Mendis, 4.2 ov)',
      '2-68 (P. Nissanka, 7.5 ov)',
      '3-112 (C. Asalanka, 12.4 ov)',
      '4-135 (A. Fernando, 15.1 ov)',
      '5-162 (D. de Silva, 18.2 ov)',
      '6-172 (M. Theekshana, 19.3 ov)',
    ],
    didNotBat: ['L. Kumara', 'P. Jayasuriya'],
  },
  innings2: {
    teamName: 'Kandy Tigers',
    teamFlag: '🐯',
    score: '154/4',
    overs: '17.2',
    extras: '8 (b 1, lb 2, w 4, nb 1)',
    total: '154/4 (17.2 Overs)',
    batting: [
      { name: 'D. Chandimal', dismissal: 'c Asalanka b Chameera', runs: 28, balls: 19, fours: 4, sixes: 0, sr: '147.37' },
      { name: 'K. Perera', dismissal: 'not out', runs: 58, balls: 34, fours: 6, sixes: 3, sr: '170.58', isStriker: true },
      { name: 'B. Rajapaksa', dismissal: 'c Mendis b Madushanka', runs: 16, balls: 12, fours: 2, sixes: 0, sr: '133.33' },
      { name: 'A. Mathews', dismissal: 'lbw b Theekshana', runs: 20, balls: 15, fours: 1, sixes: 1, sr: '133.33' },
      { name: 'D. Shanaka (c)', dismissal: 'not out', runs: 24, balls: 14, fours: 2, sixes: 1, sr: '171.42', isStriker: false },
    ],
    bowling: [
      { name: 'D. Chameera', overs: '4.0', maidens: 0, runs: 34, wickets: 1, econ: '8.50', wides: 1, noBalls: 0 },
      { name: 'D. Madushanka', overs: '4.0', maidens: 0, runs: 38, wickets: 1, econ: '9.50', wides: 2, noBalls: 1 },
      { name: 'M. Theekshana', overs: '4.0', maidens: 0, runs: 26, wickets: 1, econ: '6.50', wides: 0, noBalls: 0 },
      { name: 'D. de Silva', overs: '3.2', maidens: 0, runs: 32, wickets: 0, econ: '9.60', wides: 1, noBalls: 0 },
      { name: 'P. Jayasuriya', overs: '2.0', maidens: 0, runs: 16, wickets: 0, econ: '8.00', wides: 0, noBalls: 0 },
    ],
    fallOfWickets: ['1-45 (D. Chandimal, 4.5 ov)', '2-78 (B. Rajapaksa, 8.4 ov)', '3-118 (A. Mathews, 13.2 ov)'],
    didNotBat: ['W. Hasaranga', 'C. Karunaratne', 'K. Rajitha', 'M. Pathirana', 'N. Pradeep'],
  },
};

export default function FullScorecardPage() {
  const [activeTab, setActiveTab] = useState<'inn2' | 'inn1'>('inn2');
  const activeInnings = activeTab === 'inn1' ? mockMatch.innings1 : mockMatch.innings2;

  return (
    <div style={{ background: 'var(--color-paper-dark)', minHeight: '100vh', color: 'var(--color-paper)' }}>
      <Navbar />

      <main style={{ paddingTop: '90px', paddingBottom: 'var(--space-3xl)' }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '0 12px' }}>
          {/* Top Sticky Bar: Navigation */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <Link
              href="/"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                color: 'var(--color-accent-bright)',
                fontFamily: 'var(--font-body)',
                fontWeight: 700,
                fontSize: '0.85rem',
                textDecoration: 'none',
                background: 'rgba(255, 255, 255, 0.08)',
                padding: '6px 14px',
                borderRadius: '9999px',
                border: '1px solid rgba(255, 255, 255, 0.12)',
              }}
            >
              ← Overview
            </Link>

            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '4px 10px',
                borderRadius: '9999px',
                background: 'var(--color-accent)',
                color: 'white',
                fontFamily: 'var(--font-display)',
                fontSize: '0.75rem',
                fontWeight: 800,
                letterSpacing: '0.1em',
              }}
            >
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'white' }} className="animate-pulse-dot" />
              LIVE SCORE
            </span>
          </div>

          {/* Broadcast Header Card */}
          <div
            style={{
              background: 'linear-gradient(145deg, rgba(192, 39, 45, 0.28) 0%, rgba(18, 14, 14, 0.95) 100%)',
              border: '1px solid rgba(255, 255, 255, 0.14)',
              borderRadius: '16px',
              padding: '16px',
              marginBottom: '16px',
              boxShadow: '0 16px 40px rgba(0, 0, 0, 0.5)',
            }}
          >
            {/* Stage Title */}
            <div style={{ fontFamily: 'var(--font-body)', fontSize: '0.75rem', color: 'var(--color-ink-subtle)', marginBottom: '12px' }}>
              {mockMatch.matchName} • {mockMatch.date}
            </div>

            {/* Scores Layout: Mobile Responsive Stack */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '14px' }}>
              {/* Team 1 Score Row */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  background: 'rgba(255, 255, 255, 0.05)',
                  padding: '10px 14px',
                  borderRadius: '10px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '1.5rem' }}>{mockMatch.team1.flag}</span>
                  <div>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', fontWeight: 800 }}>{mockMatch.team1.name}</div>
                    <span style={{ fontSize: '0.7rem', color: 'var(--color-ink-subtle)' }}>1st Innings</span>
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontFamily: 'var(--font-data)', fontSize: '1.4rem', fontWeight: 900 }}>{mockMatch.team1.score}</div>
                  <div style={{ fontFamily: 'var(--font-data)', fontSize: '0.75rem', color: 'var(--color-ink-subtle)' }}>({mockMatch.team1.overs} ov)</div>
                </div>
              </div>

              {/* Team 2 Score Row (Live Active) */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  background: 'rgba(192, 39, 45, 0.18)',
                  border: '1.5px solid var(--color-accent)',
                  padding: '10px 14px',
                  borderRadius: '10px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '1.5rem' }}>{mockMatch.team2.flag}</span>
                  <div>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', fontWeight: 800, color: 'white' }}>{mockMatch.team2.name}</div>
                    <span style={{ fontSize: '0.7rem', color: 'var(--color-accent-bright)', fontWeight: 700 }}>Chasing Target 179</span>
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontFamily: 'var(--font-data)', fontSize: '1.4rem', fontWeight: 900, color: 'white' }}>{mockMatch.team2.score}</div>
                  <div style={{ fontFamily: 'var(--font-data)', fontSize: '0.75rem', color: 'var(--color-accent-bright)', fontWeight: 700 }}>({mockMatch.team2.overs} ov)</div>
                </div>
              </div>
            </div>

            {/* Equation Banner */}
            <div
              style={{
                background: 'rgba(255, 255, 255, 0.06)',
                padding: '8px 12px',
                borderRadius: '8px',
                borderLeft: '3px solid var(--color-accent)',
                fontFamily: 'var(--font-body)',
                fontSize: '0.8rem',
                fontWeight: 700,
                color: 'white',
              }}
            >
              📢 {mockMatch.statusNote}
            </div>
          </div>

          {/* Sticky Tab Selector for Innings */}
          <div
            style={{
              position: 'sticky',
              top: '76px',
              zIndex: 50,
              background: 'var(--color-paper-dark)',
              padding: '6px 0',
              marginBottom: '16px',
              borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
            }}
          >
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                onClick={() => setActiveTab('inn2')}
                style={{
                  flex: 1,
                  padding: '10px 12px',
                  borderRadius: '10px',
                  fontFamily: 'var(--font-display)',
                  fontSize: '0.95rem',
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  border: 'none',
                  cursor: 'pointer',
                  background: activeTab === 'inn2' ? 'var(--color-accent)' : 'rgba(255, 255, 255, 0.06)',
                  color: activeTab === 'inn2' ? 'white' : 'var(--color-ink-subtle)',
                  transition: 'all 200ms ease-out',
                }}
              >
                {mockMatch.innings2.teamFlag} {mockMatch.innings2.teamName} ({mockMatch.innings2.score})
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('inn1')}
                style={{
                  flex: 1,
                  padding: '10px 12px',
                  borderRadius: '10px',
                  fontFamily: 'var(--font-display)',
                  fontSize: '0.95rem',
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  border: 'none',
                  cursor: 'pointer',
                  background: activeTab === 'inn1' ? 'var(--color-accent)' : 'rgba(255, 255, 255, 0.06)',
                  color: activeTab === 'inn1' ? 'white' : 'var(--color-ink-subtle)',
                  transition: 'all 200ms ease-out',
                }}
              >
                {mockMatch.innings1.teamFlag} {mockMatch.innings1.teamName} ({mockMatch.innings1.score})
              </button>
            </div>
          </div>

          {/* MAIN SCORECARD DETAILS */}
          <div
            style={{
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '16px',
              padding: '16px',
              marginBottom: '24px',
            }}
          >
            {/* Innings Title */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '16px',
                paddingBottom: '10px',
                borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
              }}
            >
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', fontWeight: 900 }}>
                {activeInnings.teamFlag} {activeInnings.teamName} Batting
              </h3>
              <span style={{ fontFamily: 'var(--font-data)', fontSize: '1.1rem', fontWeight: 800, color: 'var(--color-accent-bright)' }}>
                {activeInnings.total}
              </span>
            </div>

            {/* BATTING LIST: Clean Mobile Cards View (< 640px) */}
            <div className="block sm:hidden" style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
              {activeInnings.batting.map((b, idx) => (
                <div
                  key={idx}
                  style={{
                    background: b.isStriker ? 'rgba(192, 39, 45, 0.16)' : 'rgba(255, 255, 255, 0.04)',
                    border: b.isStriker ? '1px solid var(--color-accent)' : '1px solid rgba(255, 255, 255, 0.06)',
                    borderRadius: '10px',
                    padding: '10px 12px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ fontFamily: 'var(--font-body)', fontSize: '0.9rem', fontWeight: 700, color: b.isStriker ? 'var(--color-accent-bright)' : 'white' }}>
                      {b.name} {b.isStriker && ' (Striker *)'}
                    </span>
                    <span style={{ fontFamily: 'var(--font-data)', fontSize: '1rem', fontWeight: 800, color: 'white' }}>
                      {b.runs} <span style={{ fontSize: '0.75rem', fontWeight: 400, color: 'var(--color-ink-subtle)' }}>({b.balls})</span>
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--color-ink-subtle)' }}>
                    <span>{b.dismissal}</span>
                    <span style={{ fontFamily: 'var(--font-data)' }}>
                      {b.fours}×4s • {b.sixes}×6s • SR: {b.sr}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* BATTING TABLE: Desktop View (≥ 640px) */}
            <div className="hidden sm:block" style={{ overflowX: 'auto', marginBottom: '20px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '1.5px solid rgba(255, 255, 255, 0.12)', fontFamily: 'var(--font-body)', fontSize: '0.7rem', fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--color-ink-subtle)' }}>
                    <th style={{ padding: '8px 10px' }}>Batter</th>
                    <th style={{ padding: '8px 10px' }}>Dismissal Mode</th>
                    <th style={{ padding: '8px 10px', textAlign: 'right' }}>R</th>
                    <th style={{ padding: '8px 10px', textAlign: 'right' }}>B</th>
                    <th style={{ padding: '8px 10px', textAlign: 'right' }}>4s</th>
                    <th style={{ padding: '8px 10px', textAlign: 'right' }}>6s</th>
                    <th style={{ padding: '8px 10px', textAlign: 'right' }}>SR</th>
                  </tr>
                </thead>
                <tbody>
                  {activeInnings.batting.map((b, idx) => (
                    <tr
                      key={idx}
                      style={{
                        borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                        fontFamily: 'var(--font-body)',
                        fontSize: '0.85rem',
                        background: b.isStriker ? 'rgba(192, 39, 45, 0.1)' : 'transparent',
                      }}
                    >
                      <td style={{ padding: '8px 10px', fontWeight: 700, color: b.isStriker ? 'var(--color-accent-bright)' : 'white' }}>
                        {b.name} {b.isStriker && '*'}
                      </td>
                      <td style={{ padding: '8px 10px', color: 'var(--color-ink-subtle)', fontSize: '0.8rem' }}>{b.dismissal}</td>
                      <td style={{ padding: '8px 10px', textAlign: 'right', fontFamily: 'var(--font-data)', fontWeight: 800, color: 'white' }}>{b.runs}</td>
                      <td style={{ padding: '8px 10px', textAlign: 'right', fontFamily: 'var(--font-data)' }}>{b.balls}</td>
                      <td style={{ padding: '8px 10px', textAlign: 'right', fontFamily: 'var(--font-data)' }}>{b.fours}</td>
                      <td style={{ padding: '8px 10px', textAlign: 'right', fontFamily: 'var(--font-data)' }}>{b.sixes}</td>
                      <td style={{ padding: '8px 10px', textAlign: 'right', fontFamily: 'var(--font-data)', color: 'var(--color-ink-subtle)' }}>{b.sr}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Extras & Yet to Bat */}
            <div style={{ background: 'rgba(0, 0, 0, 0.25)', padding: '10px 14px', borderRadius: '8px', marginBottom: '20px', fontSize: '0.8rem' }}>
              <div style={{ marginBottom: '4px' }}>
                <strong style={{ color: 'var(--color-ink-subtle)' }}>Extras: </strong>
                <span style={{ fontFamily: 'var(--font-data)', fontWeight: 700 }}>{activeInnings.extras}</span>
              </div>
              {activeInnings.didNotBat.length > 0 && (
                <div>
                  <strong style={{ color: 'var(--color-ink-subtle)' }}>Yet to Bat: </strong>
                  <span>{activeInnings.didNotBat.join(', ')}</span>
                </div>
              )}
            </div>

            {/* Fall of Wickets */}
            {activeInnings.fallOfWickets.length > 0 && (
              <div style={{ marginBottom: '20px' }}>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: '0.9rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--color-accent-bright)', marginBottom: '6px' }}>
                  Fall of Wickets
                </div>
                <div style={{ fontFamily: 'var(--font-data)', fontSize: '0.75rem', color: 'var(--color-ink-subtle)', background: 'rgba(255, 255, 255, 0.03)', padding: '10px 12px', borderRadius: '8px', lineHeight: 1.6 }}>
                  {activeInnings.fallOfWickets.join(' • ')}
                </div>
              </div>
            )}

            {/* BOWLING LIST: Clean Mobile Cards View (< 640px) */}
            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', fontWeight: 900, textTransform: 'uppercase', color: 'var(--color-accent-bright)', marginBottom: '10px' }}>
                Bowling Analysis
              </div>

              <div className="block sm:hidden" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {activeInnings.bowling.map((bw, idx) => (
                  <div key={idx} style={{ background: 'rgba(255, 255, 255, 0.04)', border: '1px solid rgba(255, 255, 255, 0.06)', borderRadius: '10px', padding: '10px 12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span style={{ fontFamily: 'var(--font-body)', fontSize: '0.85rem', fontWeight: 700, color: 'white' }}>{bw.name}</span>
                      <span style={{ fontFamily: 'var(--font-data)', fontSize: '0.95rem', fontWeight: 800, color: bw.wickets > 0 ? 'var(--color-accent-bright)' : 'white' }}>
                        {bw.wickets} / {bw.runs}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--color-ink-subtle)', fontFamily: 'var(--font-data)' }}>
                      <span>{bw.overs} Overs • {bw.maidens} Maidens</span>
                      <span>ECON: {bw.econ} • WD: {bw.wides}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* BOWLING TABLE: Desktop View (≥ 640px) */}
              <div className="hidden sm:block" style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ borderBottom: '1.5px solid rgba(255, 255, 255, 0.12)', fontFamily: 'var(--font-body)', fontSize: '0.7rem', fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--color-ink-subtle)' }}>
                      <th style={{ padding: '8px 10px' }}>Bowler</th>
                      <th style={{ padding: '8px 10px', textAlign: 'right' }}>O</th>
                      <th style={{ padding: '8px 10px', textAlign: 'right' }}>M</th>
                      <th style={{ padding: '8px 10px', textAlign: 'right' }}>R</th>
                      <th style={{ padding: '8px 10px', textAlign: 'right' }}>W</th>
                      <th style={{ padding: '8px 10px', textAlign: 'right' }}>ECON</th>
                      <th style={{ padding: '8px 10px', textAlign: 'right' }}>WD</th>
                      <th style={{ padding: '8px 10px', textAlign: 'right' }}>NB</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeInnings.bowling.map((bw, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)', fontFamily: 'var(--font-body)', fontSize: '0.85rem' }}>
                        <td style={{ padding: '8px 10px', fontWeight: 600, color: 'white' }}>{bw.name}</td>
                        <td style={{ padding: '8px 10px', textAlign: 'right', fontFamily: 'var(--font-data)' }}>{bw.overs}</td>
                        <td style={{ padding: '8px 10px', textAlign: 'right', fontFamily: 'var(--font-data)' }}>{bw.maidens}</td>
                        <td style={{ padding: '8px 10px', textAlign: 'right', fontFamily: 'var(--font-data)' }}>{bw.runs}</td>
                        <td style={{ padding: '8px 10px', textAlign: 'right', fontFamily: 'var(--font-data)', fontWeight: 800, color: bw.wickets > 0 ? 'var(--color-accent-bright)' : 'white' }}>{bw.wickets}</td>
                        <td style={{ padding: '8px 10px', textAlign: 'right', fontFamily: 'var(--font-data)', color: 'var(--color-ink-subtle)' }}>{bw.econ}</td>
                        <td style={{ padding: '8px 10px', textAlign: 'right', fontFamily: 'var(--font-data)', color: 'var(--color-ink-subtle)' }}>{bw.wides}</td>
                        <td style={{ padding: '8px 10px', textAlign: 'right', fontFamily: 'var(--font-data)', color: 'var(--color-ink-subtle)' }}>{bw.noBalls}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Stadium & Match Info */}
            <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '14px', display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.75rem', color: 'var(--color-ink-subtle)' }}>
              <div>📍 <strong>Venue:</strong> {mockMatch.venue}</div>
              <div>🪙 <strong>Toss:</strong> {mockMatch.toss}</div>
              <div>👔 <strong>Umpires:</strong> {mockMatch.umpires}</div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
