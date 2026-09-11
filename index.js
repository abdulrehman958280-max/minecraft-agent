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
const { pathfinder, Movements } = require('mineflayer-pathfinder');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

let bot = null;
let activeMode = 'idle';
let reconnectTimer = null;
let reconnectAttempts = 0;
const logs = [];
const agentState = {
  homeBase: null,
  homeBuildAttempted: false,
  setHomeBase(value) { this.homeBase = value; },
  gatherHomeMaterials: async () => {},
  ensureCraftingTable: async () => {},
  craftItem: async () => {}
};

function addLog(module, message) {
  const entry = `[${new Date().toISOString()}][${module}] ${message}`;
  logs.push(entry);
  while (logs.length > settings.agent.logLimit) logs.shift();
  logging.log(module, message);
}

function createBot(options = settings.minecraft) {
  if (bot) {
    try { bot.quit('reconnecting'); } catch (_) {}
  }
  bot = mineflayer.createBot({
    host: options.host,
    port: Number(options.port),
    username: options.username,
    auth: options.auth,
    version: options.version || undefined,
    hideErrors: options.hideErrors
  });
  bot.loadPlugin(pathfinder);
  bot.defaultMovements = new Movements(bot);
  bot.once('spawn', () => {
    reconnectAttempts = 0;
    addLog('Bot', `Connected to ${options.host}:${options.port} as ${options.username}`);
  });
  bot.on('chat', (username, message) => addLog('Chat', `${username}: ${message}`));
  bot.on('kicked', reason => addLog('Bot', `Kicked: ${String(reason)}`));
  bot.on('error', err => addLog('Bot', `Error: ${err.message}`));
  bot.on('end', () => {
    addLog('Bot', 'Connection closed');
    bot = null;
    activeMode = 'idle';
    if (settings.minecraft.autoReconnect) scheduleReconnect();
  });
  return bot;
}

function scheduleReconnect() {
  if (reconnectTimer) return;
  const max = settings.minecraft.maxReconnectAttempts;
  if (max > 0 && reconnectAttempts >= max) return;
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    reconnectAttempts += 1;
    addLog('Bot', `Reconnect attempt ${reconnectAttempts}`);
    connectBot().catch(err => addLog('Bot', `Reconnect failed: ${err.message}`));
  }, Math.max(1000, settings.minecraft.reconnectDelay));
}

async function connectBot() {
  if (bot) return bot;
  return createBot(settings.minecraft);
}

function requireBot() {
  if (!bot || !bot.entity) throw new Error('Bot is not connected/spawned');
  return bot;
}

async function runMode(mode, args = []) {
  const currentBot = requireBot();
  activeMode = mode;
  addLog('Mode', `Starting ${mode}`);
  try {
    switch (mode) {
      case 'mine': return await mining.mineResources(currentBot);
      case 'diamond': return await mining.mineDiamond(currentBot, Number(args[0] || 3));
      case 'iron': return await mining.mineIron(currentBot, Number(args[0] || 3));
      case 'stripmine': return await mining.stripmineAtYLevel(currentBot);
      case 'build': return await building.buildHomeBase(currentBot, agentState.homeBase, agentState.homeBuildAttempted, agentState.setHomeBase, agentState.gatherHomeMaterials, agentState.ensureCraftingTable, agentState.craftItem);
      case 'eat': return await inventory.eatFood(currentBot);
      case 'cleanup': return await inventory.batchCleanup(currentBot);
      case 'store': return await inventory.storeItems(currentBot);
      case 'patrol': {
        const origin = currentBot.entity.position;
        for (const [dx, dz] of [[8,0],[0,8],[-8,0],[0,-8]]) {
          await movement.moveTo(currentBot, { x: Math.floor(origin.x + dx), y: Math.floor(origin.y), z: Math.floor(origin.z + dz) }, { timeout: 30000 });
        }
        return { success: true };
      }
      case 'explore': {
        const origin = currentBot.entity.position;
        const distance = Number(args[0] || 24);
        const [dx, dz] = [[1,0],[0,1],[-1,0],[0,-1]][Math.floor(Math.random() * 4)];
        return await movement.moveTo(currentBot, { x: Math.floor(origin.x + dx * distance), y: Math.floor(origin.y), z: Math.floor(origin.z + dz * distance) }, { timeout: 45000 });
      }
      case 'afk':
        activeMode = 'afk';
        return { success: true, mode: 'afk' };
      case 'stop':
        currentBot.pathfinder?.setGoal(null);
        activeMode = 'idle';
        return { success: true, mode: 'idle' };
      default:
        throw new Error(`Unknown mode: ${mode}`);
    }
  } catch (err) {
    addLog('Mode', `${mode} failed: ${err.message}`);
    throw err;
  }
}

app.get('/api/status', (req, res) => {
  res.json({
    connected: Boolean(bot?.entity),
    spawned: Boolean(bot?.entity),
    mode: activeMode,
    server: settings.minecraft,
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
    if (req.body?.host) settings.minecraft.host = String(req.body.host);
    if (req.body?.port) settings.minecraft.port = Number(req.body.port);
    if (req.body?.username) settings.minecraft.username = String(req.body.username);
    await connectBot();
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/disconnect', (req, res) => {
  try { if (bot) bot.quit('manual disconnect'); } catch (_) {}
  bot = null;
  activeMode = 'idle';
  res.json({ success: true });
});

app.post('/api/reconnect', async (req, res) => {
  try { if (bot) bot.quit('manual reconnect'); } catch (_) {}
  bot = null;
  try { await connectBot(); res.json({ success: true }); } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/mode', async (req, res) => {
  try { res.json({ success: true, result: await runMode(String(req.body.mode || 'stop'), req.body.args || []) }); }
  catch (err) { res.status(400).json({ error: err.message }); }
});

app.post('/cli', async (req, res) => {
  const { cmd, args } = req.body;
  try {
    if (cmd === 'connect') await connectBot();
    else if (['mine', 'diamond', 'iron', 'stripmine', 'build', 'eat', 'cleanup', 'store', 'patrol', 'explore', 'afk', 'stop'].includes(cmd)) await runMode(cmd, args || []);
    else await cli.runCLICommand(cmd, args, bot, agentState);
    res.json({ message: 'Command executed.' });
  } catch (err) {
    addLog('CLI', `Error: ${err.message}`);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/settings', (req, res) => {
  res.json({ minecraft: settings.minecraft, web: settings.web, agent: settings.agent });
});

app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

app.listen(settings.web.port, settings.web.host, () => {
  addLog('Server', `Dashboard listening on ${settings.web.host}:${settings.web.port}`);
  if (settings.minecraft.autoConnect && settings.minecraft.host !== 'YOUR_SERVER_IP') {
    connectBot().catch(err => addLog('Bot', `Auto-connect failed: ${err.message}`));
  }
});

module.exports = { createBot, connectBot, runMode };
