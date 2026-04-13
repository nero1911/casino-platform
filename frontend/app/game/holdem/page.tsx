'use client';
import { useState, useCallback } from 'react';
import { useAuth } from '@/lib/auth';
import { useWebSocket } from '@/lib/useWebSocket';
import Link from 'next/link';

function CardDisplay({ card }: { card: any }) {
  if (!card || card.value === '?') return (
    <div style={{ width: 44, height: 62, borderRadius: 6, background: '#1a1a2e', border: '2px solid #2a2a4a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>🂠</div>
  );
  const isRed = ['H', 'D'].includes(card.suit);
  const suit = ({ S: '♠', H: '♥', D: '♦', C: '♣' } as any)[card.suit] || '';
  return (
    <div style={{ width: 44, height: 62, borderRadius: 6, background: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', border: '1px solid #ddd', color: isRed ? '#e53e3e' : '#1a1a1a', fontWeight: 800, fontSize: 13, gap: 1 }}>
      <span>{card.value}</span>
      <span style={{ fontSize: 11 }}>{suit}</span>
    </div>
  );
}

export default function HoldemPage() {
  const { user } = useAuth();
  const [rooms, setRooms] = useState<any[]>([]);
  const [currentRoom, setCurrentRoom] = useState<any>(null);
  const [myHand, setMyHand] = useState<any[]>([]);
  const [view, setView] = useState<'lobby' | 'room'>('lobby');
  const [newRoomName, setNewRoomName] = useState('');
  const [newRoomBet, setNewRoomBet] = useState(1000);
  const [isConnected, setIsConnected] = useState(false);
  const [lastEvent, setLastEvent] = useState('');

  const handleMessage = useCallback((msg: any) => {
    switch (msg.type) {
      case 'init':
        break;
      case 'holdem_list':
        setRooms(msg.rooms || []);
        break;
      case 'holdem_joined':
        setCurrentRoom(msg.room);
        setView('room');
        break;
      case 'holdem_update':
        setCurrentRoom(msg.room);
        break;
      case 'holdem_hand':
        setMyHand(msg.hand);
        break;
      case 'holdem_end':
        setLastEvent(`🏆 ${msg.winner.username} 승리! +${msg.pot.toLocaleString()}P`);
        setCurrentRoom(msg.room);
        break;
      case 'holdem_room_created':
        setRooms(prev => [...prev, msg.room]);
        break;
    }
  }, []);

  const { send, connected: wsConnected } = useWebSocket(handleMessage);

  const loadRooms = () => send({ type: 'holdem_list' });
  const createRoom = () => {
    if (!newRoomName.trim()) return;
    send({ type: 'holdem_create', name: newRoomName, minBet: newRoomBet });
    setNewRoomName('');
  };
  const joinRoom = (roomId: string) => send({ type: 'holdem_join', roomId });
  const startGame = () => send({ type: 'holdem_start' });
  const doAction = (action: string, amount?: number) => send({ type: 'holdem_action', action, amount });

  const me = currentRoom?.players?.find((p: any) => p.userId === user?.id);
  const isMyTurn = currentRoom?.players?.[currentRoom?.currentTurn]?.userId === user?.id;
  const isHost = currentRoom?.players?.[0]?.userId === user?.id;

  const roundNames = ['프리플랍', '플랍', '턴', '리버'];

  if (view === 'room' && currentRoom) return (
    <div style={{ background: '#0a0a0f', minHeight: '100vh' }}>
      <nav style={{ background: '#0d0d14', borderBottom: '1px solid #1e1e2e', padding: '0 1.5rem', height: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
          <span style={{ fontSize: 22 }}>🎰</span>
          <span style={{ fontSize: 18, fontWeight: 900, color: '#f0c040' }}>카지노</span>
        </Link>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          {user && <span style={{ fontWeight: 800, color: '#f0c040' }}>{user.points.toLocaleString()}P</span>}
          <button onClick={() => { setView('lobby'); setCurrentRoom(null); setMyHand([]); }}
            style={{ padding: '6px 14px', borderRadius: 8, border: '1px solid #2a2a3a', background: 'transparent', color: '#888', cursor: 'pointer', fontSize: 13 }}>← 로비</button>
        </div>
      </nav>

      <div style={{ maxWidth: 800, margin: '0 auto', padding: '1.5rem 1rem 4rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: '#e2e2e2', margin: 0 }}>🃏 {currentRoom.name}</h2>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span style={{ fontSize: 13, color: '#888' }}>{roundNames[currentRoom.round] || '대기'}</span>
            <span style={{ fontSize: 14, fontWeight: 700, color: '#f0c040' }}>팟: {currentRoom.pot?.toLocaleString()}P</span>
          </div>
        </div>

        {lastEvent && (
          <div style={{ background: '#0a2010', border: '1px solid #4ade80', borderRadius: 10, padding: '10px 16px', marginBottom: 16, color: '#4ade80', fontWeight: 700, fontSize: 14 }}>
            {lastEvent}
          </div>
        )}

        {/* 커뮤니티 카드 */}
        <div style={{ background: '#0d2010', border: '2px solid #1a3a1a', borderRadius: 14, padding: '1.5rem', marginBottom: 16, textAlign: 'center' }}>
          <p style={{ fontSize: 12, color: '#888', margin: '0 0 12px' }}>커뮤니티 카드</p>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginBottom: 16 }}>
            {currentRoom.phase === 'playing'
              ? [...Array(5)].map((_, i) => <CardDisplay key={i} card={currentRoom.communityCards?.[i] || null} />)
              : <p style={{ color: '#555', fontSize: 14, margin: 0 }}>게임 시작 전</p>
            }
          </div>

          {/* 내 패 */}
          {myHand.length > 0 && (
            <>
              <p style={{ fontSize: 12, color: '#888', margin: '0 0 8px' }}>내 패</p>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
                {myHand.map((c, i) => <CardDisplay key={i} card={c} />)}
              </div>
            </>
          )}
        </div>

        {/* 플레이어 목록 */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 10, marginBottom: 16 }}>
          {currentRoom.players?.map((p: any, i: number) => (
            <div key={p.userId} style={{
              background: p.userId === user?.id ? '#1a1a00' : '#13131c',
              border: `2px solid ${currentRoom.currentTurn === i && currentRoom.phase === 'playing' ? '#f0c040' : p.userId === user?.id ? '#f0c04044' : '#1e1e2e'}`,
              borderRadius: 12, padding: '1rem', textAlign: 'center'
            }}>
              {p.avatar
                ? <img src={`https://cdn.discordapp.com/avatars/${p.userId}/${p.avatar}.png`} style={{ width: 40, height: 40, borderRadius: '50%', marginBottom: 6 }} onError={e => (e.currentTarget.style.display = 'none')} alt="" />
                : <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#2a2a3a', margin: '0 auto 6px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>👤</div>
              }
              <p style={{ fontSize: 13, fontWeight: 700, color: p.userId === user?.id ? '#f0c040' : '#e2e2e2', margin: '0 0 4px' }}>
                {p.username} {i === 0 ? '👑' : ''}
              </p>
              <p style={{ fontSize: 12, color: '#888', margin: '0 0 4px' }}>{p.chips?.toLocaleString()}P</p>
              {p.folded && <span style={{ fontSize: 11, color: '#f87171', fontWeight: 700 }}>폴드</span>}
              {currentRoom.currentTurn === i && currentRoom.phase === 'playing' && !p.folded && (
                <span style={{ fontSize: 11, color: '#f0c040', fontWeight: 700 }}>← 차례</span>
              )}
              {p.bet > 0 && <p style={{ fontSize: 11, color: '#fb923c', margin: '2px 0 0' }}>베팅: {p.bet?.toLocaleString()}P</p>}
            </div>
          ))}
        </div>

        {/* 액션 버튼 */}
        {currentRoom.phase === 'waiting' && isHost && (
          <button onClick={startGame} disabled={currentRoom.players?.length < 2} style={{
            width: '100%', padding: '1rem', borderRadius: 12, border: 'none',
            background: currentRoom.players?.length >= 2 ? '#f0c040' : '#333',
            color: '#000', fontWeight: 900, fontSize: 16,
            cursor: currentRoom.players?.length >= 2 ? 'pointer' : 'not-allowed'
          }}>
            {currentRoom.players?.length < 2 ? '최소 2명 필요' : '🃏 게임 시작'}
          </button>
        )}

        {currentRoom.phase === 'waiting' && !isHost && (
          <div style={{ background: '#13131c', border: '1px solid #1e1e2e', borderRadius: 12, padding: '1rem', textAlign: 'center', color: '#888' }}>
            방장이 게임을 시작할 때까지 기다려주세요...
          </div>
        )}

        {currentRoom.phase === 'playing' && isMyTurn && me && !me.folded && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
            <button onClick={() => doAction('fold')} style={{ padding: '0.9rem', borderRadius: 10, border: 'none', background: '#450a0a', color: '#f87171', fontWeight: 800, fontSize: 15, cursor: 'pointer' }}>폴드</button>
            <button onClick={() => doAction('check')} style={{ padding: '0.9rem', borderRadius: 10, border: 'none', background: '#1a1a2e', color: '#a78bfa', fontWeight: 800, fontSize: 15, cursor: 'pointer' }}>체크</button>
            <button onClick={() => doAction('call')} style={{ padding: '0.9rem', borderRadius: 10, border: 'none', background: '#0a2010', color: '#4ade80', fontWeight: 800, fontSize: 15, cursor: 'pointer' }}>콜</button>
            <button onClick={() => doAction('raise', (currentRoom.currentBet || 0) * 2)} style={{ padding: '0.9rem', borderRadius: 10, border: 'none', background: '#2a2010', color: '#f0c040', fontWeight: 800, fontSize: 15, cursor: 'pointer' }}>레이즈</button>
          </div>
        )}

        {currentRoom.phase === 'playing' && !isMyTurn && (
          <div style={{ background: '#13131c', border: '1px solid #1e1e2e', borderRadius: 12, padding: '1rem', textAlign: 'center', color: '#888' }}>
            다른 플레이어의 차례입니다...
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div style={{ background: '#0a0a0f', minHeight: '100vh' }}>
      <nav style={{ background: '#0d0d14', borderBottom: '1px solid #1e1e2e', padding: '0 1.5rem', height: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
          <span style={{ fontSize: 22 }}>🎰</span>
          <span style={{ fontSize: 18, fontWeight: 900, color: '#f0c040' }}>카지노</span>
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: wsConnected ? '#4ade80' : '#f87171' }} />
            <span style={{ fontSize: 12, color: '#888' }}>{wsConnected ? '연결됨' : '연결 중...'}</span>
          </div>
          {user && <span style={{ fontWeight: 800, color: '#f0c040' }}>{user.points.toLocaleString()}P</span>}
        </div>
      </nav>

      <div style={{ maxWidth: 700, margin: '0 auto', padding: '1.5rem 1rem 4rem' }}>
        <h1 style={{ fontSize: 26, fontWeight: 900, color: '#e2e2e2', marginBottom: 4 }}>🃏 텍사스 홀덤</h1>
        <p style={{ color: '#888', marginBottom: 20, fontSize: 13 }}>방을 만들거나 참가해서 게임을 시작하세요</p>

        {/* 방 만들기 */}
        <div style={{ background: '#13131c', border: '1px solid #1e1e2e', borderRadius: 14, padding: '1.2rem', marginBottom: 20 }}>
          <p style={{ fontSize: 14, fontWeight: 700, color: '#e2e2e2', margin: '0 0 12px' }}>🆕 방 만들기</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 140px 120px', gap: 10 }}>
            <input value={newRoomName} onChange={e => setNewRoomName(e.target.value)} placeholder="방 이름"
              style={{ background: '#0a0a0f', border: '1px solid #2a2a3a', borderRadius: 8, padding: '10px 12px', color: '#e2e2e2', fontSize: 14, outline: 'none' }} />
            <input type="number" value={newRoomBet} onChange={e => setNewRoomBet(parseInt(e.target.value) || 1000)} placeholder="최소 베팅"
              style={{ background: '#0a0a0f', border: '1px solid #2a2a3a', borderRadius: 8, padding: '10px 12px', color: '#f0c040', fontSize: 14, outline: 'none' }} />
            <button onClick={createRoom} disabled={!wsConnected || !user} style={{ padding: '10px', borderRadius: 8, border: 'none', background: '#f0c040', color: '#000', fontWeight: 800, fontSize: 14, cursor: 'pointer' }}>
              방 만들기
            </button>
          </div>
        </div>

        {/* 방 목록 */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <p style={{ fontSize: 16, fontWeight: 700, color: '#e2e2e2', margin: 0 }}>🚪 방 목록</p>
          <button onClick={loadRooms} style={{ padding: '6px 14px', borderRadius: 8, border: '1px solid #2a2a3a', background: 'transparent', color: '#888', fontSize: 13, cursor: 'pointer' }}>새로고침</button>
        </div>

        {rooms.length === 0 ? (
          <div style={{ background: '#13131c', border: '1px solid #1e1e2e', borderRadius: 12, padding: '2rem', textAlign: 'center', color: '#555' }}>
            <p style={{ fontSize: 32, margin: '0 0 8px' }}>🃏</p>
            <p style={{ margin: 0 }}>아직 방이 없어요. 첫 번째로 방을 만들어보세요!</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {rooms.map(room => (
              <div key={room.id} style={{ background: '#13131c', border: '1px solid #1e1e2e', borderRadius: 12, padding: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <p style={{ fontSize: 15, fontWeight: 700, color: '#e2e2e2', margin: '0 0 4px' }}>{room.name}</p>
                  <p style={{ fontSize: 12, color: '#888', margin: 0 }}>
                    최소 베팅: {room.minBet?.toLocaleString()}P · 플레이어: {room.players?.length}/{room.maxPlayers} · {room.phase === 'waiting' ? '대기중' : '게임중'}
                  </p>
                </div>
                <button onClick={() => joinRoom(room.id)} disabled={!wsConnected || !user || room.players?.length >= room.maxPlayers} style={{
                  padding: '8px 20px', borderRadius: 8, border: 'none',
                  background: room.phase === 'playing' ? '#1a1a2e' : '#f0c040',
                  color: room.phase === 'playing' ? '#a78bfa' : '#000',
                  fontWeight: 700, fontSize: 13, cursor: 'pointer'
                }}>
                  {room.phase === 'playing' ? '관전' : '참가'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
