const express = require('express');
const path = require('path');
const mining = require('./mining');
const building = require('./building');
const movement = require('./movement');
const inventory = require('./inventory');
const logging = require('./logging');
const cli = require('./cli');
const settings = require('./settings');
const mineflayer = require('mineflayer');
const AutoAuth = require('mineflayer-auto-auth');
const { pathfinder, Movements } = require('mineflayer-pathfinder');

const app = express();
app.set('trust proxy', 1);
app.use(express.json({ limit: '32kb' }));
app.use(express.static(path.join(__dirname, 'public')));

let bot = null;
let activeMode = 'idle';
let reconnectTimer = null;
let reconnectAttempts = 0;
let reconnectEnabled = true;
let lastConnectOptions = null;
const logs = [];

const allowedModes = new Set([
  'mine', 'diamond', 'iron', 'stripmine', 'build', 'eat', 'cleanup',
  'store', 'patrol', 'explore', 'afk', 'stop'
]);

const agentState = {
  homeBase: null,
  homeBuildAttempted: false,
  setHomeBase(value) { this.homeBase = value; }
};

function addLog(module, message) {
  const entry = `[${new Date().toISOString()}][${module}] ${message}`;
  logs.push(entry);
  while (logs.length > settings.agent.logLimit) logs.shift();
  logging.log(module, message);
}

function normalizePort(value, fallback = 25565) {
  const port = Number(value);
  if (!Number.isInteger(port) || port < 1 || port > 65535) return fallback;
  return port;
}

function runtimeServerSettings(body = {}) {
  const host = body.host ? String(body.host).trim() : settings.minecraft.host;
  const port = normalizePort(body.port, settings.minecraft.port);
  const username = body.username ? String(body.username).trim() : settings.minecraft.username;

  if (!host) throw new Error('Minecraft host is required');
  if (!username) throw new Error('Minecraft username is required');

  settings.minecraft.host = host;
  settings.minecraft.port = port;
  settings.minecraft.username = username;
  return settings.minecraft;
}

function clearReconnectTimer() {
  if (reconnectTimer) clearTimeout(reconnectTimer);
  reconnectTimer = null;
}

function destroyBot(reason = 'reconnecting') {
  clearReconnectTimer();
  if (!bot) return;
  const current = bot;
  bot = null;
  try { current.quit(reason); } catch (_) {}
  try { current.pathfinder?.setGoal(null); } catch (_) {}
}

function createBot(options = settings.minecraft) {
  destroyBot('recreating connection');

  const botOptions = {
    host: String(options.host),
    port: normalizePort(options.port),
    username: String(options.username),
    auth: options.auth,
    version: options.version || undefined,
    hideErrors: Boolean(options.hideErrors),
    checkTimeoutInterval: 60000
  };

  if (settings.autoAuth.enabled && settings.autoAuth.password && settings.autoAuth.password !== 'CHANGE_ME') {
    botOptions.plugins = [AutoAuth];
    botOptions.AutoAuth = {
      password: settings.autoAuth.password,
      logging: settings.autoAuth.logging,
      ignoreRepeat: settings.autoAuth.ignoreRepeat
    };
  }

  bot = mineflayer.createBot(botOptions);
  lastConnectOptions = { ...options, port: botOptions.port };
  bot.loadPlugin(pathfinder);
  bot.defaultMovements = new Movements(bot);

  bot.once('spawn', () => {
    reconnectAttempts = 0;
    activeMode = 'idle';
    addLog('Bot', `Connected to ${options.host}:${botOptions.port} as ${options.username}`);
  });

  bot.on('serverAuth', () => addLog('Auth', 'Server authentication completed automatically'));
  bot.on('chat', (username, message) => addLog('Chat', `${username}: ${message}`));
  bot.on('health', () => {
    if (bot && bot.food !== undefined && bot.food <= 6) addLog('Bot', `Low food level: ${bot.food}`);
  });
  bot.on('kicked', reason => addLog('Bot', `Kicked: ${String(reason)}`));
  bot.on('error', err => addLog('Bot', `Error: ${err.message}`));
  bot.on('end', () => {
    addLog('Bot', 'Connection closed');
    if (bot && bot === currentBot) bot = null;
    activeMode = 'idle';
    if (reconnectEnabled && settings.minecraft.autoReconnect) scheduleReconnect();
  });

  const currentBot = bot;
  return currentBot;
}

function scheduleReconnect() {
  if (reconnectTimer || !reconnectEnabled) return;
  const max = settings.minecraft.maxReconnectAttempts;
  if (max > 0 && reconnectAttempts >= max) {
    addLog('Bot', `Reconnect limit reached (${max})`);
    return;
  }

  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    reconnectAttempts += 1;
    addLog('Bot', `Reconnect attempt ${reconnectAttempts}`);
    connectBot().catch(err => addLog('Bot', `Reconnect failed: ${err.message}`));
  }, Math.max(1000, settings.minecraft.reconnectDelay));
}

async function connectBot() {
  reconnectEnabled = true;
  if (bot) return bot;
  return createBot(settings.minecraft);
}

function requireBot() {
  if (!bot || !bot.entity) throw new Error('Bot is not connected/spawned');
  return bot;
}

async function runMode(mode, args = []) {
  const normalizedMode = String(mode || 'stop').trim().toLowerCase();
  if (!allowedModes.has(normalizedMode)) throw new Error(`Unknown mode: ${normalizedMode}`);

  const currentBot = requireBot();
  activeMode = normalizedMode;
  addLog('Mode', `Starting ${normalizedMode}`);

  try {
    switch (normalizedMode) {
      case 'mine': return await mining.mineResources(currentBot);
      case 'diamond': return await mining.mineDiamond(currentBot, Number(args[0] || 3));
      case 'iron': return await mining.mineIron(currentBot, Number(args[0] || 3));
      case 'stripmine': return await mining.stripmineAtYLevel(currentBot);
      case 'build': return await building.buildHomeBase(
        currentBot,
        agentState.homeBase,
        agentState.homeBuildAttempted,
        agentState.setHomeBase,
        agentState.gatherHomeMaterials,
        agentState.ensureCraftingTable,
        agentState.craftItem
      );
      case 'eat': return await inventory.eatFood(currentBot);
      case 'cleanup': return await inventory.batchCleanup(currentBot);
      case 'store': return await inventory.storeItems(currentBot);
      case 'patrol': {
        const origin = currentBot.entity.position;
        for (const [dx, dz] of [[8, 0], [0, 8], [-8, 0], [0, -8]]) {
          await movement.moveTo(currentBot, {
            x: Math.floor(origin.x + dx),
            y: Math.floor(origin.y),
            z: Math.floor(origin.z + dz)
          }, { timeout: 30000 });
        }
        return { success: true, mode: 'patrol' };
      }
      case 'explore': {
        const origin = currentBot.entity.position;
        const distance = Math.max(8, Math.min(256, Number(args[0] || 24)));
        const [dx, dz] = [[1, 0], [0, 1], [-1, 0], [0, -1]][Math.floor(Math.random() * 4)];
        return await movement.moveTo(currentBot, {
          x: Math.floor(origin.x + dx * distance),
          y: Math.floor(origin.y),
          z: Math.floor(origin.z + dz * distance)
        }, { timeout: 45000 });
      }
      case 'afk':
        activeMode = 'afk';
        return { success: true, mode: 'afk' };
      case 'stop':
        currentBot.pathfinder?.setGoal(null);
        activeMode = 'idle';
        return { success: true, mode: 'idle' };
      default:
        throw new Error(`Unknown mode: ${normalizedMode}`);
    }
  } catch (err) {
    addLog('Mode', `${normalizedMode} failed: ${err.message}`);
    activeMode = 'idle';
    throw err;
  }
}

function publicServerSettings() {
  return {
    host: settings.minecraft.host,
    port: settings.minecraft.port,
    username: settings.minecraft.username,
    auth: settings.minecraft.auth,
    version: settings.minecraft.version,
    autoConnect: settings.minecraft.autoConnect,
    autoReconnect: settings.minecraft.autoReconnect,
    reconnectDelay: settings.minecraft.reconnectDelay,
    maxReconnectAttempts: settings.minecraft.maxReconnectAttempts,
    autoAuthEnabled: settings.autoAuth.enabled
  };
}

app.get('/api/status', (req, res) => {
  res.json({
    connected: Boolean(bot?.entity),
    spawned: Boolean(bot?.entity),
    mode: activeMode,
    server: publicServerSettings(),
    player: bot?.entity?.position ? {
      username: bot.username,
      health: bot.health,
      food: bot.food,
      position: {
        x: Number(bot.entity.position.x.toFixed(2)),
        y: Number(bot.entity.position.y.toFixed(2)),
        z: Number(bot.entity.position.z.toFixed(2))
      }
    } : null,
    inventory: bot?.inventory?.items().map(item => ({ name: item.name, count: item.count })) || [],
    logs
  });
});

app.post('/api/connect', async (req, res) => {
  try {
    reconnectEnabled = true;
    runtimeServerSettings(req.body || {});
    clearReconnectTimer();
    if (bot) destroyBot('manual reconnect');
    await connectBot();
    res.json({ success: true, server: publicServerSettings() });
  } catch (err) {
    addLog('Web', `Connect failed: ${err.message}`);
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/disconnect', (req, res) => {
  reconnectEnabled = false;
  clearReconnectTimer();
  destroyBot('manual disconnect');
  activeMode = 'idle';
  res.json({ success: true });
});

app.post('/api/reconnect', async (req, res) => {
  try {
    reconnectEnabled = true;
    clearReconnectTimer();
    destroyBot('manual reconnect');
    await connectBot();
    res.json({ success: true });
  } catch (err) {
    addLog('Web', `Reconnect failed: ${err.message}`);
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/mode', async (req, res) => {
  try {
    res.json({ success: true, result: await runMode(req.body?.mode, req.body?.args || []) });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/cli', async (req, res) => {
  const { cmd, args } = req.body || {};
  try {
    if (cmd === 'connect') await connectBot();
    else if (allowedModes.has(String(cmd || '').toLowerCase())) await runMode(cmd, args || []);
    else await cli.runCLICommand(cmd, args, bot, agentState);
    res.json({ message: 'Command executed.' });
  } catch (err) {
    addLog('CLI', `Error: ${err.message}`);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/settings', (req, res) => {
  res.json({
    minecraft: publicServerSettings(),
    autoAuth: { enabled: settings.autoAuth.enabled },
    web: settings.web,
    agent: settings.agent,
    runtime: { nodeVersion: process.version, pid: process.pid, platform: process.platform }
  });
});

app.get('/healthz', (req, res) => {
  res.status(200).json({ ok: true, botConnected: Boolean(bot?.entity) });
});

app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

const server = app.listen(settings.web.port, settings.web.host, () => {
  addLog('Server', `Dashboard listening on ${settings.web.host}:${settings.web.port}`);
  if (settings.minecraft.autoConnect && settings.minecraft.host !== 'YOUR_SERVER_IP') {
    connectBot().catch(err => addLog('Bot', `Auto-connect failed: ${err.message}`));
  }
});

server.on('error', err => addLog('Server', `HTTP server error: ${err.message}`));

process.on('SIGTERM', () => {
  reconnectEnabled = false;
  clearReconnectTimer();
  destroyBot('process shutdown');
  server.close(() => process.exit(0));
});

process.on('SIGINT', () => {
  reconnectEnabled = false;
  clearReconnectTimer();
  destroyBot('process shutdown');
  server.close(() => process.exit(0));
});

module.exports = { createBot, connectBot, runMode, publicServerSettings };
