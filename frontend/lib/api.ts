import axios from 'axios';
import Cookies from 'js-cookie';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

const api = axios.create({ baseURL: API_URL });

api.interceptors.request.use(config => {
  const token = Cookies.get('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401) {
      Cookies.remove('token');
      window.location.href = '/';
    }
    return Promise.reject(err);
  }
);

export default api;

// ── 인증 ────────────────────────────────────────────────
export const getMe = () => api.get('/auth/me').then(r => r.data);

// ── 게임 ────────────────────────────────────────────────
export const playCoinflip  = (bet: number, choice: string) => api.post('/game/coinflip', { bet, choice }).then(r => r.data);
export const playDice      = (bet: number, target: number, direction: string) => api.post('/game/dice', { bet, target, direction }).then(r => r.data);
export const playBaccarat  = (bet: number, choice: string) => api.post('/game/baccarat', { bet, choice }).then(r => r.data);
export const playPlinko    = (bet: number, rows: number, risk: string) => api.post('/game/plinko', { bet, rows, risk }).then(r => r.data);
export const playCrash     = (bet: number, cashoutAt: number) => api.post('/game/crash', { bet, cashoutAt }).then(r => r.data);
export const playRoulette  = (bet: number, betType: string, betValue: string) => api.post('/game/roulette', { bet, betType, betValue }).then(r => r.data);
export const playLadder    = (bet: number, choice: string) => api.post('/game/ladder', { bet, choice }).then(r => r.data);
export const playOddEven   = (bet: number, choice: string) => api.post('/game/oddeven', { bet, choice }).then(r => r.data);
export const bjDeal        = (bet: number) => api.post('/game/blackjack/deal', { bet }).then(r => r.data);
export const bjAction      = (action: string) => api.post('/game/blackjack/action', { action }).then(r => r.data);

// ── 기록/랭킹 ───────────────────────────────────────────
export const getHistory     = (page = 1, game?: string) => api.get('/game/history', { params: { page, game } }).then(r => r.data);
export const getLeaderboard = () => api.get('/game/leaderboard').then(r => r.data);

// ── 관리자 ──────────────────────────────────────────────
export const adminLogin    = (username: string, password: string) => api.post('/admin/login', { username, password }).then(r => r.data);
export const adminGetUsers = (search?: string, page = 1) => api.get('/admin/users', { params: { search, page }, headers: { Authorization: `Bearer ${Cookies.get('adminToken')}` } }).then(r => r.data);
export const adminAddPoints = (id: number, amount: number, memo: string) => api.post(`/admin/users/${id}/points`, { amount, memo }, { headers: { Authorization: `Bearer ${Cookies.get('adminToken')}` } }).then(r => r.data);
export const adminBanUser  = (id: number) => api.post(`/admin/users/${id}/ban`, {}, { headers: { Authorization: `Bearer ${Cookies.get('adminToken')}` } }).then(r => r.data);
export const adminGetSettings = () => api.get('/admin/settings', { headers: { Authorization: `Bearer ${Cookies.get('adminToken')}` } }).then(r => r.data);
export const adminUpdateSetting = (game: string, data: any) => api.post(`/admin/settings/${game}`, data, { headers: { Authorization: `Bearer ${Cookies.get('adminToken')}` } }).then(r => r.data);
export const adminGetStats = () => api.get('/admin/stats', { headers: { Authorization: `Bearer ${Cookies.get('adminToken')}` } }).then(r => r.data);
export const adminGetHistory = (page = 1, game?: string) => api.get('/admin/history', { params: { page, game }, headers: { Authorization: `Bearer ${Cookies.get('adminToken')}` } }).then(r => r.data);
