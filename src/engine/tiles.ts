import type { Tile, TileColor } from './types';
import { TILE_COLORS } from './types';

let tileIdCounter = 0;

export function createTileId(): string {
  return `tile-${++tileIdCounter}`;
}

export function resetTileIdCounter(): void {
  tileIdCounter = 0;
}

export function createTile(color: TileColor, number: number): Tile {
  return { id: createTileId(), color, number, isJoker: false };
}

export function createJoker(): Tile {
  return { id: createTileId(), color: 'black', number: 0, isJoker: true };
}

export function generatePool(): Tile[] {
  resetTileIdCounter();
  const tiles: Tile[] = [];

  // 2 sets of tiles 1-13 in each of 4 colors
  for (let set = 0; set < 2; set++) {
    for (const color of TILE_COLORS) {
      for (let num = 1; num <= 13; num++) {
        tiles.push(createTile(color, num));
      }
    }
  }

  // 2 jokers
  tiles.push(createJoker());
  tiles.push(createJoker());

  return tiles;
}

export function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export function dealTiles(pool: Tile[], count: number): { dealt: Tile[]; remaining: Tile[] } {
  const shuffled = shuffleArray(pool);
  return {
    dealt: shuffled.slice(0, count),
    remaining: shuffled.slice(count),
  };
}

export function sortByNumber(tiles: Tile[]): Tile[] {
  return [...tiles].sort((a, b) => {
    if (a.isJoker && !b.isJoker) return 1;
    if (!a.isJoker && b.isJoker) return -1;
    if (a.number !== b.number) return a.number - b.number;
    return TILE_COLORS.indexOf(a.color) - TILE_COLORS.indexOf(b.color);
  });
}

export function sortByColor(tiles: Tile[]): Tile[] {
  return [...tiles].sort((a, b) => {
    if (a.isJoker && !b.isJoker) return 1;
    if (!a.isJoker && b.isJoker) return -1;
    const colorDiff = TILE_COLORS.indexOf(a.color) - TILE_COLORS.indexOf(b.color);
    if (colorDiff !== 0) return colorDiff;
    return a.number - b.number;
  });
}
