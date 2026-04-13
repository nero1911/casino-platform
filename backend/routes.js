const express = require('express');
const router = express.Router();
const db = require('./database');
const games = require('./games');
const { requireAuth } = require('./auth');

// ─── 미들웨어: 포인트 검증 ─────────────────────────────────
function deductAndRecord(userId, betAmount, gameName, gameResult) {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
  if (!user) throw new Error('유저 없음');
  if (user.points < betAmount) throw new Error('포인트 부족');
  if (user.is_banned) throw new Error('정지된 계정');

  const setting = db.prepare('SELECT * FROM game_settings WHERE game = ?').get(gameName);
  if (setting && !setting.is_enabled) throw new Error('비활성화된 게임');
  if (setting && betAmount < setting.min_bet) throw new Error(`최소 베팅: ${setting.min_bet}`);
  if (setting && betAmount > setting.max_bet) throw new Error(`최대 베팅: ${setting.max_bet}`);

  const payout = Math.floor(betAmount * gameResult.multiplier);
  const newPoints = user.points - betAmount + payout;

  db.prepare('UPDATE users SET points = ?, total_bet = total_bet + ?, total_win = total_win + ? WHERE id = ?')
    .run(newPoints, betAmount, payout, userId);

  db.prepare(`INSERT INTO game_history (user_id, game, bet_amount, result, payout, detail)
    VALUES (?, ?, ?, ?, ?, ?)`)
    .run(userId, gameName, betAmount, gameResult.win ? 'win' : 'lose', payout, JSON.stringify(gameResult.detail));

  return { ...gameResult, payout, newPoints };
}

// ─── 코인플립 ──────────────────────────────────────────────
router.post('/coinflip', requireAuth, (req, res) => {
  try {
    const { bet, choice } = req.body;
    if (!['heads','tails'].includes(choice)) return res.status(400).json({ error: '선택: heads 또는 tails' });
    const result = games.playCoinflip(choice);
    const final = deductAndRecord(req.userId, bet, 'coinflip', result);
    res.json(final);
  } catch (e) { res.status(400).json({ error: e.message }); }
});

// ─── 주사위 ───────────────────────────────────────────────
router.post('/dice', requireAuth, (req, res) => {
  try {
    const { bet, target, direction } = req.body;
    if (!['over','under'].includes(direction)) return res.status(400).json({ error: '방향: over 또는 under' });
    if (target < 2 || target > 98) return res.status(400).json({ error: '목표: 2~98' });
    const result = games.playDice(target, direction);
    const final = deductAndRecord(req.userId, bet, 'dice', result);
    res.json(final);
  } catch (e) { res.status(400).json({ error: e.message }); }
});

// ─── 바카라 ───────────────────────────────────────────────
router.post('/baccarat', requireAuth, (req, res) => {
  try {
    const { bet, choice } = req.body;
    if (!['player','banker','tie'].includes(choice)) return res.status(400).json({ error: '선택: player, banker, tie' });
    const result = games.playBaccarat(choice);
    const final = deductAndRecord(req.userId, bet, 'baccarat', result);
    res.json(final);
  } catch (e) { res.status(400).json({ error: e.message }); }
});

// ─── 플링코 ───────────────────────────────────────────────
router.post('/plinko', requireAuth, (req, res) => {
  try {
    const { bet, rows, risk } = req.body;
    const result = games.playPlinko(rows || 8, risk || 'medium');
    const final = deductAndRecord(req.userId, bet, 'plinko', result);
    res.json(final);
  } catch (e) { res.status(400).json({ error: e.message }); }
});

// ─── 크래시 (부스타빗) ────────────────────────────────────
router.post('/crash', requireAuth, (req, res) => {
  try {
    const { bet, cashoutAt } = req.body;
    if (cashoutAt < 1.01) return res.status(400).json({ error: '최소 캐시아웃: 1.01' });
    const setting = db.prepare('SELECT * FROM game_settings WHERE game = ?').get('crash');
    const result = games.playCrash(cashoutAt, setting?.house_edge || 0.05);
    const final = deductAndRecord(req.userId, bet, 'crash', result);
    res.json(final);
  } catch (e) { res.status(400).json({ error: e.message }); }
});

// ─── 블랙잭 ───────────────────────────────────────────────
const blackjackSessions = new Map();

router.post('/blackjack/deal', requireAuth, (req, res) => {
  try {
    const { bet } = req.body;
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.userId);
    if (user.points < bet) return res.status(400).json({ error: '포인트 부족' });
    const state = games.playBlackjack('deal');
    blackjackSessions.set(req.userId, { ...state, bet });
    if (state.state === 'finished') {
      const final = deductAndRecord(req.userId, bet, 'blackjack', state);
      blackjackSessions.delete(req.userId);
      return res.json(final);
    }
    res.json({ ...state, bet });
  } catch (e) { res.status(400).json({ error: e.message }); }
});

router.post('/blackjack/action', requireAuth, (req, res) => {
  try {
    const { action } = req.body;
    const session = blackjackSessions.get(req.userId);
    if (!session) return res.status(400).json({ error: '진행 중인 게임 없음. /deal 먼저 하세요' });
    const state = games.playBlackjack(action, session);
    blackjackSessions.set(req.userId, { ...state, bet: session.bet });
    if (state.state === 'finished') {
      const final = deductAndRecord(req.userId, session.bet, 'blackjack', state);
      blackjackSessions.delete(req.userId);
      return res.json(final);
    }
    res.json({ ...state, bet: session.bet });
  } catch (e) { res.status(400).json({ error: e.message }); }
});

// ─── 룰렛 ─────────────────────────────────────────────────
router.post('/roulette', requireAuth, (req, res) => {
  try {
    const { bet, betType, betValue } = req.body;
    const result = games.playRoulette(betType, betValue);
    const final = deductAndRecord(req.userId, bet, 'roulette', result);
    res.json(final);
  } catch (e) { res.status(400).json({ error: e.message }); }
});

// ─── 사다리 ───────────────────────────────────────────────
router.post('/ladder', requireAuth, (req, res) => {
  try {
    const { bet, choice } = req.body;
    if (!['left','right'].includes(choice)) return res.status(400).json({ error: '선택: left 또는 right' });
    const result = games.playLadder(choice);
    const final = deductAndRecord(req.userId, bet, 'ladder', result);
    res.json(final);
  } catch (e) { res.status(400).json({ error: e.message }); }
});

// ─── 홀짝 ─────────────────────────────────────────────────
router.post('/oddeven', requireAuth, (req, res) => {
  try {
    const { bet, choice } = req.body;
    if (!['odd','even'].includes(choice)) return res.status(400).json({ error: '선택: odd 또는 even' });
    const result = games.playOddEven(choice);
    const final = deductAndRecord(req.userId, bet, 'oddeven', result);
    res.json(final);
  } catch (e) { res.status(400).json({ error: e.message }); }
});

// ─── 유저 베팅 기록 ───────────────────────────────────────
router.get('/history', requireAuth, (req, res) => {
  const { page = 1, game } = req.query;
  const limit = 20;
  const offset = (page - 1) * limit;
  let query = 'SELECT * FROM game_history WHERE user_id = ?';
  const params = [req.userId];
  if (game) { query += ' AND game = ?'; params.push(game); }
  query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
  params.push(limit, offset);
  const history = db.prepare(query).all(...params);
  res.json(history);
});

// ─── 랭킹 ─────────────────────────────────────────────────
router.get('/leaderboard', (req, res) => {
  const top = db.prepare('SELECT id, username, avatar, points, total_bet, total_win FROM users ORDER BY points DESC LIMIT 20').all();
  res.json(top);
});

module.exports = router;
