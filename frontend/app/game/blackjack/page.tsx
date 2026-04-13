'use client';
import { useState } from 'react';
import { useAuth } from '@/lib/auth';
import { bjDeal, bjAction } from '@/lib/api';
import Link from 'next/link';

function CardDisplay({ card }: { card: any }) {
  if (card.value === '?') return (
    <div style={{ width: 52, height: 72, borderRadius: 8, background: '#1a1a2e', border: '2px solid #2a2a4a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>🂠</div>
  );
  const isRed = ['H','D'].includes(card.suit);
  const suitSymbol = { S:'♠',H:'♥',D:'♦',C:'♣' }[card.suit as string] || '';
  return (
    <div style={{ width: 52, height: 72, borderRadius: 8, background: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', border: '1px solid #ddd', color: isRed ? '#e53e3e' : '#1a1a1a', fontWeight: 800, fontSize: 15, gap: 2 }}>
      <span>{card.value}</span>
      <span style={{ fontSize: 13 }}>{suitSymbol}</span>
    </div>
  );
}

export default function BlackjackPage() {
  const { user, refreshUser } = useAuth();
  const [bet, setBet] = useState(500);
  const [gameState, setGameState] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [finished, setFinished] = useState(false);
  const quickBets = [500, 1000, 5000, 10000, 50000];

  const handleDeal = async () => {
    if (!user || loading) return;
    setLoading(true);
    setFinished(false);
    try {
      const data = await bjDeal(bet);
      setGameState(data);
      if (data.state === 'finished') setFinished(true);
      refreshUser();
    } catch (e: any) {
      alert(e.response?.data?.error || '오류 발생');
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (action: string) => {
    if (!gameState || loading) return;
    setLoading(true);
    try {
      const data = await bjAction(action);
      setGameState(data);
      if (data.state === 'finished') { setFinished(true); refreshUser(); }
    } catch (e: any) {
      alert(e.response?.data?.error || '오류 발생');
    } finally {
      setLoading(false);
    }
  };

  const resultColor = () => {
    if (!gameState?.result) return '#e2e2e2';
    if (['win','blackjack'].includes(gameState.result)) return '#4ade80';
    if (gameState.result === 'push') return '#f0c040';
    return '#f87171';
  };

  const resultText = () => {
    const r = gameState?.result;
    if (r === 'blackjack') return '🎉 블랙잭!';
    if (r === 'win') return '🎉 승리!';
    if (r === 'push') return '🤝 무승부';
    if (r === 'bust') return '💥 버스트!';
    if (r === 'lose') return '😢 패배';
    return '';
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

      <div style={{ maxWidth: 560, margin: '0 auto', padding: '2rem 1rem' }}>
        <h1 style={{ fontSize: 28, fontWeight: 900, color: '#e2e2e2', marginBottom: 4 }}>♠️ 블랙잭</h1>
        <p style={{ color: '#888', marginBottom: 28, fontSize: 14 }}>21을 넘지 않으면서 딜러보다 높은 숫자를 만드세요</p>

        {/* 게임 테이블 */}
        <div style={{ background: '#0d2010', border: '2px solid #1a3a1a', borderRadius: 16, padding: '1.5rem', marginBottom: 20 }}>
          {/* 딜러 */}
          <div style={{ marginBottom: 20 }}>
            <p style={{ fontSize: 13, color: '#888', margin: '0 0 8px', fontWeight: 600 }}>
              딜러 {gameState && finished ? `(${gameState.dealerTotal ?? '?'}점)` : gameState ? `(${gameState.dealerVisible ?? '?'}점 보임)` : ''}
            </p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {gameState
                ? (finished ? gameState.dealerHand : gameState.dealerHand)?.map((c: any, i: number) => <CardDisplay key={i} card={c} />)
                : <div style={{ width: 52, height: 72, borderRadius: 8, background: '#1a2a1a', border: '2px dashed #2a4a2a', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4a6a4a', fontSize: 22 }}>?</div>
              }
            </div>
          </div>

          {/* 결과 */}
          {finished && gameState && (
            <div style={{ textAlign: 'center', padding: '0.8rem', background: 'rgba(0,0,0,0.4)', borderRadius: 10, marginBottom: 16 }}>
              <p style={{ fontSize: 26, fontWeight: 900, color: resultColor(), margin: '0 0 4px' }}>{resultText()}</p>
              <p style={{ fontSize: 14, color: '#888', margin: 0 }}>
                {['win','blackjack'].includes(gameState.result)
                  ? `+${gameState.payout?.toLocaleString()}P 획득!`
                  : gameState.result === 'push' ? '베팅금 반환'
                  : `-${bet.toLocaleString()}P 손실`}
              </p>
            </div>
          )}

          {/* 플레이어 */}
          <div>
            <p style={{ fontSize: 13, color: '#888', margin: '0 0 8px', fontWeight: 600 }}>
              내 패 {gameState ? `(${gameState.playerTotal}점)` : ''}
            </p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {gameState
                ? gameState.playerHand?.map((c: any, i: number) => <CardDisplay key={i} card={c} />)
                : <div style={{ width: 52, height: 72, borderRadius: 8, background: '#1a2a1a', border: '2px dashed #2a4a2a', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4a6a4a', fontSize: 22 }}>?</div>
              }
            </div>
          </div>
        </div>

        {/* 액션 버튼 */}
        {gameState && gameState.state === 'playing' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
            <button onClick={() => handleAction('hit')} disabled={loading} style={{ padding: '0.9rem', borderRadius: 10, border: 'none', background: '#22c55e', color: '#fff', fontWeight: 800, fontSize: 16, cursor: 'pointer' }}>
              ➕ 히트
            </button>
            <button onClick={() => handleAction('stand')} disabled={loading} style={{ padding: '0.9rem', borderRadius: 10, border: 'none', background: '#ef4444', color: '#fff', fontWeight: 800, fontSize: 16, cursor: 'pointer' }}>
              ✋ 스탠드
            </button>
          </div>
        )}

        {/* 베팅/딜 */}
        {(!gameState || finished) && (
          <>
            <div style={{ background: '#13131c', border: '1px solid #1e1e2e', borderRadius: 12, padding: '1.2rem', marginBottom: 16 }}>
              <p style={{ fontSize: 12, color: '#888', margin: '0 0 8px' }}>베팅 금액</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <input type="number" value={bet} onChange={e => setBet(Math.max(500, parseInt(e.target.value) || 500))}
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
            <button onClick={handleDeal} disabled={loading || !user} style={{
              width: '100%', padding: '1rem', borderRadius: 12, border: 'none',
              background: loading ? '#333' : '#f0c040', color: '#000',
              fontWeight: 900, fontSize: 18, cursor: loading ? 'not-allowed' : 'pointer'
            }}>
              {loading ? '카드 배분 중...' : `♠️ ${bet.toLocaleString()}P 딜`}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
