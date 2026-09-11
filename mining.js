// --- Mining Module ---
const config = require('./config');
const movement = require('./movement');

function getMiningYLevel(ore) {
  return config.miningYLevels[ore] ?? -59;
}

async function findAndDigBlock(bot, names) {
  if (!bot || typeof bot.findBlock !== 'function' || typeof bot.dig !== 'function') throw new Error('Bot is not ready for mining');
  const candidates = Array.isArray(names) ? names : [names];
  const block = bot.findBlock({ matching: b => b && candidates.includes(b.name), maxDistance: 48 });
  if (!block) throw new Error(`No target block found: ${candidates.join(', ')}`);
  await movement.moveTo(bot, block.position, { timeout: 30000 });
  const current = bot.blockAt(block.position);
  if (current && candidates.includes(current.name)) await bot.dig(current);
  return { name: block.name, position: block.position };
}

async function stripmineAtYLevel(bot, targetY = config.miningYLevels.diamond, branchLength = config.mining.branchLength, branchSpacing = config.mining.branchSpacing, numBranches = config.mining.numBranches) {
  if (!bot?.entity) throw new Error('Bot is not spawned');
  const start = { x: Math.floor(bot.entity.position.x), y: targetY, z: Math.floor(bot.entity.position.z) };
  await movement.moveTo(bot, start, { timeout: 30000 });
  const results = [];
  const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  for (let branch = 0; branch < Math.max(1, numBranches); branch += 1) {
    const [dx, dz] = dirs[branch % dirs.length];
    const offset = Math.floor(branch / dirs.length) * branchSpacing;
    const origin = { x: start.x + dz * offset, y: targetY, z: start.z + dx * offset };
    try { await movement.moveTo(bot, origin, { timeout: 15000 }); } catch (_) { continue; }
    for (let step = 0; step < branchLength; step += 1) {
      const pos = { x: origin.x + dx * step, y: targetY, z: origin.z + dz * step };
      try { await movement.moveTo(bot, pos, { timeout: 10000 }); } catch (_) { break; }
      const adjacent = [
        { x: pos.x, y: pos.y, z: pos.z },
        { x: pos.x + 1, y: pos.y, z: pos.z }, { x: pos.x - 1, y: pos.y, z: pos.z },
        { x: pos.x, y: pos.y + 1, z: pos.z }, { x: pos.x, y: pos.y - 1, z: pos.z },
        { x: pos.x, y: pos.y, z: pos.z + 1 }, { x: pos.x, y: pos.y, z: pos.z - 1 }
      ];
      for (const p of adjacent) {
        const block = bot.blockAt(p);
        if (block && /(^|deepslate_)(diamond|iron|gold|redstone|lapis|emerald)_ore$|^(coal|copper)_ore$/.test(block.name)) {
          try { await bot.dig(block); results.push(block.name); } catch (_) {}
        }
      }
    }
  }
  return results;
}

async function mineResources(bot) {
  return findAndDigBlock(bot, ['diamond_ore', 'deepslate_diamond_ore', 'iron_ore', 'deepslate_iron_ore', 'gold_ore', 'deepslate_gold_ore', 'coal_ore', 'deepslate_coal_ore', 'copper_ore', 'deepslate_copper_ore']);
}

async function mineDiamond(bot, count = 3) {
  const found = [];
  for (let i = 0; i < Math.max(1, count); i += 1) {
    try { found.push(await findAndDigBlock(bot, ['diamond_ore', 'deepslate_diamond_ore'])); } catch (_) { break; }
  }
  if (!found.length) throw new Error('No diamond ore found nearby');
  return found;
}

async function mineIron(bot, count = 3) {
  const found = [];
  for (let i = 0; i < Math.max(1, count); i += 1) {
    try { found.push(await findAndDigBlock(bot, ['iron_ore', 'deepslate_iron_ore'])); } catch (_) { break; }
  }
  if (!found.length) throw new Error('No iron ore found nearby');
  return found;
}

module.exports = { getMiningYLevel, stripmineAtYLevel, mineResources, mineDiamond, mineIron };
