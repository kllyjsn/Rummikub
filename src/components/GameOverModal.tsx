import { motion, AnimatePresence } from 'framer-motion';
import type { Player } from '../engine/types';
import { calculatePenalty } from '../engine/scoring';
import { cn } from '../lib/utils';

interface GameOverModalProps {
  isOpen: boolean;
  winner: Player | null;
  players: Player[];
  localPlayerId: string;
  onRematch: () => void;
  onHome: () => void;
}

export default function GameOverModal({
  isOpen,
  winner,
  players,
  localPlayerId,
  onRematch,
  onHome,
}: GameOverModalProps) {
  if (!winner) return null;

  const isLocalWinner = winner.id === localPlayerId;

  const playerScores = players
    .map(p => ({
      ...p,
      score: p.id === winner.id ? 0 : -calculatePenalty(p.rack),
    }))
    .sort((a, b) => b.score - a.score);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ type: 'spring', damping: 20, stiffness: 300 }}
            className="bg-slate-900 border border-slate-700 rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl"
          >
            {/* Confetti-like decorations */}
            <div className="text-center mb-6">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: 'spring' }}
                className="text-5xl mb-2"
              >
                {isLocalWinner ? '🏆' : '😔'}
              </motion.div>
              <h2 className="text-2xl font-bold text-white mb-1">
                {isLocalWinner ? 'You Win!' : `${winner.name} Wins!`}
              </h2>
              <p className="text-slate-400 text-sm">
                {isLocalWinner
                  ? 'Congratulations! You played all your tiles!'
                  : 'Better luck next time!'}
              </p>
            </div>

            {/* Scores */}
            <div className="space-y-2 mb-6">
              <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wide">
                Final Scores
              </h3>
              {playerScores.map((player, index) => (
                <div
                  key={player.id}
                  className={cn(
                    'flex items-center justify-between px-4 py-2 rounded-lg',
                    index === 0 ? 'bg-accent/20 border border-accent/30' : 'bg-slate-800/50'
                  )}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-lg">
                      {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : ''}
                    </span>
                    <span className={cn(
                      'font-semibold',
                      player.id === localPlayerId ? 'text-blue-300' : 'text-white'
                    )}>
                      {player.id === localPlayerId ? 'You' : player.name}
                    </span>
                  </div>
                  <span className={cn(
                    'font-mono font-bold',
                    player.score >= 0 ? 'text-valid' : 'text-invalid'
                  )}>
                    {player.score >= 0 ? `+${player.score}` : player.score}
                  </span>
                </div>
              ))}
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={onRematch}
                className="flex-1 px-4 py-3 rounded-xl bg-accent hover:bg-accent-dark text-slate-900 font-bold transition-colors"
              >
                Rematch
              </button>
              <button
                onClick={onHome}
                className="flex-1 px-4 py-3 rounded-xl bg-slate-700 hover:bg-slate-600 text-white font-semibold transition-colors"
              >
                Home
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
