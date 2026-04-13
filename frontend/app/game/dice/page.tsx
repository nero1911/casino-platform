'use client';
import { useState } from 'react';
import { useAuth } from '@/lib/auth';
import { playDice } from '@/lib/api';
import Link from 'next/link';

export default function DicePage() {
  const { user, refreshUser } = useAuth();
  const [target, setTarget] = useState(50);
  const [direction, setDirection] = useState<'over' | 'under'>('over');
  const [bet, setBet] = useState(100);
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const quickBets = [100, 500, 1000, 5000, 10000];

  const chance = direction === 'over' ? (100 - target) / 100 : target / 100;
  const multiplier = parseFloat(Math.min((0.95 / chance), 100).toFixed(2));

  const handlePlay = async () => {
    if (!user || loading) return;
    setLoading(true);
    setResult(null);
    try {
      const data = await playDice(bet, target, direction);
      setResult(data);
      refreshUser();
    } catch (e: any) {
      setResult({ error: e.response?.data?.error || '오류 발생' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ background: '#0a0a0f', minHeight: '100vh' }}>
      <nav style={{ background: '#0d0d14', borderBottom: '1px solid #1e1e2e', padding: '0 1.5rem', height: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
          <span style={{ fontSize: 22 }}>🎰</span>
          <span style={{ fontSize: 18, fontWeight: 900, color: '#f0c040' }}>카지노</span>
        </Link>
        {user && <span style={{ fontWeight: 800, color: '#f0c040', fontSize: 16 }}>{user.points.toLocaleString()}P</span>}
      </nav>

      <div style={{ maxWidth: 520, margin: '0 auto', padding: '2rem 1rem' }}>
        <h1 style={{ fontSize: 28, fontWeight: 900, color: '#e2e2e2', marginBottom: 4 }}>🎰 주사위</h1>
        <p style={{ color: '#888', marginBottom: 28, fontSize: 14 }}>1~100 숫자를 굴려서 예측한 방향이면 승리</p>

        {/* 결과 숫자 */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: 120, height: 120, borderRadius: 20,
            background: result ? (result.win ? '#0a2010' : '#200a0a') : '#13131c',
            border: `3px solid ${result ? (result.win ? '#4ade80' : '#f87171') : '#2a2a3a'}`,
            fontSize: 52, fontWeight: 900,
            color: result ? (result.win ? '#4ade80' : '#f87171') : '#f0c040',
            transition: 'all 0.3s'
          }}>
            {loading ? '🎲' : result ? result.result : '?'}
          </div>
        </div>

        {/* 정보 카드 */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 24 }}>
          {[
            { label: '목표', value: target },
            { label: '승률', value: `${(chance * 100).toFixed(0)}%` },
            { label: '배당', value: `${multiplier}x` },
          ].map(item => (
            <div key={item.label} style={{ background: '#13131c', border: '1px solid #1e1e2e', borderRadius: 10, padding: '0.8rem', textAlign: 'center' }}>
              <p style={{ fontSize: 11, color: '#888', margin: '0 0 4px' }}>{item.label}</p>
              <p style={{ fontSize: 18, fontWeight: 800, color: '#f0c040', margin: 0 }}>{item.value}</p>
            </div>
          ))}
        </div>

        {/* 방향 선택 */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
          {(['over', 'under'] as const).map(d => (
            <button key={d} onClick={() => setDirection(d)} style={{
              padding: '0.9rem', borderRadius: 10,
              border: `2px solid ${direction === d ? '#f0c040' : '#2a2a3a'}`,
              background: direction === d ? '#2a2010' : '#13131c',
              color: direction === d ? '#f0c040' : '#888',
              fontWeight: 700, fontSize: 15, cursor: 'pointer'
            }}>
              {d === 'over' ? `⬆️ ${target} 초과` : `⬇️ ${target} 미만`}
            </button>
          ))}
        </div>

        {/* 슬라이더 */}
        <div style={{ background: '#13131c', border: '1px solid #1e1e2e', borderRadius: 12, padding: '1.2rem', marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 13, color: '#888' }}>목표 숫자</span>
            <span style={{ fontSize: 16, fontWeight: 800, color: '#f0c040' }}>{target}</span>
          </div>
          <input type="range" min={2} max={98} value={target} onChange={e => setTarget(parseInt(e.target.value))}
            style={{ width: '100%', accentColor: '#f0c040' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
            <span style={{ fontSize: 11, color: '#555' }}>2</span>
            <span style={{ fontSize: 11, color: '#555' }}>98</span>
          </div>
        </div>

        {/* 베팅금액 */}
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
          {loading ? '굴리는 중...' : `🎰 ${bet.toLocaleString()}P 베팅`}
        </button>

        {result && !result.error && (
          <div style={{ background: result.win ? '#0a2010' : '#200a0a', border: `2px solid ${result.win ? '#4ade80' : '#f87171'}`, borderRadius: 12, padding: '1.2rem', textAlign: 'center' }}>
            <p style={{ fontSize: 32, margin: '0 0 4px' }}>{result.win ? '🎉' : '😢'}</p>
            <p style={{ fontSize: 20, fontWeight: 900, color: result.win ? '#4ade80' : '#f87171', margin: '0 0 4px' }}>
              {result.win ? `+${result.payout.toLocaleString()}P 획득!` : `-${bet.toLocaleString()}P 손실`}
            </p>
            <p style={{ color: '#888', fontSize: 13, margin: 0 }}>
              결과: {result.result} ({direction === 'over' ? `${target} 초과` : `${target} 미만`} {result.win ? '성공' : '실패'}) | 잔고: {result.newPoints?.toLocaleString()}P
            </p>
          </div>
        )}
        {result?.error && (
          <div style={{ background: '#200a0a', border: '1px solid #f87171', borderRadius: 12, padding: '1rem', textAlign: 'center', color: '#f87171', marginTop: 16 }}>
            ❌ {result.error}
          </div>
        )}
      </div>
    </div>
  );
}
