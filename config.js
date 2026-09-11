// Centralized configuration for the Minecraft bot
module.exports = {
  miningYLevels: {
    diamond: -59,
    redstone: -59,
    gold: -16,
    iron: 16,
    lapis: 0,
    emerald: 236
  },
  homeMaterials: {
    cobble: 64,
    planks: 64,
    glass: 16,
    torch: 8,
    fence: 8,
    slab: 16,
    flower: 2
  },
  inventoryThresholds: {
    food: 8,
    health: 10,
    full: 30
  },
  timeouts: {
    homeBuild: 2 * 60 * 1000
  },
  fallbackBlocks: ['dirt', 'sand', 'gravel', 'andesite', 'granite', 'diorite', 'netherrack', 'end_stone'],
  mining: {
    branchLength: 16,
    branchSpacing: 2,
    numBranches: 6
  }
};
