import type { TileSet, GameLogEntry, Tile } from '../engine/types';

export type GameMessage =
  | { type: 'JOIN'; playerId: string; playerName: string }
  | { type: 'READY'; playerId: string }
  | { type: 'START_GAME'; hostId: string; playerOrder: string[]; playerNames: Record<string, string>; poolSize: number; turnDuration: number }
  | { type: 'DEAL_HAND'; targetPlayerId: string; tiles: Tile[]; table: TileSet[] }
  | { type: 'TURN_END'; playerId: string; newTable: TileSet[]; rackSize: number; hasInitialMeld: boolean; log: GameLogEntry }
  | { type: 'DRAW_TILE'; playerId: string; newRackSize: number; log: GameLogEntry }
  | { type: 'GAME_OVER'; winnerId: string; winnerName: string; scores: Record<string, number> }
  | { type: 'CHAT'; playerId: string; playerName: string; message: string }
  | { type: 'EMOJI'; playerId: string; playerName: string; emoji: string }
  | { type: 'PING' }
  | { type: 'PONG'; playerId: string }
  | { type: 'REMATCH_REQUEST'; playerId: string }
  | { type: 'REMATCH_ACCEPT'; playerId: string }
  | { type: 'PLAYER_LEFT'; playerId: string; playerName: string }
  | { type: 'SYNC_REQUEST'; playerId: string }
  | { type: 'KICK'; playerId: string };
