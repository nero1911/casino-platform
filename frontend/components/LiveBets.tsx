'use client';
import { useState, useEffect } from 'react';

interface BetEntry {
  userId: number;
  username: string;
  avatar: string;
  bet: number;
  detail?: any;
  time: number;
}

interface Props {
  game: string;
  initialBets?: BetEntry[];
  newBet?: BetEntry | null;
}

export default function LiveBets({ game, initialBets = [], newBet }: Props) {
  const [bets, setBets] = useState<BetEntry[]>(initialBets);

  useEffect(() => {
    if (newBet) setBets(prev => [newBet, ...prev].slice(0, 15));
  }, [newBet]);

  const gameNames: Record<string, string> = {
    coinflip: '코인플립', dice: '주사위', baccarat: '바카라',
    plinko: '플링코', roulette: '룰렛', ladder: '사다리',
    oddeven: '홀짝', blackjack: '블랙잭', crash: '부스타빗'
  };

  return (
    <div style={{ background: '#13131c', border: '1px solid #1e1e2e', borderRadius: 12, padding: '1rem', minWidth: 200 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#4ade80', boxShadow: '0 0 6px #4ade80' }} />
        <p style={{ fontSize: 12, color: '#888', margin: 0, fontWeight: 600 }}>실시간 베팅</p>
      </div>
      {bets.length === 0 ? (
        <p style={{ fontSize: 12, color: '#555', textAlign: 'center', padding: '1rem 0', margin: 0 }}>베팅 내역 없음</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {bets.map((b, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px', background: '#0a0a0f', borderRadius: 8, animation: i === 0 ? 'slideIn 0.3s ease' : 'none' }}>
              <style>{`@keyframes slideIn{from{opacity:0;transform:translateX(-8px)}to{opacity:1;transform:translateX(0)}}`}</style>
              {b.avatar
                ? <img src={`https://cdn.discordapp.com/avatars/${b.userId}/${b.avatar}.png`} style={{ width: 22, height: 22, borderRadius: '50%', flexShrink: 0 }} alt="" />
                : <div style={{ width: 22, height: 22, borderRadius: '50%', background: '#2a2a3a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, flexShrink: 0 }}>👤</div>
              }
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 11, color: '#e2e2e2', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.username}</p>
                <p style={{ fontSize: 10, color: '#888', margin: 0 }}>{b.detail ? JSON.stringify(b.detail).slice(0, 20) : ''}</p>
              </div>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#f0c040', flexShrink: 0 }}>{b.bet.toLocaleString()}P</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
