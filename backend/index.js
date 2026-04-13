require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');

const app = express();
const server = http.createServer(app);

app.use(cors({ origin: process.env.FRONTEND_URL, credentials: true }));
app.use(express.json());

const { router: authRouter } = require('./auth');
const gameRouter = require('./routes');
const adminRouter = require('./admin');
const { initWebSocket } = require('./websocket');

app.use('/auth', authRouter);
app.use('/game', gameRouter);
app.use('/admin', adminRouter);
app.get('/health', (req, res) => res.json({ status: 'ok', time: new Date() }));

// WebSocket 초기화
initWebSocket(server);

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`
  ╔══════════════════════════════════╗
  ║   카지노 백엔드 서버 시작!        ║
  ║   http://localhost:${PORT}          ║
  ║   WebSocket: ws://localhost:${PORT} ║
  ╚══════════════════════════════════╝
  `);
});
