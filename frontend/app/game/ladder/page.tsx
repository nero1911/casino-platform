'use client';
import { useState } from 'react';
import { useAuth } from '@/lib/auth';
import { playLadder } from '@/lib/api';
import Link from 'next/link';

export default function LadderPage() {
  const { user, refreshUser } = useAuth();
  const [choice, setChoice] = useState<'left' | 'right'>('left');
  const [bet, setBet] = useState(100);
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [animating, setAnimating] = useState(false);
  const [activePath, setActivePath] = useState<'left' | 'right' | null>(null);

  const handlePlay = async () => {
    if (!user || loading) return;
    setLoading(true);
    setResult(null);
    setActivePath(null);
    setAnimating(true);
    setTimeout(async () => {
      try {
        const data = await playLadder(bet, choice);
        setActivePath(data.result);
        setResult(data);
        refreshUser();
      } catch (e: any) {
        setResult({ error: e.response?.data?.error || '오류 발생' });
      } finally {
        setLoading(false);
        setAnimating(false);
      }
    }, 1200);
  };

  const quickBets = [100, 500, 1000, 5000, 10000];

  // 사다리 SVG
  const LadderSVG = () => (
    <svg width="200" height="220" viewBox="0 0 200 220" style={{ display: 'block', margin: '0 auto' }}>
      {/* 왼쪽 기둥 */}
      <line x1="40" y1="20" x2="40" y2="200" stroke={activePath === 'left' ? '#f0c040' : '#2a2a3a'} strokeWidth="4" strokeLinecap="round"/>
      {/* 오른쪽 기둥 */}
      <line x1="160" y1="20" x2="160" y2="200" stroke={activePath === 'right' ? '#f0c040' : '#2a2a3a'} strokeWidth="4" strokeLinecap="round"/>
      {/* 가로줄들 */}
      <line x1="40" y1="70" x2="160" y2="70" stroke="#3a3a4a" strokeWidth="3" strokeLinecap="round"/>
      <line x1="40" y1="120" x2="160" y2="120" stroke="#3a3a4a" strokeWidth="3" strokeLinecap="round"/>
      <line x1="40" y1="160" x2="160" y2="160" stroke="#3a3a4a" strokeWidth="3" strokeLinecap="round"/>
      {/* 상단 라벨 */}
      <text x="40" y="14" textAnchor="middle" fill={choice === 'left' ? '#f0c040' : '#666'} fontSize="13" fontWeight="700">왼쪽</text>
      <text x="160" y="14" textAnchor="middle" fill={choice === 'right' ? '#f0c040' : '#666'} fontSize="13" fontWeight="700">오른쪽</text>
      {/* 하단 결과 */}
      <text x="40" y="218" textAnchor="middle" fill={activePath === 'left' ? '#4ade80' : '#666'} fontSize="12" fontWeight="700">
        {activePath === 'left' ? '당첨!' : '꽝'}
      </text>
      <text x="160" y="218" textAnchor="middle" fill={activePath === 'right' ? '#4ade80' : '#666'} fontSize="12" fontWeight="700">
        {activePath === 'right' ? '당첨!' : '꽝'}
      </text>
      {/* 움직이는 점 */}
      {animating && (
        <circle cx="40" cy="20" r="8" fill="#f0c040">
          <animate attributeName="cy" values="20;200" dur="1s" fill="freeze"/>
        </circle>
      )}
      {activePath && !animating && (
        <circle cx={activePath === 'left' ? 40 : 160} cy="200" r="8" fill={result?.win ? '#4ade80' : '#f87171'}/>
      )}
    </svg>
  );

  return (
    <div style={{ background: '#0a0a0f', minHeight: '100vh' }}>
      <nav style={{ background: '#0d0d14', borderBottom: '1px solid #1e1e2e', padding: '0 1.5rem', height: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
          <span style={{ fontSize: 22 }}>🎰</span>
          <span style={{ fontSize: 18, fontWeight: 900, color: '#f0c040' }}>카지노</span>
        </Link>
        {user && <span style={{ fontWeight: 800, color: '#f0c040', fontSize: 16 }}>{user.points.toLocaleString()}P</span>}
      </nav>

      <div style={{ maxWidth: 480, margin: '0 auto', padding: '2rem 1rem' }}>
        <h1 style={{ fontSize: 28, fontWeight: 900, color: '#e2e2e2', marginBottom: 4 }}>🪜 사다리</h1>
        <p style={{ color: '#888', marginBottom: 32, fontSize: 14 }}>왼쪽 또는 오른쪽 — 50:50 확률, 1.9배 배당</p>

        <div style={{ background: '#13131c', border: '1px solid #1e1e2e', borderRadius: 16, padding: '2rem', marginBottom: 24 }}>
          <LadderSVG />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 24 }}>
          {(['left', 'right'] as const).map(side => (
            <button key={side} onClick={() => setChoice(side)} style={{
              padding: '1.2rem', borderRadius: 12, border: `2px solid ${choice === side ? '#f0c040' : '#2a2a3a'}`,
              background: choice === side ? '#2a2010' : '#13131c', color: choice === side ? '#f0c040' : '#888',
              fontWeight: 700, fontSize: 18, cursor: 'pointer', transition: 'all 0.15s'
            }}>
              {side === 'left' ? '⬅️ 왼쪽' : '➡️ 오른쪽'}
            </button>
          ))}
        </div>

        <div style={{ background: '#13131c', border: '1px solid #1e1e2e', borderRadius: 12, padding: '1.2rem', marginBottom: 16 }}>
          <p style={{ fontSize: 12, color: '#888', margin: '0 0 8px' }}>베팅 금액</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <input type="number" value={bet} onChange={e => setBet(Math.max(100, parseInt(e.target.value) || 100))}
              style={{ flex: 1, background: '#0a0a0f', border: '1px solid #2a2a3a', borderRadius: 8, padding: '8px 12px', color: '#f0c040', fontSize: 18, fontWeight: 700, outline: 'none' }} />
            <span style={{ color: '#888', fontWeight: 700 }}>P</span>
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {quickBets.map(q => (
              <button key={q} onClick={() => setBet(q)} style={{ flex: 1, minWidth: 60, padding: '6px 4px', borderRadius: 8, border: '1px solid #2a2a3a', background: bet === q ? '#2a2010' : '#0a0a0f', color: bet === q ? '#f0c040' : '#888', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>{q.toLocaleString()}</button>
            ))}
            <button onClick={() => setBet(Math.floor((user?.points || 0) / 2))} style={{ flex: 1, minWidth: 60, padding: '6px 4px', borderRadius: 8, border: '1px solid #2a2a3a', background: '#0a0a0f', color: '#888', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>1/2</button>
            <button onClick={() => setBet(user?.points || 0)} style={{ flex: 1, minWidth: 60, padding: '6px 4px', borderRadius: 8, border: '1px solid #2a2a3a', background: '#0a0a0f', color: '#888', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>MAX</button>
          </div>
        </div>

        <button onClick={handlePlay} disabled={loading || !user} style={{
          width: '100%', padding: '1rem', borderRadius: 12, border: 'none',
          background: loading ? '#333' : '#f0c040', color: '#000',
          fontWeight: 900, fontSize: 18, cursor: loading ? 'not-allowed' : 'pointer', marginBottom: 16
        }}>
          {loading ? '사다리 타는 중...' : `🪜 ${bet.toLocaleString()}P 베팅`}
        </button>

        {result && !result.error && (
          <div style={{ background: result.win ? '#0a2010' : '#200a0a', border: `2px solid ${result.win ? '#4ade80' : '#f87171'}`, borderRadius: 12, padding: '1.2rem', textAlign: 'center' }}>
            <p style={{ fontSize: 32, margin: '0 0 4px' }}>{result.win ? '🎉' : '😢'}</p>
            <p style={{ fontSize: 22, fontWeight: 900, color: result.win ? '#4ade80' : '#f87171', margin: '0 0 4px' }}>
              {result.win ? `+${result.payout.toLocaleString()}P 획득!` : `-${bet.toLocaleString()}P 손실`}
            </p>
            <p style={{ color: '#888', fontSize: 13, margin: 0 }}>
              결과: {result.result === 'left' ? '왼쪽' : '오른쪽'} | 잔고: {result.newPoints?.toLocaleString()}P
            </p>
          </div>
        )}
        {result?.error && (
          <div style={{ background: '#200a0a', border: '1px solid #f87171', borderRadius: 12, padding: '1rem', textAlign: 'center', color: '#f87171' }}>
            ❌ {result.error}
          </div>
        )}
      </div>
    </div>
  );
}
