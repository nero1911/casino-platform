'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { getHistory, getMe } from '@/lib/api';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

const GAME_NAMES: Record<string, string> = {
  crash: '📈 부스타빗', baccarat: '🎴 바카라', blackjack: '♠️ 블랙잭',
  holdem: '🃏 홀덤', roulette: '🎡 룰렛', plinko: '🎯 플링코',
  ladder: '🪜 사다리', oddeven: '🎲 홀짝', coinflip: '🪙 코인플립', dice: '🎰 주사위',
};

export default function ProfilePage() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [history, setHistory] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { router.push('/'); return; }
    Promise.all([getMe(), getHistory(1)]).then(([u, h]) => {
      setStats(u);
      setHistory(h.slice(0, 5));
      setLoading(false);
    });
  }, [user]);

  const handleLogout = () => { logout(); router.push('/'); };

  if (!user || loading) return (
    <div style={{ background: '#0a0a0f', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ fontSize: 40 }}>⏳</div>
    </div>
  );

  const profit = stats ? stats.total_win - stats.total_bet : 0;
  const winCount = history.filter(h => h.result === 'win').length;

  // 게임별 통계 계산
  const gameStats: Record<string, { count: number; win: number; bet: number }> = {};
  history.forEach(h => {
    if (!gameStats[h.game]) gameStats[h.game] = { count: 0, win: 0, bet: 0 };
    gameStats[h.game].count++;
    if (h.result === 'win') gameStats[h.game].win++;
    gameStats[h.game].bet += h.bet_amount;
  });

  return (
    <div style={{ background: '#0a0a0f', minHeight: '100vh' }}>
      <nav style={{ background: '#0d0d14', borderBottom: '1px solid #1e1e2e', padding: '0 1.5rem', height: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
          <span style={{ fontSize: 22 }}>🎰</span>
          <span style={{ fontSize: 18, fontWeight: 900, color: '#f0c040' }}>카지노</span>
        </Link>
        <button onClick={handleLogout} style={{ padding: '7px 16px', borderRadius: 8, border: '1px solid #f87171', background: 'transparent', color: '#f87171', fontSize: 13, cursor: 'pointer', fontWeight: 600 }}>
          로그아웃
        </button>
      </nav>

      <div style={{ maxWidth: 680, margin: '0 auto', padding: '2rem 1rem 4rem' }}>

        {/* 프로필 헤더 */}
        <div style={{ background: 'linear-gradient(135deg, #1a1020 0%, #12181a 100%)', border: '1px solid #2a2a3a', borderRadius: 20, padding: '2rem', marginBottom: 20, textAlign: 'center' }}>
          {user.avatar
            ? <img src={`https://cdn.discordapp.com/avatars/${user.discord_id}/${user.avatar}.png?size=128`} style={{ width: 88, height: 88, borderRadius: '50%', border: '3px solid #f0c040', marginBottom: 14 }} onError={e => (e.currentTarget.style.display='none')} alt="" />
            : <div style={{ width: 88, height: 88, borderRadius: '50%', background: '#2a2a3a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36, margin: '0 auto 14px' }}>👤</div>
          }
          <h2 style={{ fontSize: 24, fontWeight: 900, color: '#e2e2e2', margin: '0 0 6px' }}>{user.username}</h2>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            <svg width="16" height="16" viewBox="0 0 127.14 96.36" fill="#5865F2">
              <path d="M107.7,8.07A105.15,105.15,0,0,0,81.47,0a72.06,72.06,0,0,0-3.36,6.83A97.68,97.68,0,0,0,49,6.83,72.37,72.37,0,0,0,45.64,0,105.89,105.89,0,0,0,19.39,8.09C2.79,32.65-1.71,56.6.54,80.21h0A105.73,105.73,0,0,0,32.71,96.36,77.7,77.7,0,0,0,39.6,85.25a68.42,68.42,0,0,1-10.85-5.18c.91-.66,1.8-1.34,2.66-2a75.57,75.57,0,0,0,64.32,0c.87.71,1.76,1.39,2.66,2a68.68,68.68,0,0,1-10.87,5.19,77,77,0,0,0,6.89,11.1A105.25,105.25,0,0,0,126.6,80.22h0C129.24,52.84,122.09,29.11,107.7,8.07ZM42.45,65.69C36.18,65.69,31,60,31,53s5-12.74,11.43-12.74S54,46,53.89,53,48.84,65.69,42.45,65.69Zm42.24,0C78.41,65.69,73.25,60,73.25,53s5-12.74,11.44-12.74S96.23,46,96.12,53,91.08,65.69,84.69,65.69Z"/>
            </svg>
            <span style={{ fontSize: 13, color: '#888' }}>디스코드 로그인</span>
          </div>
        </div>

        {/* 통계 */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, marginBottom: 20 }}>
          {[
            { label: '💰 보유 포인트', value: stats?.points?.toLocaleString() + 'P', color: '#f0c040', big: true },
            { label: '📊 순손익', value: (profit >= 0 ? '+' : '') + profit?.toLocaleString() + 'P', color: profit >= 0 ? '#4ade80' : '#f87171', big: true },
            { label: '🎲 총 베팅액', value: stats?.total_bet?.toLocaleString() + 'P', color: '#fb923c', big: false },
            { label: '🏆 총 획득액', value: stats?.total_win?.toLocaleString() + 'P', color: '#4ade80', big: false },
          ].map(s => (
            <div key={s.label} style={{ background: '#13131c', border: '1px solid #1e1e2e', borderRadius: 14, padding: s.big ? '1.4rem' : '1.2rem', textAlign: 'center' }}>
              <p style={{ fontSize: 12, color: '#888', margin: '0 0 6px' }}>{s.label}</p>
              <p style={{ fontSize: s.big ? 26 : 20, fontWeight: 900, color: s.color, margin: 0 }}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* 바로가기 */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 24 }}>
          <Link href="/leaderboard" style={{ textDecoration: 'none' }}>
            <div style={{ background: '#13131c', border: '1px solid #1e1e2e', borderRadius: 12, padding: '1rem', textAlign: 'center', cursor: 'pointer' }}>
              <p style={{ fontSize: 24, margin: '0 0 4px' }}>🏆</p>
              <p style={{ fontSize: 14, fontWeight: 700, color: '#e2e2e2', margin: 0 }}>랭킹 보기</p>
            </div>
          </Link>
          <Link href="/history" style={{ textDecoration: 'none' }}>
            <div style={{ background: '#13131c', border: '1px solid #1e1e2e', borderRadius: 12, padding: '1rem', textAlign: 'center', cursor: 'pointer' }}>
              <p style={{ fontSize: 24, margin: '0 0 4px' }}>📋</p>
              <p style={{ fontSize: 14, fontWeight: 700, color: '#e2e2e2', margin: 0 }}>전체 전적</p>
            </div>
          </Link>
        </div>

        {/* 최근 게임 기록 */}
        <div style={{ background: '#13131c', border: '1px solid #1e1e2e', borderRadius: 14, padding: '1.2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <p style={{ fontSize: 15, fontWeight: 700, color: '#e2e2e2', margin: 0 }}>최근 게임</p>
            <Link href="/history" style={{ fontSize: 12, color: '#888', textDecoration: 'none' }}>전체 보기 →</Link>
          </div>
          {history.length === 0 ? (
            <p style={{ color: '#555', textAlign: 'center', padding: '1.5rem 0', margin: 0, fontSize: 14 }}>아직 게임 기록이 없어요</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {history.map((h: any) => (
                <div key={h.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', background: '#0a0a0f', borderRadius: 10, border: `1px solid ${h.result === 'win' ? '#4ade8022' : '#f8717122'}` }}>
                  <div style={{ width: 32, height: 32, borderRadius: '50%', background: h.result === 'win' ? '#0a2010' : '#200a0a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0 }}>
                    {h.result === 'win' ? '✅' : '❌'}
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 13, fontWeight: 600, color: '#e2e2e2', margin: 0 }}>{GAME_NAMES[h.game] || h.game}</p>
                    <p style={{ fontSize: 11, color: '#555', margin: 0 }}>
                      {new Date(h.created_at).toLocaleString('ko-KR', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ fontSize: 14, fontWeight: 800, color: h.result === 'win' ? '#4ade80' : '#f87171', margin: 0 }}>
                      {h.result === 'win' ? `+${h.payout?.toLocaleString()}P` : `-${h.bet_amount?.toLocaleString()}P`}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
