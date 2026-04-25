import { useState, useEffect, useCallback, useRef } from 'react';
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
import { ArrowLeft, Undo2, SkipForward } from 'lucide-react';
import { useGameState } from '../hooks/useGameState';
import { useAudio } from '../hooks/useAudio';
import type { Tile } from '../engine/types';
import { findAIPlay, type AIDifficulty } from '../engine/ai';
import { createSetId } from '../engine/gameReducer';
import { cn } from '../lib/utils';
import GameBoard from '../components/GameBoard';
import TileRack from '../components/TileRack';
import TileComponent from '../components/Tile';
import Timer from '../components/Timer';
import ScoreBoard from '../components/ScoreBoard';
import GameOverModal from '../components/GameOverModal';

type DifficultyOption = { label: string; value: AIDifficulty; description: string };

const DIFFICULTIES: DifficultyOption[] = [
  { label: 'Casual', value: 'casual', description: 'Relaxed play, obvious moves only' },
  { label: 'Standard', value: 'standard', description: 'Smart plays, moderate manipulation' },
  { label: 'Expert', value: 'expert', description: 'Optimal strategy, deep manipulation' },
];

export default function SinglePlayer() {
  const navigate = useNavigate();
  const location = useLocation();
  const playerName = (location.state as { playerName?: string })?.playerName || 'Player';

  const [difficulty, setDifficulty] = useState<AIDifficulty>('standard');
  const [turnDuration, setTurnDuration] = useState(60);
  const [gameStarted, setGameStarted] = useState(false);
  const [activeTile, setActiveTile] = useState<Tile | null>(null);
  const [aiThinking, setAiThinking] = useState(false);
  const [aiPlayedTileIds, setAiPlayedTileIds] = useState<Set<string>>(new Set());
  const [aiPlayMessage, setAiPlayMessage] = useState<string | null>(null);
  const aiTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const {
    state,
    dispatch,
    startGame,
    placeTile,
    endTurn,
    drawTile,
    undoTurn,
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

  const isPlayerTurn = state.currentPlayerIndex === 0;
  const currentPlayer = state.players[0];
  const winner = state.players.find(p => p.id === state.winner);

  // Start game
  const handleStart = () => {
    startGame(2, turnDuration);
    setGameStarted(true);
  };

  // Actually start with names once state is ready
  useEffect(() => {
    if (gameStarted && state.phase === 'playing' && state.players.length === 2) {
      if (state.players[0].name === 'Player 1') {
        dispatch({
          type: 'SYNC_STATE',
          state: {
            ...state,
            players: state.players.map((p, i) => ({
              ...p,
              name: i === 0 ? playerName : `AI (${difficulty})`,
            })),
          },
        });
      }
    }
  }, [gameStarted, state.phase, state.players, playerName, difficulty, dispatch, state]);

  // AI turn
  const runAITurn = useCallback(() => {
    if (state.phase !== 'playing' || state.currentPlayerIndex !== 1) return;

    setAiThinking(true);
    aiTimeoutRef.current = setTimeout(() => {
      const play = findAIPlay(state, 1, difficulty);

      if (play && play.tilesToPlace.length > 0) {
        // Track played tiles for animation
        const playedIds = new Set(play.tilesToPlace.map(t => t.id));
        setAiPlayedTileIds(playedIds);

        // Place tiles from rack to table (new sets or extending existing ones)
        let newState = { ...state };
        const newTable = play.modifiedTable;
        const newRack = state.players[1].rack.filter(t => !playedIds.has(t.id));

        newState = {
          ...newState,
          table: newTable,
          players: newState.players.map((p, i) =>
            i === 1 ? { ...p, rack: newRack, hasInitialMeld: true } : p
          ),
        };

        // Show play message
        setAiPlayMessage(`AI played ${play.tilesToPlace.length} tile${play.tilesToPlace.length > 1 ? 's' : ''}!`);
        audio.playTilePlace();

        // Dispatch table + rack update immediately so tiles render with highlights
        dispatch({
          type: 'SYNC_STATE',
          state: {
            ...newState,
            gameLog: [
              ...newState.gameLog,
              {
                playerId: state.players[1].id,
                playerName: state.players[1].name,
                action: newRack.length === 0 ? 'win' : 'play',
                tilesPlayed: play.tilesToPlace.length,
                timestamp: Date.now(),
              },
            ],
            ...(newRack.length === 0
              ? { phase: 'game_over' as const, winner: state.players[1].id }
              : {}),
          },
        });

        // After a pause, clear highlights and advance to player's turn
        setTimeout(() => {
          setAiPlayedTileIds(new Set());
          setAiPlayMessage(null);
          setAiThinking(false);
          if (newRack.length > 0) {
            dispatch({
              type: 'SYNC_STATE',
              state: {
                ...newState,
                currentPlayerIndex: 0,
                turnStartTable: newTable.map(s => ({ ...s, tiles: [...s.tiles] })),
                turnStartRack: [...state.players[0].rack],
                turnTimeRemaining: state.turnDuration,
                gameLog: [
                  ...newState.gameLog,
                  {
                    playerId: state.players[1].id,
                    playerName: state.players[1].name,
                    action: 'play',
                    tilesPlayed: play.tilesToPlace.length,
                    timestamp: Date.now(),
                  },
                ],
              },
            });
          }
        }, 800);
        return;
      } else {
        // AI draws — show message
        setAiPlayMessage('AI drew a tile');
        drawTile();
        audio.playTileDraw();
        setTimeout(() => setAiPlayMessage(null), 600);
      }

      setAiPlayedTileIds(new Set());
      setAiPlayMessage(null);
      setAiThinking(false);
    }, 400 + Math.random() * 400);
  }, [state, difficulty, dispatch, drawTile, audio]);

  useEffect(() => {
    if (state.phase === 'playing' && state.currentPlayerIndex === 1 && !aiThinking) {
      const id = setTimeout(() => runAITurn(), 0);
      return () => {
        clearTimeout(id);
        if (aiTimeoutRef.current) clearTimeout(aiTimeoutRef.current);
      };
    }
    return () => {
      if (aiTimeoutRef.current) clearTimeout(aiTimeoutRef.current);
    };
  }, [state.currentPlayerIndex, state.phase, runAITurn, aiThinking]);

  // Drag handlers
  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const data = active.data.current;
    if (data?.tile) {
      setActiveTile(data.tile as Tile);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTile(null);
    if (!over || !isPlayerTurn) return;

    const activeData = active.data.current;
    const overData = over.data.current;

    // Rack tile → table (new set)
    if (activeData?.type === 'rack-tile' && overData?.type === 'table-new-set') {
      placeTile(activeData.tile.id, null, 0);
      audio.playTilePlace();
      return;
    }

    // Rack tile → existing set
    if (activeData?.type === 'rack-tile' && overData?.type === 'set') {
      const setId = overData.setId as string;
      const targetSet = state.table.find(s => s.id === setId);
      placeTile(activeData.tile.id, setId, targetSet ? targetSet.tiles.length : 0);
      audio.playTilePlace();
      return;
    }

    // Rack tile → set tile (insert position)
    if (activeData?.type === 'rack-tile' && overData?.type === 'set-tile') {
      const setId = overData.setId as string;
      const targetSet = state.table.find(s => s.id === setId);
      if (targetSet) {
        const overTileId = (over.id as string).split('::')[1];
        const pos = targetSet.tiles.findIndex(t => t.id === overTileId);
        placeTile(activeData.tile.id, setId, pos >= 0 ? pos : targetSet.tiles.length);
        audio.playTilePlace();
      }
      return;
    }

    // Set tile → new set on table
    if (activeData?.type === 'set-tile' && overData?.type === 'table-new-set') {
      const fromSetId = activeData.setId as string;
      const tileId = activeData.tile.id;
      const newSetId = createSetId();
      dispatch({
        type: 'MOVE_TILE_BETWEEN_SETS',
        tileId,
        fromSetId,
        toSetId: newSetId,
        position: 0,
      });
      audio.playTilePlace();
      return;
    }

    // Set tile → another set
    if (activeData?.type === 'set-tile' && overData?.type === 'set') {
      const fromSetId = activeData.setId as string;
      const toSetId = overData.setId as string;
      if (fromSetId === toSetId) return;
      const tileId = activeData.tile.id;
      const targetSet = state.table.find(s => s.id === toSetId);
      dispatch({
        type: 'MOVE_TILE_BETWEEN_SETS',
        tileId,
        fromSetId,
        toSetId,
        position: targetSet ? targetSet.tiles.length : 0,
      });
      audio.playTilePlace();
      return;
    }

    // Set tile → rack (return to rack)
    if (activeData?.type === 'set-tile' && overData?.type === 'rack') {
      dispatch({
        type: 'REMOVE_FROM_SET',
        tileId: activeData.tile.id,
        setId: activeData.setId as string,
      });
      audio.playTileDraw();
      return;
    }

    // Rack reorder
    if (activeData?.type === 'rack-tile' && overData?.type === 'rack-tile') {
      if (!currentPlayer) return;
      const oldIndex = currentPlayer.rack.findIndex(t => t.id === activeData.tile.id);
      const newIndex = currentPlayer.rack.findIndex(t => t.id === overData.tile.id);
      if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
        const newRack = arrayMove(currentPlayer.rack, oldIndex, newIndex);
        dispatch({
          type: 'SYNC_STATE',
          state: {
            ...state,
            players: state.players.map((p, i) =>
              i === 0 ? { ...p, rack: newRack } : p
            ),
          },
        });
      }
      return;
    }

    // Reorder within same set
    if (activeData?.type === 'set-tile' && overData?.type === 'set-tile') {
      const fromSetId = activeData.setId as string;
      const toSetId = overData.setId as string;

      if (fromSetId === toSetId) {
        const set = state.table.find(s => s.id === fromSetId);
        if (!set) return;
        const oldIdx = set.tiles.findIndex(t => t.id === activeData.tile.id);
        const overTileId = (over.id as string).split('::')[1];
        const newIdx = set.tiles.findIndex(t => t.id === overTileId);
        if (oldIdx !== -1 && newIdx !== -1 && oldIdx !== newIdx) {
          const newTiles = arrayMove(set.tiles, oldIdx, newIdx);
          dispatch({
            type: 'SYNC_STATE',
            state: {
              ...state,
              table: state.table.map(s =>
                s.id === fromSetId ? { ...s, tiles: newTiles } : s
              ),
            },
          });
        }
      } else {
        // Move between sets
        const overTileId = (over.id as string).split('::')[1];
        const targetSet = state.table.find(s => s.id === toSetId);
        const pos = targetSet?.tiles.findIndex(t => t.id === overTileId) ?? 0;
        dispatch({
          type: 'MOVE_TILE_BETWEEN_SETS',
          tileId: activeData.tile.id,
          fromSetId,
          toSetId,
          position: pos >= 0 ? pos : 0,
        });
        audio.playTilePlace();
      }
      return;
    }
  };

  const handleEndTurn = () => {
    if (canEndTurn()) {
      endTurn();
      audio.playValidSet();
    } else {
      audio.playInvalid();
    }
  };

  const handleDrawTile = () => {
    drawTile();
    audio.playTileDraw();
  };

  const handleUndo = () => {
    undoTurn();
  };

  const handleRematch = () => {
    startGame(2, turnDuration);
    setGameStarted(true);
  };

  // Pre-game difficulty selection
  if (!gameStarted) {
    return (
      <div className="h-full flex flex-col items-center justify-center px-4 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
        <div className="max-w-md w-full">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-1 text-slate-400 hover:text-white mb-6 transition-colors"
          >
            <ArrowLeft size={16} />
            <span className="text-sm">Back</span>
          </button>

          <h2 className="text-2xl font-bold text-white mb-6">Single Player Setup</h2>

          <div className="space-y-4">
            <div>
              <label className="text-sm text-slate-400 mb-2 block">Difficulty</label>
              <div className="grid gap-2">
                {DIFFICULTIES.map(d => (
                  <button
                    key={d.value}
                    onClick={() => setDifficulty(d.value)}
                    className={`px-4 py-3 rounded-lg text-left transition-colors ${
                      difficulty === d.value
                        ? 'bg-accent/20 border-2 border-accent text-white'
                        : 'bg-slate-800 border-2 border-slate-700 text-slate-300 hover:border-slate-600'
                    }`}
                  >
                    <div className="font-semibold">{d.label}</div>
                    <div className="text-xs text-slate-400">{d.description}</div>
                  </button>
                ))}
              </div>
            </div>

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
              onClick={handleStart}
              className="w-full mt-4 px-6 py-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-lg transition-colors shadow-lg"
            >
              Start Game
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="h-full flex flex-col bg-slate-950">
        {/* Header */}
        <div className="flex items-center justify-between px-2 sm:px-4 py-1.5 sm:py-2 bg-slate-900/80 border-b border-slate-800">
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={() => navigate('/')}
              className="text-slate-400 hover:text-white transition-colors"
            >
              <ArrowLeft size={18} />
            </button>
            <h1 className="hidden sm:block text-lg font-bold text-white">
              <span className="text-tile-red">R</span>
              <span className="text-tile-blue">u</span>
              <span className="text-tile-orange">m</span>
              <span className="text-slate-300">m</span>
              <span className="text-tile-red">i</span>
              <span className="text-accent">Cube</span>
            </h1>
          </div>

          <ScoreBoard
            players={state.players}
            currentPlayerIndex={state.currentPlayerIndex}
            localPlayerIndex={0}
          />

          <Timer
            timeRemaining={state.turnTimeRemaining}
            totalTime={state.turnDuration}
            isActive={isPlayerTurn && state.phase === 'playing'}
          />
        </div>

        {/* AI status indicator */}
        {(aiThinking || aiPlayMessage) && (
          <div className={cn(
            'px-4 py-1.5 text-center text-sm border-b transition-all',
            aiPlayMessage && !aiThinking
              ? 'bg-emerald-900/30 text-emerald-300 border-emerald-800/30'
              : 'bg-amber-900/30 text-amber-300 border-amber-800/30'
          )}>
            {aiPlayMessage || <>AI is thinking<span className="animate-pulse">...</span></>}
          </div>
        )}

        {/* Game board */}
        <div className="flex-1 p-1.5 sm:p-3 overflow-hidden">
          <GameBoard table={state.table} poolSize={state.pool.length} highlightTileIds={aiPlayedTileIds} />
        </div>

        {/* Player rack */}
        <div className="px-1.5 sm:px-3 pb-1.5 sm:pb-2">
          <TileRack
            tiles={currentPlayer?.rack || []}
            onSortByNumber={() => sortRack('number')}
            onSortByColor={() => sortRack('color')}
            isCurrentPlayer={isPlayerTurn}
          />
        </div>

        {/* Action bar */}
        <div className="flex items-center justify-between px-2 sm:px-4 py-1.5 sm:py-2 bg-slate-900/80 border-t border-slate-800">
          <div className="flex gap-1.5 sm:gap-2">
            <button
              onClick={handleUndo}
              disabled={!isPlayerTurn}
              className="flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs sm:text-sm font-semibold disabled:opacity-30 transition-colors"
            >
              <Undo2 size={14} />
              Undo
            </button>
          </div>

          <div className="flex gap-1.5 sm:gap-2">
            <button
              onClick={handleDrawTile}
              disabled={!isPlayerTurn || state.pool.length === 0}
              className="flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs sm:text-sm font-semibold disabled:opacity-30 transition-colors"
            >
              Draw
            </button>
            <button
              onClick={handleEndTurn}
              disabled={!isPlayerTurn || !canEndTurn()}
              className="flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-lg bg-accent hover:bg-accent-dark text-slate-900 text-xs sm:text-sm font-bold disabled:opacity-30 transition-colors"
            >
              <SkipForward size={14} />
              End Turn
            </button>
          </div>
        </div>
      </div>

      {/* Drag overlay */}
      <DragOverlay>
        {activeTile && <TileComponent tile={activeTile} isDragging className="dragging-tile" />}
      </DragOverlay>

      {/* Game over */}
      <GameOverModal
        isOpen={state.phase === 'game_over'}
        winner={winner || null}
        players={state.players}
        localPlayerId={currentPlayer?.id || ''}
        onRematch={handleRematch}
        onHome={() => navigate('/')}
      />
    </DndContext>
  );
}
