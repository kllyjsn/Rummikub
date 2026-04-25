import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Users, Bot, BookOpen, Wifi, WifiOff } from 'lucide-react';
import { hasPubNubKeys } from '../multiplayer/pubnub';

export default function Home() {
  const navigate = useNavigate();
  const [playerName, setPlayerName] = useState(
    () => localStorage.getItem('rummicube-name') || ''
  );
  const hasPubnub = hasPubNubKeys();

  const handlePlay = (mode: 'single' | 'multi') => {
    const name = playerName.trim() || 'Player';
    localStorage.setItem('rummicube-name', name);
    if (mode === 'single') {
      navigate('/play/single', { state: { playerName: name } });
    } else {
      navigate('/play/multi', { state: { playerName: name } });
    }
  };

  return (
    <div className="h-full flex flex-col items-center justify-center px-4 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-accent/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative z-10 text-center"
      >
        {/* Logo */}
        <div className="mb-8">
          <h1 className="text-4xl sm:text-6xl font-black tracking-tight">
            <span className="text-tile-red">R</span>
            <span className="text-tile-blue">u</span>
            <span className="text-tile-orange">m</span>
            <span className="text-tile-black text-slate-300">m</span>
            <span className="text-tile-red">i</span>
            <span className="text-accent">Cube</span>
          </h1>
          <p className="text-slate-400 mt-2 text-base sm:text-lg">The classic tile game, reimagined</p>
        </div>

        {/* Name input */}
        <div className="mb-8">
          <input
            type="text"
            value={playerName}
            onChange={e => setPlayerName(e.target.value)}
            placeholder="Enter your name..."
            maxLength={20}
            className="w-64 sm:w-72 px-4 py-3 rounded-xl bg-slate-800/80 border border-slate-700 text-white text-center text-base sm:text-lg placeholder-slate-500 outline-none focus:border-accent/50 transition-colors"
          />
        </div>

        {/* Game modes */}
        <div className="flex flex-col gap-3 w-64 sm:w-72 mx-auto">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => handlePlay('single')}
            className="flex items-center gap-3 px-6 py-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-lg transition-colors shadow-lg shadow-emerald-600/20"
          >
            <Bot size={24} />
            <div className="text-left">
              <div>Play vs AI</div>
              <div className="text-xs font-normal text-emerald-100/70">3 difficulty levels</div>
            </div>
          </motion.button>

          <motion.button
            whileHover={{ scale: hasPubnub ? 1.02 : 1 }}
            whileTap={{ scale: hasPubnub ? 0.98 : 1 }}
            onClick={() => hasPubnub && handlePlay('multi')}
            disabled={!hasPubnub}
            className="flex items-center gap-3 px-6 py-4 rounded-xl bg-accent hover:bg-accent-dark text-slate-900 font-bold text-lg transition-colors shadow-lg shadow-accent/20 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {hasPubnub ? <Wifi size={24} /> : <WifiOff size={24} />}
            <div className="text-left">
              <div>Multiplayer</div>
              <div className="text-xs font-normal text-slate-800/70">
                {hasPubnub ? '2–4 players online' : 'PubNub keys required'}
              </div>
            </div>
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => navigate('/how-to-play')}
            className="flex items-center gap-3 px-6 py-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-lg transition-colors"
          >
            <BookOpen size={24} />
            <div className="text-left">
              <div>How to Play</div>
              <div className="text-xs font-normal text-slate-400">Learn the rules</div>
            </div>
          </motion.button>
        </div>

        {/* Footer */}
        <div className="mt-12 flex items-center justify-center gap-4">
          <div className="flex gap-1">
            {['red', 'blue', 'orange', 'black'].map(color => (
              <div
                key={color}
                className="w-6 h-8 rounded bg-tile-face flex items-center justify-center text-[10px] font-bold shadow-sm"
                style={{ color: color === 'black' ? '#1e293b' : color === 'red' ? '#dc2626' : color === 'blue' ? '#2563eb' : '#ea580c' }}
              >
                {color === 'red' ? '7' : color === 'blue' ? '3' : color === 'orange' ? '11' : '9'}
              </div>
            ))}
          </div>
          <Users size={14} className="text-slate-600" />
          <span className="text-xs text-slate-600">Powered by PubNub</span>
        </div>
      </motion.div>
    </div>
  );
}
