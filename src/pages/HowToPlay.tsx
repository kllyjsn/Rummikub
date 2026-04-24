import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';

const sections = [
  {
    title: 'The Tiles',
    content: `The game uses 106 tiles: numbers 1-13 in four colors (black, red, blue, orange), with 2 copies of each tile, plus 2 jokers. Each player starts with 14 tiles on their rack.`,
  },
  {
    title: 'Objective',
    content: `Be the first player to play all the tiles from your rack onto the table by forming valid sets. When a player empties their rack, they win!`,
  },
  {
    title: 'Valid Sets',
    content: `There are two types of valid sets:
    
    Groups: 3 or 4 tiles with the same number but different colors.
    Example: Red 7, Blue 7, Black 7
    
    Runs: 3 or more consecutive numbers in the same color.
    Example: Blue 3, Blue 4, Blue 5, Blue 6`,
  },
  {
    title: 'Initial Meld',
    content: `Your very first play must total at least 30 points. The point value of each tile is its face number. You can play multiple sets in your first turn to reach 30. After your initial meld, you can play any valid move.`,
  },
  {
    title: 'Table Manipulation',
    content: `This is where Rummikub gets exciting! After your initial meld, you can rearrange existing sets on the table to incorporate your tiles. You can:
    
    - Add tiles to existing sets
    - Split a run into two runs
    - Take tiles from sets (as long as remaining sets stay valid)
    - Combine parts of different sets
    
    The only rule: when you end your turn, ALL sets on the table must be valid.`,
  },
  {
    title: 'Jokers',
    content: `Jokers can substitute for any tile. A joker in a set can be replaced by the specific tile it represents — the player who replaces it takes the joker for their own use. Jokers left on your rack at game end count as 30 penalty points.`,
  },
  {
    title: 'Drawing',
    content: `If you can't or don't want to play any tiles, you must draw one tile from the pool. This ends your turn. Any changes you made to the table will be reverted.`,
  },
  {
    title: 'Winning & Scoring',
    content: `The first player to empty their rack wins! Remaining players count the value of tiles left on their racks as penalty points (jokers = 30 each). The winner receives points equal to the sum of all other players' penalties.`,
  },
  {
    title: 'Tips & Strategy',
    content: `- Keep an eye on what tiles other players need
    - Don't be afraid to manipulate the table creatively
    - Save jokers for big plays
    - Try to maintain flexibility in your rack
    - Watch the pool counter — when it's empty, every turn matters!`,
  },
];

export default function HowToPlay() {
  const navigate = useNavigate();

  return (
    <div className="h-full overflow-y-auto bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-1 text-slate-400 hover:text-white mb-6 transition-colors"
        >
          <ArrowLeft size={16} />
          <span className="text-sm">Back</span>
        </button>

        <h1 className="text-3xl font-bold text-white mb-2">How to Play</h1>
        <p className="text-slate-400 mb-8">Learn the rules of Rummikub</p>

        <div className="space-y-6">
          {sections.map((section, index) => (
            <motion.div
              key={section.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5"
            >
              <h2 className="text-lg font-bold text-accent mb-2">
                {index + 1}. {section.title}
              </h2>
              <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-line">
                {section.content}
              </p>
            </motion.div>
          ))}
        </div>

        <div className="mt-8 text-center">
          <button
            onClick={() => navigate('/')}
            className="px-8 py-3 rounded-xl bg-accent hover:bg-accent-dark text-slate-900 font-bold transition-colors"
          >
            Ready to Play!
          </button>
        </div>
      </div>
    </div>
  );
}
