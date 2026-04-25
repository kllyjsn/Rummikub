import { forwardRef } from 'react';
import { motion } from 'framer-motion';
import type { Tile as TileType } from '../engine/types';
import { COLOR_HEX } from '../engine/types';
import { cn } from '../lib/utils';

interface TileProps {
  tile: TileType;
  isDragging?: boolean;
  isOver?: boolean;
  isHighlighted?: boolean;
  animationDelay?: number;
  className?: string;
  style?: React.CSSProperties;
  onClick?: () => void;
}

const highlightAnimation = {
  initial: { scale: 0, opacity: 0, rotateY: 90 },
  animate: { scale: 1, opacity: 1, rotateY: 0 },
};

const Tile = forwardRef<HTMLDivElement, TileProps>(
  ({ tile, isDragging, isHighlighted, animationDelay, className, style, onClick, ...props }, ref) => {
    const motionProps = isHighlighted
      ? {
          initial: highlightAnimation.initial,
          animate: highlightAnimation.animate,
          transition: {
            type: 'spring' as const,
            stiffness: 300,
            damping: 20,
            delay: animationDelay ?? 0,
          },
        }
      : {};

    const glowShadow = isHighlighted
      ? '0 0 12px 4px rgba(245, 158, 11, 0.6), 0 0 24px 8px rgba(245, 158, 11, 0.3)'
      : undefined;

    if (tile.isJoker) {
      return (
        <motion.div
          ref={ref}
          className={cn(
            'w-9 h-12 sm:w-11 sm:h-14 rounded-lg cursor-grab active:cursor-grabbing select-none',
            'flex items-center justify-center relative',
            'shadow-md hover:shadow-lg transition-shadow',
            isDragging && 'opacity-50 scale-105',
            isHighlighted && 'ring-2 ring-accent z-10',
            className
          )}
          style={{
            background: 'linear-gradient(135deg, #fef3c7, #fde68a)',
            boxShadow: glowShadow || (isDragging
              ? '0 8px 25px rgba(0,0,0,0.3)'
              : '0 2px 4px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.5)'),
            ...style,
          }}
          whileHover={{ y: -2 }}
          layout
          onClick={onClick}
          {...motionProps}
          {...props}
        >
          <span className="text-lg sm:text-2xl">🃏</span>
          <div
            className="absolute inset-0 rounded-lg opacity-20"
            style={{
              background: 'linear-gradient(135deg, #dc2626, #2563eb, #ea580c, #10b981)',
            }}
          />
        </motion.div>
      );
    }

    const color = COLOR_HEX[tile.color];

    return (
      <motion.div
        ref={ref}
        className={cn(
          'w-9 h-12 sm:w-11 sm:h-14 rounded-lg cursor-grab active:cursor-grabbing select-none',
          'flex flex-col items-center justify-center relative overflow-hidden',
          'shadow-md hover:shadow-lg transition-shadow',
          isDragging && 'opacity-50 scale-105',
          isHighlighted && 'ring-2 ring-accent z-10',
          className
        )}
        style={{
          background: 'linear-gradient(180deg, #fef3c7 0%, #fde68a 100%)',
          boxShadow: glowShadow || (isDragging
            ? '0 8px 25px rgba(0,0,0,0.3)'
            : '0 2px 4px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.5)'),
          ...style,
        }}
        whileHover={{ y: -2 }}
        layout
        onClick={onClick}
        {...motionProps}
        {...props}
      >
        {/* Top-left number */}
        <span
          className="absolute top-0.5 left-1 text-[8px] font-bold"
          style={{ color }}
        >
          {tile.number}
        </span>

        {/* Center number */}
        <span
          className="text-base sm:text-xl font-black"
          style={{ color }}
        >
          {tile.number}
        </span>

        {/* Bottom-right number (upside down) */}
        <span
          className="absolute bottom-0.5 right-1 text-[8px] font-bold rotate-180"
          style={{ color }}
        >
          {tile.number}
        </span>

        {/* Subtle texture overlay */}
        <div className="absolute inset-0 rounded-lg opacity-5 bg-gradient-to-br from-white to-transparent" />
      </motion.div>
    );
  }
);

Tile.displayName = 'Tile';
export default Tile;
