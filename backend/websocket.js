const { WebSocketServer, WebSocket } = require('ws');
const jwt = require('jsonwebtoken');
const db = require('./database');
const { generateCrashPoint } = require('./games');
require('dotenv').config();

const clients = new Map();

const liveBets = {
  coinflip: [], dice: [], baccarat: [], plinko: [],
  roulette: [], ladder: [], oddeven: [], blackjack: [],
};

const crashState = {
  phase: 'waiting',
  crashPoint: 1.0,
  startTime: null,
  bets: [],
  countdown: 10,
  history: [],
};

const baccaratState = {
  phase: 'betting',
  bets: [],
  countdown: 15,
  result: null,
  history: [],
};

const holdemRooms = new Map();

function broadcast(data, filter = null) {
  const msg = JSON.stringify(data);
  clients.forEach((info, ws) => {
    if (ws.readyState !== WebSocket.OPEN) return;
    if (filter && !filter(info)) return;
    ws.send(msg);
  });
}

function sendTo(ws, data) {
  if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(data));
}

function initWebSocket(server) {
  const wss = new WebSocketServer({ server });

  wss.on('connection', (ws, req) => {
    const url = new URL(req.url, 'http://localhost');
    const token = url.searchParams.get('token');
    let userInfo = null;

    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = db.prepare('SELECT * FROM users WHERE id = ?').get(decoded.userId);
        if (user && !user.is_banned) {
          // discord_id 포함해서 저장
          userInfo = {
            userId: user.id,
            discordId: user.discord_id,
            username: user.username,
            avatar: user.avatar,
            points: user.points
          };
          clients.set(ws, userInfo);
        }
      } catch {}
    }

    if (!userInfo) {
      clients.set(ws, { userId: null, username: 'guest' });
    }

    sendTo(ws, {
      type: 'init',
      crash: { phase: crashState.phase, countdown: crashState.countdown, bets: crashState.bets, history: crashState.history },
      baccarat: { phase: baccaratState.phase, countdown: baccaratState.countdown, bets: baccaratState.bets, history: baccaratState.history },
      liveBets
    });

    ws.on('message', raw => {
      let msg;
      try { msg = JSON.parse(raw); } catch { return; }
      const info = clients.get(ws);
      if (!info?.userId) return;
      handleMessage(ws, info, msg);
    });

    ws.on('close', () => {
      const info = clients.get(ws);
      clients.delete(ws);
      if (info?.userId) {
        holdemRooms.forEach((room, roomId) => {
          const idx = room.players.findIndex(p => p.userId === info.userId);
          if (idx !== -1) {
            room.players.splice(idx, 1);
            broadcast({ type: 'holdem_update', room: sanitizeRoom(room) }, i => room.players.some(p => p.userId === i.userId));
            if (room.players.length === 0) holdemRooms.delete(roomId);
          }
        });
      }
    });
  });

  startCrashLoop();
  startBaccaratLoop();

  return wss;
}

function handleMessage(ws, info, msg) {
  switch (msg.type) {

    case 'bet_placed': {
      const { game, bet, detail } = msg;
      if (!liveBets[game]) break;
      const entry = {
        userId: info.userId,
        discordId: info.discordId,
        username: info.username,
        avatar: info.avatar,
        bet, detail,
        time: Date.now()
      };
      liveBets[game] = [entry, ...liveBets[game]].slice(0, 20);
      broadcast({ type: 'live_bet', game, entry });
      break;
    }

    case 'crash_bet': {
      if (crashState.phase !== 'waiting') return sendTo(ws, { type: 'error', message: '베팅 시간이 아닙니다' });
      const user = db.prepare('SELECT * FROM users WHERE id = ?').get(info.userId);
      if (!user || user.points < msg.bet) return sendTo(ws, { type: 'error', message: '포인트 부족' });
      const existing = crashState.bets.find(b => b.userId === info.userId);
      if (existing) return sendTo(ws, { type: 'error', message: '이미 베팅했습니다' });
      db.prepare('UPDATE users SET points = points - ? WHERE id = ?').run(msg.bet, info.userId);
      const betEntry = {
        userId: info.userId,
        discordId: info.discordId,  // ← 디스코드 ID 추가
        username: info.username,
        avatar: info.avatar,
        bet: msg.bet,
        autoCashout: msg.autoCashout || null,
        cashedOut: false,
        payout: 0
      };
      crashState.bets.push(betEntry);
      broadcast({ type: 'crash_bet', bet: betEntry });
      sendTo(ws, { type: 'crash_bet_ok', bet: msg.bet });
      break;
    }

    case 'crash_cashout': {
      if (crashState.phase !== 'flying') return sendTo(ws, { type: 'error', message: '진행 중인 게임이 없습니다' });
      const betEntry = crashState.bets.find(b => b.userId === info.userId && !b.cashedOut);
      if (!betEntry) return sendTo(ws, { type: 'error', message: '베팅 내역 없음' });
      const elapsed = (Date.now() - crashState.startTime) / 1000;
      const currentMult = parseFloat(Math.max(1.0, Math.exp(0.06 * elapsed)).toFixed(2));
      if (currentMult <= 1.0 || currentMult >= crashState.crashPoint) return;
      betEntry.cashedOut = true;
      betEntry.payout = Math.floor(betEntry.bet * currentMult);
      db.prepare('UPDATE users SET points = points + ? WHERE id = ?').run(betEntry.payout, info.userId);
      db.prepare('INSERT INTO game_history (user_id, game, bet_amount, result, payout, detail) VALUES (?,?,?,?,?,?)').run(info.userId, 'crash', betEntry.bet, 'win', betEntry.payout, JSON.stringify({ cashoutAt: currentMult, crashPoint: crashState.crashPoint }));
      broadcast({ type: 'crash_cashout', userId: info.userId, username: info.username, cashoutAt: currentMult, payout: betEntry.payout });
      sendTo(ws, { type: 'crash_cashout_ok', cashoutAt: currentMult, payout: betEntry.payout });
      break;
    }

    case 'baccarat_bet': {
      if (baccaratState.phase !== 'betting') return sendTo(ws, { type: 'error', message: '베팅 시간이 아닙니다' });
      const user = db.prepare('SELECT * FROM users WHERE id = ?').get(info.userId);
      if (!user || user.points < msg.bet) return sendTo(ws, { type: 'error', message: '포인트 부족' });
      const existing = baccaratState.bets.find(b => b.userId === info.userId);
      if (existing) { existing.bet = msg.bet; existing.choice = msg.choice; }
      else baccaratState.bets.push({
        userId: info.userId,
        discordId: info.discordId,
        username: info.username,
        avatar: info.avatar,
        bet: msg.bet,
        choice: msg.choice
      });
      db.prepare('UPDATE users SET points = points - ? WHERE id = ?').run(msg.bet, info.userId);
      broadcast({ type: 'baccarat_bet', bets: baccaratState.bets });
      sendTo(ws, { type: 'baccarat_bet_ok' });
      break;
    }

    case 'holdem_list': {
      const rooms = [...holdemRooms.values()].map(sanitizeRoom);
      sendTo(ws, { type: 'holdem_list', rooms });
      break;
    }

    case 'holdem_create': {
      const roomId = `room_${Date.now()}`;
      const room = {
        id: roomId, name: msg.name || `${info.username}의 방`,
        minBet: msg.minBet || 1000, maxPlayers: 6,
        players: [], phase: 'waiting', pot: 0,
        communityCards: [], deck: [], currentTurn: 0, round: 0
      };
      holdemRooms.set(roomId, room);
      joinHoldemRoom(ws, info, room);
      broadcast({ type: 'holdem_room_created', room: sanitizeRoom(room) });
      break;
    }

    case 'holdem_join': {
      const room = holdemRooms.get(msg.roomId);
      if (!room) return sendTo(ws, { type: 'error', message: '방 없음' });
      if (room.players.length >= room.maxPlayers) return sendTo(ws, { type: 'error', message: '방이 꽉 찼습니다' });
      joinHoldemRoom(ws, info, room);
      break;
    }

    case 'holdem_start': {
      const room = [...holdemRooms.values()].find(r => r.players.some(p => p.userId === info.userId));
      if (!room || room.players[0].userId !== info.userId) return sendTo(ws, { type: 'error', message: '방장만 시작 가능' });
      if (room.players.length < 2) return sendTo(ws, { type: 'error', message: '최소 2명 필요' });
      startHoldem(room);
      break;
    }

    case 'holdem_action': {
      const room = [...holdemRooms.values()].find(r => r.players.some(p => p.userId === info.userId));
      if (!room || room.phase !== 'playing') return;
      handleHoldemAction(room, info.userId, msg.action, msg.amount);
      break;
    }
  }
}

// ── 부스타빗 루프 ─────────────────────────────────────
function startCrashLoop() {
  const startWaiting = () => {
    crashState.phase = 'waiting';
    crashState.bets = [];
    crashState.crashPoint = generateCrashPoint(0.15);
    crashState.countdown = 10;
    broadcast({ type: 'crash_waiting', countdown: crashState.countdown, history: crashState.history });

    const countdownInterval = setInterval(() => {
      crashState.countdown--;
      broadcast({ type: 'crash_countdown', countdown: crashState.countdown });
      if (crashState.countdown <= 0) {
        clearInterval(countdownInterval);
        startFlying();
      }
    }, 1000);
  };

  const startFlying = () => {
    crashState.phase = 'flying';
    crashState.startTime = Date.now();
    broadcast({ type: 'crash_start', startTime: crashState.startTime });

    const autoCashoutInterval = setInterval(() => {
      if (crashState.phase !== 'flying') return clearInterval(autoCashoutInterval);
      const elapsed = (Date.now() - crashState.startTime) / 1000;
      const currentMult = parseFloat(Math.max(1.0, Math.exp(0.06 * elapsed)).toFixed(2));

      crashState.bets.forEach(bet => {
        if (bet.cashedOut || !bet.autoCashout) return;
        if (currentMult >= bet.autoCashout) {
          bet.cashedOut = true;
          bet.payout = Math.floor(bet.bet * bet.autoCashout);
          db.prepare('UPDATE users SET points = points + ? WHERE id = ?').run(bet.payout, bet.userId);
          db.prepare('INSERT INTO game_history (user_id, game, bet_amount, result, payout, detail) VALUES (?,?,?,?,?,?)').run(bet.userId, 'crash', bet.bet, 'win', bet.payout, JSON.stringify({ cashoutAt: bet.autoCashout, crashPoint: crashState.crashPoint }));
          broadcast({ type: 'crash_cashout', userId: bet.userId, username: bet.username, cashoutAt: bet.autoCashout, payout: bet.payout });
        }
      });

      if (currentMult >= crashState.crashPoint) {
        clearInterval(autoCashoutInterval);
        endCrash();
      }
    }, 100);
  };

  const endCrash = () => {
    crashState.phase = 'crashed';
    crashState.bets.forEach(bet => {
      if (!bet.cashedOut) {
        db.prepare('INSERT INTO game_history (user_id, game, bet_amount, result, payout, detail) VALUES (?,?,?,?,?,?)').run(bet.userId, 'crash', bet.bet, 'lose', 0, JSON.stringify({ cashoutAt: null, crashPoint: crashState.crashPoint }));
      }
    });
    crashState.history = [{ crashPoint: crashState.crashPoint, bets: crashState.bets }, ...crashState.history].slice(0, 20);
    broadcast({ type: 'crash_end', crashPoint: crashState.crashPoint, bets: crashState.bets });
    setTimeout(startWaiting, 4000);
  };

  startWaiting();
}

// ── 바카라 루프 ───────────────────────────────────────
function startBaccaratLoop() {
  const { playBaccarat } = require('./games');

  const startBetting = () => {
    baccaratState.phase = 'betting';
    baccaratState.bets = [];
    baccaratState.result = null;
    baccaratState.countdown = 15;
    broadcast({ type: 'baccarat_betting', countdown: baccaratState.countdown });

    const countdownInterval = setInterval(() => {
      baccaratState.countdown--;
      broadcast({ type: 'baccarat_countdown', countdown: baccaratState.countdown });
      if (baccaratState.countdown <= 0) {
        clearInterval(countdownInterval);
        dealBaccarat();
      }
    }, 1000);
  };

  const dealBaccarat = () => {
    baccaratState.phase = 'dealing';
    broadcast({ type: 'baccarat_dealing' });

    setTimeout(() => {
      const result = playBaccarat('player');
      baccaratState.result = result;
      baccaratState.phase = 'finished';

      baccaratState.bets.forEach(bet => {
        let multiplier = 0;
        if (bet.choice === result.detail.winner) {
          if (bet.choice === 'player') multiplier = 1.95;
          else if (bet.choice === 'banker') multiplier = 1.90;
          else if (bet.choice === 'tie') multiplier = 8.0;
        }
        const payout = Math.floor(bet.bet * multiplier);
        const win = multiplier > 0;
        db.prepare('UPDATE users SET points = points + ?, total_bet = total_bet + ?, total_win = total_win + ? WHERE id = ?').run(payout, bet.bet, payout, bet.userId);
        db.prepare('INSERT INTO game_history (user_id, game, bet_amount, result, payout, detail) VALUES (?,?,?,?,?,?)').run(bet.userId, 'baccarat', bet.bet, win ? 'win' : 'lose', payout, JSON.stringify({ choice: bet.choice, winner: result.detail.winner }));
        bet.payout = payout;
        bet.win = win;
      });

      baccaratState.history = [{ winner: result.detail.winner, playerTotal: result.detail.playerTotal, bankerTotal: result.detail.bankerTotal }, ...baccaratState.history].slice(0, 50);
      broadcast({ type: 'baccarat_result', result: result.detail, bets: baccaratState.bets, history: baccaratState.history });
      setTimeout(startBetting, 6000);
    }, 2000);
  };

  startBetting();
}

// ── 홀덤 ──────────────────────────────────────────────
function joinHoldemRoom(ws, info, room) {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(info.userId);
  if (!user) return;
  const alreadyIn = room.players.find(p => p.userId === info.userId);
  if (!alreadyIn) {
    room.players.push({
      userId: info.userId,
      discordId: info.discordId,
      username: info.username,
      avatar: info.avatar,
      chips: 5000, hand: [], folded: false, bet: 0, ws
    });
  }
  sendTo(ws, { type: 'holdem_joined', room: sanitizeRoom(room) });
  broadcast({ type: 'holdem_update', room: sanitizeRoom(room) }, i => room.players.some(p => p.userId === i.userId));
}

function makeHoldemDeck() {
  const suits = ['S','H','D','C'], values = ['A','2','3','4','5','6','7','8','9','10','J','Q','K'];
  const deck = [];
  for (const s of suits) for (const v of values) deck.push({ suit: s, value: v });
  for (let i = deck.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [deck[i], deck[j]] = [deck[j], deck[i]]; }
  return deck;
}

function startHoldem(room) {
  room.phase = 'playing';
  room.deck = makeHoldemDeck();
  room.pot = 0;
  room.communityCards = [];
  room.round = 0;
  room.currentTurn = 0;
  room.minBet = room.minBet || 1000;

  room.players.forEach(p => {
    p.hand = [room.deck.pop(), room.deck.pop()];
    p.folded = false;
    p.bet = 0;
  });

  const sb = room.players[0];
  const bb = room.players[1] || room.players[0];
  sb.chips -= room.minBet / 2; sb.bet = room.minBet / 2; room.pot += room.minBet / 2;
  bb.chips -= room.minBet; bb.bet = room.minBet; room.pot += room.minBet;
  room.currentBet = room.minBet;
  room.currentTurn = 2 % room.players.length;

  room.players.forEach(p => {
    clients.forEach((info, ws) => {
      if (info.userId === p.userId) sendTo(ws, { type: 'holdem_hand', hand: p.hand });
    });
  });

  broadcast({ type: 'holdem_update', room: sanitizeRoom(room) }, i => room.players.some(p => p.userId === i.userId));
}

function handleHoldemAction(room, userId, action, amount) {
  const playerIdx = room.players.findIndex(p => p.userId === userId);
  if (playerIdx !== room.currentTurn) return;
  const player = room.players[playerIdx];

  if (action === 'fold') player.folded = true;
  else if (action === 'check') {}
  else if (action === 'call') {
    const callAmt = room.currentBet - player.bet;
    player.chips -= callAmt; player.bet += callAmt; room.pot += callAmt;
  } else if (action === 'raise') {
    const raiseAmt = amount || room.currentBet * 2;
    const diff = raiseAmt - player.bet;
    player.chips -= diff; player.bet = raiseAmt; room.pot += diff;
    room.currentBet = raiseAmt;
  } else if (action === 'allin') {
    room.pot += player.chips; player.bet += player.chips; player.chips = 0;
  }

  const activePlayers = room.players.filter(p => !p.folded);
  if (activePlayers.length === 1) return endHoldem(room, activePlayers[0]);

  room.currentTurn = (room.currentTurn + 1) % room.players.length;
  while (room.players[room.currentTurn].folded) {
    room.currentTurn = (room.currentTurn + 1) % room.players.length;
  }

  const allCalled = activePlayers.every(p => p.bet === room.currentBet);
  if (allCalled && room.currentTurn === 0) {
    nextHoldemRound(room);
    return;
  }

  broadcast({ type: 'holdem_update', room: sanitizeRoom(room) }, i => room.players.some(p => p.userId === i.userId));
}

function nextHoldemRound(room) {
  room.round++;
  room.players.forEach(p => { p.bet = 0; });
  room.currentBet = 0;
  room.currentTurn = 0;

  if (room.round === 1) room.communityCards = [room.deck.pop(), room.deck.pop(), room.deck.pop()];
  else if (room.round === 2) room.communityCards.push(room.deck.pop());
  else if (room.round === 3) room.communityCards.push(room.deck.pop());
  else {
    const active = room.players.filter(p => !p.folded);
    const winner = active[Math.floor(Math.random() * active.length)];
    return endHoldem(room, winner);
  }

  broadcast({ type: 'holdem_update', room: sanitizeRoom(room) }, i => room.players.some(p => p.userId === i.userId));
}

function endHoldem(room, winner) {
  winner.chips += room.pot;
  db.prepare('UPDATE users SET points = points + ? WHERE id = ?').run(room.pot, winner.userId);
  room.phase = 'finished';
  broadcast({ type: 'holdem_end', winner: { userId: winner.userId, username: winner.username, chips: winner.chips }, pot: room.pot, room: sanitizeRoom(room) }, i => room.players.some(p => p.userId === i.userId));
  setTimeout(() => {
    if (room.players.length >= 2) startHoldem(room);
    else { room.phase = 'waiting'; broadcast({ type: 'holdem_update', room: sanitizeRoom(room) }, i => room.players.some(p => p.userId === i.userId)); }
  }, 5000);
}

function sanitizeRoom(room) {
  return {
    id: room.id, name: room.name, minBet: room.minBet, phase: room.phase,
    pot: room.pot, communityCards: room.communityCards, round: room.round,
    currentTurn: room.currentTurn, currentBet: room.currentBet,
    players: room.players.map(p => ({
      userId: p.userId,
      discordId: p.discordId,
      username: p.username,
      avatar: p.avatar,
      chips: p.chips, folded: p.folded, bet: p.bet,
      cardCount: p.hand?.length || 0
    }))
  };
}

module.exports = { initWebSocket };
