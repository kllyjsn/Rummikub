import { useDroppable } from '@dnd-kit/core';
import {
  SortableContext,
  horizontalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Tile as TileType } from '../engine/types';
import TileComponent from './Tile';
import { cn } from '../lib/utils';

interface SortableTileProps {
  tile: TileType;
}

function SortableTile({ tile }: SortableTileProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: tile.id, data: { type: 'rack-tile', tile } });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <TileComponent tile={tile} isDragging={isDragging} />
    </div>
  );
}

interface TileRackProps {
  tiles: TileType[];
  onSortByNumber: () => void;
  onSortByColor: () => void;
  isCurrentPlayer: boolean;
}

export default function TileRack({
  tiles,
  onSortByNumber,
  onSortByColor,
  isCurrentPlayer,
}: TileRackProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: 'rack',
    data: { type: 'rack' },
  });

  return (
    <div
      className={cn(
        'rounded-xl p-2 sm:p-3 transition-colors',
        isCurrentPlayer
          ? 'bg-amber-900/40 border-2 border-amber-600/50'
          : 'bg-slate-800/50 border-2 border-slate-700/30',
        isOver && 'border-amber-400/70 bg-amber-900/60'
      )}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-amber-200">
            Your Rack ({tiles.length} tiles)
          </span>
        </div>
        <div className="flex gap-1">
          <button
            onClick={onSortByNumber}
            className="px-2 py-0.5 text-xs rounded bg-slate-700 hover:bg-slate-600 text-slate-300 transition-colors"
          >
            Sort #
          </button>
          <button
            onClick={onSortByColor}
            className="px-2 py-0.5 text-xs rounded bg-slate-700 hover:bg-slate-600 text-slate-300 transition-colors"
          >
            Sort Color
          </button>
        </div>
      </div>

      <div
        ref={setNodeRef}
        className="flex flex-wrap gap-1 min-h-[60px] tile-rack-scroll"
      >
        <SortableContext
          items={tiles.map(t => t.id)}
          strategy={horizontalListSortingStrategy}
        >
          {tiles.map(tile => (
            <SortableTile key={tile.id} tile={tile} />
          ))}
        </SortableContext>
        {tiles.length === 0 && (
          <div className="flex items-center justify-center w-full text-slate-500 text-sm italic">
            Empty rack — you win!
          </div>
        )}
      </div>
    </div>
  );
}
