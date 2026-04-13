const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, 'casino.db'));

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    discord_id TEXT UNIQUE NOT NULL,
    username TEXT NOT NULL,
    avatar TEXT,
    points INTEGER DEFAULT 0,
    total_bet INTEGER DEFAULT 0,
    total_win INTEGER DEFAULT 0,
    is_banned INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS admins (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS game_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    game TEXT NOT NULL,
    bet_amount INTEGER NOT NULL,
    result TEXT NOT NULL,
    payout INTEGER NOT NULL,
    detail TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS game_settings (
    game TEXT PRIMARY KEY,
    house_edge REAL DEFAULT 0.05,
    min_bet INTEGER DEFAULT 100,
    max_bet INTEGER DEFAULT 100000,
    is_enabled INTEGER DEFAULT 1,
    extra TEXT
  );

  CREATE TABLE IF NOT EXISTS point_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    amount INTEGER NOT NULL,
    type TEXT NOT NULL,
    memo TEXT,
    admin TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS bot_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    description TEXT
  );

  CREATE TABLE IF NOT EXISTS roulette_payouts (
    bet_type TEXT NOT NULL,
    bet_value TEXT NOT NULL,
    multiplier REAL NOT NULL,
    label TEXT,
    PRIMARY KEY (bet_type, bet_value)
  );
`);

// 기본 게임 설정
const defaultGames = [
  { game: 'coinflip',  house_edge: 0.05, min_bet: 100,  max_bet: 100000 },
  { game: 'dice',      house_edge: 0.05, min_bet: 100,  max_bet: 100000 },
  { game: 'plinko',    house_edge: 0.05, min_bet: 100,  max_bet: 50000  },
  { game: 'crash',     house_edge: 0.15, min_bet: 100,  max_bet: 100000 },
  { game: 'baccarat',  house_edge: 0.06, min_bet: 500,  max_bet: 200000 },
  { game: 'blackjack', house_edge: 0.05, min_bet: 500,  max_bet: 200000 },
  { game: 'roulette',  house_edge: 0.027,min_bet: 100,  max_bet: 100000 },
  { game: 'ladder',    house_edge: 0.05, min_bet: 100,  max_bet: 100000 },
  { game: 'oddeven',   house_edge: 0.05, min_bet: 100,  max_bet: 100000 },
  { game: 'holdem',    house_edge: 0.05, min_bet: 1000, max_bet: 500000 },
];

const insertSetting = db.prepare(`
  INSERT OR IGNORE INTO game_settings (game, house_edge, min_bet, max_bet)
  VALUES (@game, @house_edge, @min_bet, @max_bet)
`);
for (const g of defaultGames) insertSetting.run(g);

// 기본 봇 설정
const defaultBotSettings = [
  { key: 'daily_points',       value: '500',   description: '출석 보상 포인트' },
  { key: 'daily_cooldown_hours', value: '24',  description: '출석 쿨타임 (시간)' },
  { key: 'signup_bonus',       value: '1000',  description: '첫 가입 보너스 포인트' },
  { key: 'daily_enabled',      value: 'true',  description: '출석 기능 활성화' },
  { key: 'min_bet_global',     value: '100',   description: '전체 게임 최소 베팅' },
  { key: 'site_url',           value: 'http://localhost:3000', description: '사이트 주소' },
];

const insertBotSetting = db.prepare(`
  INSERT OR IGNORE INTO bot_settings (key, value, description) VALUES (?, ?, ?)
`);
for (const s of defaultBotSettings) insertBotSetting.run(s.key, s.value, s.description);

// 룰렛 기본 배당
const defaultPayouts = [
  { bet_type: 'color',   bet_value: 'red',   multiplier: 1.95, label: '레드' },
  { bet_type: 'color',   bet_value: 'black', multiplier: 1.95, label: '블랙' },
  { bet_type: 'color',   bet_value: 'green', multiplier: 35.0, label: '그린(0)' },
  { bet_type: 'oddeven', bet_value: 'odd',   multiplier: 1.95, label: '홀수' },
  { bet_type: 'oddeven', bet_value: 'even',  multiplier: 1.95, label: '짝수' },
  { bet_type: 'half',    bet_value: 'low',   multiplier: 1.95, label: '1~18' },
  { bet_type: 'half',    bet_value: 'high',  multiplier: 1.95, label: '19~36' },
  { bet_type: 'number',  bet_value: 'any',   multiplier: 35.0, label: '숫자 직접' },
];

const insertPayout = db.prepare(`
  INSERT OR IGNORE INTO roulette_payouts (bet_type, bet_value, multiplier, label)
  VALUES (?, ?, ?, ?)
`);
for (const p of defaultPayouts) insertPayout.run(p.bet_type, p.bet_value, p.multiplier, p.label);

module.exports = db;
