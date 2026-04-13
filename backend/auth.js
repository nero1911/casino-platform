const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const db = require('./database');
require('dotenv').config();

const {
  DISCORD_CLIENT_ID,
  DISCORD_CLIENT_SECRET,
  DISCORD_REDIRECT_URI,
  JWT_SECRET,
  FRONTEND_URL
} = process.env;

// 디스코드 로그인 시작
router.get('/discord', (req, res) => {
  const params = new URLSearchParams({
    client_id: DISCORD_CLIENT_ID,
    redirect_uri: DISCORD_REDIRECT_URI,
    response_type: 'code',
    scope: 'identify'
  });
  res.redirect(`https://discord.com/api/oauth2/authorize?${params}`);
});

// 디스코드 콜백
router.get('/discord/callback', async (req, res) => {
  const { code } = req.query;
  if (!code) return res.redirect(`${FRONTEND_URL}?error=no_code`);

  try {
    // 토큰 교환
    const tokenRes = await fetch('https://discord.com/api/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: DISCORD_CLIENT_ID,
        client_secret: DISCORD_CLIENT_SECRET,
        grant_type: 'authorization_code',
        code,
        redirect_uri: DISCORD_REDIRECT_URI
      })
    });
    const tokenData = await tokenRes.json();

    if (!tokenData.access_token) {
      console.error('Token error:', tokenData);
      return res.redirect(`${FRONTEND_URL}?error=token_failed`);
    }

    // 유저 정보 가져오기
    const userRes = await fetch('https://discord.com/api/users/@me', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` }
    });
    const discordUser = await userRes.json();

    // DB에 유저 저장 또는 업데이트
    const existing = db.prepare('SELECT * FROM users WHERE discord_id = ?').get(discordUser.id);

    if (!existing) {
      db.prepare(`
        INSERT INTO users (discord_id, username, avatar, points)
        VALUES (?, ?, ?, 1000)
      `).run(discordUser.id, discordUser.username, discordUser.avatar);
    } else {
      db.prepare(`
        UPDATE users SET username = ?, avatar = ? WHERE discord_id = ?
      `).run(discordUser.username, discordUser.avatar, discordUser.id);
    }

    const user = db.prepare('SELECT * FROM users WHERE discord_id = ?').get(discordUser.id);

    if (user.is_banned) {
      return res.redirect(`${FRONTEND_URL}?error=banned`);
    }

    // JWT 발급
    const token = jwt.sign(
      { userId: user.id, discordId: user.discord_id, username: user.username },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.redirect(`${FRONTEND_URL}/auth/callback?token=${token}`);
  } catch (err) {
    console.error('Auth error:', err);
    res.redirect(`${FRONTEND_URL}?error=auth_failed`);
  }
});

// 내 정보 조회
router.get('/me', requireAuth, (req, res) => {
  const user = db.prepare('SELECT id, discord_id, username, avatar, points, total_bet, total_win, created_at FROM users WHERE id = ?').get(req.userId);
  if (!user) return res.status(404).json({ error: '유저 없음' });
  res.json(user);
});

function requireAuth(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: '로그인 필요' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.userId;
    next();
  } catch {
    res.status(401).json({ error: '토큰 만료' });
  }
}

module.exports = { router, requireAuth };
