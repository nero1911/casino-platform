'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import Cookies from 'js-cookie';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:4000';

type MessageHandler = (msg: any) => void;

export function useWebSocket(onMessage: MessageHandler) {
  const wsRef = useRef<WebSocket | null>(null);
  const [connected, setConnected] = useState(false);
  const handlersRef = useRef(onMessage);
  handlersRef.current = onMessage;

  useEffect(() => {
    const token = Cookies.get('token');
    const url = token ? `${WS_URL}?token=${token}` : WS_URL;
    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => setConnected(true);
    ws.onclose = () => {
      setConnected(false);
      // 3초 후 재연결
      setTimeout(() => {}, 3000);
    };
    ws.onmessage = e => {
      try {
        const msg = JSON.parse(e.data);
        handlersRef.current(msg);
      } catch {}
    };

    return () => { ws.close(); };
  }, []);

  const send = useCallback((data: any) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data));
    }
  }, []);

  return { send, connected };
}
