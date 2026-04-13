'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/lib/auth';
import { useWebSocket } from '@/lib/useWebSocket';
import Link from 'next/link';

interface BetEntry {
  userId: number;
  discordId: string;
  username: string;
  avatar: string;
  bet: number;
  autoCashout: number | null;
  cashedOut: boolean;
  payout: number;
}

interface HistoryItem { crashPoint: number; }
type Phase = 'waiting' | 'flying' | 'crashed';

const GRAPH_W = 560;
const GRAPH_H = 240;
const PAD_L = 44;
const PAD_B = 28;

function Avatar({ discordId, avatar, username, size = 24 }: { discordId: string; avatar: string; username: string; size?: number }) {
  const [err, setErr] = useState(false);
  // 아바타 해시가 있으면 디스코드 CDN, 없으면 기본 아바타
  const src = !err && avatar && avatar !== 'null'
    ? `https://cdn.discordapp.com/avatars/${discordId}/${avatar}.png?size=64`
    : `https://cdn.discordapp.com/embed/avatars/${parseInt(discordId || '0') % 5}.png`;
  return (
    <img
      src={src}
      alt={username}
      onError={() => setErr(true)}
      style={{ width: size, height: size, borderRadius: '50%', flexShrink: 0, objectFit: 'cover' }}
    />
  );
}

export default function CrashPage() {
  const { user, refreshUser } = useAuth();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const phaseRef = useRef<Phase>('waiting');

  const [isConnected, setIsConnected] = useState(false);
  const [phase, setPhase] = useState<Phase>('waiting');
  const [countdown, setCountdown] = useState(10);
  const [currentMult, setCurrentMult] = useState(1.0);
  const [crashPoint, setCrashPoint] = useState<number | null>(null);
  const [bets, setBets] = useState<BetEntry[]>([]);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [myBet, setMyBet] = useState(1000);
  const [autoCashout, setAutoCashout] = useState<string>('2.00');
  const [hasBet, setHasBet] = useState(false);
  const [myCashout, setMyCashout] = useState<{ mult: number; payout: number } | null>(null);

  const quickBets = [500, 1000, 5000, 10000, 50000];

  const drawGraph = useCallback((mult: number, crashed: boolean) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = GRAPH_W, H = GRAPH_H;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#0d0d14';
    ctx.fillRect(0, 0, W, H);

    const plotW = W - PAD_L - 16;
    const plotH = H - PAD_B - 16;

    ctx.strokeStyle = '#1e1e2e';
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= 4; i++) {
      const y = 16 + (plotH / 4) * i;
      ctx.beginPath(); ctx.moveTo(PAD_L, y); ctx.lineTo(W - 16, y); ctx.stroke();
    }

    ctx.fillStyle = '#555';
    ctx.font = '11px monospace';
    ctx.textAlign = 'right';
    const maxMult = Math.max(mult * 1.1, 2);
    for (let i = 0; i <= 4; i++) {
      const val = 1 + (maxMult - 1) * (1 - i / 4);
      ctx.fillText(val.toFixed(1) + 'x', PAD_L - 4, 16 + (plotH / 4) * i + 4);
    }

    const elapsed = phaseRef.current === 'flying'
      ? (Date.now() - startTimeRef.current) / 1000
      : Math.log(mult) / 0.06;
    const totalTime = Math.max(elapsed, 1);

    const color = crashed ? '#f87171' : '#4ade80';
    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth = 2.5;
    ctx.shadowColor = color;
    ctx.shadowBlur = 8;

    let lastX = PAD_L, lastY = 16 + plotH;
    const steps = 80;
    for (let i = 0; i <= steps; i++) {
      const t = (totalTime * i) / steps;
      const m = Math.max(1.0, Math.exp(0.06 * t));
      if (m > maxMult) break;
      const x = PAD_L + (plotW * i) / steps;
      const y = 16 + plotH * (1 - (m - 1) / (maxMult - 1));
      lastX = x; lastY = y;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.shadowBlur = 0;

    ctx.globalAlpha = 0.08;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(PAD_L, 16 + plotH);
    for (let i = 0; i <= steps; i++) {
      const t = (totalTime * i) / steps;
      const m = Math.max(1.0, Math.exp(0.06 * t));
      if (m > maxMult) break;
      const x = PAD_L + (plotW * i) / steps;
      const y = 16 + plotH * (1 - (m - 1) / (maxMult - 1));
      ctx.lineTo(x, y);
    }
    ctx.lineTo(lastX, 16 + plotH);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 1;
  }, []);

  const startAnimation = useCallback(() => {
    const loop = () => {
      if (phaseRef.current !== 'flying') return;
      const elapsed = (Date.now() - startTimeRef.current) / 1000;
      const m = parseFloat(Math.max(1.0, Math.exp(0.06 * elapsed)).toFixed(2));
      setCurrentMult(m);
      drawGraph(m, false);
      animRef.current = requestAnimationFrame(loop);
    };
    animRef.current = requestAnimationFrame(loop);
  }, [drawGraph]);

  const handleMessage = useCallback((msg: any) => {
    switch (msg.type) {
      case 'init':
        setHistory(msg.crash?.history || []);
        setBets(msg.crash?.bets || []);
        if (msg.crash?.phase === 'waiting') { setPhase('waiting'); setCountdown(msg.crash.countdown); }
        break;
      case 'crash_waiting':
        phaseRef.current = 'waiting';
        setPhase('waiting'); setCountdown(msg.countdown);
        setHasBet(false); setMyCashout(null); setCrashPoint(null);
        setCurrentMult(1.0); setBets([]);
        setHistory(msg.history || []);
        if (animRef.current) cancelAnimationFrame(animRef.current);
        drawGraph(1.0, false);
        break;
      case 'crash_countdown':
        setCountdown(msg.countdown);
        break;
      case 'crash_start':
        phaseRef.current = 'flying';
        setPhase('flying');
        startTimeRef.current = msg.startTime;
        startAnimation();
        break;
      case 'crash_end':
        phaseRef.current = 'crashed';
        setPhase('crashed');
        setCrashPoint(msg.crashPoint);
        setBets(msg.bets || []);
        if (animRef.current) cancelAnimationFrame(animRef.current);
        drawGraph(msg.crashPoint, true);
        refreshUser();
        break;
      case 'crash_bet':
        setBets(prev => [...prev.filter(b => b.userId !== msg.bet.userId), msg.bet]);
        break;
      case 'crash_cashout':
        setBets(prev => prev.map(b => b.userId === msg.userId ? { ...b, cashedOut: true, payout: msg.payout } : b));
        if (user && msg.userId === user.id) setMyCashout({ mult: msg.cashoutAt, payout: msg.payout });
        break;
      case 'crash_bet_ok':
        setHasBet(true);
        break;
    }
  }, [user, startAnimation, drawGraph, refreshUser]);

  const { send, connected: wsConnected } = useWebSocket(handleMessage);
  useEffect(() => { setIsConnected(wsConnected); }, [wsConnected]);
  useEffect(() => () => { if (animRef.current) cancelAnimationFrame(animRef.current); }, []);

  const handleBet = () => {
    if (!user || hasBet || phase !== 'waiting') return;
    const auto = parseFloat(autoCashout);
    send({ type: 'crash_bet', bet: myBet, autoCashout: isNaN(auto) || auto <= 1 ? null : auto });
  };

  const handleCashout = () => {
    if (phase !== 'flying' || !hasBet || myCashout) return;
    send({ type: 'crash_cashout' });
  };

  const multColor = (m: number) => {
    if (m < 1.5) return '#f87171';
    if (m < 2)   return '#fb923c';
    if (m < 5)   return '#facc15';
    if (m < 10)  return '#4ade80';
    return '#a78bfa';
  };

  const histColor = (cp: number) => {
    if (cp < 1.5) return { bg: '#200a0a', border: '#f87171', color: '#f87171' };
    if (cp < 2)   return { bg: '#1a1000', border: '#fb923c', color: '#fb923c' };
    if (cp < 5)   return { bg: '#1a1500', border: '#facc15', color: '#facc15' };
    if (cp < 10)  return { bg: '#0a1a00', border: '#4ade80', color: '#4ade80' };
    return { bg: '#14001a', border: '#a78bfa', color: '#a78bfa' };
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
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: isConnected ? '#4ade80' : '#f87171' }} />
            <span style={{ fontSize: 12, color: '#888' }}>{isConnected ? '연결됨' : '연결 중...'}</span>
          </div>
          {user && <span style={{ fontWeight: 800, color: '#f0c040', fontSize: 16 }}>{user.points.toLocaleString()}P</span>}
        </div>
      </nav>

      <div style={{ maxWidth: 1000, margin: '0 auto', padding: '1.5rem 1rem 4rem', display: 'grid', gridTemplateColumns: '1fr 280px', gap: 16 }}>

        {/* 왼쪽 */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <h1 style={{ fontSize: 22, fontWeight: 900, color: '#e2e2e2', margin: 0 }}>📈 부스타빗</h1>
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
              {history.slice(0, 8).map((h, i) => {
                const c = histColor(h.crashPoint);
                return <div key={i} style={{ background: c.bg, border: `1px solid ${c.border}`, borderRadius: 6, padding: '2px 8px', fontSize: 11, fontWeight: 800, color: c.color }}>{h.crashPoint.toFixed(2)}x</div>;
              })}
            </div>
          </div>

          {/* 그래프 */}
          <div style={{ position: 'relative', borderRadius: 14, overflow: 'hidden', border: '1px solid #1e1e2e', marginBottom: 16 }}>
            <canvas ref={canvasRef} width={GRAPH_W} height={GRAPH_H} style={{ display: 'block', width: '100%' }} />

            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
              {phase === 'waiting' && (
                <div style={{ textAlign: 'center' }}>
                  <p style={{ fontSize: 14, color: '#888', margin: '0 0 8px' }}>다음 라운드까지</p>
                  <p style={{ fontSize: 56, fontWeight: 900, color: '#f0c040', margin: 0 }}>{countdown}초</p>
                </div>
              )}
              {phase === 'flying' && (
                <div style={{ textAlign: 'center' }}>
                  <p style={{ fontSize: 72, fontWeight: 900, color: multColor(currentMult), margin: 0, fontVariantNumeric: 'tabular-nums', letterSpacing: -2, textShadow: `0 0 30px ${multColor(currentMult)}` }}>
                    {currentMult.toFixed(2)}x
                  </p>
                  {myBetEntry && !myBetEntry.cashedOut && !myCashout && (
                    <p style={{ fontSize: 14, color: '#4ade80', margin: '8px 0 0', fontWeight: 700 }}>
                      현재 {Math.floor(myBetEntry.bet * currentMult).toLocaleString()}P
                    </p>
                  )}
                </div>
              )}
              {phase === 'crashed' && (
                <div style={{ textAlign: 'center' }}>
                  <p style={{ fontSize: 20, color: '#f87171', margin: '0 0 8px', fontWeight: 700 }}>💥 폭발!</p>
                  <p style={{ fontSize: 56, fontWeight: 900, color: '#f87171', margin: 0 }}>{crashPoint?.toFixed(2)}x</p>
                </div>
              )}
            </div>

            {phase === 'flying' && hasBet && !myCashout && myBetEntry && !myBetEntry.cashedOut && (
              <button onClick={handleCashout} style={{
                position: 'absolute', bottom: 16, right: 16,
                background: '#4ade80', color: '#000', fontWeight: 900,
                fontSize: 15, padding: '10px 24px', borderRadius: 10,
                border: 'none', cursor: 'pointer',
                boxShadow: '0 0 20px rgba(74,222,128,0.5)',
              }}>
                💰 {currentMult.toFixed(2)}x 캐시아웃!<br />
                <span style={{ fontSize: 12 }}>({Math.floor(myBetEntry.bet * currentMult).toLocaleString()}P)</span>
              </button>
            )}

            {myCashout && (
              <div style={{ position: 'absolute', top: 16, right: 16, background: '#0a2010', border: '2px solid #4ade80', borderRadius: 10, padding: '8px 14px', textAlign: 'right' }}>
                <p style={{ fontSize: 12, color: '#4ade80', margin: 0, fontWeight: 700 }}>✅ {myCashout.mult.toFixed(2)}x 캐시아웃!</p>
                <p style={{ fontSize: 16, color: '#4ade80', margin: 0, fontWeight: 900 }}>+{myCashout.payout.toLocaleString()}P</p>
              </div>
            )}
          </div>

          {/* 베팅 컨트롤 */}
          <div style={{ background: '#13131c', border: '1px solid #1e1e2e', borderRadius: 14, padding: '1.2rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
              <div>
                <p style={{ fontSize: 12, color: '#888', margin: '0 0 6px' }}>베팅 금액</p>
                <input type="number" value={myBet} onChange={e => setMyBet(Math.max(100, parseInt(e.target.value) || 100))} disabled={hasBet || phase === 'flying'}
                  style={{ width: '100%', background: '#0a0a0f', border: '1px solid #2a2a3a', borderRadius: 8, padding: '8px 12px', color: '#f0c040', fontSize: 16, fontWeight: 700, outline: 'none', boxSizing: 'border-box', opacity: hasBet ? 0.5 : 1 }} />
                <div style={{ display: 'flex', gap: 4, marginTop: 6 }}>
                  {quickBets.map(q => (
                    <button key={q} onClick={() => setMyBet(q)} disabled={hasBet || phase === 'flying'}
                      style={{ flex: 1, padding: '4px 2px', borderRadius: 6, border: '1px solid #2a2a3a', background: myBet === q ? '#2a2010' : '#0a0a0f', color: myBet === q ? '#f0c040' : '#888', fontSize: 10, fontWeight: 600, cursor: 'pointer' }}>
                      {q >= 1000 ? (q / 1000) + 'K' : q}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p style={{ fontSize: 12, color: '#888', margin: '0 0 6px' }}>자동 캐시아웃 (선택)</p>
                <input type="text" value={autoCashout} onChange={e => setAutoCashout(e.target.value)} placeholder="없음" disabled={hasBet || phase === 'flying'}
                  style={{ width: '100%', background: '#0a0a0f', border: '1px solid #2a2a3a', borderRadius: 8, padding: '8px 12px', color: '#4ade80', fontSize: 16, fontWeight: 700, outline: 'none', boxSizing: 'border-box', opacity: hasBet ? 0.5 : 1 }} />
                <div style={{ display: 'flex', gap: 4, marginTop: 6 }}>
                  {[1.5, 2, 3, 5, 10].map(q => (
                    <button key={q} onClick={() => setAutoCashout(String(q))} disabled={hasBet || phase === 'flying'}
                      style={{ flex: 1, padding: '4px 2px', borderRadius: 6, border: '1px solid #2a2a3a', background: autoCashout === String(q) ? '#0a2010' : '#0a0a0f', color: autoCashout === String(q) ? '#4ade80' : '#888', fontSize: 10, fontWeight: 600, cursor: 'pointer' }}>
                      {q}x
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div style={{ background: '#0a1a08', border: '1px solid #1a3a18', borderRadius: 8, padding: '8px 12px', marginBottom: 10, display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 12, color: '#888' }}>캐시아웃 성공 시 예상 수익</span>
              <span style={{ fontSize: 13, fontWeight: 800, color: '#4ade80' }}>
                +{Math.floor(myBet * (parseFloat(autoCashout) || 2) - myBet).toLocaleString()}P
              </span>
            </div>

            {!hasBet ? (
              <button onClick={handleBet} disabled={phase !== 'waiting' || !user} style={{
                width: '100%', padding: '0.9rem', borderRadius: 10, border: 'none',
                background: phase === 'waiting' && user ? '#f0c040' : '#333',
                color: '#000', fontWeight: 900, fontSize: 16,
                cursor: phase === 'waiting' && user ? 'pointer' : 'not-allowed'
              }}>
                {phase === 'waiting' ? `📈 ${myBet.toLocaleString()}P 베팅하기`
                  : phase === 'flying' ? '🚀 게임 진행 중...'
                  : '💥 다음 라운드 대기 중...'}
              </button>
            ) : (
              <div style={{ background: '#0a2010', border: '1px solid #4ade80', borderRadius: 10, padding: '0.9rem', textAlign: 'center' }}>
                <p style={{ color: '#4ade80', fontWeight: 700, margin: 0, fontSize: 15 }}>
                  ✅ {myBet.toLocaleString()}P 베팅 완료
                  {autoCashout && parseFloat(autoCashout) > 1 ? ` — ${autoCashout}x 자동 캐시아웃` : ' — 수동 캐시아웃'}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* 오른쪽 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ background: '#13131c', border: '1px solid #1e1e2e', borderRadius: 12, padding: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#4ade80', boxShadow: '0 0 6px #4ade80' }} />
              <p style={{ fontSize: 12, color: '#888', margin: 0, fontWeight: 600 }}>이번 라운드 ({bets.length}명)</p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5, maxHeight: 340, overflowY: 'auto' }}>
              {bets.length === 0 ? (
                <p style={{ fontSize: 12, color: '#555', textAlign: 'center', padding: '1rem 0', margin: 0 }}>베팅 대기 중...</p>
              ) : bets.map((b, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: 8, padding: '7px 8px',
                  background: b.cashedOut ? '#0a2010' : b.userId === user?.id ? '#1a1a00' : '#0a0a0f',
                  borderRadius: 8,
                  border: `1px solid ${b.cashedOut ? '#4ade80' : b.userId === user?.id ? '#f0c040' : 'transparent'}`
                }}>
                  <Avatar discordId={b.discordId} avatar={b.avatar} username={b.username} size={24} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 11, color: b.userId === user?.id ? '#f0c040' : '#e2e2e2', margin: 0, fontWeight: b.userId === user?.id ? 700 : 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.username}</p>
                    <p style={{ fontSize: 10, color: '#888', margin: 0 }}>{b.bet.toLocaleString()}P</p>
                  </div>
                  {b.cashedOut
                    ? <span style={{ fontSize: 11, fontWeight: 700, color: '#4ade80' }}>+{b.payout.toLocaleString()}</span>
                    : b.autoCashout
                      ? <span style={{ fontSize: 10, color: '#888' }}>{b.autoCashout}x</span>
                      : <span style={{ fontSize: 10, color: '#555' }}>수동</span>
                  }
                </div>
              ))}
            </div>
          </div>

          <div style={{ background: '#13131c', border: '1px solid #1e1e2e', borderRadius: 12, padding: '1rem' }}>
            <p style={{ fontSize: 12, color: '#888', margin: '0 0 10px', fontWeight: 600 }}>최근 20게임</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {history.length === 0
                ? <p style={{ fontSize: 12, color: '#555', margin: 0 }}>기록 없음</p>
                : history.map((h, i) => {
                    const c = histColor(h.crashPoint);
                    return <div key={i} style={{ background: c.bg, border: `1px solid ${c.border}`, borderRadius: 6, padding: '3px 8px', fontSize: 11, fontWeight: 700, color: c.color }}>{h.crashPoint.toFixed(2)}x</div>;
                  })
              }
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
