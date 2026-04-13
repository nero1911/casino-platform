'use client';
import { useState, useCallback } from 'react';
import { useAuth } from '@/lib/auth';
import { useWebSocket } from '@/lib/useWebSocket';
import Link from 'next/link';

type Choice = 'player' | 'banker' | 'tie';
type Phase = 'betting' | 'dealing' | 'finished';

interface BetEntry {
  userId: number;
  discordId: string;
  username: string;
  avatar: string;
  bet: number;
  choice: Choice;
  payout?: number;
  win?: boolean;
}

interface HistoryItem {
  winner: string;
  playerTotal: number;
  bankerTotal: number;
}

function CardDisplay({ card }: { card: any }) {
  if (!card) return null;
  const isRed = ['H', 'D'].includes(card.suit);
  const suit = ({ S: '♠', H: '♥', D: '♦', C: '♣' } as any)[card.suit] || '';
  return (
    <div style={{ width: 44, height: 62, borderRadius: 6, background: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', border: '1px solid #ddd', color: isRed ? '#e53e3e' : '#1a1a1a', fontWeight: 800, fontSize: 13, gap: 1, flexShrink: 0 }}>
      <span>{card.value}</span>
      <span style={{ fontSize: 11 }}>{suit}</span>
    </div>
  );
}

function Avatar({ discordId, avatar, username, size = 24 }: { discordId: string; avatar: string; username: string; size?: number }) {
  const [err, setErr] = useState(false);
  const src = !err && avatar && avatar !== 'null'
    ? `https://cdn.discordapp.com/avatars/${discordId}/${avatar}.png?size=64`
    : `https://cdn.discordapp.com/embed/avatars/${parseInt(discordId || '0') % 5}.png`;
  return <img src={src} alt={username} onError={() => setErr(true)} style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />;
}

// 비드로드
function BeadRoad({ history }: { history: HistoryItem[] }) {
  const ROWS = 6;
  const cols = Math.max(10, Math.ceil(history.length / ROWS) + 2);
  const grid: (string | null)[][] = Array.from({ length: ROWS }, () => Array(cols).fill(null));
  history.forEach((h, idx) => {
    const col = Math.floor(idx / ROWS);
    const row = idx % ROWS;
    if (col < cols) grid[row][col] = h.winner;
  });
  const color = (r: string | null) => r === 'banker' ? '#2563eb' : r === 'player' ? '#dc2626' : r === 'tie' ? '#16a34a' : 'transparent';
  const label = (r: string | null) => r === 'banker' ? 'B' : r === 'player' ? 'P' : r === 'tie' ? 'T' : '';
  return (
    <div style={{ overflowX: 'auto' }}>
      <div style={{ display: 'inline-grid', gridTemplateRows: `repeat(${ROWS}, 20px)`, gridTemplateColumns: `repeat(${cols}, 20px)`, gap: 2 }}>
        {grid.map((row, r) => row.map((cell, c) => (
          <div key={`${r}-${c}`} style={{ width: 20, height: 20, borderRadius: '50%', background: color(cell), border: cell ? 'none' : '1px dashed #2a2a3a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 800, color: '#fff' }}>
            {label(cell)}
          </div>
        )))}
      </div>
    </div>
  );
}

// 빅로드
function BigRoad({ history }: { history: HistoryItem[] }) {
  const ROWS = 6; const cols = 20;
  const grid: (string | null)[][] = Array.from({ length: ROWS }, () => Array(cols).fill(null));
  let col = -1, row = 0, last: string | null = null;
  for (const h of history) {
    if (h.winner === 'tie') continue;
    if (h.winner !== last) { col++; row = 0; last = h.winner; }
    else { if (row < ROWS - 1) row++; else col++; }
    if (col < cols) grid[row][col] = h.winner;
  }
  const color = (r: string) => r === 'banker' ? '#2563eb' : '#dc2626';
  return (
    <div style={{ overflowX: 'auto' }}>
      <div style={{ display: 'inline-grid', gridTemplateRows: `repeat(${ROWS}, 20px)`, gridTemplateColumns: `repeat(${cols}, 20px)`, gap: 2 }}>
        {grid.map((row, r) => row.map((cell, c) => (
          <div key={`${r}-${c}`} style={{ width: 20, height: 20, borderRadius: '50%', background: cell ? color(cell) : 'transparent', border: cell ? 'none' : '1px dashed #2a2a3a' }} />
        )))}
      </div>
    </div>
  );
}

export default function BaccaratPage() {
  const { user, refreshUser } = useAuth();
  const [phase, setPhase] = useState<Phase>('betting');
  const [countdown, setCountdown] = useState(15);
  const [bets, setBets] = useState<BetEntry[]>([]);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [result, setResult] = useState<any>(null);
  const [myChoice, setMyChoice] = useState<Choice>('banker');
  const [myBet, setMyBet] = useState(500);
  const [hasBet, setHasBet] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const quickBets = [500, 1000, 5000, 10000, 50000];

  const handleMessage = useCallback((msg: any) => {
    switch (msg.type) {
      case 'init':
        setBets(msg.baccarat?.bets || []);
        setHistory(msg.baccarat?.history || []);
        if (msg.baccarat?.phase) setPhase(msg.baccarat.phase);
        if (msg.baccarat?.countdown) setCountdown(msg.baccarat.countdown);
        break;
      case 'baccarat_betting':
        setPhase('betting');
        setCountdown(msg.countdown);
        setBets([]);
        setResult(null);
        setHasBet(false);
        break;
      case 'baccarat_countdown':
        setCountdown(msg.countdown);
        break;
      case 'baccarat_dealing':
        setPhase('dealing');
        break;
      case 'baccarat_result':
        setPhase('finished');
        setResult(msg.result);
        setBets(msg.bets || []);
        setHistory(msg.history || []);
        refreshUser();
        break;
      case 'baccarat_bet':
        setBets(msg.bets || []);
        break;
      case 'baccarat_bet_ok':
        setHasBet(true);
        break;
    }
  }, [refreshUser]);

  const { send, connected: wsConnected } = useWebSocket(handleMessage);

  const handleBet = () => {
    if (!user || hasBet || phase !== 'betting') return;
    send({ type: 'baccarat_bet', bet: myBet, choice: myChoice });
  };

  // 통계
  const bankerCount = history.filter(h => h.winner === 'banker').length;
  const playerCount = history.filter(h => h.winner === 'player').length;
  const tieCount = history.filter(h => h.winner === 'tie').length;
  const total = history.length;

  // 연속 패턴
  const streaks: { result: string; count: number }[] = [];
  for (const h of history.filter(h => h.winner !== 'tie')) {
    if (!streaks.length || streaks[streaks.length - 1].result !== h.winner)
      streaks.push({ result: h.winner, count: 1 });
    else streaks[streaks.length - 1].count++;
  }
  const currentStreak = streaks[streaks.length - 1];

  const choiceConfig = {
    banker: { label: '뱅커', odds: '1.90배', color: '#2563eb' },
    player: { label: '플레이어', odds: '1.95배', color: '#dc2626' },
    tie:    { label: '타이',    odds: '8.00배', color: '#16a34a' },
  };

  const myBetEntry = bets.find(b => b.userId === user?.id);

  return (
    <div style={{ background: '#0a0a0f', minHeight: '100vh' }}>
      <nav style={{ background: '#0d0d14', borderBottom: '1px solid #1e1e2e', padding: '0 1.5rem', height: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
          <span style={{ fontSize: 22 }}>🎰</span>
          <span style={{ fontSize: 18, fontWeight: 900, color: '#f0c040' }}>카지노</span>
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: wsConnected ? '#4ade80' : '#f87171' }} />
            <span style={{ fontSize: 12, color: '#888' }}>{wsConnected ? '연결됨' : '연결 중...'}</span>
          </div>
          {user && <span style={{ fontWeight: 800, color: '#f0c040', fontSize: 16 }}>{user.points.toLocaleString()}P</span>}
        </div>
      </nav>

      <div style={{ maxWidth: 980, margin: '0 auto', padding: '1.5rem 1rem 4rem', display: 'grid', gridTemplateColumns: '1fr 260px', gap: 16 }}>

        {/* 왼쪽 */}
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 900, color: '#e2e2e2', marginBottom: 4 }}>🎴 바카라 (멀티)</h1>
          <p style={{ color: '#888', marginBottom: 16, fontSize: 13 }}>같은 테이블에서 다같이 베팅 — 15초마다 새 라운드</p>

          {/* 패턴 보드 */}
          <div style={{ background: '#0a1628', border: '2px solid #1e3a5f', borderRadius: 14, padding: '1rem', marginBottom: 16 }}>
            <div style={{ display: 'flex', gap: 16, marginBottom: 10, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 12, color: '#888' }}>총 {total}게임</span>
              <span style={{ fontSize: 12, color: '#2563eb', fontWeight: 700 }}>뱅커 {bankerCount} ({total ? Math.round(bankerCount/total*100) : 0}%)</span>
              <span style={{ fontSize: 12, color: '#dc2626', fontWeight: 700 }}>플레이어 {playerCount} ({total ? Math.round(playerCount/total*100) : 0}%)</span>
              <span style={{ fontSize: 12, color: '#16a34a', fontWeight: 700 }}>타이 {tieCount}</span>
              {currentStreak && <span style={{ fontSize: 12, color: '#f0c040', fontWeight: 700 }}>현재 {currentStreak.result === 'banker' ? '뱅커' : '플레이어'} {currentStreak.count}연속</span>}
            </div>
            {history.length === 0 ? (
              <p style={{ color: '#555', fontSize: 13, textAlign: 'center', padding: '1rem 0', margin: 0 }}>게임이 시작되면 패턴이 기록됩니다</p>
            ) : (
              <>
                <div style={{ marginBottom: 10 }}>
                  <p style={{ fontSize: 11, color: '#888', margin: '0 0 5px', fontWeight: 600 }}>비드로드</p>
                  <BeadRoad history={history} />
                </div>
                <div>
                  <p style={{ fontSize: 11, color: '#888', margin: '0 0 5px', fontWeight: 600 }}>빅로드</p>
                  <BigRoad history={history} />
                </div>
              </>
            )}
          </div>

          {/* 최근 10게임 */}
          {history.length > 0 && (
            <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
              {history.slice(-10).map((h, i) => (
                <div key={i} style={{ width: 32, height: 32, borderRadius: '50%', background: h.winner === 'banker' ? '#1e3a8a' : h.winner === 'player' ? '#7f1d1d' : '#14532d', border: `2px solid ${h.winner === 'banker' ? '#2563eb' : h.winner === 'player' ? '#dc2626' : '#16a34a'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, color: '#fff' }}>
                  {h.winner === 'banker' ? 'B' : h.winner === 'player' ? 'P' : 'T'}
                </div>
              ))}
            </div>
          )}

          {/* 카드 결과 */}
          {result && phase === 'finished' && (
            <div style={{ background: '#13131c', border: '1px solid #2a2a3a', borderRadius: 14, padding: '1.2rem', marginBottom: 16, animation: 'fadeIn 0.3s ease' }}>
              <style>{`@keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}`}</style>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 14 }}>
                <div>
                  <p style={{ fontSize: 12, color: '#dc2626', fontWeight: 700, margin: '0 0 8px' }}>플레이어 ({result.playerTotal}점)</p>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {result.playerCards?.map((c: any, i: number) => <CardDisplay key={i} card={c} />)}
                  </div>
                </div>
                <div>
                  <p style={{ fontSize: 12, color: '#2563eb', fontWeight: 700, margin: '0 0 8px' }}>뱅커 ({result.bankerTotal}점)</p>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {result.bankerCards?.map((c: any, i: number) => <CardDisplay key={i} card={c} />)}
                  </div>
                </div>
              </div>
              <div style={{ background: '#0a0a0f', borderRadius: 10, padding: '0.8rem', textAlign: 'center' }}>
                <p style={{ fontSize: 20, fontWeight: 900, color: result.winner === 'banker' ? '#2563eb' : result.winner === 'player' ? '#dc2626' : '#16a34a', margin: '0 0 4px' }}>
                  {result.winner === 'banker' ? '🔵 뱅커 승!' : result.winner === 'player' ? '🔴 플레이어 승!' : '🟢 타이!'}
                </p>
                {myBetEntry && (
                  <p style={{ fontSize: 16, fontWeight: 900, color: myBetEntry.win ? '#4ade80' : '#f87171', margin: 0 }}>
                    {myBetEntry.win ? `+${myBetEntry.payout?.toLocaleString()}P 획득!` : `-${myBet.toLocaleString()}P 손실`}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* 게임 상태 */}
          <div style={{ background: '#13131c', border: '1px solid #1e1e2e', borderRadius: 14, padding: '1.2rem', marginBottom: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: phase === 'betting' ? '#4ade80' : '#f0c040', boxShadow: phase === 'betting' ? '0 0 8px #4ade80' : '0 0 8px #f0c040' }} />
                <span style={{ fontSize: 14, fontWeight: 700, color: '#e2e2e2' }}>
                  {phase === 'betting' ? `베팅 중 — ${countdown}초 남음` : phase === 'dealing' ? '카드 배분 중...' : '결과 확인 중...'}
                </span>
              </div>
              {phase === 'betting' && (
                <div style={{ background: '#0a0a0f', borderRadius: 8, padding: '4px 12px' }}>
                  <span style={{ fontSize: 20, fontWeight: 900, color: countdown <= 5 ? '#f87171' : '#f0c040' }}>{countdown}</span>
                </div>
              )}
            </div>

            {/* 베팅 선택 */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 14 }}>
              {(Object.entries(choiceConfig) as [Choice, any][]).map(([key, cfg]) => (
                <button key={key} onClick={() => setMyChoice(key)} disabled={hasBet || phase !== 'betting'} style={{
                  padding: '0.9rem 0.5rem', borderRadius: 10,
                  border: `2px solid ${myChoice === key ? cfg.color : '#2a2a3a'}`,
                  background: myChoice === key ? `${cfg.color}22` : '#0a0a0f',
                  color: myChoice === key ? cfg.color : '#888',
                  fontWeight: 700, fontSize: 14, cursor: hasBet || phase !== 'betting' ? 'not-allowed' : 'pointer',
                  opacity: hasBet ? 0.6 : 1
                }}>
                  <div style={{ fontSize: 15 }}>{cfg.label}</div>
                  <div style={{ fontSize: 11, opacity: 0.8 }}>{cfg.odds}</div>
                </button>
              ))}
            </div>

            {/* 베팅금액 */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <input type="number" value={myBet} onChange={e => setMyBet(Math.max(500, parseInt(e.target.value) || 500))} disabled={hasBet || phase !== 'betting'}
                style={{ flex: 1, background: '#0a0a0f', border: '1px solid #2a2a3a', borderRadius: 8, padding: '8px 12px', color: '#f0c040', fontSize: 16, fontWeight: 700, outline: 'none', opacity: hasBet ? 0.5 : 1 }} />
              <span style={{ color: '#888' }}>P</span>
            </div>
            <div style={{ display: 'flex', gap: 5, marginBottom: 12 }}>
              {quickBets.map(q => (
                <button key={q} onClick={() => setMyBet(q)} disabled={hasBet || phase !== 'betting'} style={{ flex: 1, padding: '5px 4px', borderRadius: 6, border: '1px solid #2a2a3a', background: myBet === q ? '#2a2010' : '#0a0a0f', color: myBet === q ? '#f0c040' : '#888', fontSize: 11, cursor: 'pointer' }}>{q >= 1000 ? (q/1000)+'K' : q}</button>
              ))}
              <button onClick={() => setMyBet(user?.points || 0)} disabled={hasBet || phase !== 'betting'} style={{ flex: 1, padding: '5px 4px', borderRadius: 6, border: '1px solid #2a2a3a', background: '#0a0a0f', color: '#888', fontSize: 11, cursor: 'pointer' }}>MAX</button>
            </div>

            {!hasBet ? (
              <button onClick={handleBet} disabled={phase !== 'betting' || !user} style={{
                width: '100%', padding: '0.9rem', borderRadius: 10, border: 'none',
                background: phase === 'betting' && user ? '#f0c040' : '#333',
                color: '#000', fontWeight: 900, fontSize: 16,
                cursor: phase === 'betting' && user ? 'pointer' : 'not-allowed'
              }}>
                {phase === 'betting' ? `🎴 ${myBet.toLocaleString()}P — ${choiceConfig[myChoice].label} 베팅` : phase === 'dealing' ? '카드 배분 중...' : '다음 라운드 대기 중...'}
              </button>
            ) : (
              <div style={{ background: '#0a2010', border: '1px solid #4ade80', borderRadius: 10, padding: '0.9rem', textAlign: 'center' }}>
                <p style={{ color: '#4ade80', fontWeight: 700, margin: 0 }}>
                  ✅ {myBet.toLocaleString()}P — {choiceConfig[myChoice].label} 베팅 완료
                </p>
              </div>
            )}
          </div>
        </div>

        {/* 오른쪽: 베팅 현황 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ background: '#13131c', border: '1px solid #1e1e2e', borderRadius: 12, padding: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#4ade80', boxShadow: '0 0 6px #4ade80' }} />
              <p style={{ fontSize: 12, color: '#888', margin: 0, fontWeight: 600 }}>이번 라운드 ({bets.length}명)</p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 400, overflowY: 'auto' }}>
              {bets.length === 0 ? (
                <p style={{ fontSize: 12, color: '#555', textAlign: 'center', padding: '1rem 0', margin: 0 }}>베팅 대기 중...</p>
              ) : bets.map((b, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: 8, padding: '8px',
                  background: b.userId === user?.id ? '#1a1a00' : '#0a0a0f',
                  borderRadius: 8,
                  border: `1px solid ${b.win === true ? '#4ade80' : b.win === false ? '#f87171' : b.userId === user?.id ? '#f0c04044' : 'transparent'}`
                }}>
                  <Avatar discordId={b.discordId} avatar={b.avatar} username={b.username} size={24} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 11, color: b.userId === user?.id ? '#f0c040' : '#e2e2e2', margin: 0, fontWeight: b.userId === user?.id ? 700 : 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.username}</p>
                    <p style={{ fontSize: 10, color: '#888', margin: 0 }}>{b.bet.toLocaleString()}P</p>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <span style={{ fontSize: 10, fontWeight: 700, color: b.choice === 'banker' ? '#2563eb' : b.choice === 'player' ? '#dc2626' : '#16a34a' }}>
                      {b.choice === 'banker' ? 'B' : b.choice === 'player' ? 'P' : 'T'}
                    </span>
                    {b.win !== undefined && (
                      <p style={{ fontSize: 10, color: b.win ? '#4ade80' : '#f87171', margin: 0, fontWeight: 700 }}>
                        {b.win ? `+${b.payout?.toLocaleString()}` : '손실'}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 베팅 분포 */}
          {bets.length > 0 && (
            <div style={{ background: '#13131c', border: '1px solid #1e1e2e', borderRadius: 12, padding: '1rem' }}>
              <p style={{ fontSize: 12, color: '#888', margin: '0 0 10px', fontWeight: 600 }}>베팅 분포</p>
              {(['banker', 'player', 'tie'] as Choice[]).map(c => {
                const total = bets.reduce((s, b) => s + b.bet, 0);
                const amount = bets.filter(b => b.choice === c).reduce((s, b) => s + b.bet, 0);
                const pct = total ? Math.round(amount / total * 100) : 0;
                const color = c === 'banker' ? '#2563eb' : c === 'player' ? '#dc2626' : '#16a34a';
                const label = c === 'banker' ? '뱅커' : c === 'player' ? '플레이어' : '타이';
                return (
                  <div key={c} style={{ marginBottom: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                      <span style={{ fontSize: 11, color, fontWeight: 700 }}>{label}</span>
                      <span style={{ fontSize: 11, color: '#888' }}>{amount.toLocaleString()}P ({pct}%)</span>
                    </div>
                    <div style={{ background: '#0a0a0f', borderRadius: 4, height: 6, overflow: 'hidden' }}>
                      <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 4, transition: 'width 0.3s' }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
