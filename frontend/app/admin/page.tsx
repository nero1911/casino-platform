'use client';
import { useState, useEffect } from 'react';
import Cookies from 'js-cookie';
import Link from 'next/link';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

function adminFetch(path: string, method = 'GET', body?: any) {
  const token = Cookies.get('adminToken');
  return fetch(`${API}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: body ? JSON.stringify(body) : undefined,
  }).then(r => r.json());
}

const GAME_NAMES: Record<string, string> = {
  crash: '📈 부스타빗', baccarat: '🎴 바카라', blackjack: '♠️ 블랙잭',
  holdem: '🃏 홀덤', roulette: '🎡 룰렛', plinko: '🎯 플링코',
  ladder: '🪜 사다리', oddeven: '🎲 홀짝', coinflip: '🪙 코인플립', dice: '🎰 주사위',
};

export default function AdminPage() {
  const [tab, setTab] = useState<'login'|'stats'|'settings'|'roulette'|'bot'|'users'|'history'>('login');
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<any>(null);
  const [settings, setSettings] = useState<any[]>([]);
  const [roulettePayouts, setRoulettePayouts] = useState<any[]>([]);
  const [botSettings, setBotSettings] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [userSearch, setUserSearch] = useState('');
  const [editingUser, setEditingUser] = useState<any>(null);
  const [pointAmount, setPointAmount] = useState('');
  const [pointMemo, setPointMemo] = useState('');
  const [historyGame, setHistoryGame] = useState('');
  const [saveMsg, setSaveMsg] = useState('');

  useEffect(() => {
    const token = Cookies.get('adminToken');
    if (token) { setIsLoggedIn(true); setTab('stats'); loadStats(); }
  }, []);

  const showSave = (msg = '저장됨!') => { setSaveMsg(msg); setTimeout(() => setSaveMsg(''), 2000); };

  const loadStats    = async () => { const d = await adminFetch('/admin/stats'); if (!d.error) setStats(d); };
  const loadSettings = async () => { const d = await adminFetch('/admin/settings'); if (Array.isArray(d)) setSettings(d); };
  const loadRoulette = async () => { const d = await adminFetch('/admin/roulette-payouts'); if (Array.isArray(d)) setRoulettePayouts(d); };
  const loadBotSettings = async () => { const d = await adminFetch('/admin/bot-settings'); if (Array.isArray(d)) setBotSettings(d); };
  const loadUsers    = async (s = '') => { const d = await adminFetch(`/admin/users?search=${s}`); if (Array.isArray(d)) setUsers(d); };
  const loadHistory  = async (g = '') => { const d = await adminFetch(`/admin/history?game=${g}`); if (Array.isArray(d)) setHistory(d); };

  const handleLogin = async () => {
    setLoading(true); setError('');
    const data = await fetch(`${API}/admin/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(loginForm) }).then(r => r.json());
    setLoading(false);
    if (data.token) { Cookies.set('adminToken', data.token, { expires: 1 }); setIsLoggedIn(true); setTab('stats'); loadStats(); }
    else setError(data.error || '로그인 실패');
  };

  const handleTabChange = (t: typeof tab) => {
    setTab(t);
    if (t === 'stats') loadStats();
    if (t === 'settings') loadSettings();
    if (t === 'roulette') loadRoulette();
    if (t === 'bot') loadBotSettings();
    if (t === 'users') loadUsers();
    if (t === 'history') loadHistory();
  };

  const cardStyle: any = { background: '#13131c', border: '1px solid #1e1e2e', borderRadius: 12, padding: '1.2rem' };
  const inputStyle: any = { background: '#0a0a0f', border: '1px solid #2a2a3a', borderRadius: 6, padding: '6px 10px', color: '#e2e2e2', fontSize: 14, outline: 'none' };

  if (!isLoggedIn) return (
    <div style={{ background: '#0a0a0f', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ ...cardStyle, width: 360, padding: '2rem' }}>
        <h2 style={{ fontSize: 22, fontWeight: 900, color: '#f0c040', margin: '0 0 24px', textAlign: 'center' }}>🔐 관리자 로그인</h2>
        {error && <div style={{ background: '#200a0a', border: '1px solid #f87171', borderRadius: 8, padding: 10, marginBottom: 16, color: '#f87171', fontSize: 13 }}>{error}</div>}
        <div style={{ marginBottom: 12 }}>
          <p style={{ fontSize: 12, color: '#888', margin: '0 0 6px' }}>아이디</p>
          <input value={loginForm.username} onChange={e => setLoginForm(p => ({ ...p, username: e.target.value }))} onKeyDown={e => e.key === 'Enter' && handleLogin()}
            style={{ ...inputStyle, width: '100%', padding: '10px 14px', boxSizing: 'border-box' as any }} />
        </div>
        <div style={{ marginBottom: 20 }}>
          <p style={{ fontSize: 12, color: '#888', margin: '0 0 6px' }}>비밀번호</p>
          <input type="password" value={loginForm.password} onChange={e => setLoginForm(p => ({ ...p, password: e.target.value }))} onKeyDown={e => e.key === 'Enter' && handleLogin()}
            style={{ ...inputStyle, width: '100%', padding: '10px 14px', boxSizing: 'border-box' as any }} />
        </div>
        <button onClick={handleLogin} disabled={loading} style={{ width: '100%', padding: 12, borderRadius: 10, border: 'none', background: '#f0c040', color: '#000', fontWeight: 900, fontSize: 16, cursor: 'pointer' }}>
          {loading ? '로그인 중...' : '로그인'}
        </button>
      </div>
    </div>
  );

  return (
    <div style={{ background: '#0a0a0f', minHeight: '100vh' }}>
      <nav style={{ background: '#0d0d14', borderBottom: '1px solid #1e1e2e', padding: '0 1.5rem', height: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <Link href="/" style={{ fontSize: 18, fontWeight: 900, color: '#f0c040', textDecoration: 'none' }}>🎰 카지노</Link>
          <span style={{ color: '#555' }}>|</span>
          <span style={{ fontSize: 13, color: '#888' }}>관리자 패널</span>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          {saveMsg && <span style={{ fontSize: 13, color: '#4ade80', fontWeight: 700 }}>✅ {saveMsg}</span>}
          <button onClick={() => { Cookies.remove('adminToken'); setIsLoggedIn(false); setTab('login'); }}
            style={{ background: '#200a0a', border: '1px solid #f87171', borderRadius: 8, padding: '6px 14px', color: '#f87171', fontSize: 13, cursor: 'pointer' }}>로그아웃</button>
        </div>
      </nav>

      {/* 탭 */}
      <div style={{ borderBottom: '1px solid #1e1e2e', display: 'flex', padding: '0 1.5rem', overflowX: 'auto' }}>
        {[
          { key: 'stats',    label: '📊 통계' },
          { key: 'settings', label: '⚙️ 게임 설정' },
          { key: 'roulette', label: '🎡 룰렛 배당' },
          { key: 'bot',      label: '🤖 봇 설정' },
          { key: 'users',    label: '👤 유저 관리' },
          { key: 'history',  label: '📋 베팅 기록' },
        ].map(t => (
          <button key={t.key} onClick={() => handleTabChange(t.key as any)} style={{
            padding: '14px 18px', border: 'none', background: 'transparent',
            color: tab === t.key ? '#f0c040' : '#888',
            fontWeight: tab === t.key ? 700 : 400, fontSize: 13, cursor: 'pointer', whiteSpace: 'nowrap',
            borderBottom: tab === t.key ? '2px solid #f0c040' : '2px solid transparent', marginBottom: -1,
          }}>{t.label}</button>
        ))}
      </div>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '2rem 1.5rem' }}>

        {/* ── 통계 ──────────────────────────────────── */}
        {tab === 'stats' && stats && (
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: '#e2e2e2', marginBottom: 20 }}>📊 전체 통계</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: 12, marginBottom: 24 }}>
              {[
                { label: '총 유저', value: stats.totalUsers?.toLocaleString() + '명', color: '#f0c040' },
                { label: '총 베팅액', value: stats.totalBet?.toLocaleString() + 'P', color: '#fb923c' },
                { label: '총 지급액', value: stats.totalPayout?.toLocaleString() + 'P', color: '#4ade80' },
                { label: '하우스 수익', value: stats.houseProfit?.toLocaleString() + 'P', color: stats.houseProfit >= 0 ? '#4ade80' : '#f87171' },
                { label: '오늘 베팅', value: stats.todayBet?.toLocaleString() + 'P', color: '#a78bfa' },
              ].map(s => (
                <div key={s.label} style={cardStyle}>
                  <p style={{ fontSize: 12, color: '#888', margin: '0 0 6px' }}>{s.label}</p>
                  <p style={{ fontSize: 22, fontWeight: 900, color: s.color, margin: 0 }}>{s.value}</p>
                </div>
              ))}
            </div>
            <div style={{ ...cardStyle, overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                <thead><tr style={{ borderBottom: '1px solid #2a2a3a' }}>
                  {['게임','게임수','총 베팅','총 지급','수익'].map(h => <th key={h} style={{ padding: '10px 12px', textAlign: 'left', color: '#888', fontWeight: 600 }}>{h}</th>)}
                </tr></thead>
                <tbody>
                  {stats.gameStats?.map((g: any) => {
                    const profit = g.total_bet - g.total_payout;
                    return (
                      <tr key={g.game} style={{ borderBottom: '1px solid #1e1e2e' }}>
                        <td style={{ padding: '10px 12px', color: '#e2e2e2', fontWeight: 600 }}>{GAME_NAMES[g.game] || g.game}</td>
                        <td style={{ padding: '10px 12px', color: '#888' }}>{g.count?.toLocaleString()}</td>
                        <td style={{ padding: '10px 12px', color: '#fb923c' }}>{g.total_bet?.toLocaleString()}P</td>
                        <td style={{ padding: '10px 12px', color: '#4ade80' }}>{g.total_payout?.toLocaleString()}P</td>
                        <td style={{ padding: '10px 12px', color: profit >= 0 ? '#4ade80' : '#f87171', fontWeight: 700 }}>{profit?.toLocaleString()}P</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── 게임 설정 ─────────────────────────────── */}
        {tab === 'settings' && (
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: '#e2e2e2', marginBottom: 8 }}>⚙️ 게임 설정</h2>
            <p style={{ color: '#888', fontSize: 13, marginBottom: 20 }}>하우스 엣지: 높을수록 하우스에 유리 (0.05 = 5%)</p>

            {/* 부스타빗 빠른 난이도 */}
            <div style={{ ...cardStyle, marginBottom: 16 }}>
              <p style={{ fontSize: 14, fontWeight: 700, color: '#e2e2e2', margin: '0 0 12px' }}>📈 부스타빗 난이도 빠른 설정</p>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                {[
                  { label: '😊 쉬움', he: 0.05, desc: '5%' },
                  { label: '😐 보통', he: 0.10, desc: '10%' },
                  { label: '😈 어려움', he: 0.15, desc: '15%' },
                  { label: '💀 지옥', he: 0.25, desc: '25%' },
                ].map(d => (
                  <button key={d.label} onClick={async () => {
                    await adminFetch('/admin/settings/crash', 'POST', { house_edge: d.he });
                    loadSettings(); showSave(`부스타빗 ${d.label} 적용!`);
                  }} style={{ padding: '10px 16px', borderRadius: 10, border: '1px solid #2a2a3a', background: '#0a0a0f', cursor: 'pointer', textAlign: 'left' as any }}>
                    <p style={{ fontSize: 13, fontWeight: 700, color: '#e2e2e2', margin: '0 0 2px' }}>{d.label}</p>
                    <p style={{ fontSize: 11, color: '#888', margin: 0 }}>{d.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {settings.map(s => (
                <div key={s.game} style={{ ...cardStyle, display: 'grid', gridTemplateColumns: '160px 1fr 1fr 1fr 130px', alignItems: 'center', gap: 14 }}>
                  <p style={{ fontSize: 14, fontWeight: 700, color: '#e2e2e2', margin: 0 }}>{GAME_NAMES[s.game] || s.game}</p>
                  <div>
                    <p style={{ fontSize: 11, color: '#888', margin: '0 0 4px' }}>하우스 엣지</p>
                    <input type="number" step="0.01" min="0" max="0.5" defaultValue={s.house_edge} id={`he_${s.game}`}
                      style={{ ...inputStyle, width: 80 }} />
                  </div>
                  <div>
                    <p style={{ fontSize: 11, color: '#888', margin: '0 0 4px' }}>최소 베팅</p>
                    <input type="number" step="100" defaultValue={s.min_bet} id={`min_${s.game}`}
                      style={{ ...inputStyle, width: 100 }} />
                  </div>
                  <div>
                    <p style={{ fontSize: 11, color: '#888', margin: '0 0 4px' }}>최대 베팅</p>
                    <input type="number" step="1000" defaultValue={s.max_bet} id={`max_${s.game}`}
                      style={{ ...inputStyle, width: 110 }} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <button onClick={() => {
                      const he  = (document.getElementById(`he_${s.game}`) as HTMLInputElement)?.value;
                      const min = (document.getElementById(`min_${s.game}`) as HTMLInputElement)?.value;
                      const max = (document.getElementById(`max_${s.game}`) as HTMLInputElement)?.value;
                      adminFetch(`/admin/settings/${s.game}`, 'POST', { house_edge: parseFloat(he), min_bet: parseInt(min), max_bet: parseInt(max) })
                        .then(() => { loadSettings(); showSave(`${GAME_NAMES[s.game]} 저장!`); });
                    }} style={{ padding: '7px 14px', borderRadius: 8, border: 'none', background: '#f0c040', color: '#000', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>저장</button>
                    <button onClick={async () => {
                      await adminFetch(`/admin/settings/${s.game}`, 'POST', { is_enabled: s.is_enabled ? 0 : 1 });
                      loadSettings();
                    }} style={{ padding: '5px 10px', borderRadius: 8, border: 'none', background: s.is_enabled ? '#0a2010' : '#200a0a', color: s.is_enabled ? '#4ade80' : '#f87171', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                      {s.is_enabled ? '✅ 활성' : '❌ 비활성'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── 룰렛 배당 ─────────────────────────────── */}
        {tab === 'roulette' && (
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: '#e2e2e2', marginBottom: 8 }}>🎡 룰렛 배당 설정</h2>
            <p style={{ color: '#888', fontSize: 13, marginBottom: 20 }}>각 베팅 종류별 배당을 개별 조정할 수 있어요. 예: 1.95 = 베팅액의 1.95배 지급</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {roulettePayouts.map(p => (
                <div key={`${p.bet_type}_${p.bet_value}`} style={{ ...cardStyle, display: 'flex', alignItems: 'center', gap: 16 }}>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 14, fontWeight: 700, color: '#e2e2e2', margin: '0 0 2px' }}>{p.label}</p>
                    <p style={{ fontSize: 11, color: '#555', margin: 0 }}>{p.bet_type} / {p.bet_value}</p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div>
                      <p style={{ fontSize: 11, color: '#888', margin: '0 0 4px' }}>배당 배수</p>
                      <input type="number" step="0.05" min="1" defaultValue={p.multiplier} id={`payout_${p.bet_type}_${p.bet_value}`}
                        style={{ ...inputStyle, width: 90 }} />
                    </div>
                    <div>
                      <p style={{ fontSize: 11, color: '#888', margin: '0 0 4px' }}>현재</p>
                      <p style={{ fontSize: 16, fontWeight: 800, color: '#f0c040', margin: 0 }}>{p.multiplier}x</p>
                    </div>
                    <button onClick={async () => {
                      const val = (document.getElementById(`payout_${p.bet_type}_${p.bet_value}`) as HTMLInputElement)?.value;
                      await adminFetch('/admin/roulette-payouts', 'POST', { bet_type: p.bet_type, bet_value: p.bet_value, multiplier: parseFloat(val) });
                      loadRoulette(); showSave(`${p.label} 배당 저장!`);
                    }} style={{ padding: '8px 18px', borderRadius: 8, border: 'none', background: '#f0c040', color: '#000', fontWeight: 700, fontSize: 13, cursor: 'pointer', marginTop: 16 }}>저장</button>
                  </div>
                </div>
              ))}
            </div>

            {/* 빠른 설정 */}
            <div style={{ ...cardStyle, marginTop: 16 }}>
              <p style={{ fontSize: 14, fontWeight: 700, color: '#e2e2e2', margin: '0 0 12px' }}>빠른 배당 설정</p>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                {[
                  { label: '🎰 실제 카지노', values: [1.95, 1.95, 35, 1.95, 1.95, 1.95, 1.95, 35] },
                  { label: '💰 후한 배당', values: [2.0, 2.0, 36, 2.0, 2.0, 2.0, 2.0, 36] },
                  { label: '😈 박한 배당', values: [1.8, 1.8, 30, 1.8, 1.8, 1.8, 1.8, 30] },
                ].map(preset => (
                  <button key={preset.label} onClick={async () => {
                    for (let i = 0; i < roulettePayouts.length; i++) {
                      const p = roulettePayouts[i];
                      await adminFetch('/admin/roulette-payouts', 'POST', { bet_type: p.bet_type, bet_value: p.bet_value, multiplier: preset.values[i] || 1.95 });
                    }
                    loadRoulette(); showSave(`${preset.label} 적용!`);
                  }} style={{ padding: '10px 18px', borderRadius: 10, border: '1px solid #2a2a3a', background: '#0a0a0f', color: '#e2e2e2', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── 봇 설정 ───────────────────────────────── */}
        {tab === 'bot' && (
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: '#e2e2e2', marginBottom: 8 }}>🤖 봇 설정</h2>
            <p style={{ color: '#888', fontSize: 13, marginBottom: 20 }}>디스코드 봇 동작 방식을 설정합니다</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {botSettings.map(s => (
                <div key={s.key} style={{ ...cardStyle, display: 'flex', alignItems: 'center', gap: 16 }}>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 14, fontWeight: 700, color: '#e2e2e2', margin: '0 0 2px' }}>{s.description || s.key}</p>
                    <p style={{ fontSize: 11, color: '#555', margin: 0 }}>키: {s.key}</p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    {/* 불리언 설정은 토글, 나머지는 인풋 */}
                    {s.value === 'true' || s.value === 'false' ? (
                      <button onClick={async () => {
                        const newVal = s.value === 'true' ? 'false' : 'true';
                        await adminFetch('/admin/bot-settings', 'POST', { key: s.key, value: newVal });
                        loadBotSettings(); showSave(`${s.description} 변경!`);
                      }} style={{ padding: '8px 20px', borderRadius: 8, border: 'none', background: s.value === 'true' ? '#0a2010' : '#200a0a', color: s.value === 'true' ? '#4ade80' : '#f87171', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
                        {s.value === 'true' ? '✅ 활성화' : '❌ 비활성화'}
                      </button>
                    ) : (
                      <>
                        <div>
                          <p style={{ fontSize: 11, color: '#888', margin: '0 0 4px' }}>현재값</p>
                          <input type={s.key.includes('url') ? 'text' : 'number'} defaultValue={s.value} id={`bot_${s.key}`}
                            style={{ ...inputStyle, width: s.key.includes('url') ? 240 : 100 }} />
                        </div>
                        <button onClick={async () => {
                          const val = (document.getElementById(`bot_${s.key}`) as HTMLInputElement)?.value;
                          await adminFetch('/admin/bot-settings', 'POST', { key: s.key, value: val });
                          loadBotSettings(); showSave(`${s.description} 저장!`);
                        }} style={{ padding: '8px 18px', borderRadius: 8, border: 'none', background: '#f0c040', color: '#000', fontWeight: 700, fontSize: 13, cursor: 'pointer', marginTop: 16 }}>저장</button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── 유저 관리 ─────────────────────────────── */}
        {tab === 'users' && (
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: '#e2e2e2', marginBottom: 16 }}>👤 유저 관리</h2>
            <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
              <input value={userSearch} onChange={e => setUserSearch(e.target.value)} placeholder="유저명 또는 디스코드 ID 검색..."
                onKeyDown={e => e.key === 'Enter' && loadUsers(userSearch)}
                style={{ flex: 1, ...inputStyle, padding: '10px 14px' }} />
              <button onClick={() => loadUsers(userSearch)} style={{ padding: '10px 20px', borderRadius: 8, border: 'none', background: '#f0c040', color: '#000', fontWeight: 700, cursor: 'pointer' }}>검색</button>
            </div>

            {/* 포인트 수정 모달 */}
            {editingUser && (
              <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
                <div style={{ ...cardStyle, width: 380, padding: '1.5rem' }}>
                  <h3 style={{ fontSize: 18, fontWeight: 800, color: '#e2e2e2', margin: '0 0 16px' }}>💰 {editingUser.username} 포인트 수정</h3>
                  <p style={{ fontSize: 13, color: '#888', margin: '0 0 12px' }}>현재: <b style={{ color: '#f0c040' }}>{editingUser.points.toLocaleString()}P</b></p>
                  <input type="number" value={pointAmount} onChange={e => setPointAmount(e.target.value)} placeholder="+ 지급 / - 차감"
                    style={{ ...inputStyle, width: '100%', padding: 10, boxSizing: 'border-box' as any, marginBottom: 10, color: '#f0c040', fontSize: 16, fontWeight: 700 }} />
                  <input value={pointMemo} onChange={e => setPointMemo(e.target.value)} placeholder="메모 (사유)"
                    style={{ ...inputStyle, width: '100%', padding: 10, boxSizing: 'border-box' as any, marginBottom: 12 }} />
                  <div style={{ display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap' }}>
                    {[1000,5000,10000,50000,100000].map(a => (
                      <button key={a} onClick={() => setPointAmount(String(a))} style={{ padding: '5px 10px', borderRadius: 6, border: '1px solid #2a2a3a', background: '#0a0a0f', color: '#f0c040', fontSize: 12, cursor: 'pointer' }}>+{(a/1000)}K</button>
                    ))}
                    {[1000,5000,10000].map(a => (
                      <button key={-a} onClick={() => setPointAmount(String(-a))} style={{ padding: '5px 10px', borderRadius: 6, border: '1px solid #2a2a3a', background: '#0a0a0f', color: '#f87171', fontSize: 12, cursor: 'pointer' }}>-{(a/1000)}K</button>
                    ))}
                  </div>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <button onClick={() => { setEditingUser(null); setPointAmount(''); setPointMemo(''); }}
                      style={{ flex: 1, padding: 10, borderRadius: 8, border: '1px solid #2a2a3a', background: 'transparent', color: '#888', cursor: 'pointer' }}>취소</button>
                    <button onClick={async () => {
                      setLoading(true);
                      await adminFetch(`/admin/users/${editingUser.id}/points`, 'POST', { amount: parseInt(pointAmount), memo: pointMemo || '관리자 수정' });
                      setLoading(false); setEditingUser(null); setPointAmount(''); setPointMemo('');
                      loadUsers(userSearch); showSave('포인트 수정 완료!');
                    }} disabled={!pointAmount || loading}
                      style={{ flex: 2, padding: 10, borderRadius: 8, border: 'none', background: '#f0c040', color: '#000', fontWeight: 900, cursor: 'pointer' }}>
                      {loading ? '처리 중...' : '적용'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div style={{ ...cardStyle, overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                <thead><tr style={{ borderBottom: '1px solid #2a2a3a' }}>
                  {['유저','포인트','총 베팅','총 획득','상태','액션'].map(h => <th key={h} style={{ padding: '10px 12px', textAlign: 'left', color: '#888', fontWeight: 600 }}>{h}</th>)}
                </tr></thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u.id} style={{ borderBottom: '1px solid #1e1e2e' }}>
                      <td style={{ padding: '10px 12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          {u.avatar && <img src={`https://cdn.discordapp.com/avatars/${u.discord_id}/${u.avatar}.png`} style={{ width: 28, height: 28, borderRadius: '50%' }} onError={e => (e.currentTarget.style.display='none')} alt="" />}
                          <div>
                            <p style={{ fontSize: 13, fontWeight: 600, color: '#e2e2e2', margin: 0 }}>{u.username}</p>
                            <p style={{ fontSize: 11, color: '#555', margin: 0 }}>#{u.id}</p>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '10px 12px', color: '#f0c040', fontWeight: 700 }}>{u.points?.toLocaleString()}P</td>
                      <td style={{ padding: '10px 12px', color: '#888' }}>{u.total_bet?.toLocaleString()}P</td>
                      <td style={{ padding: '10px 12px', color: '#4ade80' }}>{u.total_win?.toLocaleString()}P</td>
                      <td style={{ padding: '10px 12px' }}>
                        <span style={{ background: u.is_banned ? '#200a0a' : '#0a2010', color: u.is_banned ? '#f87171' : '#4ade80', padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 700 }}>
                          {u.is_banned ? '정지' : '정상'}
                        </span>
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button onClick={() => { setEditingUser(u); setPointAmount(''); setPointMemo(''); }}
                            style={{ padding: '5px 12px', borderRadius: 6, border: 'none', background: '#2a2010', color: '#f0c040', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>💰</button>
                          <button onClick={async () => { await adminFetch(`/admin/users/${u.id}/ban`, 'POST'); loadUsers(userSearch); }}
                            style={{ padding: '5px 12px', borderRadius: 6, border: 'none', background: u.is_banned ? '#0a2010' : '#200a0a', color: u.is_banned ? '#4ade80' : '#f87171', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                            {u.is_banned ? '해제' : '정지'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── 베팅 기록 ─────────────────────────────── */}
        {tab === 'history' && (
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: '#e2e2e2', marginBottom: 16 }}>📋 베팅 기록</h2>
            <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
              {['', ...Object.keys(GAME_NAMES)].map(g => (
                <button key={g} onClick={() => { setHistoryGame(g); loadHistory(g); }} style={{
                  padding: '6px 12px', borderRadius: 8, border: '1px solid #2a2a3a',
                  background: historyGame === g ? '#2a2010' : '#13131c',
                  color: historyGame === g ? '#f0c040' : '#888',
                  fontSize: 12, cursor: 'pointer', fontWeight: historyGame === g ? 700 : 400
                }}>{g ? GAME_NAMES[g] : '전체'}</button>
              ))}
            </div>
            <div style={{ ...cardStyle, overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead><tr style={{ borderBottom: '1px solid #2a2a3a' }}>
                  {['유저','게임','베팅','결과','지급','시간'].map(h => <th key={h} style={{ padding: '10px 12px', textAlign: 'left', color: '#888', fontWeight: 600 }}>{h}</th>)}
                </tr></thead>
                <tbody>
                  {history.map((h: any) => (
                    <tr key={h.id} style={{ borderBottom: '1px solid #1e1e2e' }}>
                      <td style={{ padding: '8px 12px', color: '#e2e2e2' }}>{h.username}</td>
                      <td style={{ padding: '8px 12px', color: '#888' }}>{GAME_NAMES[h.game] || h.game}</td>
                      <td style={{ padding: '8px 12px', color: '#fb923c' }}>{h.bet_amount?.toLocaleString()}P</td>
                      <td style={{ padding: '8px 12px' }}>
                        <span style={{ background: h.result === 'win' ? '#0a2010' : '#200a0a', color: h.result === 'win' ? '#4ade80' : '#f87171', padding: '2px 8px', borderRadius: 6, fontSize: 12, fontWeight: 700 }}>
                          {h.result === 'win' ? '승' : '패'}
                        </span>
                      </td>
                      <td style={{ padding: '8px 12px', color: h.payout > 0 ? '#4ade80' : '#888', fontWeight: h.payout > 0 ? 700 : 400 }}>
                        {h.payout > 0 ? '+' : ''}{h.payout?.toLocaleString()}P
                      </td>
                      <td style={{ padding: '8px 12px', color: '#555', fontSize: 12 }}>
                        {new Date(h.created_at).toLocaleString('ko-KR', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
