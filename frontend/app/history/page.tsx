'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { getHistory, getMe } from '@/lib/api';
import Link from 'next/link';

const GAME_NAMES: Record<string, string> = {
  crash: '📈 부스타빗', baccarat: '🎴 바카라', blackjack: '♠️ 블랙잭',
  holdem: '🃏 홀덤', roulette: '🎡 룰렛', plinko: '🎯 플링코',
  ladder: '🪜 사다리', oddeven: '🎲 홀짝', coinflip: '🪙 코인플립', dice: '🎰 주사위',
};

export default function HistoryPage() {
  const { user } = useAuth();
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [gameFilter, setGameFilter] = useState('');
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    if (!user) return;
    loadHistory();
    loadStats();
  }, [user, page, gameFilter]);

  const loadHistory = async () => {
    setLoading(true);
    const data = await getHistory(page, gameFilter || undefined);
    setHistory(data);
    setLoading(false);
  };

  const loadStats = async () => {
    const u = await getMe();
    setStats(u);
  };

  const profit = stats ? stats.total_win - stats.total_bet : 0;

  return (
    <div style={{ background: '#0a0a0f', minHeight: '100vh' }}>
      <nav style={{ background: '#0d0d14', borderBottom: '1px solid #1e1e2e', padding: '0 1.5rem', height: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
          <span style={{ fontSize: 22 }}>🎰</span>
          <span style={{ fontSize: 18, fontWeight: 900, color: '#f0c040' }}>카지노</span>
        </Link>
        {user && <span style={{ fontWeight: 800, color: '#f0c040', fontSize: 16 }}>{user.points.toLocaleString()}P</span>}
      </nav>

      <div style={{ maxWidth: 700, margin: '0 auto', padding: '2rem 1rem 4rem' }}>
        <h1 style={{ fontSize: 26, fontWeight: 900, color: '#e2e2e2', marginBottom: 20 }}>📋 내 전적</h1>

        {/* 통계 카드 */}
        {stats && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 24 }}>
            {[
              { label: '보유 포인트', value: stats.points?.toLocaleString() + 'P', color: '#f0c040' },
              { label: '총 베팅', value: stats.total_bet?.toLocaleString() + 'P', color: '#fb923c' },
              { label: '총 획득', value: stats.total_win?.toLocaleString() + 'P', color: '#4ade80' },
              { label: '순손익', value: (profit >= 0 ? '+' : '') + profit?.toLocaleString() + 'P', color: profit >= 0 ? '#4ade80' : '#f87171' },
            ].map(s => (
              <div key={s.label} style={{ background: '#13131c', border: '1px solid #1e1e2e', borderRadius: 10, padding: '1rem', textAlign: 'center' }}>
                <p style={{ fontSize: 10, color: '#888', margin: '0 0 4px' }}>{s.label}</p>
                <p style={{ fontSize: 15, fontWeight: 800, color: s.color, margin: 0 }}>{s.value}</p>
              </div>
            ))}
          </div>
        )}

        {/* 필터 */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
          {['', ...Object.keys(GAME_NAMES)].map(g => (
            <button key={g} onClick={() => { setGameFilter(g); setPage(1); }} style={{
              padding: '6px 12px', borderRadius: 8, border: '1px solid #2a2a3a',
              background: gameFilter === g ? '#2a2010' : '#13131c',
              color: gameFilter === g ? '#f0c040' : '#888',
              fontSize: 12, cursor: 'pointer', fontWeight: gameFilter === g ? 700 : 400
            }}>{g ? GAME_NAMES[g] : '전체'}</button>
          ))}
        </div>

        {/* 기록 리스트 */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: '#555' }}>불러오는 중...</div>
        ) : history.length === 0 ? (
          <div style={{ background: '#13131c', border: '1px solid #1e1e2e', borderRadius: 12, padding: '3rem', textAlign: 'center', color: '#555' }}>
            <p style={{ fontSize: 32, margin: '0 0 8px' }}>🎮</p>
            <p style={{ margin: 0 }}>베팅 기록이 없어요</p>
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}>
              {history.map((h: any) => (
                <div key={h.id} style={{
                  background: '#13131c', border: `1px solid ${h.result === 'win' ? '#4ade8022' : '#f8717122'}`,
                  borderRadius: 10, padding: '12px 16px',
                  display: 'flex', alignItems: 'center', gap: 12
                }}>
                  <div style={{ width: 36, height: 36, borderRadius: '50%', background: h.result === 'win' ? '#0a2010' : '#200a0a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>
                    {h.result === 'win' ? '✅' : '❌'}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: '#e2e2e2' }}>{GAME_NAMES[h.game] || h.game}</span>
                      <span style={{ fontSize: 11, color: '#555' }}>{new Date(h.created_at).toLocaleString('ko-KR', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <p style={{ fontSize: 12, color: '#888', margin: '2px 0 0' }}>베팅: {h.bet_amount?.toLocaleString()}P</p>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <p style={{ fontSize: 15, fontWeight: 900, color: h.result === 'win' ? '#4ade80' : '#f87171', margin: 0 }}>
                      {h.result === 'win' ? '+' : '-'}{h.result === 'win' ? h.payout?.toLocaleString() : h.bet_amount?.toLocaleString()}P
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* 페이지네이션 */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: 10 }}>
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                style={{ padding: '8px 18px', borderRadius: 8, border: '1px solid #2a2a3a', background: '#13131c', color: page === 1 ? '#555' : '#e2e2e2', cursor: page === 1 ? 'not-allowed' : 'pointer' }}>← 이전</button>
              <span style={{ padding: '8px 16px', color: '#888', fontSize: 14 }}>{page}페이지</span>
              <button onClick={() => setPage(p => p + 1)} disabled={history.length < 20}
                style={{ padding: '8px 18px', borderRadius: 8, border: '1px solid #2a2a3a', background: '#13131c', color: history.length < 20 ? '#555' : '#e2e2e2', cursor: history.length < 20 ? 'not-allowed' : 'pointer' }}>다음 →</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
