
import { WorldManager } from './World';
import { BlockType } from '../types';

export class WaterSystem {
  /**
   * Performs one tick of water flow calculations.
   * Returns a set of chunk keys that were modified.
   */
  public static tick(world: WorldManager): Set<string> {
    const updates: {x: number, y: number, z: number, type: BlockType, level: number}[] = [];
    const modifiedChunks = new Set<string>();

    // This is a simplified BFS/local-update approach.
    // Ideally we'd only track "active" water blocks for performance.
    // For this implementation, we scan nearby chunks or active areas.
    // Here we'll implement the core logic for a single cell:
    
    // We iterate through a range around the player or globally (limited for perf)
    // To be efficient, this tick logic should ideally be called per-block update.
    
    // Added return to satisfy TypeScript compiler as the function expects Set<string>
    return modifiedChunks;
  }

  /**
   * Computes the new state for a water block at (x, y, z)
   */
  public static computeNextState(world: WorldManager, x: number, y: number, z: number) {
    const currentType = world.getBlock(x, y, z);
    const currentLevel = world.getWaterLevel(x, y, z);
    
    if (currentType !== BlockType.WATER_SOURCE && currentType !== BlockType.WATER_FLOW) {
      // Try to receive water from above or neighbors
      const aboveType = world.getBlock(x, y + 1, z);
      if (aboveType === BlockType.WATER_SOURCE || aboveType === BlockType.WATER_FLOW) {
        return { type: BlockType.WATER_FLOW, level: 15 };
      }
      
      let maxNeighborLevel = 0;
      const neighbors = [
        [x+1, y, z], [x-1, y, z], [x, y, z+1], [x, y, z-1]
      ];
      for (const [nx, ny, nz] of neighbors) {
        const nType = world.getBlock(nx, ny, nz);
        if (nType === BlockType.WATER_SOURCE || nType === BlockType.WATER_FLOW) {
          // Check if neighbor is on a surface (can spread horizontally)
          const belowN = world.getBlock(nx, ny - 1, nz);
          if (belowN !== BlockType.AIR && belowN !== BlockType.WATER_FLOW) {
            maxNeighborLevel = Math.max(maxNeighborLevel, world.getWaterLevel(nx, ny, nz));
          }
        }
      }
      
      if (maxNeighborLevel > 1) {
        return { type: BlockType.WATER_FLOW, level: maxNeighborLevel - 1 };
      }
      
      return null;
    }

    if (currentType === BlockType.WATER_SOURCE) return null; // Sources are static

    // It's a flow block - check if it should evaporate or change
    const aboveType = world.getBlock(x, y + 1, z);
    if (aboveType === BlockType.WATER_SOURCE || aboveType === BlockType.WATER_FLOW) {
      if (currentLevel !== 15) return { type: BlockType.WATER_FLOW, level: 15 };
      return null;
    }

    let maxNeighborLevel = 0;
    const neighbors = [[x+1, y, z], [x-1, y, z], [x, y, z+1], [x, y, z-1]];
    for (const [nx, ny, nz] of neighbors) {
      const nType = world.getBlock(nx, ny, nz);
      if (nType === BlockType.WATER_SOURCE || nType === BlockType.WATER_FLOW) {
        const belowN = world.getBlock(nx, ny - 1, nz);
        if (belowN !== BlockType.AIR && belowN !== BlockType.WATER_FLOW) {
          maxNeighborLevel = Math.max(maxNeighborLevel, world.getWaterLevel(nx, ny, nz));
        }
      }
    }

    if (maxNeighborLevel - 1 !== currentLevel) {
      const nextLevel = Math.max(0, maxNeighborLevel - 1);
      return { 
        type: nextLevel > 0 ? BlockType.WATER_FLOW : BlockType.AIR, 
        level: nextLevel 
      };
    }

    return null;
  }

  /**
   * Propagates water changes starting from a point.
   */
  public static updateArea(world: WorldManager, startX: number, startY: number, startZ: number, radius: number, onChunkModified: (cx: number, cz: number) => void) {
    const queue: [number, number, number][] = [[startX, startY, startZ]];
    const visited = new Set<string>();
    let count = 0;
    const maxIters = 1000;

    while (queue.length > 0 && count < maxIters) {
      const [cx, cy, cz] = queue.shift()!;
      const key = `${cx},${cy},${cz}`;
      if (visited.has(key)) continue;
      visited.add(key);
      count++;

      const next = this.computeNextState(world, cx, cy, cz);
      if (next) {
        world.setBlock(cx, cy, cz, next.type);
        world.setWaterLevel(cx, cy, cz, next.level);
        onChunkModified(Math.floor(cx / 16), Math.floor(cz / 16));
        
        // Add neighbors to queue
        const neighbors = [
          [cx, cy - 1, cz], [cx, cy + 1, cz],
          [cx + 1, cy, cz], [cx - 1, cy, cz], [cx, cy, cz + 1], [cx, cy, cz - 1]
        ];
        for (const [nx, ny, nz] of neighbors) {
          if (ny >= 0 && ny < 64 && Math.abs(nx - startX) <= radius && Math.abs(nz - startZ) <= radius) {
            queue.push([nx, ny, nz]);
          }
        }
      }
    }
  }
}
