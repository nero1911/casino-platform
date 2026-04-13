'use client';
import { useState } from 'react';
import { useAuth } from '@/lib/auth';
import { playCoinflip } from '@/lib/api';
import Link from 'next/link';

export default function CoinflipPage() {
  const { user, refreshUser } = useAuth();
  const [choice, setChoice] = useState<'heads' | 'tails'>('heads');
  const [bet, setBet] = useState(100);
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [flipping, setFlipping] = useState(false);

  const handlePlay = async () => {
    if (!user || loading) return;
    setLoading(true);
    setResult(null);
    setFlipping(true);
    setTimeout(async () => {
      try {
        const data = await playCoinflip(bet, choice);
        setResult(data);
        refreshUser();
      } catch (e: any) {
        setResult({ error: e.response?.data?.error || '오류 발생' });
      } finally {
        setLoading(false);
        setFlipping(false);
      }
    }, 1000);
  };

  const quickBets = [100, 500, 1000, 5000, 10000];

  return (
    <div style={{ background: '#0a0a0f', minHeight: '100vh' }}>
      {/* 네비 */}
      <nav style={{ background: '#0d0d14', borderBottom: '1px solid #1e1e2e', padding: '0 1.5rem', height: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
          <span style={{ fontSize: 22 }}>🎰</span>
          <span style={{ fontSize: 18, fontWeight: 900, color: '#f0c040' }}>카지노</span>
        </Link>
        {user && (
          <span style={{ fontWeight: 800, color: '#f0c040', fontSize: 16 }}>{user.points.toLocaleString()}P</span>
        )}
      </nav>

      <div style={{ maxWidth: 480, margin: '0 auto', padding: '2rem 1rem' }}>
        <h1 style={{ fontSize: 28, fontWeight: 900, color: '#e2e2e2', marginBottom: 4 }}>🪙 코인플립</h1>
        <p style={{ color: '#888', marginBottom: 32, fontSize: 14 }}>앞면 뒷면 — 50:50 확률, 1.9배 배당</p>

        {/* 코인 애니메이션 */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            fontSize: 96,
            display: 'inline-block',
            transition: 'transform 0.1s',
            animation: flipping ? 'spin 0.3s linear infinite' : 'none',
            filter: result ? (result.win ? 'drop-shadow(0 0 20px #4ade80)' : 'drop-shadow(0 0 20px #f87171)') : 'none'
          }}>
            {flipping ? '🪙' : result ? (result.result === 'heads' ? '🌝' : '🌚') : '🪙'}
          </div>
          <style>{`@keyframes spin { from{transform:rotateY(0deg)} to{transform:rotateY(360deg)} }`}</style>
        </div>

        {/* 선택 */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 24 }}>
          {(['heads', 'tails'] as const).map(side => (
            <button key={side} onClick={() => setChoice(side)} style={{
              padding: '1rem', borderRadius: 12, border: `2px solid ${choice === side ? '#f0c040' : '#2a2a3a'}`,
              background: choice === side ? '#2a2010' : '#13131c', color: choice === side ? '#f0c040' : '#888',
              fontWeight: 700, fontSize: 16, cursor: 'pointer', transition: 'all 0.15s'
            }}>
              {side === 'heads' ? '🌝 앞면' : '🌚 뒷면'}
            </button>
          ))}
        </div>

        {/* 베팅금액 */}
        <div style={{ background: '#13131c', border: '1px solid #1e1e2e', borderRadius: 12, padding: '1.2rem', marginBottom: 16 }}>
          <p style={{ fontSize: 12, color: '#888', margin: '0 0 8px' }}>베팅 금액</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <input
              type="number" value={bet} onChange={e => setBet(Math.max(100, parseInt(e.target.value) || 100))}
              style={{ flex: 1, background: '#0a0a0f', border: '1px solid #2a2a3a', borderRadius: 8, padding: '8px 12px', color: '#f0c040', fontSize: 18, fontWeight: 700, outline: 'none' }}
            />
            <span style={{ color: '#888', fontWeight: 700 }}>P</span>
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {quickBets.map(q => (
              <button key={q} onClick={() => setBet(q)} style={{
                flex: 1, minWidth: 60, padding: '6px 4px', borderRadius: 8, border: '1px solid #2a2a3a',
                background: bet === q ? '#2a2010' : '#0a0a0f', color: bet === q ? '#f0c040' : '#888',
                fontSize: 12, fontWeight: 600, cursor: 'pointer'
              }}>{q.toLocaleString()}</button>
            ))}
            <button onClick={() => setBet(Math.floor((user?.points || 0) / 2))} style={{
              flex: 1, minWidth: 60, padding: '6px 4px', borderRadius: 8, border: '1px solid #2a2a3a',
              background: '#0a0a0f', color: '#888', fontSize: 12, fontWeight: 600, cursor: 'pointer'
            }}>1/2</button>
            <button onClick={() => setBet(user?.points || 0)} style={{
              flex: 1, minWidth: 60, padding: '6px 4px', borderRadius: 8, border: '1px solid #2a2a3a',
              background: '#0a0a0f', color: '#888', fontSize: 12, fontWeight: 600, cursor: 'pointer'
            }}>MAX</button>
          </div>
        </div>

        {/* 플레이 버튼 */}
        <button onClick={handlePlay} disabled={loading || !user} style={{
          width: '100%', padding: '1rem', borderRadius: 12, border: 'none',
          background: loading ? '#333' : '#f0c040', color: '#000',
          fontWeight: 900, fontSize: 18, cursor: loading ? 'not-allowed' : 'pointer', marginBottom: 16
        }}>
          {loading ? '동전 던지는 중...' : `🪙 ${bet.toLocaleString()}P 베팅`}
        </button>

        {/* 결과 */}
        {result && !result.error && (
          <div style={{
            background: result.win ? '#0a2010' : '#200a0a',
            border: `2px solid ${result.win ? '#4ade80' : '#f87171'}`,
            borderRadius: 12, padding: '1.2rem', textAlign: 'center', animation: 'fadeIn 0.3s ease'
          }}>
            <style>{`@keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}`}</style>
            <p style={{ fontSize: 32, margin: '0 0 4px' }}>{result.win ? '🎉' : '😢'}</p>
            <p style={{ fontSize: 22, fontWeight: 900, color: result.win ? '#4ade80' : '#f87171', margin: '0 0 4px' }}>
              {result.win ? `+${result.payout.toLocaleString()}P 획득!` : `-${bet.toLocaleString()}P 손실`}
            </p>
            <p style={{ color: '#888', fontSize: 13, margin: 0 }}>
              결과: {result.result === 'heads' ? '🌝 앞면' : '🌚 뒷면'} | 잔고: {result.newPoints?.toLocaleString()}P
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
