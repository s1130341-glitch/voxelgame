
import * as THREE from 'three';
import { WorldManager } from './World';
import { BlockType } from '../types';

export const PLAYER_HEIGHT = 1.8;
export const PLAYER_RADIUS = 0.35;
export const GRAVITY = 32.0;
export const COLLISION_EPSILON = 0.05;

export class PhysicsEngine {
  /**
   * 檢查給定位置是否與方塊碰撞
   * @param feetPos 玩家腳底的座標
   */
  public static isColliding(feetPos: THREE.Vector3, world: WorldManager): boolean {
    const r = PLAYER_RADIUS - 0.02; // 稍微收縮碰撞盒避免卡牆
    const h = PLAYER_HEIGHT;
    
    // 檢查點：腳底四角、軀幹四角、頭頂四角
    const yPoints = [0.1, h / 2, h - 0.1];
    const xzOffsets = [
      { x: -r, z: -r }, { x: r, z: -r },
      { x: -r, z: r }, { x: r, z: r },
      { x: 0, z: 0 } // 中心點
    ];

    for (const dy of yPoints) {
      for (const off of xzOffsets) {
        const checkX = Math.floor(feetPos.x + off.x);
        const checkY = Math.floor(feetPos.y + dy);
        const checkZ = Math.floor(feetPos.z + off.z);
        
        if (world.getBlock(checkX, checkY, checkZ) !== BlockType.AIR) {
          return true;
        }
      }
    }
    return false;
  }

  public static updateMovement(
    feetPos: THREE.Vector3,
    vel: THREE.Vector3,
    delta: number,
    world: WorldManager,
    onGrounded: () => void
  ) {
    const substeps = 4;
    const stepDelta = delta / substeps;

    for (let i = 0; i < substeps; i++) {
      // 應用重力
      vel.y -= GRAVITY * stepDelta;
      
      // 限制終端速度防止穿牆
      if (vel.y < -50) vel.y = -50;

      const nextY = feetPos.y + vel.y * stepDelta;
      const nextPos = feetPos.clone();
      nextPos.y = nextY;

      if (this.isColliding(nextPos, world)) {
        if (vel.y < 0) {
          // 落地處理：對齊方塊頂部
          feetPos.y = Math.ceil(nextY - 0.001);
          onGrounded();
        } else {
          // 撞到天花板
          feetPos.y = Math.floor(nextY + PLAYER_HEIGHT) - PLAYER_HEIGHT - 0.01;
        }
        vel.y = 0;
        break;
      } else {
        feetPos.y = nextY;
      }
    }
  }
}
