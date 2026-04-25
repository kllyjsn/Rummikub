import type { GameState, GameAction, TileSet, Player } from './types';
import { generatePool, dealTiles, sortByNumber, sortByColor } from './tiles';
import { isTableValid, calculateMeldValue } from './validation';
import { INITIAL_MELD_THRESHOLD } from './types';

let setIdCounter = 0;
export function createSetId(): string {
  return `set-${++setIdCounter}`;
}

function createInitialState(): GameState {
  return {
    players: [],
    table: [],
    pool: [],
    currentPlayerIndex: 0,
    turnStartTable: [],
    turnStartRack: [],
    phase: 'waiting',
    turnTimeRemaining: 60,
    turnDuration: 60,
    winner: null,
    gameLog: [],
  };
}

export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'DEAL': {
      const pool = generatePool();
      const players: Player[] = [];
      let remaining = pool;

      for (let i = 0; i < action.playerCount; i++) {
        const { dealt, remaining: rest } = dealTiles(remaining, 14);
        players.push({
          id: `player-${i}`,
          name: `Player ${i + 1}`,
          rack: sortByNumber(dealt),
          hasInitialMeld: false,
          isConnected: true,
        });
        remaining = rest;
      }

      return {
        ...createInitialState(),
        players,
        pool: remaining,
        phase: 'playing',
        turnDuration: action.turnDuration,
        turnTimeRemaining: action.turnDuration,
        turnStartTable: [],
        turnStartRack: [...players[0].rack],
      };
    }

    case 'PLACE_TILE': {
      const player = state.players[state.currentPlayerIndex];
      const tileIndex = player.rack.findIndex(t => t.id === action.tileId);
      if (tileIndex === -1) return state;

      const tile = player.rack[tileIndex];
      const newRack = player.rack.filter((_, i) => i !== tileIndex);
      let newTable = [...state.table];

      if (action.targetSetId) {
        newTable = newTable.map(set => {
          if (set.id !== action.targetSetId) return set;
          const newTiles = [...set.tiles];
          newTiles.splice(action.position, 0, tile);
          return { ...set, tiles: newTiles };
        });
      } else {
        const newSet: TileSet = { id: createSetId(), tiles: [tile] };
        newTable.push(newSet);
      }

      const newPlayers = state.players.map((p, i) =>
        i === state.currentPlayerIndex ? { ...p, rack: newRack } : p
      );

      return { ...state, players: newPlayers, table: newTable };
    }

    case 'MOVE_TILE_BETWEEN_SETS': {
      const fromSet = state.table.find(s => s.id === action.fromSetId);
      if (!fromSet) return state;

      const tileIdx = fromSet.tiles.findIndex(t => t.id === action.tileId);
      if (tileIdx === -1) return state;

      const tile = fromSet.tiles[tileIdx];
      let newTable = state.table.map(set => {
        if (set.id === action.fromSetId) {
          return { ...set, tiles: set.tiles.filter((_, i) => i !== tileIdx) };
        }
        if (set.id === action.toSetId) {
          const newTiles = [...set.tiles];
          newTiles.splice(action.position, 0, tile);
          return { ...set, tiles: newTiles };
        }
        return set;
      });

      // If target is a new set
      if (!state.table.find(s => s.id === action.toSetId)) {
        newTable.push({ id: action.toSetId, tiles: [tile] });
      }

      // Remove empty sets
      newTable = newTable.filter(s => s.tiles.length > 0);

      return { ...state, table: newTable };
    }

    case 'REMOVE_FROM_SET': {
      const set = state.table.find(s => s.id === action.setId);
      if (!set) return state;

      const tile = set.tiles.find(t => t.id === action.tileId);
      if (!tile) return state;

      const newTable = state.table
        .map(s => {
          if (s.id !== action.setId) return s;
          return { ...s, tiles: s.tiles.filter(t => t.id !== action.tileId) };
        })
        .filter(s => s.tiles.length > 0);

      const newPlayers = state.players.map((p, i) =>
        i === state.currentPlayerIndex ? { ...p, rack: [...p.rack, tile] } : p
      );

      return { ...state, players: newPlayers, table: newTable };
    }

    case 'END_TURN': {
      if (!isTableValid(state.table)) {
        return gameReducer(state, { type: 'UNDO_TURN' });
      }

      const player = state.players[state.currentPlayerIndex];

      // Check initial meld requirement
      if (!player.hasInitialMeld) {
        const newSets = state.table.filter(
          ts => !state.turnStartTable.find(sts => sts.id === ts.id)
        );
        const meldValue = calculateMeldValue(newSets);
        if (meldValue < INITIAL_MELD_THRESHOLD) {
          return gameReducer(state, { type: 'UNDO_TURN' });
        }
      }

      // Check for win
      if (player.rack.length === 0) {
        return {
          ...state,
          phase: 'game_over',
          winner: player.id,
          players: state.players.map((p, i) =>
            i === state.currentPlayerIndex ? { ...p, hasInitialMeld: true } : p
          ),
          gameLog: [
            ...state.gameLog,
            {
              playerId: player.id,
              playerName: player.name,
              action: 'win',
              timestamp: Date.now(),
            },
          ],
        };
      }

      const tilesPlayed = state.turnStartRack.length - player.rack.length;
      const nextIndex = (state.currentPlayerIndex + 1) % state.players.length;
      const nextPlayer = state.players[nextIndex];

      return {
        ...state,
        currentPlayerIndex: nextIndex,
        turnStartTable: state.table.map(s => ({ ...s, tiles: [...s.tiles] })),
        turnStartRack: [...nextPlayer.rack],
        turnTimeRemaining: state.turnDuration,
        players: state.players.map((p, i) =>
          i === state.currentPlayerIndex
            ? { ...p, hasInitialMeld: true }
            : p
        ),
        gameLog: [
          ...state.gameLog,
          {
            playerId: player.id,
            playerName: player.name,
            action: tilesPlayed > 0 ? (player.hasInitialMeld ? 'play' : 'initial_meld') : 'draw',
            tilesPlayed,
            timestamp: Date.now(),
          },
        ],
      };
    }

    case 'DRAW_TILE': {
      if (state.pool.length === 0) return state;

      // First undo any changes made this turn
      const undoneState = gameReducer(state, { type: 'UNDO_TURN' });

      const [drawnTile, ...remainingPool] = undoneState.pool;
      const newPlayers = undoneState.players.map((p, i) =>
        i === undoneState.currentPlayerIndex ? { ...p, rack: [...p.rack, drawnTile] } : p
      );

      const nextIndex = (undoneState.currentPlayerIndex + 1) % undoneState.players.length;
      const nextPlayer = newPlayers[nextIndex];
      const currentPlayer = newPlayers[undoneState.currentPlayerIndex];

      return {
        ...undoneState,
        players: newPlayers,
        pool: remainingPool,
        currentPlayerIndex: nextIndex,
        turnStartTable: undoneState.table.map(s => ({ ...s, tiles: [...s.tiles] })),
        turnStartRack: [...nextPlayer.rack],
        turnTimeRemaining: undoneState.turnDuration,
        gameLog: [
          ...undoneState.gameLog,
          {
            playerId: currentPlayer.id,
            playerName: currentPlayer.name,
            action: 'draw',
            timestamp: Date.now(),
          },
        ],
      };
    }

    case 'UNDO_TURN': {
      // Collect all tiles that were placed on the table this turn
      const currentTileIds = new Set(
        state.table.flatMap(s => s.tiles.map(t => t.id))
      );
      const startTileIds = new Set(
        state.turnStartTable.flatMap(s => s.tiles.map(t => t.id))
      );

      // Tiles that are on the table now but weren't at turn start = tiles from rack
      const tilesFromRack: string[] = [];
      currentTileIds.forEach(id => {
        if (!startTileIds.has(id)) tilesFromRack.push(id);
      });

      const newPlayers = state.players.map((p, i) =>
        i === state.currentPlayerIndex
          ? { ...p, rack: [...state.turnStartRack] }
          : p
      );

      // Also return any tiles that were removed from table to rack
      // by restoring the turn start table exactly
      return {
        ...state,
        table: state.turnStartTable.map(s => ({
          ...s,
          tiles: [...s.tiles],
        })),
        players: newPlayers,
      };
    }

    case 'SORT_RACK': {
      const sortFn = action.sortBy === 'number' ? sortByNumber : sortByColor;
      const newPlayers = state.players.map((p, i) =>
        i === state.currentPlayerIndex ? { ...p, rack: sortFn(p.rack) } : p
      );
      return { ...state, players: newPlayers };
    }

    case 'TICK_TIMER': {
      if (state.phase !== 'playing') return state;
      const newTime = state.turnTimeRemaining - 1;
      if (newTime <= 0) {
        if (state.pool.length > 0) {
          return gameReducer(state, { type: 'DRAW_TILE' });
        }
        // Pool empty — undo changes and advance turn without drawing
        const undoneState = gameReducer(state, { type: 'UNDO_TURN' });
        const nextIdx = (undoneState.currentPlayerIndex + 1) % undoneState.players.length;
        const nextP = undoneState.players[nextIdx];
        return {
          ...undoneState,
          currentPlayerIndex: nextIdx,
          turnStartTable: undoneState.table.map(s => ({ ...s, tiles: [...s.tiles] })),
          turnStartRack: [...nextP.rack],
          turnTimeRemaining: undoneState.turnDuration,
        };
      }
      return { ...state, turnTimeRemaining: newTime };
    }

    case 'SYNC_STATE': {
      return action.state;
    }

    default:
      return state;
  }
}

export { createInitialState };
