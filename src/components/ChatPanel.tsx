import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, Send, X } from 'lucide-react';
import type { ChatMessage } from '../engine/types';
import { cn } from '../lib/utils';

const QUICK_EMOJIS = ['👍', '😂', '🔥', '😱', '👏', '🤔', '😤', '🎉'];

interface ChatPanelProps {
  messages: ChatMessage[];
  onSendMessage: (message: string) => void;
  onSendEmoji: (emoji: string) => void;
  localPlayerId: string;
}

export default function ChatPanel({
  messages,
  onSendMessage,
  onSendEmoji,
  localPlayerId,
}: ChatPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [readCount, setReadCount] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const unread = isOpen ? 0 : messages.slice(readCount).filter(m => m.playerId !== localPlayerId).length;

  const handleOpen = useCallback(() => {
    setIsOpen(true);
    setReadCount(messages.length);
  }, [messages.length]);

  const handleClose = useCallback(() => {
    setIsOpen(false);
    setReadCount(messages.length);
  }, [messages.length]);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [isOpen, messages.length]);

  const handleSend = () => {
    if (!input.trim()) return;
    onSendMessage(input.trim());
    setInput('');
  };

  return (
    <>
      {/* Toggle button */}
      <button
        onClick={() => isOpen ? handleClose() : handleOpen()}
        className={cn(
          'relative p-2 rounded-lg transition-colors',
          isOpen ? 'bg-accent text-slate-900' : 'bg-slate-700 hover:bg-slate-600 text-slate-300'
        )}
      >
        <MessageCircle size={18} />
        {unread > 0 && !isOpen && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-[10px] font-bold text-white flex items-center justify-center">
            {unread}
          </span>
        )}
      </button>

      {/* Chat panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-20 right-4 w-80 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl z-40 flex flex-col max-h-96"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-2 border-b border-slate-700">
              <span className="text-sm font-semibold text-white">Chat</span>
              <button onClick={handleClose} className="text-slate-400 hover:text-white">
                <X size={14} />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2 min-h-[150px]">
              {messages.map(msg => (
                <div
                  key={msg.id}
                  className={cn(
                    'flex flex-col',
                    msg.playerId === localPlayerId ? 'items-end' : 'items-start'
                  )}
                >
                  {!msg.isEmoji && (
                    <span className="text-[10px] text-slate-500 mb-0.5">
                      {msg.playerId === localPlayerId ? 'You' : msg.playerName}
                    </span>
                  )}
                  <div
                    className={cn(
                      msg.isEmoji
                        ? 'text-2xl'
                        : cn(
                            'px-3 py-1.5 rounded-lg text-sm max-w-[85%]',
                            msg.playerId === localPlayerId
                              ? 'bg-accent/20 text-accent'
                              : 'bg-slate-800 text-slate-200'
                          )
                    )}
                  >
                    {msg.message}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Quick emojis */}
            <div className="flex gap-1 px-3 py-1.5 border-t border-slate-800">
              {QUICK_EMOJIS.map(emoji => (
                <button
                  key={emoji}
                  onClick={() => onSendEmoji(emoji)}
                  className="text-lg hover:scale-125 transition-transform"
                >
                  {emoji}
                </button>
              ))}
            </div>

            {/* Input */}
            <div className="flex gap-2 p-3 pt-0">
              <input
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSend()}
                placeholder="Type a message..."
                className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-white placeholder-slate-500 outline-none focus:border-accent/50"
              />
              <button
                onClick={handleSend}
                disabled={!input.trim()}
                className="p-1.5 rounded-lg bg-accent hover:bg-accent-dark text-slate-900 disabled:opacity-30 transition-colors"
              >
                <Send size={14} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
