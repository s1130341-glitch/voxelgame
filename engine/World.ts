
import { Noise } from '../utils/noise';
import { BlockType, ChunkData, InventorySlot } from '../types';
import { CHUNK_SIZE, WORLD_HEIGHT, CHEST_SIZE } from '../constants';

export class WorldManager {
  private chunks: Map<string, ChunkData> = new Map();
  private metadata: Map<string, InventorySlot[]> = new Map();
  private noise: Noise;
  private seed: number;

  constructor(seed: number = 12345) {
    this.seed = seed;
    this.noise = new Noise(seed);
  }

  public getChunkKey(x: number, z: number): string { return `${x},${z}`; }
  public getCoordKey(x: number, y: number, z: number): string { return `${x},${y},${z}`; }

  private hash(x: number, y: number, z: number): number {
    const h = (x * 73856093) ^ (y * 19349663) ^ (z * 83492791) ^ this.seed;
    const res = Math.sin(h) * 10000;
    return res - Math.floor(res);
  }

  public getChunk(cx: number, cz: number): ChunkData {
    const key = this.getChunkKey(cx, cz);
    if (this.chunks.has(key)) return this.chunks.get(key)!;

    const data = new Uint8Array(CHUNK_SIZE * CHUNK_SIZE * WORLD_HEIGHT);
    const waterLevels = new Uint8Array(CHUNK_SIZE * CHUNK_SIZE * WORLD_HEIGHT);
    
    // Pass 1: Base Terrain
    for (let x = 0; x < CHUNK_SIZE; x++) {
      for (let z = 0; z < CHUNK_SIZE; z++) {
        const wx = cx * CHUNK_SIZE + x;
        const wz = cz * CHUNK_SIZE + z;

        let baseH = (this.noise.perlin2d(wx * 0.015, wz * 0.015) + 1) * 10 + 25;
        const detail = (this.noise.perlin2d(wx * 0.05, wz * 0.05)) * 2;
        const canyonMask = Math.abs(this.noise.perlin2d(wx * 0.005, wz * 0.005));
        if (canyonMask < 0.02) {
          const intensity = 1.0 - (canyonMask / 0.02);
          baseH -= Math.pow(intensity, 2) * 20;
        }
        const floorH = Math.floor(baseH + detail);

        for (let y = 0; y < WORLD_HEIGHT; y++) {
          const idx = this.getIndex(x, y, z);
          const cavePath = this.noise.perlin3d(wx * 0.035, y * 0.05, wz * 0.035);
          const caveWidthVar = (this.noise.perlin3d(wx * 0.02, y * 0.02, wz * 0.02) + 1) * 0.5;
          let threshold = 0.08 + (caveWidthVar * 0.12);
          if (y > floorH - 5) threshold = 0.02;

          const isCave = Math.abs(cavePath) < threshold && y > 1;

          if (isCave) {
            data[idx] = BlockType.AIR;
          } else if (y <= floorH) {
            if (y === floorH) {
              data[idx] = BlockType.GRASS;
            } else if (y > floorH - 3) {
              data[idx] = BlockType.DIRT;
            } else {
              data[idx] = this.getOreType(wx, y, wz);
            }
          } else {
            if (y < 20) {
              data[idx] = BlockType.WATER_SOURCE;
              waterLevels[idx] = 15;
            } else {
              data[idx] = BlockType.AIR;
            }
          }
        }
      }
    }

    const chunk: ChunkData = { x: cx, z: cz, data, waterLevels };
    this.chunks.set(key, chunk);

    // Pass 2: Vegetation (Trees)
    for (let x = 0; x < CHUNK_SIZE; x++) {
      for (let z = 0; z < CHUNK_SIZE; z++) {
        const wx = cx * CHUNK_SIZE + x;
        const wz = cz * CHUNK_SIZE + z;
        
        let surfaceY = -1;
        for (let y = WORLD_HEIGHT - 1; y >= 0; y--) {
          if (data[this.getIndex(x, y, z)] === BlockType.GRASS) {
            surfaceY = y;
            break;
          }
        }

        if (surfaceY > 20 && this.hash(wx, 0, wz) < 0.015) {
          this.generateTree(wx, surfaceY, wz);
        }
      }
    }

    return chunk;
  }

  private generateTree(wx: number, surfaceY: number, wz: number) {
    const trunkHeight = 4 + Math.floor(this.hash(wx, 1, wz) * 5);
    for (let i = 1; i <= trunkHeight; i++) {
      this.setBlock(wx, surfaceY + i, wz, BlockType.WOOD);
    }
    const leafStart = 3; 
    for (let ly = leafStart; ly <= trunkHeight + 1; ly++) {
      const y = surfaceY + ly;
      let radius = 2;
      if (ly >= trunkHeight) radius = 1;
      else if (ly === leafStart) radius = 1;

      for (let dx = -radius; dx <= radius; dx++) {
        for (let dz = -radius; dz <= radius; dz++) {
          const distSq = dx * dx + dz * dz;
          if (distSq > radius * radius + 0.5) continue;
          if (this.getBlock(wx + dx, y, wz + dz) === BlockType.AIR) {
            this.setBlock(wx + dx, y, wz + dz, BlockType.LEAVES);
          }
        }
      }
    }
  }

  private getOreType(wx: number, y: number, wz: number): BlockType {
    const chance = this.hash(wx, y, wz);
    const veinNoise = this.noise.perlin3d(wx * 0.15, y * 0.15, wz * 0.15);
    const inVein = veinNoise > 0.4;
    if (inVein) {
      if (y < 14 && chance < 0.0015) return BlockType.DIAMOND_ORE;
      if (y < 45 && chance < 0.008) return BlockType.IRON_ORE;
      if (chance < 0.02) return BlockType.COAL_ORE;
    }
    return BlockType.STONE;
  }

  public getIndex(x: number, y: number, z: number): number {
    return x + z * CHUNK_SIZE + y * CHUNK_SIZE * CHUNK_SIZE;
  }

  public getBlock(x: number, y: number, z: number): BlockType {
    if (y < 0 || y >= WORLD_HEIGHT) return BlockType.AIR;
    const cx = Math.floor(x / CHUNK_SIZE);
    const cz = Math.floor(z / CHUNK_SIZE);
    const lx = ((x % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
    const lz = ((z % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
    const key = this.getChunkKey(cx, cz);
    const chunk = this.chunks.get(key);
    if (!chunk) return BlockType.AIR;
    return chunk.data[this.getIndex(lx, y, lz)];
  }

  public setBlock(x: number, y: number, z: number, type: BlockType) {
    if (y < 0 || y >= WORLD_HEIGHT) return;
    const cx = Math.floor(x / CHUNK_SIZE);
    const cz = Math.floor(z / CHUNK_SIZE);
    const lx = ((x % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
    const lz = ((z % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
    const key = this.getChunkKey(cx, cz);
    const chunk = this.chunks.get(key);
    if (chunk) {
      const idx = this.getIndex(lx, y, lz);
      const oldType = chunk.data[idx];
      chunk.data[idx] = type;
      
      // Cleanup metadata if block is broken
      if (oldType === BlockType.CHEST && type !== BlockType.CHEST) {
        this.metadata.delete(this.getCoordKey(x, y, z));
      }

      if (type === BlockType.WATER_SOURCE) chunk.waterLevels[idx] = 15;
      else if (type === BlockType.AIR) chunk.waterLevels[idx] = 0;
    }
  }

  public getMetadata(x: number, y: number, z: number): InventorySlot[] | undefined {
    return this.metadata.get(this.getCoordKey(x, y, z));
  }

  public setMetadata(x: number, y: number, z: number, data: InventorySlot[]) {
    this.metadata.set(this.getCoordKey(x, y, z), data);
  }

  public getWaterLevel(x: number, y: number, z: number): number {
    if (y < 0 || y >= WORLD_HEIGHT) return 0;
    const cx = Math.floor(x / CHUNK_SIZE);
    const cz = Math.floor(z / CHUNK_SIZE);
    const lx = ((x % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
    const lz = ((z % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
    const chunk = this.chunks.get(this.getChunkKey(cx, cz));
    if (!chunk) return 0;
    return chunk.waterLevels[this.getIndex(lx, y, lz)];
  }

  public setWaterLevel(x: number, y: number, z: number, level: number) {
    if (y < 0 || y >= WORLD_HEIGHT) return;
    const cx = Math.floor(x / CHUNK_SIZE);
    const cz = Math.floor(z / CHUNK_SIZE);
    const lx = ((x % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
    const lz = ((z % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
    const chunk = this.chunks.get(this.getChunkKey(cx, cz));
    if (chunk) {
      chunk.waterLevels[this.getIndex(lx, y, lz)] = level;
    }
  }
}
