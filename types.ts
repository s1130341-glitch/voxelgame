
import * as THREE from 'three';

export enum BlockType {
  AIR = 0, GRASS = 1, DIRT = 2, STONE = 3, WOOD = 4, LEAVES = 5, PLANKS = 6, CRAFTING_TABLE = 7,
  STICK = 8, COAL = 9, IRON_INGOT = 10, COPPER_INGOT = 11, GOLD_INGOT = 12, TIN_INGOT = 13,
  QUARTZ = 14, DIAMOND = 15, URANIUM = 16, FOOLS_GOLD_INGOT = 17,
  COAL_ORE = 18, IRON_ORE = 19, COPPER_ORE = 20, GOLD_ORE = 21, TIN_ORE = 22,
  QUARTZ_ORE = 23, DIAMOND_ORE = 24, URANIUM_ORE = 25, FOOLS_GOLD_ORE = 26,
  COBBLESTONE = 27, SAND = 28, GLASS = 29, STONE_BRICKS = 30,
  // 工具類
  WOOD_PICKAXE = 31, STONE_PICKAXE = 32, TIN_PICKAXE = 33, COPPER_PICKAXE = 34,
  IRON_PICKAXE = 35, FOOLS_GOLD_PICKAXE = 36, GOLD_PICKAXE = 37, QUARTZ_PICKAXE = 38, DIAMOND_PICKAXE = 39,
  WOOD_SWORD = 40, STONE_SWORD = 41, TIN_SWORD = 42, COPPER_SWORD = 43,
  IRON_SWORD = 44, FOOLS_GOLD_SWORD = 45, GOLD_SWORD = 46, QUARTZ_SWORD = 47, DIAMOND_SWORD = 48,
  // 水系統
  WATER_SOURCE = 49,
  WATER_FLOW = 50,
  IRON_BUCKET = 51,
  WATER_BUCKET = 52,
  // 儲存
  CHEST = 53
}

export interface InventorySlot { type: BlockType; count: number; }
export interface Recipe { input: (BlockType | null)[][]; output: { type: BlockType; count: number }; }
export interface ChunkData { x: number; z: number; data: Uint8Array; waterLevels: Uint8Array; }

export interface DroppedItem { 
  id: string; 
  type: BlockType; 
  position: THREE.Vector3; 
  mesh: THREE.Mesh; 
  createdAt: number; 
  isBeingCollected?: boolean;
  velocity?: THREE.Vector3;
}

export type NetworkMessage = 
  | { type: 'SYNC_SEED', seed: number }
  | { type: 'PLAYER_POS', id: string, pos: [number, number, number], rot: number }
  | { type: 'BLOCK_UPDATE', x: number, y: number, z: number, blockType: BlockType }
  | { type: 'BLOCK_METADATA_UPDATE', x: number, y: number, z: number, metadata: InventorySlot[] }
  | { type: 'ITEM_DROP', id: string, itemType: BlockType, pos: [number, number, number], vel: [number, number, number] };
