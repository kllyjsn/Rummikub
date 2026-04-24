# RummiCube

A world-class, browser-based Rummikub game with real-time PubNub multiplayer, AI opponents, and buttery-smooth drag-and-drop tile manipulation.

## Features

- **Single Player vs AI** — 3 difficulty levels (Casual, Standard, Expert)
- **Real-Time Multiplayer** — 2-4 players via PubNub with room codes
- **Drag & Drop** — Intuitive tile placement and table manipulation using @dnd-kit
- **Smart Validation** — Real-time set validation with visual feedback (groups, runs, jokers)
- **Table Manipulation** — Rearrange existing sets on the table to create new plays
- **Turn Timer** — Configurable countdown (30s / 60s / 90s / unlimited)
- **Undo System** — Full turn undo to revert all changes
- **Rack Sorting** — Sort by number or color
- **Procedural Audio** — Satisfying tile sounds via Web Audio API (no asset files)
- **In-Game Chat** — Messages and emoji reactions during multiplayer
- **Responsive Design** — Optimized for desktop with tablet support

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | React 18 + TypeScript |
| Build | Vite |
| Styling | Tailwind CSS v4 |
| Animations | Framer Motion |
| Drag & Drop | @dnd-kit/core + @dnd-kit/sortable |
| Multiplayer | PubNub |
| Audio | Web Audio API |
| Icons | Lucide React |
| Routing | React Router v7 |

## Getting Started

```bash
# Install dependencies
npm install

# Set up PubNub keys (required for multiplayer)
cp .env.example .env
# Edit .env with your PubNub keys

# Start dev server
npm run dev
```

## Environment Variables

| Variable | Description |
|----------|-------------|
| `VITE_PUBNUB_PUBLISH_KEY` | PubNub publish key (for multiplayer) |
| `VITE_PUBNUB_SUBSCRIBE_KEY` | PubNub subscribe key (for multiplayer) |

Single player mode works without PubNub keys.

## Game Rules

- **106 tiles**: Numbers 1-13 in 4 colors (x2) + 2 jokers
- **Initial meld**: First play must total 30+ points
- **Valid sets**: Groups (same number, different colors) or Runs (consecutive numbers, same color)
- **Table manipulation**: Rearrange existing sets to incorporate your tiles
- **Win**: First to empty your rack wins!

## Architecture

```
src/
├── engine/        # Core game logic (pure functions + reducer)
├── multiplayer/   # PubNub transport layer
├── components/    # React UI components
├── hooks/         # Custom hooks (game state, audio)
├── pages/         # Route pages (Home, SinglePlayer, Multiplayer, HowToPlay)
└── lib/           # Utilities
```
