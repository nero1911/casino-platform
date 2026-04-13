const bcrypt = require('bcryptjs');
const path = require('path');
const db = require('better-sqlite3')(path.join(__dirname, 'casino.db'));

const username = 'pangsaang';
const password = 'wns131313@';

const hash = bcrypt.hashSync(password, 10);

// 기존 계정 있으면 비밀번호 업데이트
const existing = db.prepare('SELECT * FROM admins WHERE username = ?').get(username);
if (existing) {
  db.prepare('UPDATE admins SET password = ? WHERE username = ?').run(hash, username);
  console.log('기존 계정 비밀번호 업데이트 완료!');
} else {
  db.prepare('INSERT INTO admins (username, password) VALUES (?, ?)').run(username, hash);
  console.log('새 관리자 계정 생성 완료!');
}

console.log('============================');
console.log('아이디:', username);
console.log('비밀번호:', password);
console.log('============================');

// 확인
const check = db.prepare('SELECT id, username FROM admins').all();
console.log('현재 관리자 목록:', check);
