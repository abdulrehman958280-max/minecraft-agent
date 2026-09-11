// --- Inventory Module ---

const FOOD_ITEMS = new Set(['bread', 'cooked_beef', 'cooked_porkchop', 'cooked_chicken', 'cooked_mutton', 'cooked_rabbit', 'baked_potato', 'golden_carrot', 'carrot', 'potato', 'apple', 'melon_slice', 'sweet_berries', 'beef', 'porkchop', 'chicken', 'mutton']);
const TRASH_ITEMS = new Set(['rotten_flesh', 'spider_eye', 'poisonous_potato', 'dirt', 'gravel', 'sand', 'cobblestone']);

function getFoodItems(bot) {
  return bot.inventory.items().filter(item => FOOD_ITEMS.has(item.name));
}

async function eatFood(bot) {
  if (!bot?.consume || !bot?.inventory) throw new Error('Bot is not ready to eat');
  if (bot.food >= 18) return { success: true, skipped: true, reason: 'food is already high' };
  const food = getFoodItems(bot).sort((a, b) => b.count - a.count)[0];
  if (!food) throw new Error('No food available');
  await bot.equip(food, 'hand');
  await bot.consume();
  return { success: true, item: food.name };
}

async function storeItems(bot) {
  if (!bot?.findBlock || !bot?.openContainer) throw new Error('Bot is not ready for storage');
  const chest = bot.findBlock({ matching: block => block && (block.name === 'chest' || block.name === 'barrel'), maxDistance: 12 });
  if (!chest) throw new Error('No chest or barrel found nearby');
  const container = await bot.openContainer(chest);
  try {
    for (const item of bot.inventory.items()) {
      if (FOOD_ITEMS.has(item.name)) continue;
      await container.deposit(item.type, null, item.count).catch(() => {});
    }
  } finally {
    container.close();
  }
  return { success: true };
}

async function dropTrash(bot) {
  const dropped = [];
  for (const item of bot.inventory.items().filter(entry => TRASH_ITEMS.has(entry.name))) {
    try { await bot.tossStack(item); dropped.push(item.name); } catch (_) {}
  }
  return dropped;
}

async function batchCleanup(bot) {
  const dropped = await dropTrash(bot);
  return { success: true, dropped, food: getFoodItems(bot).reduce((total, item) => total + item.count, 0), slotsUsed: bot.inventory.items().length };
}

module.exports = { eatFood, storeItems, dropTrash, batchCleanup };
