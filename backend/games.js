const crypto = require('crypto');

function rng() {
  return crypto.randomBytes(4).readUInt32BE(0) / 0xFFFFFFFF;
}

// ─── 코인플립 ───────────────────────────────────────────────
function playCoinflip(choice) {
  const result = rng() < 0.5 ? 'heads' : 'tails';
  const win = choice === result;
  return {
    result,
    win,
    multiplier: win ? 1.9 : 0,
    detail: { choice, result }
  };
}

// ─── 주사위 ────────────────────────────────────────────────
function playDice(target, direction) {
  const roll = Math.floor(rng() * 100) + 1;
  const win = direction === 'over' ? roll > target : roll < target;
  const chance = direction === 'over' ? (100 - target) / 100 : target / 100;
  const multiplier = win ? Math.min((0.95 / chance), 100) : 0;
  return { result: roll, win, multiplier: parseFloat(multiplier.toFixed(4)), detail: { target, direction, roll } };
}

// ─── 바카라 ────────────────────────────────────────────────
function drawCard() {
  const suits = ['S','H','D','C'];
  const values = ['A','2','3','4','5','6','7','8','9','10','J','Q','K'];
  const suit = suits[Math.floor(rng() * 4)];
  const value = values[Math.floor(rng() * 13)];
  const point = ['10','J','Q','K'].includes(value) ? 0 : value === 'A' ? 1 : parseInt(value);
  return { suit, value, point };
}

function baccaratTotal(cards) {
  return cards.reduce((sum, c) => sum + c.point, 0) % 10;
}

function playBaccarat(bet) {
  let playerCards = [drawCard(), drawCard()];
  let bankerCards = [drawCard(), drawCard()];

  const pTotal = baccaratTotal(playerCards);
  const bTotal = baccaratTotal(bankerCards);

  if (pTotal <= 5) playerCards.push(drawCard());
  const pFinal = baccaratTotal(playerCards);
  const bFinal = baccaratTotal(bankerCards);
  if (bFinal <= 5 && playerCards.length === 2) bankerCards.push(drawCard());

  const finalP = baccaratTotal(playerCards);
  const finalB = baccaratTotal(bankerCards);

  let winner;
  if (finalP > finalB) winner = 'player';
  else if (finalB > finalP) winner = 'banker';
  else winner = 'tie';

  let multiplier = 0;
  if (bet === winner) {
    if (bet === 'player') multiplier = 1.95;
    else if (bet === 'banker') multiplier = 1.9;
    else if (bet === 'tie') multiplier = 8.0;
  }

  return {
    result: winner,
    win: bet === winner,
    multiplier,
    detail: {
      bet,
      playerCards,
      bankerCards,
      playerTotal: finalP,
      bankerTotal: finalB,
      winner
    }
  };
}

// ─── 플링코 ────────────────────────────────────────────────
function playPlinko(rows = 8, risk = 'medium') {
  const multipliers = {
    low:    { 8: [1.5,1.2,1.1,1.0,0.5,1.0,1.1,1.2,1.5] },
    medium: { 8: [5.0,2.0,1.5,0.5,0.3,0.5,1.5,2.0,5.0] },
    high:   { 8: [20, 5.0,2.0,0.5,0.2,0.5,2.0,5.0,20 ] },
  };
  const mList = multipliers[risk][rows] || multipliers.medium[8];
  const path = [];
  let pos = 0;
  for (let i = 0; i < rows; i++) {
    const dir = rng() < 0.5 ? 0 : 1;
    path.push(dir);
    pos += dir;
  }
  const slot = Math.min(pos, mList.length - 1);
  const multiplier = mList[slot];
  return {
    result: slot,
    win: multiplier >= 1,
    multiplier,
    detail: { path, slot, multiplier, rows, risk }
  };
}

// ─── 크래시 (부스타빗) ─────────────────────────────────────
// houseEdge 높을수록 낮은 배수에서 더 자주 폭발
function generateCrashPoint(houseEdge = 0.15) {
  const r = rng();
  // houseEdge 확률로 즉시 1.0 폭발
  if (r < houseEdge) return 1.0;
  // 나머지도 낮은 배수 쪽으로 치우치게
  const adjusted = r * 0.95;
  return parseFloat(Math.max(1.0, 0.99 / (1 - adjusted)).toFixed(2));
}

function playCrash(cashoutAt, houseEdge = 0.15) {
  const crashPoint = generateCrashPoint(houseEdge);
  const win = cashoutAt <= crashPoint;
  return {
    result: crashPoint,
    win,
    multiplier: win ? cashoutAt : 0,
    detail: { cashoutAt, crashPoint }
  };
}

// ─── 블랙잭 ────────────────────────────────────────────────
function makeShoe() {
  const suits = ['S','H','D','C'];
  const values = ['A','2','3','4','5','6','7','8','9','10','J','Q','K'];
  const shoe = [];
  for (const s of suits) for (const v of values) shoe.push({ suit: s, value: v });
  return shoe.sort(() => rng() - 0.5);
}

function bjValue(card) {
  if (['10','J','Q','K'].includes(card.value)) return 10;
  if (card.value === 'A') return 11;
  return parseInt(card.value);
}

function bjTotal(hand) {
  let total = hand.reduce((s, c) => s + bjValue(c), 0);
  let aces = hand.filter(c => c.value === 'A').length;
  while (total > 21 && aces > 0) { total -= 10; aces--; }
  return total;
}

function playBlackjack(action, gameState = null) {
  if (action === 'deal') {
    const shoe = makeShoe();
    const playerHand = [shoe.pop(), shoe.pop()];
    const dealerHand = [shoe.pop(), shoe.pop()];
    const playerTotal = bjTotal(playerHand);
    const blackjack = playerTotal === 21;
    return {
      state: blackjack ? 'finished' : 'playing',
      playerHand,
      dealerHand: [dealerHand[0], { value: '?', suit: '?' }],
      realDealerHand: dealerHand,
      playerTotal,
      dealerVisible: bjValue(dealerHand[0]),
      shoe,
      result: blackjack ? 'blackjack' : null,
      win: blackjack ? true : null,
      multiplier: blackjack ? 2.5 : null
    };
  }

  if (!gameState) return { error: '게임 상태 없음' };
  const { playerHand, realDealerHand, shoe } = gameState;

  if (action === 'hit') {
    playerHand.push(shoe.pop());
    const total = bjTotal(playerHand);
    if (total > 21) {
      return { ...gameState, playerHand, playerTotal: total, state: 'finished', result: 'bust', win: false, multiplier: 0 };
    }
    if (total === 21) {
      return resolveBlackjack({ ...gameState, playerHand, playerTotal: total, shoe });
    }
    return { ...gameState, playerHand, playerTotal: total, state: 'playing' };
  }

  if (action === 'stand') {
    return resolveBlackjack(gameState);
  }

  return { error: '알 수 없는 액션' };
}

function resolveBlackjack(state) {
  const { playerHand, realDealerHand, shoe } = state;
  const dealer = [...realDealerHand];
  while (bjTotal(dealer) < 17) dealer.push(shoe.pop());
  const pTotal = bjTotal(playerHand);
  const dTotal = bjTotal(dealer);
  let result, win, multiplier;
  if (dTotal > 21 || pTotal > dTotal) { result = 'win'; win = true; multiplier = 2.0; }
  else if (pTotal === dTotal) { result = 'push'; win = false; multiplier = 1.0; }
  else { result = 'lose'; win = false; multiplier = 0; }
  return { ...state, realDealerHand: dealer, dealerHand: dealer, dealerTotal: dTotal, playerTotal: pTotal, state: 'finished', result, win, multiplier };
}

// ─── 룰렛 ──────────────────────────────────────────────────
function playRoulette(betType, betValue) {
  const number = Math.floor(rng() * 37);
  const red = [1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36];
  const color = number === 0 ? 'green' : red.includes(number) ? 'red' : 'black';

  let win = false;
  let multiplier = 0;

  if (betType === 'number') {
    win = parseInt(betValue) === number;
    multiplier = win ? 35 : 0;
  } else if (betType === 'color') {
    win = betValue === color && number !== 0;
    multiplier = win ? 1.95 : 0;
  } else if (betType === 'oddeven') {
    if (number !== 0) {
      win = (betValue === 'odd' && number % 2 !== 0) || (betValue === 'even' && number % 2 === 0);
      multiplier = win ? 1.95 : 0;
    }
  } else if (betType === 'half') {
    win = (betValue === 'low' && number >= 1 && number <= 18) || (betValue === 'high' && number >= 19 && number <= 36);
    multiplier = win ? 1.95 : 0;
  }

  return { result: number, win, multiplier, detail: { number, color, betType, betValue } };
}

// ─── 사다리 ────────────────────────────────────────────────
function playLadder(choice) {
  const result = rng() < 0.5 ? 'left' : 'right';
  const win = choice === result;
  return {
    result,
    win,
    multiplier: win ? 1.9 : 0,
    detail: { choice, result }
  };
}

// ─── 홀짝 ──────────────────────────────────────────────────
function playOddEven(choice) {
  const number = Math.floor(rng() * 100) + 1;
  const result = number % 2 === 0 ? 'even' : 'odd';
  const win = choice === result;
  return {
    result,
    number,
    win,
    multiplier: win ? 1.9 : 0,
    detail: { choice, number, result }
  };
}

module.exports = {
  playCoinflip,
  playDice,
  playBaccarat,
  playPlinko,
  playCrash,
  playBlackjack,
  playRoulette,
  playLadder,
  playOddEven,
  generateCrashPoint
};
