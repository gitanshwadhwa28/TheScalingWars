# The Scaling Wars

A Catan-inspired strategy board game about the AI race.

Players act as rival tech giants competing for dominance across compute, data, chips, talent, and capital. The project currently includes:

- a `rules.html` rules and marketing page
- a `run.html` local pass-and-play prototype
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

### Not Yet Implemented

- online multiplayer
- WebSockets or real-time sync
- accounts / matchmaking / rooms
- chat between players
- voice conversation
- strategy card deck with deeper card effects
- AI opponents
- persistent saves

## Project Structure

```text
.
├── assets
│   ├── scripts
│   │   ├── rules.js
│   │   └── run.js
│   └── styles
│       ├── rules.css
│       └── run.css
├── docs
│   └── ARCHITECTURE.md
├── rules.html
├── run.html
└── README.md
```

## How To Run

This project is currently static HTML/CSS/JS, so you can open it directly in a browser.

Recommended entry points:

- `rules.html` for the rules / overview page
- `run.html` for the playable prototype

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

1. Extract the game rules from `run.js` into a standalone engine module.
2. Add room-based multiplayer with a server-authoritative state model.
3. Introduce player chat first, then voice on top of room presence.
4. Expand disruption events into mechanically distinct cards.
5. Add strategy cards, partnerships, and midgame alliance systems.

## Status

This is an active prototype focused on validating:

- whether the AI-race theme feels strong
- whether the Catan-like structure translates well
- whether disruption, trading, and specialization create interesting decisions

## License

No license has been added yet.
