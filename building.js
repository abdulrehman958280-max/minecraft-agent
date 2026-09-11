// --- Building Module ---
const { goals } = require('mineflayer-pathfinder');
const movement = require('./movement');

async function placeBlockAt(bot, position, blockName) {
  const reference = bot.findBlock({ matching: b => b && b.name !== 'air' && b.boundingBox === 'block', maxDistance: 5 });
  if (!reference) throw new Error('No reference block available for placement');
  const item = bot.inventory.items().find(i => i.name === blockName);
  if (!item) throw new Error(`Missing building material: ${blockName}`);
  await bot.equip(item, 'hand');
  await bot.placeBlock(reference, { x: position.x - reference.position.x, y: position.y - reference.position.y, z: position.z - reference.position.z });
}

async function buildHomeBase(bot, homeBase = null, homeBuildAttempted = false, setHomeBase = () => {}, gatherHomeMaterials = async () => {}, ensureCraftingTable = async () => {}, craftItem = async () => {}) {
  if (!bot?.entity) throw new Error('Bot is not spawned');
  const base = homeBase || { x: Math.floor(bot.entity.position.x), y: Math.floor(bot.entity.position.y), z: Math.floor(bot.entity.position.z) };
  if (!homeBuildAttempted) setHomeBase(base);
  await gatherHomeMaterials(bot);
  await ensureCraftingTable(bot);
  const radius = 3;
  const wallY = base.y;
  const floorBlock = bot.inventory.items().find(i => ['cobblestone', 'oak_planks', 'stone', 'dirt'].includes(i.name));
  if (!floorBlock) throw new Error('Need cobblestone, stone, dirt, or oak planks to build home');
  await bot.equip(floorBlock, 'hand');
  for (let x = -radius; x <= radius; x += 1) {
    for (let z = -radius; z <= radius; z += 1) {
      const target = bot.blockAt({ x: base.x + x, y: wallY, z: base.z + z });
      if (target?.name === 'air') await placeBlockAt(bot, { x: base.x + x, y: wallY, z: base.z + z }, floorBlock.name).catch(() => {});
    }
  }
  for (let y = 1; y <= 3; y += 1) {
    for (let x = -radius; x <= radius; x += 1) {
      for (const z of [-radius, radius]) {
        if (x === 0 && y < 2 && z === -radius) continue;
        await placeBlockAt(bot, { x: base.x + x, y: wallY + y, z: base.z + z }, floorBlock.name).catch(() => {});
      }
    }
    for (let z = -radius + 1; z < radius; z += 1) {
      for (const x of [-radius, radius]) await placeBlockAt(bot, { x: base.x + x, y: wallY + y, z: base.z + z }, floorBlock.name).catch(() => {});
    }
  }
  setHomeBase(base);
  return { success: true, homeBase: base };
}

async function buildHomeWithFallbacks(bot, homeBase, setHomeBase, ensureCraftingTable, craftItem) {
  return buildHomeBase(bot, homeBase, false, setHomeBase, async () => {}, ensureCraftingTable, craftItem);
}

module.exports = { buildHomeBase, buildHomeWithFallbacks };
