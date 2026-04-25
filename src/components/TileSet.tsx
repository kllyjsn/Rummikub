import { useDroppable } from '@dnd-kit/core';
import {
  SortableContext,
  horizontalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { TileSet as TileSetType } from '../engine/types';
import TileComponent from './Tile';
import { classifySet } from '../engine/validation';
import { cn } from '../lib/utils';

interface SortableSetTileProps {
  tileId: string;
  tile: { id: string; color: string; number: number; isJoker: boolean };
  setId: string;
  isHighlighted?: boolean;
  animationDelay?: number;
}

function SortableSetTile({ tileId, tile, setId, isHighlighted, animationDelay }: SortableSetTileProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: `${setId}::${tileId}`,
    data: { type: 'set-tile', tile, setId },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <TileComponent
        tile={tile as import('../engine/types').Tile}
        isDragging={isDragging}
        isHighlighted={isHighlighted}
        animationDelay={animationDelay}
      />
    </div>
  );
}

interface TileSetComponentProps {
  tileSet: TileSetType;
  highlightTileIds?: Set<string>;
}

export default function TileSetComponent({ tileSet, highlightTileIds }: TileSetComponentProps) {
  const setType = classifySet(tileSet);
  const isValid = setType !== 'invalid';
  const isTooSmall = tileSet.tiles.length < 3;

  const { setNodeRef, isOver } = useDroppable({
    id: `set-drop-${tileSet.id}`,
    data: { type: 'set', setId: tileSet.id },
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'inline-flex items-center gap-0.5 p-1.5 rounded-lg border-2 transition-all',
        isValid && !isTooSmall
          ? 'border-valid/40 bg-valid/10'
          : isTooSmall
          ? 'border-amber-500/40 bg-amber-500/10'
          : 'border-invalid/40 bg-invalid/10 animate-shake',
        isOver && 'border-accent/60 bg-accent/20 scale-105'
      )}
    >
      <SortableContext
        items={tileSet.tiles.map(t => `${tileSet.id}::${t.id}`)}
        strategy={horizontalListSortingStrategy}
      >
        {tileSet.tiles.map((tile, idx) => (
          <SortableSetTile
            key={tile.id}
            tileId={tile.id}
            tile={tile}
            setId={tileSet.id}
            isHighlighted={highlightTileIds?.has(tile.id)}
            animationDelay={highlightTileIds?.has(tile.id) ? idx * 0.1 : undefined}
          />
        ))}
      </SortableContext>

      {/* Set type indicator */}
      <div className="ml-1 flex flex-col items-center">
        <span
          className={cn(
            'text-[10px] font-bold uppercase',
            isValid && !isTooSmall ? 'text-valid' : isTooSmall ? 'text-amber-400' : 'text-invalid'
          )}
        >
          {isTooSmall ? `${tileSet.tiles.length}/3` : setType === 'group' ? 'GRP' : setType === 'run' ? 'RUN' : '???'}
        </span>
      </div>
    </div>
  );
}
