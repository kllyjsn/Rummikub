import type { Tile, TileSet, SetType, TileColor } from './types';
import { TILE_COLORS } from './types';

export function classifySet(tileSet: TileSet): SetType {
  const { tiles } = tileSet;
  if (tiles.length < 3) return 'invalid';

  if (isValidGroup(tiles)) return 'group';
  if (isValidRun(tiles)) return 'run';
  return 'invalid';
}

export function isValidGroup(tiles: Tile[]): boolean {
  if (tiles.length < 3 || tiles.length > 4) return false;

  const nonJokers = tiles.filter(t => !t.isJoker);
  const jokerCount = tiles.length - nonJokers.length;

  if (nonJokers.length === 0) return tiles.length >= 3;

  // All non-jokers must have the same number
  const number = nonJokers[0].number;
  if (!nonJokers.every(t => t.number === number)) return false;

  // All non-jokers must have different colors
  const colors = new Set(nonJokers.map(t => t.color));
  if (colors.size !== nonJokers.length) return false;

  // Total distinct colors (non-jokers + jokers filling gaps) must not exceed 4
  const availableColors = TILE_COLORS.filter(c => !colors.has(c));
  if (jokerCount > availableColors.length) return false;

  return true;
}

export function isValidRun(tiles: Tile[]): boolean {
  if (tiles.length < 3) return false;

  const nonJokers = tiles.filter(t => !t.isJoker);
  if (nonJokers.length === 0) return tiles.length >= 3;

  // All non-jokers must be the same color
  const color = nonJokers[0].color;
  if (!nonJokers.every(t => t.color === color)) return false;

  // Try to find a valid arrangement with jokers filling gaps
  return canFormRun(tiles, color);
}

function canFormRun(tiles: Tile[], color: TileColor): boolean {
  const nonJokers = tiles.filter(t => !t.isJoker);
  const jokerCount = tiles.length - nonJokers.length;

  // Sort non-jokers by number
  const sorted = nonJokers
    .filter(t => t.color === color)
    .sort((a, b) => a.number - b.number);

  if (sorted.length === 0) {
    return jokerCount >= 3;
  }

  // Check for duplicate numbers among non-jokers
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i].number === sorted[i - 1].number) return false;
  }

  // Calculate gaps between consecutive non-jokers
  let gapsNeeded = 0;
  for (let i = 1; i < sorted.length; i++) {
    const gap = sorted[i].number - sorted[i - 1].number - 1;
    gapsNeeded += gap;
  }

  // We need jokers to fill internal gaps
  // Remaining jokers can extend the run at either end
  if (gapsNeeded > jokerCount) return false;

  const remainingJokers = jokerCount - gapsNeeded;
  const runLength = sorted[sorted.length - 1].number - sorted[0].number + 1 + remainingJokers;

  // Check bounds: run must fit within 1-13
  const minStart = Math.max(1, sorted[0].number - remainingJokers);
  const maxEnd = Math.min(13, sorted[sorted.length - 1].number + remainingJokers);
  const maxPossibleLength = maxEnd - minStart + 1;

  return runLength >= tiles.length && maxPossibleLength >= tiles.length;
}

export function isTableValid(table: TileSet[]): boolean {
  return table.every(set => set.tiles.length >= 3 && classifySet(set) !== 'invalid');
}

export function getSetValue(tileSet: TileSet): number {
  const classification = classifySet(tileSet);
  if (classification === 'invalid') return 0;

  if (classification === 'group') {
    const nonJokers = tileSet.tiles.filter(t => !t.isJoker);
    const number = nonJokers.length > 0 ? nonJokers[0].number : 0;
    return number * tileSet.tiles.length;
  }

  // Run: sum of all numbers in the sequence
  return getRunValue(tileSet.tiles);
}

function getRunValue(tiles: Tile[]): number {
  const nonJokers = tiles.filter(t => !t.isJoker).sort((a, b) => a.number - b.number);
  const jokerCount = tiles.length - nonJokers.length;

  if (nonJokers.length === 0) return 0;

  // Reconstruct the full run
  let total = 0;
  let jokersUsed = 0;

  // Fill in from the first non-joker
  const numbers: number[] = [];
  let pos = 0;
  for (let i = 0; i < nonJokers.length; i++) {
    if (i === 0) {
      numbers.push(nonJokers[i].number);
      pos = nonJokers[i].number;
    } else {
      // Fill gaps with jokers
      while (pos + 1 < nonJokers[i].number && jokersUsed < jokerCount) {
        pos++;
        numbers.push(pos);
        jokersUsed++;
      }
      numbers.push(nonJokers[i].number);
      pos = nonJokers[i].number;
    }
  }

  // Place remaining jokers at the end
  while (jokersUsed < jokerCount) {
    pos++;
    if (pos <= 13) {
      numbers.push(pos);
    } else {
      // Place at the beginning
      const minNum = numbers[0] - 1;
      if (minNum >= 1) {
        numbers.unshift(minNum);
      }
    }
    jokersUsed++;
  }

  for (const n of numbers) total += n;
  return total;
}

export function calculateMeldValue(sets: TileSet[]): number {
  return sets.reduce((sum, set) => sum + getSetValue(set), 0);
}

export function findTileInSets(table: TileSet[], tileId: string): { setIndex: number; tileIndex: number } | null {
  for (let si = 0; si < table.length; si++) {
    const ti = table[si].tiles.findIndex(t => t.id === tileId);
    if (ti !== -1) return { setIndex: si, tileIndex: ti };
  }
  return null;
}
