# The Scaling Wars

A Catan-inspired strategy board game about the AI race.

Players act as rival tech giants competing for dominance across compute, data, chips, talent, and capital. The project currently includes:

- a `rules.html` rules and marketing page
- a `run.html` local pass-and-play prototype
- an `online.html` multiplayer room and chat client
- a hex-based board
- resource generation, building, upgrading, trading, disruption events, and victory point tracking

## Concept

The game reframes classic settlement-and-expansion gameplay around the modern AI industry.

Instead of wheat, brick, and ore, players compete over:

- `Compute`
- `Data`
- `Chips`
- `Talent`
- `Capital`

Players build:

- `Network Links`
- `AI Hubs`
- `Mega Campuses`

And they respond to:

- `Disruption` events inspired by real-world AI and tech failures, bottlenecks, and market shocks

## Current Prototype

The current web prototype is a local pass-and-play experience designed for rapid playtesting.

### Implemented

- randomized 19-hex board
- 3-4 player setup
- snake-order opening placement
- dice-based resource production
- disruption flow on rolling `7`
- real-world-inspired disruption event cards
- building links, hubs, and campuses
- bank trading
- player-to-player trading on the active player's turn
- longest network scoring
- victory point tracking
- rules/reference page
- multiplayer room code server scaffold
- Socket.IO room presence and chat
- server-authoritative room and initial game-state creation

### Not Yet Implemented

- accounts / matchmaking / rooms
- voice conversation
- strategy card deck with deeper card effects
- AI opponents
- persistent saves
- full online board-action port from the pass-and-play client

## Project Structure

```text
.
├── assets
│   ├── scripts
│   │   ├── online.js
│   │   ├── rules.js
│   │   └── run.js
│   └── styles
│       ├── online.css
│       ├── rules.css
│       └── run.css
├── docs
│   └── ARCHITECTURE.md
├── online.html
├── package.json
├── rules.html
├── run.html
├── server
│   ├── index.js
│   └── room-store.js
├── shared
│   └── game-core.js
└── README.md
```

## How To Run

This project now has two modes:

- local static pages for the rules and pass-and-play prototype
- a Node + Socket.IO server for the online multiplayer alpha

Recommended entry points:

- `rules.html` for the rules / overview page
- `run.html` for the playable prototype
- `online.html` for the multiplayer lobby + room chat client

If you want to serve it locally through a simple static server:

```bash
python3 -m http.server 8000
```

Then open:

```text
http://localhost:8000/rules.html
```

or

```text
http://localhost:8000/run.html
```

### Online Multiplayer Alpha

Install dependencies:

```bash
npm install
```

Start the server:

```bash
npm start
```

Then open:

```text
http://localhost:3000/online.html
```

Current online alpha includes:

- create room
- join room by code
- host / ready state
- room chat
- server-owned room state
- server initialization of shared game state when the host starts the game

The next step is wiring the full board interactions from `run.html` into socket-driven multiplayer actions.

## Design Direction

The long-term goal is to evolve this from a pass-and-play prototype into an online multiplayer strategy game with:

- synchronized board state
- WebSocket-based multiplayer rooms
- player chat
- voice conversation
- richer event systems
- stronger faction identity
- cleaner separation between game engine and UI

## Suggested Next Steps

1. Port the existing board actions from `run.js` into server-validated socket events.
2. Move more of the gameplay rules from the UI layer into `shared/game-core.js`.
3. Add reconnect handling and persistent room recovery.
4. Introduce player chat first, then voice on top of room presence.
5. Expand disruption events into mechanically distinct cards.
6. Add strategy cards, partnerships, and midgame alliance systems.

## Status

This is an active prototype focused on validating:

- whether the AI-race theme feels strong
- whether the Catan-like structure translates well
- whether disruption, trading, and specialization create interesting decisions

## License

No license has been added yet.
