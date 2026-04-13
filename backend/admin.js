const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('./database');
require('dotenv').config();

function requireAdmin(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: '관리자 로그인 필요' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!decoded.isAdmin) return res.status(403).json({ error: '권한 없음' });
    req.adminName = decoded.username;
    next();
  } catch {
    res.status(401).json({ error: '토큰 만료' });
  }
}

// ─── 관리자 등록 ───────────────────────────────────────────
router.post('/register', async (req, res) => {
  try {
    const { username, password, secret } = req.body;
    if (secret !== process.env.ADMIN_SECRET) return res.status(403).json({ error: '시크릿 코드 틀림' });
    const existing = db.prepare('SELECT * FROM admins WHERE username = ?').get(username);
    if (existing) return res.status(400).json({ error: '이미 존재하는 계정' });
    const hashed = await bcrypt.hash(password, 10);
    db.prepare('INSERT INTO admins (username, password) VALUES (?, ?)').run(username, hashed);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── 관리자 로그인 ─────────────────────────────────────────
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const admin = db.prepare('SELECT * FROM admins WHERE username = ?').get(username);
    if (!admin) return res.status(401).json({ error: '계정 없음' });
    const valid = await bcrypt.compare(password, admin.password);
    if (!valid) return res.status(401).json({ error: '비밀번호 틀림' });
    const token = jwt.sign({ username, isAdmin: true }, process.env.JWT_SECRET, { expiresIn: '1d' });
    res.json({ token });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── 유저 목록 ─────────────────────────────────────────────
router.get('/users', requireAdmin, (req, res) => {
  const { search, page = 1 } = req.query;
  const limit = 30, offset = (page - 1) * limit;
  let query = 'SELECT * FROM users';
  const params = [];
  if (search) { query += ' WHERE username LIKE ? OR discord_id LIKE ?'; params.push(`%${search}%`, `%${search}%`); }
  query += ' ORDER BY points DESC LIMIT ? OFFSET ?';
  params.push(limit, offset);
  res.json(db.prepare(query).all(...params));
});

// ─── 유저 포인트 수정 ──────────────────────────────────────
router.post('/users/:id/points', requireAdmin, (req, res) => {
  try {
    const { amount, memo } = req.body;
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
    if (!user) return res.status(404).json({ error: '유저 없음' });
    const newPoints = user.points + parseInt(amount);
    if (newPoints < 0) return res.status(400).json({ error: '포인트가 0 미만이 될 수 없음' });
    db.prepare('UPDATE users SET points = ? WHERE id = ?').run(newPoints, user.id);
    db.prepare('INSERT INTO point_logs (user_id, amount, type, memo, admin) VALUES (?, ?, ?, ?, ?)')
      .run(user.id, amount, amount > 0 ? 'admin_add' : 'admin_deduct', memo || '', req.adminName);
    res.json({ success: true, newPoints });
  } catch (e) { res.status(400).json({ error: e.message }); }
});

// ─── 유저 정지/해제 ────────────────────────────────────────
router.post('/users/:id/ban', requireAdmin, (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
  if (!user) return res.status(404).json({ error: '유저 없음' });
  const newBan = user.is_banned ? 0 : 1;
  db.prepare('UPDATE users SET is_banned = ? WHERE id = ?').run(newBan, user.id);
  res.json({ success: true, is_banned: newBan });
});

// ─── 게임 설정 조회 ────────────────────────────────────────
router.get('/settings', requireAdmin, (req, res) => {
  res.json(db.prepare('SELECT * FROM game_settings').all());
});

// ─── 게임 설정 변경 ────────────────────────────────────────
router.post('/settings/:game', requireAdmin, (req, res) => {
  try {
    const { house_edge, min_bet, max_bet, is_enabled } = req.body;
    const existing = db.prepare('SELECT * FROM game_settings WHERE game = ?').get(req.params.game);
    if (!existing) return res.status(404).json({ error: '게임 없음' });
    db.prepare(`UPDATE game_settings SET
      house_edge = COALESCE(?, house_edge),
      min_bet = COALESCE(?, min_bet),
      max_bet = COALESCE(?, max_bet),
      is_enabled = COALESCE(?, is_enabled)
      WHERE game = ?`)
      .run(house_edge ?? null, min_bet ?? null, max_bet ?? null, is_enabled ?? null, req.params.game);
    res.json({ success: true });
  } catch (e) { res.status(400).json({ error: e.message }); }
});

// ─── 룰렛 배당 조회 ────────────────────────────────────────
router.get('/roulette-payouts', requireAdmin, (req, res) => {
  res.json(db.prepare('SELECT * FROM roulette_payouts ORDER BY bet_type, bet_value').all());
});

// ─── 룰렛 배당 변경 ────────────────────────────────────────
router.post('/roulette-payouts', requireAdmin, (req, res) => {
  try {
    const { bet_type, bet_value, multiplier } = req.body;
    if (!bet_type || !bet_value || !multiplier) return res.status(400).json({ error: '필수값 누락' });
    db.prepare('UPDATE roulette_payouts SET multiplier = ? WHERE bet_type = ? AND bet_value = ?')
      .run(parseFloat(multiplier), bet_type, bet_value);
    res.json({ success: true });
  } catch (e) { res.status(400).json({ error: e.message }); }
});

// ─── 봇 설정 조회 ──────────────────────────────────────────
router.get('/bot-settings', requireAdmin, (req, res) => {
  res.json(db.prepare('SELECT * FROM bot_settings').all());
});

// ─── 봇 설정 변경 ──────────────────────────────────────────
router.post('/bot-settings', requireAdmin, (req, res) => {
  try {
    const { key, value } = req.body;
    if (!key || value === undefined) return res.status(400).json({ error: '필수값 누락' });
    db.prepare('INSERT OR REPLACE INTO bot_settings (key, value, description) VALUES (?, ?, (SELECT description FROM bot_settings WHERE key = ?))')
      .run(key, String(value), key);
    res.json({ success: true });
  } catch (e) { res.status(400).json({ error: e.message }); }
});

// ─── 봇 설정 단일 조회 (봇에서 사용) ──────────────────────
router.get('/bot-settings/:key', (req, res) => {
  const setting = db.prepare('SELECT * FROM bot_settings WHERE key = ?').get(req.params.key);
  if (!setting) return res.status(404).json({ error: '설정 없음' });
  res.json(setting);
});

// ─── 전체 베팅 기록 ────────────────────────────────────────
router.get('/history', requireAdmin, (req, res) => {
  const { page = 1, game, user_id } = req.query;
  const limit = 30, offset = (page - 1) * limit;
  let query = `SELECT gh.*, u.username FROM game_history gh JOIN users u ON gh.user_id = u.id WHERE 1=1`;
  const params = [];
  if (game) { query += ' AND gh.game = ?'; params.push(game); }
  if (user_id) { query += ' AND gh.user_id = ?'; params.push(user_id); }
  query += ' ORDER BY gh.created_at DESC LIMIT ? OFFSET ?';
  params.push(limit, offset);
  res.json(db.prepare(query).all(...params));
});

// ─── 통계 ──────────────────────────────────────────────────
router.get('/stats', requireAdmin, (req, res) => {
  const totalUsers    = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
  const totalBet      = db.prepare('SELECT SUM(bet_amount) as total FROM game_history').get().total || 0;
  const totalPayout   = db.prepare('SELECT SUM(payout) as total FROM game_history').get().total || 0;
  const todayBet      = db.prepare(`SELECT SUM(bet_amount) as total FROM game_history WHERE date(created_at) = date('now')`).get().total || 0;
  const gameStats     = db.prepare(`SELECT game, COUNT(*) as count, SUM(bet_amount) as total_bet, SUM(payout) as total_payout FROM game_history GROUP BY game`).all();
  res.json({ totalUsers, totalBet, totalPayout, todayBet, houseProfit: totalBet - totalPayout, gameStats });
});

// ─── 포인트 지급 내역 ──────────────────────────────────────
router.get('/point-logs', requireAdmin, (req, res) => {
  const logs = db.prepare(`SELECT pl.*, u.username FROM point_logs pl JOIN users u ON pl.user_id = u.id ORDER BY pl.created_at DESC LIMIT 100`).all();
  res.json(logs);
});

module.exports = router;
