import { useDroppable } from '@dnd-kit/core';
import type { TileSet as TileSetType } from '../engine/types';
import TileSetComponent from './TileSet';
import { cn } from '../lib/utils';

interface GameBoardProps {
  table: TileSetType[];
  poolSize: number;
  highlightTileIds?: Set<string>;
}

export default function GameBoard({ table, poolSize, highlightTileIds }: GameBoardProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: 'table-new-set',
    data: { type: 'table-new-set' },
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'flex-1 rounded-lg sm:rounded-xl p-2 sm:p-4 overflow-auto transition-all relative',
        'border-2',
        isOver
          ? 'border-accent/50 bg-felt-light/80'
          : 'border-felt-light/30 bg-felt/80'
      )}
      style={{
        backgroundImage: `
          radial-gradient(ellipse at center, rgba(6, 95, 70, 0.9) 0%, rgba(6, 78, 59, 0.95) 100%),
          repeating-linear-gradient(0deg, transparent, transparent 20px, rgba(255,255,255,0.02) 20px, rgba(255,255,255,0.02) 21px),
          repeating-linear-gradient(90deg, transparent, transparent 20px, rgba(255,255,255,0.02) 20px, rgba(255,255,255,0.02) 21px)
        `,
      }}
    >
      {/* Pool indicator */}
      <div className="absolute top-2 right-3 flex items-center gap-1.5 text-white/60 text-xs">
        <div className="w-6 h-8 rounded bg-amber-800/60 border border-amber-600/40 flex items-center justify-center text-[10px] font-bold">
          {poolSize}
        </div>
        <span>tiles left</span>
      </div>

      {/* Sets on the table */}
      <div className="flex flex-wrap gap-2 sm:gap-3 min-h-[120px] sm:min-h-[200px] items-start content-start">
        {table.map(tileSet => (
          <TileSetComponent key={tileSet.id} tileSet={tileSet} highlightTileIds={highlightTileIds} />
        ))}

        {table.length === 0 && !isOver && (
          <div className="flex items-center justify-center w-full h-24 sm:h-48 text-emerald-300/40 text-sm sm:text-lg">
            Drag tiles here to play
          </div>
        )}

        {isOver && (
          <div className="flex items-center justify-center px-4 py-2 rounded-lg border-2 border-dashed border-accent/50 text-accent/70 text-sm">
            Drop to create new set
          </div>
        )}
      </div>
    </div>
  );
}
