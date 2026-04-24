import type { Tile, TileSet, GameState } from './types';
import { TILE_COLORS } from './types';
import { isValidGroup, isValidRun, isTableValid } from './validation';
import { createSetId } from './gameReducer';

export type AIDifficulty = 'casual' | 'standard' | 'expert';

interface PossiblePlay {
  tilesToPlace: Tile[];
  newSets: TileSet[];
  modifiedTable: TileSet[];
}

export function findAIPlay(
  state: GameState,
  playerIndex: number,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _difficulty: AIDifficulty
): PossiblePlay | null {
  const player = state.players[playerIndex];
  const rack = [...player.rack];

  // Find all possible groups and runs from rack tiles
  const plays = findPlaysFromRack(rack, state.table, player.hasInitialMeld);

  if (plays.length === 0) return null;

  // Sort by number of tiles placed (most tiles = best play)
  plays.sort((a, b) => b.tilesToPlace.length - a.tilesToPlace.length);

  return plays[0];
}

function findPlaysFromRack(
  rack: Tile[],
  table: TileSet[],
  hasInitialMeld: boolean
): PossiblePlay[] {
  const plays: PossiblePlay[] = [];

  // Strategy 1: Find complete groups from rack
  const groups = findGroups(rack);
  for (const group of groups) {
    const newSet: TileSet = { id: createSetId(), tiles: group };
    if (!hasInitialMeld) {
      const value = group.reduce((s, t) => s + (t.isJoker ? 0 : t.number), 0);
      if (value < 30) continue;
    }
    plays.push({
      tilesToPlace: group,
      newSets: [newSet],
      modifiedTable: [...table, newSet],
    });
  }

  // Strategy 2: Find complete runs from rack
  const runs = findRuns(rack);
  for (const run of runs) {
    const newSet: TileSet = { id: createSetId(), tiles: run };
    if (!hasInitialMeld) {
      const value = run.reduce((s, t) => s + (t.isJoker ? 0 : t.number), 0);
      if (value < 30) continue;
    }
    plays.push({
      tilesToPlace: run,
      newSets: [newSet],
      modifiedTable: [...table, newSet],
    });
  }

  // Strategy 3: Add to existing sets on the table
  if (hasInitialMeld) {
    for (const tile of rack) {
      for (const set of table) {
        // Try adding to the end
        const extendedEnd: TileSet = { ...set, tiles: [...set.tiles, tile] };
        if (extendedEnd.tiles.length >= 3 && (isValidGroup(extendedEnd.tiles) || isValidRun(extendedEnd.tiles))) {
          const modifiedTable = table.map(s => s.id === set.id ? extendedEnd : s);
          if (isTableValid(modifiedTable)) {
            plays.push({
              tilesToPlace: [tile],
              newSets: [],
              modifiedTable,
            });
          }
        }

        // Try adding to the beginning
        const extendedStart: TileSet = { ...set, tiles: [tile, ...set.tiles] };
        if (extendedStart.tiles.length >= 3 && (isValidGroup(extendedStart.tiles) || isValidRun(extendedStart.tiles))) {
          const modifiedTable = table.map(s => s.id === set.id ? extendedStart : s);
          if (isTableValid(modifiedTable)) {
            plays.push({
              tilesToPlace: [tile],
              newSets: [],
              modifiedTable,
            });
          }
        }
      }
    }
  }

  // Strategy 4: Find combined groups + runs
  const combined = findCombinedPlays(rack);
  for (const combo of combined) {
    if (!hasInitialMeld) {
      const totalValue = combo.reduce(
        (s, set) => s + set.tiles.reduce((ss, t) => ss + (t.isJoker ? 0 : t.number), 0),
        0
      );
      if (totalValue < 30) continue;
    }
    const allTiles = combo.flatMap(s => s.tiles);
    plays.push({
      tilesToPlace: allTiles,
      newSets: combo,
      modifiedTable: [...table, ...combo],
    });
  }

  return plays;
}

function findGroups(tiles: Tile[]): Tile[][] {
  const groups: Tile[][] = [];
  const byNumber = new Map<number, Tile[]>();

  for (const tile of tiles) {
    if (tile.isJoker) continue;
    const existing = byNumber.get(tile.number) || [];
    existing.push(tile);
    byNumber.set(tile.number, existing);
  }

  for (const [, sameTiles] of byNumber) {
    // Get unique colors
    const uniqueByColor = new Map<string, Tile>();
    for (const t of sameTiles) {
      if (!uniqueByColor.has(t.color)) {
        uniqueByColor.set(t.color, t);
      }
    }

    const unique = Array.from(uniqueByColor.values());
    if (unique.length >= 3) {
      // Try all combinations of 3 and 4
      if (unique.length >= 4) {
        groups.push(unique.slice(0, 4));
      }
      // All 3-tile combinations
      for (let i = 0; i < unique.length; i++) {
        for (let j = i + 1; j < unique.length; j++) {
          for (let k = j + 1; k < unique.length; k++) {
            groups.push([unique[i], unique[j], unique[k]]);
          }
        }
      }
    }
  }

  return groups;
}

function findRuns(tiles: Tile[]): Tile[][] {
  const runs: Tile[][] = [];

  for (const color of TILE_COLORS) {
    const colorTiles = tiles
      .filter(t => !t.isJoker && t.color === color)
      .sort((a, b) => a.number - b.number);

    // Remove duplicates (keep first of each number)
    const unique: Tile[] = [];
    const seen = new Set<number>();
    for (const t of colorTiles) {
      if (!seen.has(t.number)) {
        seen.add(t.number);
        unique.push(t);
      }
    }

    // Find consecutive sequences of length 3+
    for (let start = 0; start < unique.length; start++) {
      const run: Tile[] = [unique[start]];
      for (let end = start + 1; end < unique.length; end++) {
        if (unique[end].number === unique[end - 1].number + 1) {
          run.push(unique[end]);
        } else {
          break;
        }
      }
      if (run.length >= 3) {
        runs.push([...run]);
        // Also add sub-runs
        for (let len = 3; len < run.length; len++) {
          for (let s = 0; s <= run.length - len; s++) {
            runs.push(run.slice(s, s + len));
          }
        }
      }
    }
  }

  return runs;
}

function findCombinedPlays(tiles: Tile[]): TileSet[][] {
  const results: TileSet[][] = [];
  const groups = findGroups(tiles);
  const runs = findRuns(tiles);

  // Try each group + each run if they don't share tiles
  for (const group of groups) {
    for (const run of runs) {
      const groupIds = new Set(group.map(t => t.id));
      const overlap = run.some(t => groupIds.has(t.id));
      if (!overlap) {
        results.push([
          { id: createSetId(), tiles: group },
          { id: createSetId(), tiles: run },
        ]);
      }
    }
  }

  return results;
}
