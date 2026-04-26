# Session Summary: *The Scaling Wars* AI Strategy Board Game Prototype

## 1. Problem Statement

Design and prototype a board game inspired by *Catan*, but themed around the AI industry.

The game concept:
- Players act as rival tech giants competing in the AI race
- Core resources are:
  - `Compute`
  - `Data`
  - `Chips`
  - `Talent`
  - `Capital`
- Players must choose strategic priorities such as:
  - foundation models
  - applied AI
  - cloud/infrastructure
- The game should capture real-world AI tradeoffs:
  - specialization vs flexibility
  - disruption events
  - competition over scarce resources
  - trading and expansion

The final goal evolved into:
- a playable web-based `pass-and-play` prototype
- a cleaner project structure suitable for future expansion into:
  - online multiplayer
  - WebSockets
  - chat
  - voice communication

## 2. Approach

The work was completed in phases:

1. **Game concept design**
   - Defined the AI-race theme
   - Mapped Catan-style mechanics into AI-industry equivalents

2. **Board and rule system design**
   - Chose a hex-based board
   - Defined replacements for roads, settlements, cities, and robber
   - Drafted the first rulebook

3. **Web prototype implementation**
   - Built an interactive `run.html` pass-and-play version
   - Built a `rules.html` companion/rules page

4. **UX and feature iteration**
   - Added:
     - disruption event cards
     - player-to-player trading
     - stronger CTA/buttons
     - board readability fixes
     - rules page polish

5. **Codebase cleanup**
   - Refactored inline code into:
     - `assets/styles/`
     - `assets/scripts/`
   - Added architecture docs and README

## 3. Key Iterations

### A. Core Game Framing

**User Prompt**

> I wanna build an ai strategy based board game like catan, but the players would act as tech giants and make decisions like these companies do, like in the ai world there are a lot of possibilities but you have to pick your priorities and focus on that if you wanna win the AI race. Like openai was winning in foundation model but when when google's new gemini and claude's new model came, open ai shifted focus to applied ai more. The resources in this game would be like compute power, access to data, chips, engineers and researchers and you can work on building foundational models, applied ai or act as cloud provider and invest heavily on it, like amazon laid off people to invest on AI resources, so you have to pick your battles, collect points to win the AI race

**Assistant Response**

Proposed the initial game framing:
- players compete as AI giants
- the central tension is specialization vs pivoting
- primary resources:
  - `Compute`
  - `Data`
  - `Chips`
  - `Talent`
  - `Capital`
- main strategic paths:
  - foundation models
  - applied AI
  - cloud / infrastructure
- victory comes from choosing the right priorities and adapting to the AI race

### B. Board Direction

**User Prompt**

> before designing the full rule set, let's first decide on how the board would look like...

**Assistant Response**

Explored multiple board directions first:
- network map
- layered board
- sector-control board
- hybrid board

Then the user steered the design back toward a hex-grid format. The settled direction became:
- `19–25 hex tiles`
- sectors such as:
  - `Compute Clusters`
  - `Data Lakes`
  - `Chip Fabs`
  - `Talent Hubs`
  - `Regulatory Zones`

### C. Catan Mechanic Translation

**User Prompt**

> lets design what replaces roads settlements cities ad robber

**Assistant Response**

Defined the AI-themed Catan replacements:
- `Roads` → `Network Links`
- `Settlements` → `AI Hubs`
- `Cities` → `Mega Campuses`
- `Robber` → `Disruption`

This preserved familiar mechanics while fitting the AI industry theme.

### D. Disruption Theme

**User Prompt**

> like in catan robber's job is simple, block. someone's resource, here it can be a disruption event inspired by real events...

**Assistant Response**

Kept the underlying robber mechanic simple, but re-themed it as AI-industry disruption inspired by real-world patterns:
- `System Outage`
- `Prompt Injection`
- `Botched AI Rollout`
- `Layoff Wave`
- `Memory Price Spike`
- `Panic Pivot`

Result:
- same clean blocker mechanic
- much stronger narrative flavor

### E. Rulebook Creation

**User Prompt**

> lets create the rulebook now

**Assistant Response**

Produced a first-pass rulebook covering:
- setup
- turn flow
- production
- disruption rules
- building costs
- scoring
- strategic identity

This became the basis for the playable prototype.

### F. Pass-and-Play Web App

**User Prompt**

> create an interactive webapp version of pass and play version of the game

**Assistant Response**

Built a playable local prototype in HTML/CSS/JS with:
- randomized board
- local player setup
- dice rolling
- production
- building
- upgrading
- disruption
- VP tracking
- handoff flow between players

### G. Rules Page CTA + Visual Polish

**User Prompts**

> add a button to the rightmost side of navigation bar in rules.html...

> arrows should be coming from all directions and random order

> can you make the colour scheme of rules consistent with run.html

> can you fix the board in rules.html i see text going out of hexes...

**Assistant Response**

Implemented a series of presentation upgrades:
- a prominent `Play` CTA linking from `rules.html` to `run.html`
- animated arrows toward the button
- later moved the CTA below the hero title
- made the button larger and more visually striking

### H. Disruption Event Cards in Prototype

**User Prompt**

> can you implement event card getting picked at random when we roll a 7 like we discussed based on real life events which causes diruptions

**Assistant Response**

Implemented random event-card draw on `7` in `run.html`.

Behavior:
- show disruption event overlay
- continue standard `7` resolution:
  - discard if needed
  - move disruption marker
  - steal if applicable

This preserved balance while improving theme.

### I. Player-to-Player Trading

**User Prompts**

> can you also add trades between players just like bank trade...

> its not fitting on the screen you can add that under the board inseted of in the side

**Assistant Response**

Implemented a player trade form:
- choose target player
- choose resource to give + amount
- choose resource to receive + amount
- validate both players have enough resources

Later moved the trade UI under the board because the sidebar was too cramped.

### J. Production-Style Refactor

**User Prompt**

> can you make some cosmetic tweaks in the repo without changing the functionality at all, make it production level code with prod level file structure...

**Assistant Response**

Refactored the frontend structure without changing behavior:
- extracted styles into:
  ```text
  assets/styles/rules.css
  assets/styles/run.css
  ```
- extracted scripts into:
  ```text
  assets/scripts/rules.js
  assets/scripts/run.js
  ```
- added:
  ```text
  docs/ARCHITECTURE.md
  README.md
  ```

This made the project much easier to extend later.

### K. State Management and Future Multiplayer Readiness

**Representative Technical Prompt**

> How should the game state be structured so this pass-and-play prototype can later support online multiplayer, WebSockets, chat, and voice without a major rewrite?

**Assistant Response**

Proposed and implemented a centralized state-driven approach in `run.js`, where the UI reads from a single game state object instead of scattering state across DOM elements.

Key state areas include:
- `players`
- `board`
- `currentPlayer`
- `phase`
- `dice`
- `mode`
- `discardQueue`
- `mustMoveDisruption`
- `currentEvent`
- `winner`

Why this matters technically:
- the board and side panels are rendered from the same source of truth
- turn flow is easier to validate and replay
- multiplayer can later send serialized game actions instead of raw DOM changes
- chat and voice can be added as adjacent systems without rewriting the game engine

This iteration made the codebase more suitable for:
- server-authoritative multiplayer
- WebSocket event syncing
- action history / replay
- cleaner separation between game logic and presentation

## 4. Challenges & Fixes

### 1. Board labels overflowing hexes
**Problem:**
Text on the rules-page board was too long and spilled outside hexes.

**Fix:**
- shortened labels to:
  - `Compute`
  - `Data`
  - `Talent`
  - `Chips`
  - `Capital`
  - `Regulatory`
- matched board token style to the playable prototype

### 2. Rules page and game page had inconsistent visuals
**Problem:**
`rules.html` and `run.html` looked like different products.

**Fix:**
- aligned color palette
- aligned board styling
- updated CTA styling and page polish

### 3. Player trade UI did not fit sidebar
**Problem:**
Trade controls became cramped in the right panel.

**Fix:**
- moved player trade UI under the board
- kept bank trade in the sidebar
- preserved functionality

### 4. Large inline HTML/CSS/JS files were hard to maintain
**Problem:**
Both pages had giant inline style and script blocks.

**Fix:**
Refactored to external assets:
```text
assets/styles/
assets/scripts/
```

This improved maintainability and future scalability.

### 5. Managing turn consistency
**Problem:**
The playable prototype had several turn-specific flows that could easily get out of sync:
- normal rolls producing resources
- `7` rolls triggering disruption events
- discard resolution before disruption movement
- build / trade actions only being allowed after the roll

Without explicit turn control, it would have been easy for the UI to allow actions in the wrong order.

**Fix:**
- kept an explicit `phase` and turn-related flags in the game state
- used fields like `rolled`, `mustMoveDisruption`, `pendingSevenResolution`, and `mode` to gate what the player could do
- routed turn progression through state-driven functions instead of letting button clicks directly mutate unrelated parts of the UI

This made the prototype more predictable and also created a cleaner foundation for later multiplayer synchronization.

## 5. Final Solution

The final deliverable is a themed strategy game prototype called **The Scaling Wars**.

### Final project includes
- `rules.html`
  - polished rules/reference page
  - hero CTA to launch the prototype
- `run.html`
  - playable pass-and-play prototype
- features:
  - randomized hex board
  - AI-themed resources
  - Network Links / AI Hubs / Mega Campuses
  - disruption system
  - real-world-inspired disruption event cards
  - bank trade
  - player-to-player trade
  - victory point tracking

### Final structure
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
├── README.md
├── rules.html
├── run.html
└── session.md
```

### Why this is submission-ready
- demonstrates product thinking
- shows iterative UX refinement
- includes gameplay design + implementation
- includes refactoring toward scalable architecture
- leaves a clear path to:
  - multiplayer
  - WebSockets
  - chat
  - voice systems

This session resulted in both a **working prototype** and a **cleaner foundation for future full-stack game development**.
