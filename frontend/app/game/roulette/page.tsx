'use client';
import { useState, useRef } from 'react';
import { useAuth } from '@/lib/auth';
import { playRoulette } from '@/lib/api';
import Link from 'next/link';

const RED_NUMBERS = [1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36];

const NUMBERS = [
  0,32,15,19,4,21,2,25,17,34,6,27,13,36,11,30,8,23,10,
  5,24,16,33,1,20,14,31,9,22,18,29,7,28,12,35,3,26
];

function getColor(n: number) {
  if (n === 0) return '#16a34a';
  return RED_NUMBERS.includes(n) ? '#dc2626' : '#1a1a1a';
}

export default function RoulettePage() {
  const { user, refreshUser } = useAuth();
  const [bet, setBet] = useState(1000);
  const [betType, setBetType] = useState<string>('color');
  const [betValue, setBetValue] = useState<string>('red');
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [spinning, setSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [ballAngle, setBallAngle] = useState(0);
  const [history, setHistory] = useState<{number: number; color: string}[]>([]);
  const wheelRef = useRef<HTMLDivElement>(null);
  const quickBets = [500, 1000, 5000, 10000, 50000];

  const handlePlay = async () => {
    if (!user || loading || spinning) return;
    setLoading(true);
    setResult(null);
    setSpinning(true);

    // 휠 애니메이션
    const spins = 5 + Math.random() * 5;
    const newRotation = rotation + spins * 360;
    setRotation(newRotation);
    setBallAngle(Math.random() * 360);

    setTimeout(async () => {
      try {
        const data = await playRoulette(bet, betType, betValue);
        setResult(data);
        refreshUser();
        setHistory(prev => [{ number: data.detail.number, color: data.detail.color }, ...prev].slice(0, 15));
      } catch (e: any) {
        setResult({ error: e.response?.data?.error || '오류 발생' });
      } finally {
        setLoading(false);
        setSpinning(false);
      }
    }, 3000);
  };

  const betOptions = [
    { type: 'color', value: 'red',   label: '🔴 레드',   odds: '1.95x' },
    { type: 'color', value: 'black', label: '⚫ 블랙',   odds: '1.95x' },
    { type: 'color', value: 'green', label: '🟢 그린(0)', odds: '35x'   },
    { type: 'oddeven', value: 'odd',  label: '홀수',      odds: '1.95x' },
    { type: 'oddeven', value: 'even', label: '짝수',      odds: '1.95x' },
    { type: 'half', value: 'low',    label: '1~18',      odds: '1.95x' },
    { type: 'half', value: 'high',   label: '19~36',     odds: '1.95x' },
  ];

  return (
    <div style={{ background: '#0a0a0f', minHeight: '100vh' }}>
      <nav style={{ background: '#0d0d14', borderBottom: '1px solid #1e1e2e', padding: '0 1.5rem', height: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
          <span style={{ fontSize: 22 }}>🎰</span>
          <span style={{ fontSize: 18, fontWeight: 900, color: '#f0c040' }}>카지노</span>
        </Link>
        {user && <span style={{ fontWeight: 800, color: '#f0c040', fontSize: 16 }}>{user.points.toLocaleString()}P</span>}
      </nav>

      <div style={{ maxWidth: 700, margin: '0 auto', padding: '1.5rem 1rem 4rem' }}>
        <h1 style={{ fontSize: 26, fontWeight: 900, color: '#e2e2e2', marginBottom: 4 }}>🎡 룰렛</h1>
        <p style={{ color: '#888', marginBottom: 20, fontSize: 13 }}>0~36 숫자에 베팅하세요</p>

        {/* 최근 기록 */}
        {history.length > 0 && (
          <div style={{ display: 'flex', gap: 6, marginBottom: 20, flexWrap: 'wrap' }}>
            {history.map((h, i) => (
              <div key={i} style={{
                width: 32, height: 32, borderRadius: '50%',
                background: h.color === 'red' ? '#dc2626' : h.color === 'black' ? '#1a1a2e' : '#16a34a',
                border: '2px solid #2a2a3a',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, fontWeight: 800, color: '#fff'
              }}>{h.number}</div>
            ))}
          </div>
        )}

        {/* 휠 */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 24 }}>
          <div style={{ position: 'relative', width: 240, height: 240 }}>
            {/* 휠 */}
            <div ref={wheelRef} style={{
              width: 240, height: 240, borderRadius: '50%',
              border: '6px solid #f0c040',
              background: `conic-gradient(${NUMBERS.map((n, i) => {
                const color = getColor(n);
                const pct = (i / NUMBERS.length) * 100;
                const nextPct = ((i + 1) / NUMBERS.length) * 100;
                return `${color} ${pct}% ${nextPct}%`;
              }).join(', ')})`,
              transition: spinning ? 'transform 3s cubic-bezier(0.2, 0.8, 0.3, 1)' : 'none',
              transform: `rotate(${rotation}deg)`,
              position: 'relative',
            }}>
              {/* 숫자 표시 */}
              {NUMBERS.map((n, i) => {
                const angle = (i / NUMBERS.length) * 360 + (180 / NUMBERS.length);
                return (
                  <div key={i} style={{
                    position: 'absolute', top: '50%', left: '50%',
                    transform: `rotate(${angle}deg) translateY(-96px) rotate(-${angle}deg)`,
                    fontSize: 9, fontWeight: 700, color: '#fff',
                    width: 16, height: 16, marginLeft: -8, marginTop: -8,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    textShadow: '0 0 3px rgba(0,0,0,0.8)'
                  }}>{n}</div>
                );
              })}
            </div>
            {/* 중앙 */}
            <div style={{
              position: 'absolute', top: '50%', left: '50%',
              transform: 'translate(-50%, -50%)',
              width: 60, height: 60, borderRadius: '50%',
              background: '#0d0d14', border: '4px solid #f0c040',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: result && !result.error ? 18 : 12,
              fontWeight: 900,
              color: result && !result.error ? (getColor(result.result) === '#dc2626' ? '#f87171' : getColor(result.result) === '#16a34a' ? '#4ade80' : '#e2e2e2') : '#888',
              zIndex: 2
            }}>
              {spinning ? '🎡' : result && !result.error ? result.result : '?'}
            </div>
            {/* 포인터 */}
            <div style={{
              position: 'absolute', top: -10, left: '50%',
              transform: 'translateX(-50%)',
              width: 0, height: 0,
              borderLeft: '8px solid transparent',
              borderRight: '8px solid transparent',
              borderTop: '20px solid #f0c040',
              zIndex: 3
            }} />
          </div>
        </div>

        {/* 결과 */}
        {result && !result.error && !spinning && (
          <div style={{
            background: result.win ? '#0a2010' : '#200a0a',
            border: `2px solid ${result.win ? '#4ade80' : '#f87171'}`,
            borderRadius: 12, padding: '1rem', textAlign: 'center', marginBottom: 20,
            animation: 'fadeIn 0.3s ease'
          }}>
            <style>{`@keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}`}</style>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
              <div style={{ width: 44, height: 44, borderRadius: '50%', background: getColor(result.result), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 900, color: '#fff', border: '2px solid rgba(255,255,255,0.3)' }}>
                {result.result}
              </div>
              <div>
                <p style={{ fontSize: 20, fontWeight: 900, color: result.win ? '#4ade80' : '#f87171', margin: 0 }}>
                  {result.win ? `+${result.payout.toLocaleString()}P 획득!` : `-${bet.toLocaleString()}P 손실`}
                </p>
                <p style={{ fontSize: 12, color: '#888', margin: 0 }}>
                  {result.detail.color === 'red' ? '🔴 레드' : result.detail.color === 'black' ? '⚫ 블랙' : '🟢 그린'} | 잔고: {result.newPoints?.toLocaleString()}P
                </p>
              </div>
            </div>
          </div>
        )}

        {/* 베팅 선택 */}
        <div style={{ background: '#13131c', border: '1px solid #1e1e2e', borderRadius: 12, padding: '1.2rem', marginBottom: 14 }}>
          <p style={{ fontSize: 12, color: '#888', margin: '0 0 10px', fontWeight: 600 }}>베팅 종류</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 12 }}>
            {betOptions.map(o => (
              <button key={`${o.type}_${o.value}`} onClick={() => { setBetType(o.type); setBetValue(o.value); }} style={{
                padding: '10px 6px', borderRadius: 8,
                border: `2px solid ${betType === o.type && betValue === o.value ? '#f0c040' : '#2a2a3a'}`,
                background: betType === o.type && betValue === o.value ? '#2a2010' : '#0a0a0f',
                color: betType === o.type && betValue === o.value ? '#f0c040' : '#888',
                fontSize: 12, fontWeight: 600, cursor: 'pointer', textAlign: 'center'
              }}>
                <div>{o.label}</div>
                <div style={{ fontSize: 10, opacity: 0.7, marginTop: 2 }}>{o.odds}</div>
              </button>
            ))}
            {/* 숫자 직접 베팅 */}
            <button onClick={() => { setBetType('number'); setBetValue('0'); }} style={{
              padding: '10px 6px', borderRadius: 8,
              border: `2px solid ${betType === 'number' ? '#f0c040' : '#2a2a3a'}`,
              background: betType === 'number' ? '#2a2010' : '#0a0a0f',
              color: betType === 'number' ? '#f0c040' : '#888',
              fontSize: 12, fontWeight: 600, cursor: 'pointer', textAlign: 'center'
            }}>
              <div>숫자 직접</div>
              <div style={{ fontSize: 10, opacity: 0.7, marginTop: 2 }}>35x</div>
            </button>
          </div>

          {/* 숫자 직접 선택 */}
          {betType === 'number' && (
            <div style={{ marginBottom: 12 }}>
              <p style={{ fontSize: 12, color: '#888', margin: '0 0 8px' }}>숫자 선택 (0~36)</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {Array.from({ length: 37 }, (_, i) => (
                  <button key={i} onClick={() => setBetValue(String(i))} style={{
                    width: 36, height: 36, borderRadius: 6,
                    border: `2px solid ${betValue === String(i) ? '#f0c040' : 'transparent'}`,
                    background: getColor(i),
                    color: '#fff', fontSize: 11, fontWeight: 700, cursor: 'pointer'
                  }}>{i}</button>
                ))}
              </div>
            </div>
          )}

          {/* 베팅금액 */}
          <p style={{ fontSize: 12, color: '#888', margin: '0 0 6px' }}>베팅 금액</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <input type="number" value={bet} onChange={e => setBet(Math.max(100, parseInt(e.target.value) || 100))}
              style={{ flex: 1, background: '#0a0a0f', border: '1px solid #2a2a3a', borderRadius: 8, padding: '8px 12px', color: '#f0c040', fontSize: 16, fontWeight: 700, outline: 'none' }} />
            <span style={{ color: '#888', fontWeight: 700 }}>P</span>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            {quickBets.map(q => (
              <button key={q} onClick={() => setBet(q)} style={{ flex: 1, padding: '6px 4px', borderRadius: 8, border: '1px solid #2a2a3a', background: bet === q ? '#2a2010' : '#0a0a0f', color: bet === q ? '#f0c040' : '#888', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>{q.toLocaleString()}</button>
            ))}
            <button onClick={() => setBet(Math.floor((user?.points || 0) / 2))} style={{ flex: 1, padding: '6px 4px', borderRadius: 8, border: '1px solid #2a2a3a', background: '#0a0a0f', color: '#888', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>1/2</button>
            <button onClick={() => setBet(user?.points || 0)} style={{ flex: 1, padding: '6px 4px', borderRadius: 8, border: '1px solid #2a2a3a', background: '#0a0a0f', color: '#888', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>MAX</button>
          </div>
        </div>

        <button onClick={handlePlay} disabled={loading || spinning || !user} style={{
          width: '100%', padding: '1rem', borderRadius: 12, border: 'none',
          background: (loading || spinning) ? '#333' : '#f0c040', color: '#000',
          fontWeight: 900, fontSize: 18, cursor: (loading || spinning) ? 'not-allowed' : 'pointer'
        }}>
          {spinning ? '🎡 회전 중...' : `🎡 ${bet.toLocaleString()}P 베팅`}
        </button>

        {result?.error && (
          <div style={{ background: '#200a0a', border: '1px solid #f87171', borderRadius: 12, padding: '1rem', textAlign: 'center', color: '#f87171', marginTop: 14 }}>
            ❌ {result.error}
          </div>
        )}
      </div>
    </div>
  );
}
