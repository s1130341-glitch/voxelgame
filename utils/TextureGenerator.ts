
import * as THREE from 'three';
import { BlockType } from '../types';
import { ItemTextureGenerator } from './ItemTextureGenerator';

const TEXTURE_SIZE = 16;

export class TextureGenerator {
  private static cache: Map<string, string> = new Map();
  private static threeCache: Map<string, THREE.CanvasTexture> = new Map();

  private static getColors(type: BlockType): { main: string, dark: string, light: string, accent?: string } {
    switch (type) {
      case BlockType.GRASS: return { main: '#4ade80', dark: '#166534', light: '#bdf4d4' };
      case BlockType.DIRT: return { main: '#78350f', dark: '#451a03', light: '#a16207' };
      case BlockType.STONE: return { main: '#71717a', dark: '#3f3f46', light: '#a1a1aa' };
      case BlockType.COBBLESTONE: return { main: '#52525b', dark: '#27272a', light: '#71717a' };
      case BlockType.WOOD: return { main: '#713f12', dark: '#422006', light: '#a16207' };
      case BlockType.PLANKS: return { main: '#b45309', dark: '#78350f', light: '#d97706' };
      case BlockType.LEAVES: return { main: '#15803d', dark: '#064e3b', light: '#22c55e' };
      case BlockType.SAND: return { main: '#fde047', dark: '#ca8a04', light: '#fef9c3' };
      case BlockType.GLASS: return { main: '#93c5fd', dark: '#3b82f6', light: '#eff6ff' };
      case BlockType.CHEST: return { main: '#8b4513', dark: '#5d2e0c', light: '#a0522d' };
      case BlockType.IRON_ORE: case BlockType.IRON_INGOT: case BlockType.IRON_PICKAXE: case BlockType.IRON_SWORD: case BlockType.IRON_BUCKET:
        return { main: '#d1d5db', dark: '#9ca3af', light: '#f3f4f6' };
      case BlockType.GOLD_ORE: case BlockType.GOLD_INGOT: case BlockType.GOLD_PICKAXE: case BlockType.GOLD_SWORD:
        return { main: '#fbbf24', dark: '#b45309', light: '#fef08a' };
      case BlockType.DIAMOND_ORE: case BlockType.DIAMOND: case BlockType.DIAMOND_PICKAXE: case BlockType.DIAMOND_SWORD:
        return { main: '#38bdf8', dark: '#0284c7', light: '#bae6fd' };
      case BlockType.COAL_ORE: case BlockType.COAL:
        return { main: '#18181b', dark: '#020617', light: '#3f3f46' };
      case BlockType.WATER_SOURCE: case BlockType.WATER_FLOW: case BlockType.WATER_BUCKET:
        return { main: '#3b82f6', dark: '#1d4ed8', light: '#60a5fa' };
      case BlockType.STICK: 
        return { main: '#78350f', dark: '#451a03', light: '#92400e' };
      case BlockType.STONE_PICKAXE: case BlockType.STONE_SWORD:
        return { main: '#71717a', dark: '#3f3f46', light: '#a1a1aa' };
      case BlockType.WOOD_PICKAXE: case BlockType.WOOD_SWORD:
        return { main: '#b45309', dark: '#78350f', light: '#d97706' };
      default: return { main: '#ffffff', dark: '#cccccc', light: '#eeeeee' };
    }
  }

  public static getDataURL(type: BlockType): string {
    const key = `url_${type}`;
    if (this.cache.has(key)) return this.cache.get(key)!;
    
    const canvas = document.createElement('canvas');
    canvas.width = TEXTURE_SIZE;
    canvas.height = TEXTURE_SIZE;
    this.drawToCanvas(type, canvas);
    
    const url = canvas.toDataURL();
    this.cache.set(key, url);
    return url;
  }

  public static getThreeTexture(type: BlockType): THREE.CanvasTexture {
    const key = `three_${type}`;
    if (this.threeCache.has(key)) return this.threeCache.get(key)!;

    const canvas = document.createElement('canvas');
    canvas.width = TEXTURE_SIZE;
    canvas.height = TEXTURE_SIZE;
    this.drawToCanvas(type, canvas);

    const texture = new THREE.CanvasTexture(canvas);
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.NearestFilter;
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.colorSpace = THREE.SRGBColorSpace;
    
    this.threeCache.set(key, texture);
    return texture;
  }

  private static drawToCanvas(type: BlockType, canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
    const colors = this.getColors(type);
    ctx.clearRect(0, 0, TEXTURE_SIZE, TEXTURE_SIZE);

    let seed = (type as number) * 12345;
    const rand = () => {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };

    if (type <= 30 || type === BlockType.WATER_SOURCE || type === BlockType.WATER_FLOW || type === BlockType.CHEST) {
      this.drawBlock(type, ctx, colors, rand);
    } else {
      ItemTextureGenerator.draw(type, ctx, colors, () => this.getColors(BlockType.STICK));
    }
  }

  private static drawBlock(type: BlockType, ctx: CanvasRenderingContext2D, colors: any, rand: () => number) {
    if (type === BlockType.CHEST) {
      ctx.fillStyle = colors.main;
      ctx.fillRect(0, 0, 16, 16);
      ctx.fillStyle = colors.dark;
      ctx.fillRect(0, 0, 16, 1); ctx.fillRect(0, 15, 16, 1);
      ctx.fillRect(0, 0, 1, 16); ctx.fillRect(15, 0, 1, 16);
      ctx.fillRect(0, 7, 16, 2);
      ctx.fillStyle = '#ffcc00'; // Lock
      ctx.fillRect(7, 6, 2, 3);
      ctx.fillStyle = '#664400';
      ctx.fillRect(7, 7, 2, 1);
      return;
    }

    if (type === BlockType.GRASS) {
      ctx.fillStyle = colors.main;
      ctx.fillRect(0, 0, 16, 16);
      ctx.fillStyle = colors.dark;
      for (let i = 0; i < 30; i++) ctx.fillRect(Math.floor(rand() * 16), Math.floor(rand() * 16), 1, 2);
      ctx.fillStyle = colors.light;
      for (let i = 0; i < 15; i++) ctx.fillRect(Math.floor(rand() * 16), Math.floor(rand() * 16), 1, 1);
    } 
    else if (type === BlockType.DIRT) {
      ctx.fillStyle = colors.main;
      ctx.fillRect(0, 0, 16, 16);
      ctx.fillStyle = colors.dark;
      for (let i = 0; i < 40; i++) ctx.fillRect(Math.floor(rand() * 16), Math.floor(rand() * 16), rand() > 0.5 ? 1 : 2, 1);
      ctx.fillStyle = colors.light;
      for (let i = 0; i < 10; i++) ctx.fillRect(Math.floor(rand() * 16), Math.floor(rand() * 16), 1, 1);
    }
    else if (type === BlockType.STONE || type === BlockType.COBBLESTONE || type === BlockType.STONE_BRICKS) {
      ctx.fillStyle = colors.main;
      ctx.fillRect(0, 0, 16, 16);
      ctx.fillStyle = colors.dark;
      for (let i = 0; i < 6; i++) {
        const x = Math.floor(rand() * 14);
        const y = Math.floor(rand() * 14);
        ctx.fillRect(x, y, 3, 1);
        ctx.fillRect(x, y, 1, 3);
      }
      if (type === BlockType.STONE_BRICKS) {
        ctx.fillRect(0, 7, 16, 1); ctx.fillRect(0, 15, 16, 1);
        ctx.fillRect(7, 0, 1, 8); ctx.fillRect(12, 8, 1, 8);
      }
      ctx.fillStyle = colors.light;
      for (let i = 0; i < 20; i++) ctx.fillRect(Math.floor(rand() * 16), Math.floor(rand() * 16), 1, 1);
    }
    else if (type === BlockType.WOOD) {
      ctx.fillStyle = colors.main;
      ctx.fillRect(0, 0, 16, 16);
      ctx.fillStyle = colors.dark;
      for (let x = 0; x < 16; x += 3) {
        ctx.fillRect(x + Math.floor(rand() * 2), 0, 1, 16);
      }
      ctx.fillStyle = colors.light;
      for (let i = 0; i < 10; i++) ctx.fillRect(Math.floor(rand() * 16), Math.floor(rand() * 16), 1, 2);
    }
    else if (type === BlockType.PLANKS) {
      ctx.fillStyle = colors.main;
      ctx.fillRect(0, 0, 16, 16);
      ctx.fillStyle = colors.dark;
      ctx.fillRect(0, 7, 16, 1); ctx.fillRect(0, 15, 16, 1);
      ctx.fillRect(4, 0, 1, 7); ctx.fillRect(12, 8, 1, 7);
      ctx.fillStyle = colors.light;
      for (let i = 0; i < 4; i++) {
        const y = 2 + i * 4;
        ctx.fillRect(0, y, 16, 1);
      }
    }
    else if (type === BlockType.LEAVES) {
      ctx.fillStyle = colors.dark;
      ctx.fillRect(0, 0, 16, 16);
      ctx.fillStyle = colors.main;
      for (let i = 0; i < 25; i++) {
        ctx.fillRect(Math.floor(rand() * 14), Math.floor(rand() * 14), 2, 2);
      }
      ctx.fillStyle = colors.light;
      for (let i = 0; i < 10; i++) ctx.fillRect(Math.floor(rand() * 16), Math.floor(rand() * 16), 1, 1);
    }
    else if (type === BlockType.SAND) {
      ctx.fillStyle = colors.main;
      ctx.fillRect(0, 0, 16, 16);
      ctx.fillStyle = colors.dark;
      for (let i = 0; i < 40; i++) ctx.fillRect(Math.floor(rand() * 16), Math.floor(rand() * 16), 1, 1);
      ctx.fillStyle = colors.light;
      for (let i = 0; i < 15; i++) ctx.fillRect(Math.floor(rand() * 16), Math.floor(rand() * 16), 1, 1);
    }
    else if (type >= 18 && type <= 26) { // Ores
      const stoneColors = this.getColors(BlockType.STONE);
      ctx.fillStyle = stoneColors.main;
      ctx.fillRect(0, 0, 16, 16);
      ctx.fillStyle = stoneColors.dark;
      for (let i = 0; i < 8; i++) ctx.fillRect(Math.floor(rand() * 16), Math.floor(rand() * 16), 1, 1);
      
      ctx.fillStyle = colors.main;
      for (let i = 0; i < 6; i++) {
        const x = 2 + Math.floor(rand() * 12);
        const y = 2 + Math.floor(rand() * 12);
        ctx.fillRect(x, y, 2, 2);
        ctx.fillStyle = colors.light;
        ctx.fillRect(x, y, 1, 1);
        ctx.fillStyle = colors.main;
      }
    }
    else if (type === BlockType.WATER_SOURCE || type === BlockType.WATER_FLOW) {
      ctx.fillStyle = colors.main;
      ctx.fillRect(0, 0, 16, 16);
      ctx.fillStyle = colors.light;
      for (let i = 0; i < 3; i++) {
        ctx.fillRect(Math.floor(rand() * 10), Math.floor(rand() * 16), 6, 1);
      }
    }
    else if (type === BlockType.GLASS) {
      ctx.fillStyle = 'rgba(147, 197, 253, 0.2)';
      ctx.fillRect(0, 0, 16, 16);
      ctx.strokeStyle = colors.light;
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(2, 2); ctx.lineTo(6, 6); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(10, 10); ctx.lineTo(14, 14); ctx.stroke();
    }
  }
}
