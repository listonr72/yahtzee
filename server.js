const express = require('express');
const WebSocket = require('ws');
const http = require('http');
const path = require('path');
const fs = require('fs');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const PORT = 3000;
const SAVE_FILE = path.join(__dirname, 'games.json');
const LOCAL_STATE_FILE = path.join(__dirname, 'local-game-state.json');

app.use(express.json());

// Serve static files
app.use(express.static(__dirname));
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));

// Game sessions store
const games = new Map(); // gameCode -> { players: Map, state: {...}, createdAt }
const playerSessions = new Map(); // ws -> { gameCode, playerId, name }

// Load saved games on startup
function loadSavedGames() {
  try {
    if (fs.existsSync(SAVE_FILE)) {
      const data = JSON.parse(fs.readFileSync(SAVE_FILE, 'utf8'));
      Object.entries(data).forEach(([gameCode, gameData]) => {
        const game = {
          players: new Map(),
          currentPlayer: gameData.currentPlayer || 0,
          state: gameData.state || 'paused',
          createdAt: gameData.createdAt || Date.now(),
        };
        gameData.players.forEach(p => {
          game.players.set(p.id, p);
        });
        games.set(gameCode, game);
      });
      console.log(`Loaded ${Object.keys(data).length} saved games`);
    }
  } catch (err) {
    console.error('Error loading saved games:', err);
  }
}

// Save games to disk
function saveGames() {
  try {
    const data = {};
    games.forEach((game, gameCode) => {
      data[gameCode] = {
        players: Array.from(game.players.values()),
        currentPlayer: game.currentPlayer,
        state: game.state,
        createdAt: game.createdAt,
      };
    });
    fs.writeFileSync(SAVE_FILE, JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('Error saving games:', err);
  }
}

// Auto-save every 10 seconds
setInterval(saveGames, 10000);

// Generate random game code
function generateGameCode() {
  return Math.random().toString(36).substr(2, 6).toUpperCase();
}

// WebSocket connection handler
wss.on('connection', (ws) => {
  console.log('New WebSocket connection');

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      handleMessage(ws, data);
    } catch (err) {
      console.error('Message parse error:', err);
      ws.send(JSON.stringify({ type: 'error', message: 'Invalid message' }));
    }
  });

  ws.on('close', () => {
    handlePlayerDisconnect(ws);
  });

  ws.on('error', (err) => {
    console.error('WebSocket error:', err);
  });
});

function handleMessage(ws, data) {
  const { type, gameCode, playerName, playerId, scoreData } = data;

  switch (type) {
    case 'create-game':
      handleCreateGame(ws, playerName);
      break;
    case 'join-game':
      handleJoinGame(ws, gameCode, playerName);
      break;
    case 'update-score':
      handleScoreUpdate(ws, scoreData);
      break;
    case 'end-turn':
      handleEndTurn(ws);
      break;
    default:
      console.log('Unknown message type:', type);
  }
}

function handleCreateGame(ws, playerName) {
  const gameCode = generateGameCode();
  const playerId = `player_${Date.now()}`;

  const gameState = {
    players: new Map(),
    currentPlayer: 0,
    state: 'waiting',
    createdAt: Date.now(),
  };

  gameState.players.set(playerId, {
    id: playerId,
    name: playerName,
    scores: {},
    yahtzeeBonusCount: 0,
    ready: false,
  });

  games.set(gameCode, gameState);
  playerSessions.set(ws, { gameCode, playerId, name: playerName });

  ws.send(JSON.stringify({
    type: 'game-created',
    gameCode,
    playerId,
    message: `Game created! Share code: ${gameCode}`,
  }));

  console.log(`Game created: ${gameCode} by ${playerName}`);
}

function handleJoinGame(ws, gameCode, playerName) {
  const game = games.get(gameCode);

  if (!game) {
    ws.send(JSON.stringify({
      type: 'error',
      message: 'Game not found. Check the code.',
    }));
    return;
  }

  if (game.state === 'playing') {
    ws.send(JSON.stringify({
      type: 'error',
      message: 'Game already in progress.',
    }));
    return;
  }

  const playerId = `player_${Date.now()}`;
  game.players.set(playerId, {
    id: playerId,
    name: playerName,
    scores: {},
    yahtzeeBonusCount: 0,
    ready: false,
  });

  playerSessions.set(ws, { gameCode, playerId, name: playerName });

  ws.send(JSON.stringify({
    type: 'game-joined',
    gameCode,
    playerId,
    players: Array.from(game.players.values()),
  }));

  // Notify other players
  broadcastToGame(gameCode, {
    type: 'player-joined',
    playerName,
    players: Array.from(game.players.values()),
  }, ws);

  console.log(`${playerName} joined game ${gameCode}`);
}

function handleScoreUpdate(ws, scoreData) {
  const session = playerSessions.get(ws);
  if (!session) return;

  const game = games.get(session.gameCode);
  if (!game) return;

  const player = game.players.get(session.playerId);
  if (!player) return;

  // Update player's score
  Object.assign(player.scores, scoreData.scores);
  if (scoreData.yahtzeeBonusCount !== undefined) {
    player.yahtzeeBonusCount = scoreData.yahtzeeBonusCount;
  }

  // Broadcast updated game state
  broadcastToGame(session.gameCode, {
    type: 'game-updated',
    players: Array.from(game.players.values()),
    currentPlayer: game.currentPlayer,
  });
}

function handleEndTurn(ws) {
  const session = playerSessions.get(ws);
  if (!session) return;

  const game = games.get(session.gameCode);
  if (!game) return;

  // Advance to next player
  const playerIds = Array.from(game.players.keys());
  game.currentPlayer = (game.currentPlayer + 1) % playerIds.length;

  // Broadcast turn change
  broadcastToGame(session.gameCode, {
    type: 'turn-changed',
    currentPlayer: game.currentPlayer,
    currentPlayerName: Array.from(game.players.values())[game.currentPlayer].name,
    players: Array.from(game.players.values()),
  });
}

function handlePlayerDisconnect(ws) {
  const session = playerSessions.get(ws);
  if (!session) return;

  const game = games.get(session.gameCode);
  if (game) {
    game.players.delete(session.playerId);

    // Broadcast player left
    if (game.players.size > 0) {
      broadcastToGame(session.gameCode, {
        type: 'player-left',
        playerName: session.name,
        players: Array.from(game.players.values()),
      });
    } else {
      // Delete empty game
      games.delete(session.gameCode);
      console.log(`Game ${session.gameCode} deleted (no players)`);
    }
  }

  playerSessions.delete(ws);
  console.log(`${session.name} disconnected`);
}

function broadcastToGame(gameCode, data, exclude = null) {
  wss.clients.forEach((client) => {
    if (client === exclude) return;
    const session = playerSessions.get(client);
    if (session && session.gameCode === gameCode && client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(data));
    }
  });
}

// Local game state persistence
app.get('/api/local-state', (req, res) => {
  try {
    if (fs.existsSync(LOCAL_STATE_FILE)) {
      res.json({ success: true, state: JSON.parse(fs.readFileSync(LOCAL_STATE_FILE, 'utf8')) });
    } else {
      res.json({ success: true, state: null });
    }
  } catch (err) {
    res.json({ success: true, state: null });
  }
});

app.post('/api/local-state', (req, res) => {
  try {
    fs.writeFileSync(LOCAL_STATE_FILE, JSON.stringify(req.body, null, 2));
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false });
  }
});

app.delete('/api/local-state', (req, res) => {
  try {
    if (fs.existsSync(LOCAL_STATE_FILE)) fs.unlinkSync(LOCAL_STATE_FILE);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false });
  }
});

// Handle reset message
app.post('/api/reset-game/:gameCode', (req, res) => {
  const { gameCode } = req.params;
  if (games.has(gameCode)) {
    games.delete(gameCode);
    saveGames();
    res.json({ success: true, message: 'Game reset' });
  } else {
    res.status(404).json({ success: false, message: 'Game not found' });
  }
});

// Handle reset all
app.post('/api/reset-all', (req, res) => {
  games.clear();
  saveGames();
  if (fs.existsSync(SAVE_FILE)) {
    fs.unlinkSync(SAVE_FILE);
  }
  res.json({ success: true, message: 'All games reset' });
});

loadSavedGames();

server.listen(PORT, '0.0.0.0', () => {
  console.log(`\n🎲 Yahtzee Server running!`);
  console.log(`\n  Local: http://localhost:${PORT}`);
  console.log(`  Network: http://<your-ip>:${PORT}`);
  console.log(`\nPress Ctrl+C to stop\n`);
});
