'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { getLeaderboard } from '@/lib/api';
import Link from 'next/link';

export default function LeaderboardPage() {
  const { user } = useAuth();
  const [board, setBoard] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getLeaderboard().then(data => { setBoard(data); setLoading(false); });
  }, []);

  const medals = ['🥇', '🥈', '🥉'];

  return (
    <div style={{ background: '#0a0a0f', minHeight: '100vh' }}>
      <nav style={{ background: '#0d0d14', borderBottom: '1px solid #1e1e2e', padding: '0 1.5rem', height: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
          <span style={{ fontSize: 22 }}>🎰</span>
          <span style={{ fontSize: 18, fontWeight: 900, color: '#f0c040' }}>카지노</span>
        </Link>
        {user && <span style={{ fontWeight: 800, color: '#f0c040', fontSize: 16 }}>{user.points.toLocaleString()}P</span>}
      </nav>

      <div style={{ maxWidth: 600, margin: '0 auto', padding: '2rem 1rem 4rem' }}>
        <h1 style={{ fontSize: 26, fontWeight: 900, color: '#e2e2e2', marginBottom: 4 }}>🏆 포인트 랭킹</h1>
        <p style={{ color: '#888', marginBottom: 24, fontSize: 13 }}>TOP 20 포인트 보유자</p>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: '#555' }}>불러오는 중...</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {board.map((u, i) => (
              <div key={u.id} style={{
                background: u.id === user?.id ? '#1a1a00' : i < 3 ? '#13131c' : '#0d0d14',
                border: `1px solid ${u.id === user?.id ? '#f0c040' : i === 0 ? '#f0c04044' : i === 1 ? '#94a3b844' : i === 2 ? '#f97316' + '44' : '#1e1e2e'}`,
                borderRadius: 12, padding: '1rem 1.2rem',
                display: 'flex', alignItems: 'center', gap: 14,
                animation: 'fadeIn 0.3s ease'
              }}>
                <style>{`@keyframes fadeIn{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:translateY(0)}}`}</style>

                {/* 순위 */}
                <div style={{ width: 36, textAlign: 'center', flexShrink: 0 }}>
                  {i < 3
                    ? <span style={{ fontSize: 24 }}>{medals[i]}</span>
                    : <span style={{ fontSize: 16, fontWeight: 800, color: '#555' }}>{i + 1}</span>
                  }
                </div>

                {/* 아바타 */}
                {u.avatar
                  ? <img src={`https://cdn.discordapp.com/avatars/${u.discord_id}/${u.avatar}.png`} style={{ width: 40, height: 40, borderRadius: '50%', flexShrink: 0 }} onError={e => (e.currentTarget.style.display = 'none')} alt="" />
                  : <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#2a2a3a', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>👤</div>
                }

                {/* 유저 정보 */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 15, fontWeight: 700, color: u.id === user?.id ? '#f0c040' : '#e2e2e2', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {u.username} {u.id === user?.id ? '(나)' : ''}
                  </p>
                  <p style={{ fontSize: 11, color: '#555', margin: 0 }}>
                    총 베팅: {u.total_bet?.toLocaleString()}P
                  </p>
                </div>

                {/* 포인트 */}
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <p style={{ fontSize: 18, fontWeight: 900, color: '#f0c040', margin: 0 }}>{u.points?.toLocaleString()}</p>
                  <p style={{ fontSize: 10, color: '#888', margin: 0 }}>포인트</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
