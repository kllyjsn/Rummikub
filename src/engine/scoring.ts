import type { Tile } from './types';

export function calculatePenalty(rack: Tile[]): number {
  return rack.reduce((sum, tile) => {
    if (tile.isJoker) return sum + 30;
    return sum + tile.number;
  }, 0);
}

export function calculateScores(
  players: Array<{ id: string; rack: Tile[] }>,
  winnerId: string
): Record<string, number> {
  const scores: Record<string, number> = {};
  let totalPenalty = 0;

  for (const player of players) {
    if (player.id === winnerId) continue;
    const penalty = calculatePenalty(player.rack);
    scores[player.id] = -penalty;
    totalPenalty += penalty;
  }

  scores[winnerId] = totalPenalty;
  return scores;
}
