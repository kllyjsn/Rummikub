import type { Player } from '../engine/types';
import { cn } from '../lib/utils';

interface ScoreBoardProps {
  players: Player[];
  currentPlayerIndex: number;
  localPlayerIndex: number;
}

export default function ScoreBoard({
  players,
  currentPlayerIndex,
  localPlayerIndex,
}: ScoreBoardProps) {
  return (
    <div className="flex items-center gap-2">
      {players.map((player, index) => (
        <div
          key={player.id}
          className={cn(
            'flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-all',
            index === currentPlayerIndex
              ? 'bg-accent/20 border border-accent/50 text-accent'
              : 'bg-slate-800/40 border border-slate-700/30 text-slate-400',
            index === localPlayerIndex && 'ring-1 ring-blue-400/40'
          )}
        >
          <span className="font-semibold truncate max-w-[100px]">
            {index === localPlayerIndex ? 'You' : player.name}
          </span>
          <span
            className={cn(
              'flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold',
              index === currentPlayerIndex
                ? 'bg-accent/30 text-accent'
                : 'bg-slate-700 text-slate-300'
            )}
          >
            {player.rack.length}
          </span>
          {!player.hasInitialMeld && (
            <span className="text-[10px] text-amber-400/70" title="Needs 30+ initial meld">
              30+
            </span>
          )}
          {index === currentPlayerIndex && (
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-accent" />
            </span>
          )}
        </div>
      ))}
    </div>
  );
}
