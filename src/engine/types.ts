export type TileColor = 'black' | 'red' | 'blue' | 'orange';

export interface Tile {
  id: string;
  color: TileColor;
  number: number;
  isJoker: boolean;
}

export interface TileSet {
  id: string;
  tiles: Tile[];
}

export type SetType = 'group' | 'run' | 'invalid';

export interface Player {
  id: string;
  name: string;
  rack: Tile[];
  hasInitialMeld: boolean;
  isConnected: boolean;
}

export interface GameState {
  players: Player[];
  table: TileSet[];
  pool: Tile[];
  currentPlayerIndex: number;
  turnStartTable: TileSet[];
  turnStartRack: Tile[];
  phase: GamePhase;
  turnTimeRemaining: number;
  turnDuration: number;
  winner: string | null;
  gameLog: GameLogEntry[];
}

export type GamePhase = 'waiting' | 'playing' | 'game_over';

export interface GameLogEntry {
  playerId: string;
  playerName: string;
  action: 'play' | 'draw' | 'initial_meld' | 'win';
  tilesPlayed?: number;
  timestamp: number;
}

export type GameAction =
  | { type: 'DEAL'; playerCount: number; turnDuration: number }
  | { type: 'PLACE_TILE'; tileId: string; targetSetId: string | null; position: number }
  | { type: 'MOVE_TILE_BETWEEN_SETS'; tileId: string; fromSetId: string; toSetId: string; position: number }
  | { type: 'REMOVE_FROM_SET'; tileId: string; setId: string }
  | { type: 'END_TURN' }
  | { type: 'DRAW_TILE' }
  | { type: 'UNDO_TURN' }
  | { type: 'SORT_RACK'; sortBy: 'number' | 'color' }
  | { type: 'TICK_TIMER' }
  | { type: 'SYNC_STATE'; state: GameState };

export interface MultiplayerMessage {
  type: string;
  playerId?: string;
  playerName?: string;
  gameState?: SerializedGameState;
  turnOrder?: string[];
  newTable?: TileSet[];
  tilesPlayed?: number;
  message?: string;
  emoji?: string;
  scores?: Record<string, number>;
  rack?: Tile[];
}

export interface SerializedGameState {
  players: Array<{ id: string; name: string; tileCount: number; hasInitialMeld: boolean; isConnected: boolean }>;
  table: TileSet[];
  poolSize: number;
  currentPlayerIndex: number;
  phase: GamePhase;
  turnDuration: number;
  gameLog: GameLogEntry[];
}

export interface ChatMessage {
  id: string;
  playerId: string;
  playerName: string;
  message: string;
  timestamp: number;
  isEmoji?: boolean;
}

export const TILE_COLORS: TileColor[] = ['black', 'red', 'blue', 'orange'];

export const COLOR_HEX: Record<TileColor, string> = {
  black: '#1e293b',
  red: '#dc2626',
  blue: '#2563eb',
  orange: '#ea580c',
};

export const INITIAL_MELD_THRESHOLD = 30;
