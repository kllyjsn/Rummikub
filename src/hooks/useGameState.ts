import { useReducer, useCallback, useEffect, useRef } from 'react';
import { gameReducer, createInitialState, createSetId } from '../engine/gameReducer';
import type { GameState, TileSet } from '../engine/types';
import { isTableValid, classifySet } from '../engine/validation';

export function useGameState() {
  const [state, dispatch] = useReducer(gameReducer, createInitialState());
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startGame = useCallback((playerCount: number, turnDuration: number) => {
    dispatch({ type: 'DEAL', playerCount, turnDuration });
  }, []);

  const placeTile = useCallback((tileId: string, targetSetId: string | null, position: number = 0) => {
    dispatch({ type: 'PLACE_TILE', tileId, targetSetId, position });
  }, []);

  const placeTileNewSet = useCallback((tileId: string) => {
    const newSetId = createSetId();
    dispatch({ type: 'PLACE_TILE', tileId, targetSetId: null, position: 0 });
    return newSetId;
  }, []);

  const moveTileBetweenSets = useCallback((tileId: string, fromSetId: string, toSetId: string, position: number) => {
    dispatch({ type: 'MOVE_TILE_BETWEEN_SETS', tileId, fromSetId, toSetId, position });
  }, []);

  const removeFromSet = useCallback((tileId: string, setId: string) => {
    dispatch({ type: 'REMOVE_FROM_SET', tileId, setId });
  }, []);

  const endTurn = useCallback(() => {
    dispatch({ type: 'END_TURN' });
  }, []);

  const drawTile = useCallback(() => {
    dispatch({ type: 'DRAW_TILE' });
  }, []);

  const undoTurn = useCallback(() => {
    dispatch({ type: 'UNDO_TURN' });
  }, []);

  const sortRack = useCallback((sortBy: 'number' | 'color') => {
    dispatch({ type: 'SORT_RACK', sortBy });
  }, []);

  const syncState = useCallback((newState: GameState) => {
    dispatch({ type: 'SYNC_STATE', state: newState });
  }, []);

  const canEndTurn = useCallback((): boolean => {
    return isTableValid(state.table);
  }, [state.table]);

  const getSetValidity = useCallback((tileSet: TileSet): boolean => {
    if (tileSet.tiles.length < 3) return false;
    return classifySet(tileSet) !== 'invalid';
  }, []);

  // Timer management
  useEffect(() => {
    if (state.phase === 'playing' && state.turnDuration > 0) {
      timerRef.current = setInterval(() => {
        dispatch({ type: 'TICK_TIMER' });
      }, 1000);
    }
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [state.phase, state.currentPlayerIndex, state.turnDuration]);

  return {
    state,
    dispatch,
    startGame,
    placeTile,
    placeTileNewSet,
    moveTileBetweenSets,
    removeFromSet,
    endTurn,
    drawTile,
    undoTurn,
    sortRack,
    syncState,
    canEndTurn,
    getSetValidity,
  };
}
