import { useState, useCallback, useRef, useEffect } from 'react';
import PubNub from 'pubnub';
import type { GameMessage } from './protocol';
import type { ChatMessage } from '../engine/types';
import { getPubNub, resetPubNub, generateRoomCode, getChannelName, hasPubNubKeys } from './pubnub';

interface LobbyPlayer {
  id: string;
  name: string;
  isReady: boolean;
}

interface MultiplayerState {
  roomCode: string | null;
  isHost: boolean;
  isConnected: boolean;
  isConnecting: boolean;
  players: LobbyPlayer[];
  error: string | null;
  gameStarted: boolean;
  chatMessages: ChatMessage[];
  occupancy: number;
  isReconnecting: boolean;
}

const PING_INTERVAL_MS = 15_000;
const PONG_TIMEOUT_MS = 10_000;

export function useMultiplayer(playerName: string) {
  const [state, setState] = useState<MultiplayerState>({
    roomCode: null,
    isHost: false,
    isConnected: false,
    isConnecting: false,
    players: [],
    error: null,
    gameStarted: false,
    chatMessages: [],
    occupancy: 0,
    isReconnecting: false,
  });

  const pubnubRef = useRef<PubNub | null>(null);
  const channelRef = useRef<string>('');
  const userIdRef = useRef<string>('');
  const playerNameRef = useRef<string>(playerName);
  const isHostRef = useRef<boolean>(false);
  const onMessageRef = useRef<((msg: GameMessage) => void) | null>(null);
  const listenerRef = useRef<PubNub.Listener | null>(null);
  const pingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pongTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    playerNameRef.current = playerName;
  }, [playerName]);

  const cleanup = useCallback(() => {
    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current);
      pingIntervalRef.current = null;
    }
    if (pongTimeoutRef.current) {
      clearTimeout(pongTimeoutRef.current);
      pongTimeoutRef.current = null;
    }
    listenerRef.current = null;
    resetPubNub();
    pubnubRef.current = null;
    channelRef.current = '';
  }, []);

  useEffect(() => {
    return () => { cleanup(); };
  }, [cleanup]);

  const setMessageHandler = useCallback((handler: (msg: GameMessage) => void) => {
    onMessageRef.current = handler;
  }, []);

  const startPingInterval = useCallback(() => {
    if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
    pingIntervalRef.current = setInterval(() => {
      const pn = pubnubRef.current;
      if (!pn || !channelRef.current) return;
      pn.publish({
        channel: channelRef.current,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        message: { type: 'PING' } as any,
      });
      if (pongTimeoutRef.current) clearTimeout(pongTimeoutRef.current);
      pongTimeoutRef.current = setTimeout(() => {
        setState(prev => prev.isConnected ? { ...prev, isReconnecting: true } : prev);
      }, PONG_TIMEOUT_MS);
    }, PING_INTERVAL_MS);
  }, []);

  const publish = useCallback((message: GameMessage) => {
    const pn = pubnubRef.current;
    if (!pn || !channelRef.current) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    pn.publish({ channel: channelRef.current, message: message as any });
  }, []);

  const handleMessage = useCallback((msg: GameMessage) => {
    if (msg.type === 'PING') {
      publish({ type: 'PONG', playerId: userIdRef.current });
      return;
    }
    if (msg.type === 'PONG') {
      if (pongTimeoutRef.current) {
        clearTimeout(pongTimeoutRef.current);
        pongTimeoutRef.current = null;
      }
      setState(prev => prev.isReconnecting ? { ...prev, isReconnecting: false } : prev);
      return;
    }
    if (msg.type === 'JOIN') {
      setState(prev => {
        if (prev.players.find(p => p.id === msg.playerId)) return prev;
        return {
          ...prev,
          players: [...prev.players, { id: msg.playerId, name: msg.playerName, isReady: false }],
        };
      });
      // If we're host, re-announce ourselves
      if (isHostRef.current) {
        publish({ type: 'JOIN', playerId: userIdRef.current, playerName: playerNameRef.current });
      }
    }
    if (msg.type === 'READY') {
      setState(prev => ({
        ...prev,
        players: prev.players.map(p => p.id === msg.playerId ? { ...p, isReady: true } : p),
      }));
    }
    if (msg.type === 'CHAT') {
      setState(prev => ({
        ...prev,
        chatMessages: [...prev.chatMessages, {
          id: `chat-${Date.now()}-${Math.random()}`,
          playerId: msg.playerId,
          playerName: msg.playerName,
          message: msg.message,
          timestamp: Date.now(),
        }],
      }));
    }
    if (msg.type === 'EMOJI') {
      setState(prev => ({
        ...prev,
        chatMessages: [...prev.chatMessages, {
          id: `emoji-${Date.now()}-${Math.random()}`,
          playerId: msg.playerId,
          playerName: msg.playerName,
          message: msg.emoji,
          timestamp: Date.now(),
          isEmoji: true,
        }],
      }));
    }
    if (msg.type === 'PLAYER_LEFT') {
      setState(prev => ({
        ...prev,
        players: prev.players.filter(p => p.id !== msg.playerId),
      }));
    }

    // Forward to game handler
    onMessageRef.current?.(msg);
  }, [publish]);

  const subscribe = useCallback((channel: string) => {
    const pn = pubnubRef.current;
    if (!pn) return;

    const listener: PubNub.Listener = {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      message: (event: any) => {
        if (event.publisher === userIdRef.current) return;
        handleMessage(event.message as GameMessage);
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      presence: (event: any) => {
        if (event.action === 'join' || event.action === 'leave' || event.action === 'timeout') {
          setState(prev => ({ ...prev, occupancy: event.occupancy }));
        }
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      status: (event: any) => {
        if (event.category === 'PNConnectedCategory') {
          setState(prev => ({ ...prev, isConnected: true, isConnecting: false }));
        }
        if (event.category === 'PNReconnectedCategory') {
          setState(prev => ({ ...prev, isReconnecting: false }));
        }
        if (event.category === 'PNNetworkDownCategory') {
          setState(prev => ({ ...prev, isReconnecting: true }));
        }
      },
    };

    listenerRef.current = listener;
    pn.addListener(listener);
    pn.subscribe({ channels: [channel], withPresence: true });
  }, [handleMessage]);

  const createRoom = useCallback((turnDuration: number = 60) => {
    if (!hasPubNubKeys()) {
      setState(prev => ({ ...prev, error: 'PubNub keys not configured' }));
      return null;
    }

    const roomCode = generateRoomCode();
    const userId = `player-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    userIdRef.current = userId;
    isHostRef.current = true;

    const pn = getPubNub(userId);
    pubnubRef.current = pn;
    const channel = getChannelName(roomCode);
    channelRef.current = channel;

    setState(prev => ({
      ...prev,
      roomCode,
      isHost: true,
      isConnecting: true,
      error: null,
      players: [{ id: userId, name: playerName, isReady: false }],
    }));

    subscribe(channel);
    startPingInterval();

    // Announce join after a short delay
    setTimeout(() => {
      publish({ type: 'JOIN', playerId: userId, playerName });
    }, 1000);

    return { roomCode, turnDuration };
  }, [playerName, subscribe, publish, startPingInterval]);

  const joinRoom = useCallback((roomCode: string) => {
    if (!hasPubNubKeys()) {
      setState(prev => ({ ...prev, error: 'PubNub keys not configured' }));
      return;
    }

    const userId = `player-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    userIdRef.current = userId;
    isHostRef.current = false;

    const pn = getPubNub(userId);
    pubnubRef.current = pn;
    const channel = getChannelName(roomCode);
    channelRef.current = channel;

    setState(prev => ({
      ...prev,
      roomCode,
      isHost: false,
      isConnecting: true,
      error: null,
      players: [{ id: userId, name: playerName, isReady: false }],
    }));

    subscribe(channel);
    startPingInterval();

    setTimeout(() => {
      publish({ type: 'JOIN', playerId: userId, playerName });
    }, 1000);
  }, [playerName, subscribe, publish, startPingInterval]);

  const setReady = useCallback(() => {
    publish({ type: 'READY', playerId: userIdRef.current });
    setState(prev => ({
      ...prev,
      players: prev.players.map(p => p.id === userIdRef.current ? { ...p, isReady: true } : p),
    }));
  }, [publish]);

  const sendChat = useCallback((message: string) => {
    const msg: GameMessage = { type: 'CHAT', playerId: userIdRef.current, playerName: playerNameRef.current, message };
    publish(msg);
    handleMessage(msg);
  }, [publish, handleMessage]);

  const sendEmoji = useCallback((emoji: string) => {
    const msg: GameMessage = { type: 'EMOJI', playerId: userIdRef.current, playerName: playerNameRef.current, emoji };
    publish(msg);
    handleMessage(msg);
  }, [publish, handleMessage]);

  const leaveRoom = useCallback(() => {
    publish({ type: 'PLAYER_LEFT', playerId: userIdRef.current, playerName: playerNameRef.current });
    cleanup();
    setState({
      roomCode: null,
      isHost: false,
      isConnected: false,
      isConnecting: false,
      players: [],
      error: null,
      gameStarted: false,
      chatMessages: [],
      occupancy: 0,
      isReconnecting: false,
    });
  }, [publish, cleanup]);

  const getUserId = useCallback(() => userIdRef.current, []);

  return {
    state,
    setState,
    createRoom,
    joinRoom,
    setReady,
    sendChat,
    sendEmoji,
    leaveRoom,
    publish,
    setMessageHandler,
    getUserId,
  };
}
