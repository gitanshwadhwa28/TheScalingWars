# Frontend Structure

This prototype keeps the existing static-entry workflow while making the codebase easier to evolve into a networked game.

## Current layout

- `rules.html`: marketing + rules entry page
- `run.html`: pass-and-play prototype entry page
- `assets/styles/rules.css`: rules page styles
- `assets/styles/run.css`: playable prototype styles
- `assets/scripts/rules.js`: rules page behavior
- `assets/scripts/run.js`: prototype game logic and UI wiring

## Why this helps later

- HTML entry points stay thin and easier to replace with a router later.
- Styles and scripts are already separated per surface, so chat, voice, and multiplayer UI can be added without touching giant inline blobs.
- `run.js` can be split later into modules like `engine/`, `ui/`, `transport/`, and `media/` once sockets and RTC are introduced.
- Shared tokens can later move into `assets/styles/theme.css` or a component system without changing page behavior today.

## Suggested next evolution

1. Extract the game state and rules from `run.js` into a pure game engine module.
2. Add a transport layer for WebSocket events.
3. Add chat and voice adapters as separate modules instead of mixing them into board logic.
4. Move from static HTML entry points to a bundler/framework only when the game engine boundary is stable.
