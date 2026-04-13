'use client';
import { useAuth } from '@/lib/auth';
import Link from 'next/link';

const GAMES = [
  { id: 'crash',     name: '부스타빗',  emoji: '📈', desc: '배수가 오르기 전에 탈출!',   href: '/game/crash',     color: '#ff6b35', hot: true  },
  { id: 'baccarat',  name: '바카라',    emoji: '🎴', desc: '플레이어 vs 뱅커',           href: '/game/baccarat',  color: '#a855f7', hot: false },
  { id: 'blackjack', name: '블랙잭',    emoji: '♠️', desc: '21에 가장 가깝게',           href: '/game/blackjack', color: '#22c55e', hot: false },
  { id: 'holdem',    name: '홀덤',      emoji: '🃏', desc: '텍사스 홀덤 포커',           href: '/game/holdem',    color: '#3b82f6', hot: true  },
  { id: 'roulette',  name: '룰렛',      emoji: '🎡', desc: '빨강 검정 숫자 베팅',        href: '/game/roulette',  color: '#ef4444', hot: false },
  { id: 'plinko',    name: '플링코',    emoji: '🎯', desc: '공을 떨어뜨려라',            href: '/game/plinko',    color: '#f59e0b', hot: false },
  { id: 'ladder',    name: '사다리',    emoji: '🪜', desc: '왼쪽? 오른쪽?',             href: '/game/ladder',    color: '#06b6d4', hot: false },
  { id: 'oddeven',   name: '홀짝',      emoji: '🎲', desc: '홀수? 짝수?',               href: '/game/oddeven',   color: '#84cc16', hot: false },
  { id: 'coinflip',  name: '코인플립',  emoji: '🪙', desc: '앞면 뒷면 50:50',           href: '/game/coinflip',  color: '#f0c040', hot: false },
  { id: 'dice',      name: '주사위',    emoji: '🎰', desc: '숫자를 예측하고 베팅',       href: '/game/dice',      color: '#ec4899', hot: false },
];

export default function Home() {
  const { user, loading } = useAuth();

  const handleLogin = () => {
    window.location.href = `${process.env.NEXT_PUBLIC_API_URL}/auth/discord`;
  };

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#0a0a0f' }}>
      <span style={{ fontSize: 56 }}>🎰</span>
    </div>
  );

  return (
    <div style={{ background: '#0a0a0f', minHeight: '100vh' }}>

      {/* ── 네비게이션 ─────────────────────────── */}
      <nav style={{ background: 'rgba(13,13,20,0.97)', borderBottom: '1px solid #1e1e2e', position: 'sticky', top: 0, zIndex: 50 }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 1.5rem', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
            <span style={{ fontSize: 26 }}>🎰</span>
            <span style={{ fontSize: 20, fontWeight: 900, color: '#f0c040', letterSpacing: -0.5 }}>카지노</span>
          </Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {user ? (
              <>
                <Link href="/leaderboard" style={{ fontSize: 13, color: '#aaa', textDecoration: 'none', padding: '6px 12px', borderRadius: 8 }}>🏆 랭킹</Link>
                <Link href="/history"     style={{ fontSize: 13, color: '#aaa', textDecoration: 'none', padding: '6px 12px', borderRadius: 8 }}>📋 전적</Link>
                <Link href="/profile"     style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#1a1a26', border: '1px solid #2a2a3a', borderRadius: 10, padding: '6px 14px', textDecoration: 'none' }}>
                  {user.avatar
                    ? <img src={`https://cdn.discordapp.com/avatars/${user.discord_id}/${user.avatar}.png`} style={{ width: 28, height: 28, borderRadius: '50%' }} alt="" />
                    : <span style={{ fontSize: 18 }}>👤</span>
                  }
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#e2e2e2' }}>{user.username}</span>
                  <span style={{ fontSize: 13, fontWeight: 800, color: '#f0c040' }}>{user.points.toLocaleString()}P</span>
                </Link>
              </>
            ) : (
              <button onClick={handleLogin} style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#5865F2', color: '#fff', fontWeight: 700, padding: '9px 20px', borderRadius: 10, border: 'none', cursor: 'pointer', fontSize: 14 }}>
                <svg width="16" height="16" viewBox="0 0 127.14 96.36" fill="currentColor">
                  <path d="M107.7,8.07A105.15,105.15,0,0,0,81.47,0a72.06,72.06,0,0,0-3.36,6.83A97.68,97.68,0,0,0,49,6.83,72.37,72.37,0,0,0,45.64,0,105.89,105.89,0,0,0,19.39,8.09C2.79,32.65-1.71,56.6.54,80.21h0A105.73,105.73,0,0,0,32.71,96.36,77.7,77.7,0,0,0,39.6,85.25a68.42,68.42,0,0,1-10.85-5.18c.91-.66,1.8-1.34,2.66-2a75.57,75.57,0,0,0,64.32,0c.87.71,1.76,1.39,2.66,2a68.68,68.68,0,0,1-10.87,5.19,77,77,0,0,0,6.89,11.1A105.25,105.25,0,0,0,126.6,80.22h0C129.24,52.84,122.09,29.11,107.7,8.07ZM42.45,65.69C36.18,65.69,31,60,31,53s5-12.74,11.43-12.74S54,46,53.89,53,48.84,65.69,42.45,65.69Zm42.24,0C78.41,65.69,73.25,60,73.25,53s5-12.74,11.44-12.74S96.23,46,96.12,53,91.08,65.69,84.69,65.69Z"/>
                </svg>
                디스코드로 로그인
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* ── 히어로 (비로그인) ─────────────────────── */}
      {!user && (
        <div style={{ textAlign: 'center', padding: '80px 1rem 60px' }}>
          <div style={{ fontSize: 72, marginBottom: 16 }}>🎰</div>
          <h1 style={{ fontSize: 52, fontWeight: 900, color: '#f0c040', margin: '0 0 12px', letterSpacing: -1 }}>카지노</h1>
          <p style={{ fontSize: 18, color: '#777', marginBottom: 36, lineHeight: 1.8 }}>
            친구들과 함께하는 포인트 카지노<br/>디스코드로 로그인하고 바로 시작하세요
          </p>
          <button onClick={handleLogin} style={{ display: 'inline-flex', alignItems: 'center', gap: 10, background: '#5865F2', color: '#fff', fontWeight: 800, padding: '14px 36px', borderRadius: 12, border: 'none', cursor: 'pointer', fontSize: 16 }}>
            <svg width="20" height="20" viewBox="0 0 127.14 96.36" fill="currentColor">
              <path d="M107.7,8.07A105.15,105.15,0,0,0,81.47,0a72.06,72.06,0,0,0-3.36,6.83A97.68,97.68,0,0,0,49,6.83,72.37,72.37,0,0,0,45.64,0,105.89,105.89,0,0,0,19.39,8.09C2.79,32.65-1.71,56.6.54,80.21h0A105.73,105.73,0,0,0,32.71,96.36,77.7,77.7,0,0,0,39.6,85.25a68.42,68.42,0,0,1-10.85-5.18c.91-.66,1.8-1.34,2.66-2a75.57,75.57,0,0,0,64.32,0c.87.71,1.76,1.39,2.66,2a68.68,68.68,0,0,1-10.87,5.19,77,77,0,0,0,6.89,11.1A105.25,105.25,0,0,0,126.6,80.22h0C129.24,52.84,122.09,29.11,107.7,8.07ZM42.45,65.69C36.18,65.69,31,60,31,53s5-12.74,11.43-12.74S54,46,53.89,53,48.84,65.69,42.45,65.69Zm42.24,0C78.41,65.69,73.25,60,73.25,53s5-12.74,11.44-12.74S96.23,46,96.12,53,91.08,65.69,84.69,65.69Z"/>
            </svg>
            지금 시작하기
          </button>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 20, marginTop: 52, flexWrap: 'wrap' }}>
            {[['🎮', '10가지 게임'], ['💰', '가상 포인트'], ['🔒', '디스코드 로그인'], ['🏆', '실시간 랭킹']].map(([icon, label]) => (
              <div key={String(label)} style={{ background: '#13131c', border: '1px solid #1e1e2e', borderRadius: 12, padding: '14px 22px', textAlign: 'center', minWidth: 110 }}>
                <div style={{ fontSize: 26, marginBottom: 6 }}>{icon}</div>
                <div style={{ fontSize: 12, color: '#888' }}>{label}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── 로그인 유저 잔고 카드 ─────────────────── */}
      {user && (
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '2rem 1.5rem 0' }}>
          <div style={{ background: '#13131c', border: '1px solid #2a2a3a', borderRadius: 16, padding: '1.5rem 2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              {user.avatar && <img src={`https://cdn.discordapp.com/avatars/${user.discord_id}/${user.avatar}.png`} style={{ width: 50, height: 50, borderRadius: '50%', border: '2px solid #f0c040' }} alt="" />}
              <div>
                <p style={{ fontSize: 12, color: '#888', margin: 0 }}>안녕하세요 👋</p>
                <p style={{ fontSize: 17, fontWeight: 700, color: '#e2e2e2', margin: 0 }}>{user.username}님</p>
              </div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontSize: 11, color: '#888', margin: '0 0 2px' }}>보유 포인트</p>
              <p style={{ fontSize: 34, fontWeight: 900, color: '#f0c040', margin: 0 }}>{user.points.toLocaleString()}<span style={{ fontSize: 16 }}>P</span></p>
            </div>
            <div style={{ display: 'flex', gap: 28 }}>
              {[
                { label: '총 베팅', value: user.total_bet.toLocaleString() + 'P', color: '#e2e2e2' },
                { label: '총 획득', value: user.total_win.toLocaleString() + 'P', color: '#4ade80' },
                { label: '순손익',  value: (user.total_win - user.total_bet).toLocaleString() + 'P', color: (user.total_win - user.total_bet) >= 0 ? '#4ade80' : '#f87171' },
              ].map(s => (
                <div key={s.label} style={{ textAlign: 'center' }}>
                  <p style={{ fontSize: 15, fontWeight: 700, color: s.color, margin: 0 }}>{s.value}</p>
                  <p style={{ fontSize: 11, color: '#888', margin: 0 }}>{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── 게임 목록 ─────────────────────────────── */}
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '2rem 1.5rem 5rem' }}>
        <h2 style={{ fontSize: 20, fontWeight: 800, color: '#e2e2e2', marginBottom: 18 }}>🎮 게임 목록</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(175px, 1fr))', gap: 14 }}>
          {GAMES.map(game => (
            <Link
              key={game.id}
              href={user ? game.href : '#'}
              onClick={!user ? (e) => { e.preventDefault(); handleLogin(); } : undefined}
              style={{ textDecoration: 'none' }}
            >
              <div style={{
                position: 'relative', background: '#13131c',
                border: '1px solid #1e1e2e', borderRadius: 14,
                padding: '1.4rem 1.2rem', cursor: 'pointer',
                textAlign: 'center', overflow: 'hidden',
                transition: 'border-color 0.2s, transform 0.2s',
              }}
                onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = game.color; (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-3px)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = '#1e1e2e'; (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)'; }}
              >
                {game.hot && (
                  <span style={{ position: 'absolute', top: 10, right: 10, background: '#ef4444', color: '#fff', fontSize: 10, fontWeight: 800, padding: '2px 8px', borderRadius: 20 }}>HOT</span>
                )}
                <div style={{ fontSize: 38, marginBottom: 10 }}>{game.emoji}</div>
                <h3 style={{ fontSize: 15, fontWeight: 800, color: '#e2e2e2', margin: '0 0 5px' }}>{game.name}</h3>
                <p style={{ fontSize: 11, color: '#777', margin: 0, lineHeight: 1.5 }}>{game.desc}</p>
                <div style={{ marginTop: 12, height: 3, borderRadius: 2, background: `linear-gradient(90deg, ${game.color}88, transparent)` }} />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
