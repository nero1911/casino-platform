'use client';
import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { playPlinko } from '@/lib/api';
import Link from 'next/link';

const ROWS = 8;
const MULTIPLIERS = {
  low:    [1.5, 1.2, 1.1, 1.0, 0.5, 1.0, 1.1, 1.2, 1.5],
  medium: [5.0, 2.0, 1.5, 0.5, 0.3, 0.5, 1.5, 2.0, 5.0],
  high:   [20,  5.0, 2.0, 0.5, 0.2, 0.5, 2.0, 5.0, 20 ],
};

function multColor(m: number) {
  if (m >= 10)  return '#a78bfa';
  if (m >= 5)   return '#4ade80';
  if (m >= 2)   return '#facc15';
  if (m >= 1)   return '#fb923c';
  return '#f87171';
}

export default function PlinkoPage() {
  const { user, refreshUser } = useAuth();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [bet, setBet] = useState(1000);
  const [risk, setRisk] = useState<'low' | 'medium' | 'high'>('medium');
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [ballPath, setBallPath] = useState<number[]>([]);
  const [animating, setAnimating] = useState(false);
  const [history, setHistory] = useState<{slot: number; mult: number; win: boolean}[]>([]);
  const quickBets = [500, 1000, 5000, 10000, 50000];

  const W = 400, H = 380;
  const pegR = 5, ballR = 8;

  const getPegPos = (row: number, col: number) => {
    const cols = row + 2;
    const spacing = (W - 60) / (cols - 1);
    const x = 30 + col * spacing;
    const y = 40 + row * (H - 80) / ROWS;
    return { x, y };
  };

  const getSlotX = (slot: number) => {
    const slots = ROWS + 1;
    const spacing = (W - 60) / (slots - 1);
    return 30 + slot * spacing;
  };

  useEffect(() => {
    drawBoard([], null);
  }, [risk]);

  const drawBoard = (path: number[], finalSlot: number | null) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#0d0d14';
    ctx.fillRect(0, 0, W, H);

    const mults = MULTIPLIERS[risk];
    const slotW = (W - 60) / ROWS;

    // 슬롯 배경
    mults.forEach((m, i) => {
      const x = getSlotX(i);
      const color = multColor(m);
      ctx.fillStyle = color + '33';
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(x - slotW / 2 + 2, H - 36, slotW - 4, 30, 4);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = color;
      ctx.font = 'bold 11px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(m + 'x', x, H - 16);
    });

    // 핀
    for (let row = 0; row < ROWS; row++) {
      const cols = row + 2;
      for (let col = 0; col < cols; col++) {
        const { x, y } = getPegPos(row, col);
        ctx.beginPath();
        ctx.arc(x, y, pegR, 0, Math.PI * 2);
        ctx.fillStyle = '#3a3a5a';
        ctx.fill();
        ctx.strokeStyle = '#5a5a8a';
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    }

    // 공 경로
    if (path.length > 0) {
      let col = 0;
      for (let row = 0; row < Math.min(path.length, ROWS); row++) {
        const from = getPegPos(row, col);
        col += path[row];
        const to = row + 1 < ROWS ? getPegPos(row + 1, col) : { x: getSlotX(finalSlot ?? col), y: H - 36 };

        ctx.strokeStyle = '#f0c04088';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(from.x, from.y);
        ctx.lineTo(to.x, to.y);
        ctx.stroke();
      }

      // 공
      let ballCol = 0;
      for (let i = 0; i < path.length - 1; i++) ballCol += path[i];
      const lastRow = Math.min(path.length - 1, ROWS - 1);
      const { x: bx, y: by } = getPegPos(lastRow, ballCol);
      ctx.beginPath();
      ctx.arc(bx, by, ballR, 0, Math.PI * 2);
      ctx.fillStyle = '#f0c040';
      ctx.fill();
      ctx.shadowColor = '#f0c040';
      ctx.shadowBlur = 12;
      ctx.fill();
      ctx.shadowBlur = 0;
    }
  };

  const animateBall = (path: number[], slot: number) => {
    return new Promise<void>(resolve => {
      let step = 0;
      const interval = setInterval(() => {
        step++;
        drawBoard(path.slice(0, step), step >= ROWS ? slot : null);
        if (step >= ROWS) {
          clearInterval(interval);
          setTimeout(resolve, 300);
        }
      }, 120);
    });
  };

  const handlePlay = async () => {
    if (!user || loading) return;
    setLoading(true);
    setResult(null);
    setBallPath([]);
    setAnimating(true);
    try {
      const data = await playPlinko(bet, ROWS, risk);
      setBallPath(data.detail.path);
      await animateBall(data.detail.path, data.detail.slot);
      setResult(data);
      refreshUser();
      setHistory(prev => [{ slot: data.detail.slot, mult: data.detail.multiplier, win: data.win }, ...prev].slice(0, 12));
    } catch (e: any) {
      setResult({ error: e.response?.data?.error || '오류 발생' });
      drawBoard([], null);
    } finally {
      setLoading(false);
      setAnimating(false);
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

      <div style={{ maxWidth: 700, margin: '0 auto', padding: '1.5rem 1rem 4rem', display: 'grid', gridTemplateColumns: '1fr 220px', gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 900, color: '#e2e2e2', marginBottom: 4 }}>🎯 플링코</h1>
          <p style={{ color: '#888', marginBottom: 16, fontSize: 13 }}>공을 떨어뜨려 배수를 획득하세요</p>

          {/* 캔버스 */}
          <div style={{ background: '#0d0d14', border: '1px solid #1e1e2e', borderRadius: 14, overflow: 'hidden', marginBottom: 16 }}>
            <canvas ref={canvasRef} width={W} height={H} style={{ display: 'block', width: '100%' }} />
          </div>

          {/* 결과 */}
          {result && !result.error && (
            <div style={{ background: result.win ? '#0a2010' : '#200a0a', border: `2px solid ${result.win ? '#4ade80' : '#f87171'}`, borderRadius: 12, padding: '1rem', textAlign: 'center', marginBottom: 16, animation: 'fadeIn 0.3s ease' }}>
              <style>{`@keyframes fadeIn{from{opacity:0}to{opacity:1}}`}</style>
              <p style={{ fontSize: 22, fontWeight: 900, color: result.win ? '#4ade80' : '#f87171', margin: '0 0 4px' }}>
                {result.detail.multiplier}x — {result.win ? `+${result.payout.toLocaleString()}P` : `-${bet.toLocaleString()}P`}
              </p>
              <p style={{ fontSize: 12, color: '#888', margin: 0 }}>잔고: {result.newPoints?.toLocaleString()}P</p>
            </div>
          )}

          {/* 리스크 선택 */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 12 }}>
            {(['low', 'medium', 'high'] as const).map(r => (
              <button key={r} onClick={() => { setRisk(r); drawBoard([], null); }} style={{
                padding: '10px', borderRadius: 10,
                border: `2px solid ${risk === r ? '#f0c040' : '#2a2a3a'}`,
                background: risk === r ? '#2a2010' : '#13131c',
                color: risk === r ? '#f0c040' : '#888',
                fontWeight: 700, fontSize: 14, cursor: 'pointer'
              }}>
                {r === 'low' ? '😊 낮음' : r === 'medium' ? '😐 중간' : '😈 높음'}
              </button>
            ))}
          </div>

          {/* 베팅금액 */}
          <div style={{ background: '#13131c', border: '1px solid #1e1e2e', borderRadius: 12, padding: '1.2rem', marginBottom: 14 }}>
            <p style={{ fontSize: 12, color: '#888', margin: '0 0 8px' }}>베팅 금액</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <input type="number" value={bet} onChange={e => setBet(Math.max(100, parseInt(e.target.value) || 100))}
                style={{ flex: 1, background: '#0a0a0f', border: '1px solid #2a2a3a', borderRadius: 8, padding: '8px 12px', color: '#f0c040', fontSize: 16, fontWeight: 700, outline: 'none' }} />
              <span style={{ color: '#888', fontWeight: 700 }}>P</span>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              {quickBets.map(q => (
                <button key={q} onClick={() => setBet(q)} style={{ flex: 1, padding: '6px 4px', borderRadius: 8, border: '1px solid #2a2a3a', background: bet === q ? '#2a2010' : '#0a0a0f', color: bet === q ? '#f0c040' : '#888', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>{q >= 1000 ? (q/1000)+'K' : q}</button>
              ))}
              <button onClick={() => setBet(user?.points || 0)} style={{ flex: 1, padding: '6px 4px', borderRadius: 8, border: '1px solid #2a2a3a', background: '#0a0a0f', color: '#888', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>MAX</button>
            </div>
          </div>

          <button onClick={handlePlay} disabled={loading || animating || !user} style={{
            width: '100%', padding: '1rem', borderRadius: 12, border: 'none',
            background: (loading || animating) ? '#333' : '#f0c040', color: '#000',
            fontWeight: 900, fontSize: 18, cursor: (loading || animating) ? 'not-allowed' : 'pointer'
          }}>
            {animating ? '공 떨어지는 중...' : `🎯 ${bet.toLocaleString()}P 베팅`}
          </button>

          {result?.error && <div style={{ background: '#200a0a', border: '1px solid #f87171', borderRadius: 12, padding: '1rem', textAlign: 'center', color: '#f87171', marginTop: 14 }}>❌ {result.error}</div>}
        </div>

        {/* 오른쪽: 최근 기록 */}
        <div>
          <div style={{ background: '#13131c', border: '1px solid #1e1e2e', borderRadius: 12, padding: '1rem', position: 'sticky', top: 80 }}>
            <p style={{ fontSize: 12, color: '#888', margin: '0 0 10px', fontWeight: 600 }}>최근 기록</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {history.length === 0 && <p style={{ fontSize: 12, color: '#555', textAlign: 'center', padding: '1rem 0', margin: 0 }}>기록 없음</p>}
              {history.map((h, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 10px', background: '#0a0a0f', borderRadius: 8, border: `1px solid ${multColor(h.mult)}44` }}>
                  <span style={{ fontSize: 12, color: multColor(h.mult), fontWeight: 700 }}>{h.mult}x</span>
                  <span style={{ fontSize: 11, color: h.win ? '#4ade80' : '#f87171', fontWeight: 600 }}>{h.win ? '승' : '패'}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
