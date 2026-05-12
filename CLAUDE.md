# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```powershell
# Start the server (port 3000)
npm start

# Run a Playwright test (server auto-starts inside each test file)
node test.js
node test-large-straight.js
node test-upper-click.js
node test-upper-section.js
```

No build step. The app is served directly from `index.html` as a static file.

## Architecture

This is a single-file frontend (`index.html`) + Node.js backend (`server.js`) app with no framework or bundler.

**`index.html`** contains all CSS, HTML, and JavaScript inline. Key sections:
- `CATEGORIES` — `UPPER` and `LOWER` arrays define scoring categories with `calc` functions and optional `fixed`/`fixedVal` for binary (qualify/zero) categories
- `STATE` — global variables: `players`, `currentPlayer`, `dice`, `rollsLeft`, `turnChoice`, `turnYahtzeeBonusClaimed`, `previousGameState`, and multiplayer state (`ws`, `gameCode`, `playerId`, `isOnlineHost`)
- `buildScorecard()` — full DOM rebuild on every state change; attaches `data-player` and `data-cat` attributes to `<td>` elements
- `openModal()` — single modal for all score entry, branches on category type (upper counting buttons / fixed binary / free-form)
- `saveScore()` / `endTurn()` — mutate player state then call `buildScorecard()`
- `saveGameState()` / `loadGameState()` — POST/GET to `/api/local-state` for local mode persistence

**`server.js`** uses Express + `ws`:
- In-memory `games` Map (gameCode → game) and `playerSessions` Map (ws → session)
- WebSocket messages: `create-game`, `join-game`, `update-score`, `end-turn`
- REST endpoints: `/api/local-state` (GET/POST/DELETE), `/api/reset-game/:code`, `/api/reset-all`
- Persists online games to `games.json` every 10 seconds; local game state to `local-game-state.json`

**Game modes:**
- **Local** — all players share one device/browser; state saved server-side per session
- **Online** — each player connects via WebSocket; host creates a 6-char code others use to join; turns are not enforced server-side (client-driven)

**Screen flow:** `mode-select` → (local) `setup` → `game` → `gameover` | (online) `online-choice` → `create-game`/`join-game` → `game-created` (lobby) → `game`

**Score entry modal flow:** click unfilled cell → `openModal()` → user selects/enters value → Close or Close & End Turn → `saveScore()` → `closeModal()` → optionally `endTurn()`

**Undo:** `previousGameState` is a deep-copy snapshot saved at `endTurn()` start; the "End Turn" button in the header becomes "↶ Undo" after each turn and reverts to that snapshot.

## Testing

Tests use Playwright (headless Chromium) and spawn their own server process. Each test file is standalone — run with `node <file>`. No test runner framework; results print to stdout.
