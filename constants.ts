
import { BlockType, Recipe } from './types';

export const CHUNK_SIZE = 16;
export const WORLD_HEIGHT = 64;
export const STACK_LIMIT = 64;
export const INVENTORY_SIZE = 27;
export const HOTBAR_SIZE = 9;
export const CHEST_SIZE = 32;
export const MAX_REACH = 5.0;
export const RENDER_DISTANCE = 4;
export const MOVE_SPEED = 5.0;
export const JUMP_FORCE = 8.5;

export const BLOCK_HARDNESS: Record<number, number> = {
  [BlockType.AIR]: 0,
  [BlockType.GRASS]: 0.5, [BlockType.DIRT]: 0.5, [BlockType.STONE]: 1.5,
  [BlockType.WOOD]: 1.0, [BlockType.PLANKS]: 0.8, [BlockType.LEAVES]: 0.1,
  [BlockType.COBBLESTONE]: 1.5, [BlockType.SAND]: 0.4, [BlockType.GLASS]: 0.3,
  [BlockType.IRON_ORE]: 3.0, [BlockType.COAL_ORE]: 2.0, [BlockType.DIAMOND_ORE]: 4.5,
  [BlockType.IRON_INGOT]: 3.0,
  [BlockType.CHEST]: 2.0,
  [BlockType.WATER_SOURCE]: -1,
  [BlockType.WATER_FLOW]: -1,
};

export const BLOCK_NAMES: Record<number, string> = {
  [BlockType.AIR]: 'Air', [BlockType.GRASS]: 'Grass', [BlockType.DIRT]: 'Dirt', [BlockType.STONE]: 'Stone',
  [BlockType.WOOD]: 'Oak Log', [BlockType.LEAVES]: 'Leaves', [BlockType.PLANKS]: 'Planks',
  [BlockType.COBBLESTONE]: 'Cobblestone', [BlockType.SAND]: 'Sand', [BlockType.GLASS]: 'Glass',
  [BlockType.IRON_ORE]: 'Iron Ore', [BlockType.COAL_ORE]: 'Coal Ore', [BlockType.DIAMOND_ORE]: 'Diamond Ore',
  [BlockType.IRON_INGOT]: 'Iron Ingot', [BlockType.GOLD_INGOT]: 'Gold Ingot', [BlockType.DIAMOND]: 'Diamond', [BlockType.COAL]: 'Coal',
  [BlockType.STICK]: 'Stick', [BlockType.CHEST]: 'Chest',
  [BlockType.WATER_SOURCE]: 'Water Source', [BlockType.WATER_FLOW]: 'Flowing Water',
  [BlockType.IRON_BUCKET]: 'Empty Bucket', [BlockType.WATER_BUCKET]: 'Water Bucket',
  [BlockType.IRON_PICKAXE]: 'Iron Pickaxe', [BlockType.GOLD_PICKAXE]: 'Gold Pickaxe', [BlockType.DIAMOND_PICKAXE]: 'Diamond Pickaxe',
  [BlockType.IRON_SWORD]: 'Iron Sword',
};

export const RECIPES: Recipe[] = [
  { input: [[BlockType.WOOD]], output: { type: BlockType.PLANKS, count: 4 } },
  { input: [[BlockType.PLANKS], [BlockType.PLANKS]], output: { type: BlockType.STICK, count: 4 } },
  { 
    input: [
      [BlockType.PLANKS, BlockType.PLANKS, BlockType.PLANKS],
      [BlockType.PLANKS, null, BlockType.PLANKS],
      [BlockType.PLANKS, BlockType.PLANKS, BlockType.PLANKS]
    ], 
    output: { type: BlockType.CHEST, count: 1 } 
  },
  { input: [[BlockType.IRON_INGOT, null, BlockType.IRON_INGOT], [null, BlockType.IRON_INGOT, null]], output: { type: BlockType.IRON_BUCKET, count: 1 } },
];
