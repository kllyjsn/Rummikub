import { cn } from '../lib/utils';

interface TimerProps {
  timeRemaining: number;
  totalTime: number;
  isActive: boolean;
}

export default function Timer({ timeRemaining, totalTime, isActive }: TimerProps) {
  if (totalTime <= 0) return null;

  const percentage = (timeRemaining / totalTime) * 100;
  const isLow = timeRemaining <= 10;
  const isCritical = timeRemaining <= 5;

  const minutes = Math.floor(timeRemaining / 60);
  const seconds = timeRemaining % 60;
  const display = minutes > 0
    ? `${minutes}:${seconds.toString().padStart(2, '0')}`
    : `${seconds}`;

  return (
    <div
      className={cn(
        'flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all',
        isActive
          ? isCritical
            ? 'bg-red-900/60 animate-heartbeat'
            : isLow
            ? 'bg-amber-900/40'
            : 'bg-slate-800/50'
          : 'bg-slate-800/30 opacity-50'
      )}
    >
      <div className="relative w-20 h-2 bg-slate-700 rounded-full overflow-hidden">
        <div
          className={cn(
            'absolute inset-y-0 left-0 rounded-full transition-all duration-1000',
            isCritical
              ? 'bg-red-500'
              : isLow
              ? 'bg-amber-500'
              : 'bg-emerald-500'
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <span
        className={cn(
          'text-sm font-mono font-bold tabular-nums min-w-[2rem] text-center',
          isCritical ? 'text-red-400' : isLow ? 'text-amber-400' : 'text-slate-300'
        )}
      >
        {display}
      </span>
    </div>
  );
}
