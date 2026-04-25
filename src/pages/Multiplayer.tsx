import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  DndContext,
  DragOverlay,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import { ArrowLeft, Undo2, SkipForward, Copy, Check } from 'lucide-react';
import { useMultiplayer } from '../multiplayer/useMultiplayer';
import type { GameMessage } from '../multiplayer/protocol';
import { useGameState } from '../hooks/useGameState';
import { useAudio } from '../hooks/useAudio';
import type { Tile } from '../engine/types';
import { generatePool, dealTiles, sortByNumber } from '../engine/tiles';
import { createSetId } from '../engine/gameReducer';
import GameBoard from '../components/GameBoard';
import TileRack from '../components/TileRack';
import TileComponent from '../components/Tile';
import Timer from '../components/Timer';
import ScoreBoard from '../components/ScoreBoard';
import GameOverModal from '../components/GameOverModal';
import ChatPanel from '../components/ChatPanel';

export default function Multiplayer() {
  const navigate = useNavigate();
  const location = useLocation();
  const playerName = (location.state as { playerName?: string })?.playerName || 'Player';

  const [turnDuration, setTurnDuration] = useState(60);
  const [joinCode, setJoinCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [activeTile, setActiveTile] = useState<Tile | null>(null);
  const [localPlayerIndex, setLocalPlayerIndex] = useState(0);

  const multiplayer = useMultiplayer(playerName);
  const {
    state: gameState,
    dispatch,
    sortRack,
    canEndTurn,
  } = useGameState();
  const audio = useAudio();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 150, tolerance: 5 },
    })
  );

  const isPlayerTurn = gameState.currentPlayerIndex === localPlayerIndex;
  const currentPlayer = gameState.players[localPlayerIndex];
  const winner = gameState.players.find(p => p.id === gameState.winner);

  const handleCopyCode = () => {
    if (multiplayer.state.roomCode) {
      navigator.clipboard.writeText(multiplayer.state.roomCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Handle incoming multiplayer messages
  const handleGameMessage = useCallback((msg: GameMessage) => {
    if (msg.type === 'START_GAME') {
      // Host starts the game - everyone receives dealt hands
      const playerOrder = msg.playerOrder;
      const idx = playerOrder.indexOf(multiplayer.getUserId());
      setLocalPlayerIndex(idx >= 0 ? idx : 0);
    }

    if (msg.type === 'DEAL_HAND') {
      if (msg.targetPlayerId === multiplayer.getUserId()) {
        // We received our hand
        dispatch({
          type: 'SYNC_STATE',
          state: {
            ...gameState,
            players: gameState.players.map((p, i) =>
              i === localPlayerIndex ? { ...p, rack: sortByNumber(msg.tiles) } : p
            ),
            table: msg.table,
            turnStartTable: msg.table,
            turnStartRack: sortByNumber(msg.tiles),
            phase: 'playing',
          },
        });
      }
    }

    if (msg.type === 'TURN_END') {
      // Another player ended their turn
      dispatch({
        type: 'SYNC_STATE',
        state: {
          ...gameState,
          table: msg.newTable,
          turnStartTable: msg.newTable.map(s => ({ ...s, tiles: [...s.tiles] })),
          currentPlayerIndex: (gameState.currentPlayerIndex + 1) % gameState.players.length,
          turnTimeRemaining: gameState.turnDuration,
          players: gameState.players.map(p => {
            if (p.id === msg.playerId) {
              return {
                ...p,
                rack: p.rack.slice(0, msg.rackSize),
                hasInitialMeld: msg.hasInitialMeld,
              };
            }
            return p;
          }),
          turnStartRack: gameState.players[localPlayerIndex]?.rack ? [...gameState.players[localPlayerIndex].rack] : [],
          gameLog: msg.log ? [...gameState.gameLog, msg.log] : gameState.gameLog,
        },
      });
      audio.playNotification();
    }

    if (msg.type === 'DRAW_TILE') {
      dispatch({
        type: 'SYNC_STATE',
        state: {
          ...gameState,
          currentPlayerIndex: (gameState.currentPlayerIndex + 1) % gameState.players.length,
          turnTimeRemaining: gameState.turnDuration,
          players: gameState.players.map(p => {
            if (p.id === msg.playerId) {
              return { ...p, rack: Array(msg.newRackSize).fill(null) as unknown as Tile[] };
            }
            return p;
          }),
          turnStartRack: gameState.players[localPlayerIndex]?.rack ? [...gameState.players[localPlayerIndex].rack] : [],
          gameLog: msg.log ? [...gameState.gameLog, msg.log] : gameState.gameLog,
        },
      });
      audio.playNotification();
    }

    if (msg.type === 'GAME_OVER') {
      dispatch({
        type: 'SYNC_STATE',
        state: {
          ...gameState,
          phase: 'game_over',
          winner: msg.winnerId,
        },
      });
      audio.playWin();
    }
  }, [gameState, dispatch, localPlayerIndex, multiplayer, audio]);

  useEffect(() => {
    multiplayer.setMessageHandler(handleGameMessage);
  }, [handleGameMessage, multiplayer]);

  // Host starts the game
  const handleStartGame = () => {
    const players = multiplayer.state.players;
    if (players.length < 2) return;

    const pool = generatePool();
    let remaining = pool;
    const playerOrder = players.map(p => p.id);
    const playerNames: Record<string, string> = {};
    players.forEach(p => { playerNames[p.id] = p.name; });

    // Deal hands to all players
    const hands: Record<string, Tile[]> = {};
    for (const p of players) {
      const { dealt, remaining: rest } = dealTiles(remaining, 14);
      hands[p.id] = dealt;
      remaining = rest;
    }

    // Initialize local game state
    dispatch({
      type: 'SYNC_STATE',
      state: {
        players: players.map((p) => ({
          id: p.id,
          name: p.name,
          rack: p.id === multiplayer.getUserId() ? sortByNumber(hands[p.id]) : [],
          hasInitialMeld: false,
          isConnected: true,
        })),
        table: [],
        pool: remaining,
        currentPlayerIndex: 0,
        turnStartTable: [],
        turnStartRack: sortByNumber(hands[multiplayer.getUserId()]),
        phase: 'playing',
        turnTimeRemaining: turnDuration,
        turnDuration,
        winner: null,
        gameLog: [],
      },
    });

    const idx = playerOrder.indexOf(multiplayer.getUserId());
    setLocalPlayerIndex(idx >= 0 ? idx : 0);

    // Broadcast start
    multiplayer.publish({
      type: 'START_GAME',
      hostId: multiplayer.getUserId(),
      playerOrder,
      playerNames,
      poolSize: remaining.length,
      turnDuration,
    });

    // Send each player their hand
    for (const p of players) {
      if (p.id !== multiplayer.getUserId()) {
        multiplayer.publish({
          type: 'DEAL_HAND',
          targetPlayerId: p.id,
          tiles: hands[p.id],
          table: [],
        });
      }
    }

    multiplayer.setState(prev => ({ ...prev, gameStarted: true }));
  };

  // Game actions
  const handleEndTurn = () => {
    if (!canEndTurn() || !isPlayerTurn) {
      audio.playInvalid();
      return;
    }

    // Broadcast turn end
    multiplayer.publish({
      type: 'TURN_END',
      playerId: multiplayer.getUserId(),
      newTable: gameState.table,
      rackSize: currentPlayer.rack.length,
      hasInitialMeld: true,
      log: {
        playerId: currentPlayer.id,
        playerName: currentPlayer.name,
        action: 'play',
        tilesPlayed: gameState.turnStartRack.length - currentPlayer.rack.length,
        timestamp: Date.now(),
      },
    });

    // Check for win
    if (currentPlayer.rack.length === 0) {
      multiplayer.publish({
        type: 'GAME_OVER',
        winnerId: multiplayer.getUserId(),
        winnerName: playerName,
        scores: {},
      });
      dispatch({
        type: 'SYNC_STATE',
        state: { ...gameState, phase: 'game_over', winner: currentPlayer.id },
      });
      audio.playWin();
      return;
    }

    // Advance turn locally
    const nextIndex = (gameState.currentPlayerIndex + 1) % gameState.players.length;
    dispatch({
      type: 'SYNC_STATE',
      state: {
        ...gameState,
        currentPlayerIndex: nextIndex,
        turnStartTable: gameState.table.map(s => ({ ...s, tiles: [...s.tiles] })),
        turnStartRack: [...currentPlayer.rack],
        turnTimeRemaining: gameState.turnDuration,
        players: gameState.players.map((p, i) =>
          i === localPlayerIndex ? { ...p, hasInitialMeld: true } : p
        ),
      },
    });
    audio.playValidSet();
  };

  const handleDrawTile = () => {
    if (!isPlayerTurn || gameState.pool.length === 0) return;

    // Undo any changes
    const undoneTable = gameState.turnStartTable;
    const undoneRack = [...gameState.turnStartRack];

    // Draw from pool
    const [drawn, ...remaining] = gameState.pool;
    const newRack = [...undoneRack, drawn];

    multiplayer.publish({
      type: 'DRAW_TILE',
      playerId: multiplayer.getUserId(),
      newRackSize: newRack.length,
      log: {
        playerId: currentPlayer.id,
        playerName: currentPlayer.name,
        action: 'draw',
        timestamp: Date.now(),
      },
    });

    const nextIndex = (gameState.currentPlayerIndex + 1) % gameState.players.length;
    dispatch({
      type: 'SYNC_STATE',
      state: {
        ...gameState,
        table: undoneTable,
        pool: remaining,
        currentPlayerIndex: nextIndex,
        turnStartTable: undoneTable.map(s => ({ ...s, tiles: [...s.tiles] })),
        turnStartRack: [...newRack],
        turnTimeRemaining: gameState.turnDuration,
        players: gameState.players.map((p, i) =>
          i === localPlayerIndex ? { ...p, rack: newRack } : p
        ),
      },
    });
    audio.playTileDraw();
  };

  const handleUndo = () => {
    if (!isPlayerTurn) return;
    dispatch({
      type: 'SYNC_STATE',
      state: {
        ...gameState,
        table: gameState.turnStartTable.map(s => ({ ...s, tiles: [...s.tiles] })),
        players: gameState.players.map((p, i) =>
          i === localPlayerIndex ? { ...p, rack: [...gameState.turnStartRack] } : p
        ),
      },
    });
  };

  // Drag handlers (same as single player)
  const handleDragStart = (event: DragStartEvent) => {
    const data = event.active.data.current;
    if (data?.tile) setActiveTile(data.tile as Tile);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTile(null);
    if (!over || !isPlayerTurn) return;

    const activeData = active.data.current;
    const overData = over.data.current;

    if (activeData?.type === 'rack-tile' && overData?.type === 'table-new-set') {
      dispatch({ type: 'PLACE_TILE', tileId: activeData.tile.id, targetSetId: null, position: 0 });
      audio.playTilePlace();
      return;
    }

    if (activeData?.type === 'rack-tile' && overData?.type === 'set') {
      const setId = overData.setId as string;
      const targetSet = gameState.table.find(s => s.id === setId);
      dispatch({ type: 'PLACE_TILE', tileId: activeData.tile.id, targetSetId: setId, position: targetSet ? targetSet.tiles.length : 0 });
      audio.playTilePlace();
      return;
    }

    if (activeData?.type === 'rack-tile' && overData?.type === 'set-tile') {
      const setId = overData.setId as string;
      const targetSet = gameState.table.find(s => s.id === setId);
      if (targetSet) {
        const overTileId = (over.id as string).split('::')[1];
        const pos = targetSet.tiles.findIndex(t => t.id === overTileId);
        dispatch({ type: 'PLACE_TILE', tileId: activeData.tile.id, targetSetId: setId, position: pos >= 0 ? pos : targetSet.tiles.length });
        audio.playTilePlace();
      }
      return;
    }

    if (activeData?.type === 'set-tile' && overData?.type === 'table-new-set') {
      const newSetId = createSetId();
      dispatch({ type: 'MOVE_TILE_BETWEEN_SETS', tileId: activeData.tile.id, fromSetId: activeData.setId as string, toSetId: newSetId, position: 0 });
      audio.playTilePlace();
      return;
    }

    if (activeData?.type === 'set-tile' && overData?.type === 'set') {
      const toSetId = overData.setId as string;
      if (activeData.setId === toSetId) return;
      const targetSet = gameState.table.find(s => s.id === toSetId);
      dispatch({ type: 'MOVE_TILE_BETWEEN_SETS', tileId: activeData.tile.id, fromSetId: activeData.setId as string, toSetId, position: targetSet ? targetSet.tiles.length : 0 });
      audio.playTilePlace();
      return;
    }

    if (activeData?.type === 'set-tile' && overData?.type === 'rack') {
      dispatch({ type: 'REMOVE_FROM_SET', tileId: activeData.tile.id, setId: activeData.setId as string });
      audio.playTileDraw();
      return;
    }

    if (activeData?.type === 'rack-tile' && overData?.type === 'rack-tile') {
      if (!currentPlayer) return;
      const oldIndex = currentPlayer.rack.findIndex(t => t.id === activeData.tile.id);
      const newIndex = currentPlayer.rack.findIndex(t => t.id === overData.tile.id);
      if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
        const newRack = arrayMove(currentPlayer.rack, oldIndex, newIndex);
        dispatch({
          type: 'SYNC_STATE',
          state: {
            ...gameState,
            players: gameState.players.map((p, i) =>
              i === localPlayerIndex ? { ...p, rack: newRack } : p
            ),
          },
        });
      }
      return;
    }

    if (activeData?.type === 'set-tile' && overData?.type === 'set-tile') {
      const fromSetId = activeData.setId as string;
      const toSetId = overData.setId as string;
      if (fromSetId === toSetId) {
        const set = gameState.table.find(s => s.id === fromSetId);
        if (!set) return;
        const oldIdx = set.tiles.findIndex(t => t.id === activeData.tile.id);
        const overTileId = (over.id as string).split('::')[1];
        const newIdx = set.tiles.findIndex(t => t.id === overTileId);
        if (oldIdx !== -1 && newIdx !== -1 && oldIdx !== newIdx) {
          const newTiles = arrayMove(set.tiles, oldIdx, newIdx);
          dispatch({
            type: 'SYNC_STATE',
            state: {
              ...gameState,
              table: gameState.table.map(s =>
                s.id === fromSetId ? { ...s, tiles: newTiles } : s
              ),
            },
          });
        }
      } else {
        const overTileId = (over.id as string).split('::')[1];
        const targetSet = gameState.table.find(s => s.id === toSetId);
        const pos = targetSet?.tiles.findIndex(t => t.id === overTileId) ?? 0;
        dispatch({ type: 'MOVE_TILE_BETWEEN_SETS', tileId: activeData.tile.id, fromSetId, toSetId, position: pos >= 0 ? pos : 0 });
        audio.playTilePlace();
      }
    }
  };

  // Lobby UI
  if (!multiplayer.state.gameStarted && gameState.phase !== 'playing') {
    return (
      <div className="h-full flex flex-col items-center justify-center px-4 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
        <div className="max-w-md w-full">
          <button
            onClick={() => { multiplayer.leaveRoom(); navigate('/'); }}
            className="flex items-center gap-1 text-slate-400 hover:text-white mb-6 transition-colors"
          >
            <ArrowLeft size={16} />
            <span className="text-sm">Back</span>
          </button>

          {!multiplayer.state.roomCode ? (
            <>
              <h2 className="text-2xl font-bold text-white mb-6">Multiplayer</h2>
              <div className="space-y-4">
                <div>
                  <label className="text-sm text-slate-400 mb-2 block">Turn Timer</label>
                  <div className="flex gap-2">
                    {[0, 30, 60, 90].map(t => (
                      <button
                        key={t}
                        onClick={() => setTurnDuration(t)}
                        className={`px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${
                          turnDuration === t
                            ? 'bg-accent/20 border border-accent text-accent'
                            : 'bg-slate-800 border border-slate-700 text-slate-400 hover:text-white'
                        }`}
                      >
                        {t === 0 ? 'Off' : `${t}s`}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  onClick={() => multiplayer.createRoom(turnDuration)}
                  className="w-full px-6 py-4 rounded-xl bg-accent hover:bg-accent-dark text-slate-900 font-bold text-lg transition-colors"
                >
                  Create Room
                </button>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-slate-700" />
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="bg-slate-950 px-4 text-slate-500">or</span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={joinCode}
                    onChange={e => setJoinCode(e.target.value.toUpperCase())}
                    placeholder="Enter room code"
                    maxLength={6}
                    className="flex-1 px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 text-white text-center text-lg font-mono uppercase placeholder-slate-500 outline-none focus:border-accent/50 tracking-widest"
                  />
                  <button
                    onClick={() => joinCode.length === 6 && multiplayer.joinRoom(joinCode)}
                    disabled={joinCode.length !== 6}
                    className="px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition-colors disabled:opacity-30"
                  >
                    Join
                  </button>
                </div>
              </div>
            </>
          ) : (
            <>
              <h2 className="text-2xl font-bold text-white mb-2">Game Lobby</h2>

              {/* Room code */}
              <div className="flex items-center gap-3 mb-6">
                <div className="bg-slate-800 border border-slate-700 rounded-xl px-6 py-3 text-2xl font-mono font-bold tracking-[0.3em] text-accent">
                  {multiplayer.state.roomCode}
                </div>
                <button
                  onClick={handleCopyCode}
                  className="p-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                >
                  {copied ? <Check size={18} className="text-valid" /> : <Copy size={18} />}
                </button>
              </div>

              {/* Players */}
              <div className="space-y-2 mb-6">
                <h3 className="text-sm font-semibold text-slate-400">
                  Players ({multiplayer.state.players.length}/4)
                </h3>
                {multiplayer.state.players.map(player => (
                  <div
                    key={player.id}
                    className="flex items-center justify-between px-4 py-2.5 rounded-lg bg-slate-800/60 border border-slate-700/50"
                  >
                    <span className="font-semibold text-white">
                      {player.name}
                      {player.id === multiplayer.getUserId() && (
                        <span className="text-xs text-slate-400 ml-2">(you)</span>
                      )}
                    </span>
                    {player.isReady ? (
                      <span className="text-xs font-bold text-valid">READY</span>
                    ) : (
                      <span className="text-xs text-slate-500">waiting...</span>
                    )}
                  </div>
                ))}
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                {!multiplayer.state.players.find(p => p.id === multiplayer.getUserId())?.isReady && (
                  <button
                    onClick={multiplayer.setReady}
                    className="flex-1 px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition-colors"
                  >
                    Ready
                  </button>
                )}
                {multiplayer.state.isHost &&
                  multiplayer.state.players.length >= 2 &&
                  multiplayer.state.players.every(p => p.isReady) && (
                  <button
                    onClick={handleStartGame}
                    className="flex-1 px-6 py-3 rounded-xl bg-accent hover:bg-accent-dark text-slate-900 font-bold transition-colors"
                  >
                    Start Game
                  </button>
                )}
              </div>

              {multiplayer.state.error && (
                <p className="mt-4 text-sm text-invalid text-center">
                  {multiplayer.state.error}
                </p>
              )}
            </>
          )}
        </div>
      </div>
    );
  }

  // Game UI
  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="h-full flex flex-col bg-slate-950">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2 bg-slate-900/80 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <button
              onClick={() => { multiplayer.leaveRoom(); navigate('/'); }}
              className="text-slate-400 hover:text-white transition-colors"
            >
              <ArrowLeft size={18} />
            </button>
            <h1 className="text-lg font-bold text-white">
              <span className="text-tile-red">R</span>
              <span className="text-tile-blue">u</span>
              <span className="text-tile-orange">m</span>
              <span className="text-slate-300">m</span>
              <span className="text-tile-red">i</span>
              <span className="text-accent">Cube</span>
            </h1>
            <span className="text-xs text-slate-500 font-mono">
              {multiplayer.state.roomCode}
            </span>
          </div>

          <ScoreBoard
            players={gameState.players}
            currentPlayerIndex={gameState.currentPlayerIndex}
            localPlayerIndex={localPlayerIndex}
          />

          <div className="flex items-center gap-2">
            <Timer
              timeRemaining={gameState.turnTimeRemaining}
              totalTime={gameState.turnDuration}
              isActive={isPlayerTurn && gameState.phase === 'playing'}
            />
            <ChatPanel
              messages={multiplayer.state.chatMessages}
              onSendMessage={multiplayer.sendChat}
              onSendEmoji={multiplayer.sendEmoji}
              localPlayerId={multiplayer.getUserId()}
            />
          </div>
        </div>

        {/* Reconnecting banner */}
        {multiplayer.state.isReconnecting && (
          <div className="bg-amber-900/30 px-4 py-1.5 text-center text-sm text-amber-300 border-b border-amber-800/30">
            Reconnecting<span className="animate-pulse">...</span>
          </div>
        )}

        {/* Game board */}
        <div className="flex-1 p-3 overflow-hidden">
          <GameBoard table={gameState.table} poolSize={gameState.pool.length} />
        </div>

        {/* Player rack */}
        <div className="px-3 pb-2">
          <TileRack
            tiles={currentPlayer?.rack || []}
            onSortByNumber={() => sortRack('number')}
            onSortByColor={() => sortRack('color')}
            isCurrentPlayer={isPlayerTurn}
          />
        </div>

        {/* Action bar */}
        <div className="flex items-center justify-between px-4 py-2 bg-slate-900/80 border-t border-slate-800">
          <button
            onClick={handleUndo}
            disabled={!isPlayerTurn}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 text-sm font-semibold disabled:opacity-30 transition-colors"
          >
            <Undo2 size={14} />
            Undo
          </button>

          <div className="flex gap-2">
            <button
              onClick={handleDrawTile}
              disabled={!isPlayerTurn || gameState.pool.length === 0}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 text-sm font-semibold disabled:opacity-30 transition-colors"
            >
              Draw Tile
            </button>
            <button
              onClick={handleEndTurn}
              disabled={!isPlayerTurn || !canEndTurn()}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-accent hover:bg-accent-dark text-slate-900 text-sm font-bold disabled:opacity-30 transition-colors"
            >
              <SkipForward size={14} />
              End Turn
            </button>
          </div>
        </div>
      </div>

      <DragOverlay>
        {activeTile && <TileComponent tile={activeTile} isDragging className="dragging-tile" />}
      </DragOverlay>

      <GameOverModal
        isOpen={gameState.phase === 'game_over'}
        winner={winner || null}
        players={gameState.players}
        localPlayerId={currentPlayer?.id || ''}
        onRematch={() => { /* TODO: rematch flow */ navigate('/'); }}
        onHome={() => { multiplayer.leaveRoom(); navigate('/'); }}
      />
    </DndContext>
  );
}
