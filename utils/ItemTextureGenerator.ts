
import { BlockType } from '../types';

const SIZE = 16;

export class ItemTextureGenerator {
  public static draw(type: BlockType, ctx: CanvasRenderingContext2D, colors: { main: string, dark: string, light: string }, getStickColors: () => { main: string, dark: string, light: string }) {
    ctx.imageSmoothingEnabled = false;

    // Determine category
    if (type >= 31 && type <= 39) {
      this.drawPickaxe(ctx, colors, getStickColors());
    } else if (type >= 40 && type <= 48) {
      this.drawSword(ctx, colors, getStickColors());
    } else if (type === BlockType.STICK) {
      this.drawStick(ctx, colors);
    } else if (type.toString().includes('INGOT') || type === BlockType.QUARTZ || type === BlockType.DIAMOND || type === BlockType.COAL) {
      this.drawIngotOrGem(type, ctx, colors);
    } else if (type === BlockType.IRON_BUCKET || type === BlockType.WATER_BUCKET) {
      this.drawBucket(type, ctx, colors);
    } else {
      this.drawGenericItem(ctx, colors);
    }
  }

  private static drawPickaxe(ctx: CanvasRenderingContext2D, head: any, handle: any) {
    // Handle (Stick)
    ctx.fillStyle = handle.main;
    for (let i = 0; i < 9; i++) {
      ctx.fillRect(i + 2, 13 - i, 1, 1);
      ctx.fillStyle = handle.dark;
      ctx.fillRect(i + 3, 13 - i, 1, 1);
      ctx.fillStyle = handle.main;
    }

    // Head
    ctx.fillStyle = head.main;
    // Main arch
    ctx.fillRect(8, 2, 6, 2);
    ctx.fillRect(12, 2, 2, 6);
    ctx.fillRect(7, 3, 2, 2);
    ctx.fillRect(11, 7, 2, 2);
    
    // Highlights
    ctx.fillStyle = head.light;
    ctx.fillRect(9, 2, 2, 1);
    ctx.fillRect(13, 3, 1, 2);
    
    // Shadows
    ctx.fillStyle = head.dark;
    ctx.fillRect(7, 4, 1, 1);
    ctx.fillRect(12, 8, 1, 1);
  }

  private static drawSword(ctx: CanvasRenderingContext2D, blade: any, handle: any) {
    // Handle
    ctx.fillStyle = handle.main;
    ctx.fillRect(2, 13, 2, 2);
    ctx.fillRect(3, 12, 2, 2);
    
    // Crossguard
    ctx.fillStyle = handle.dark;
    ctx.fillRect(4, 10, 3, 1);
    ctx.fillRect(5, 9, 1, 3);
    
    // Blade
    ctx.fillStyle = blade.main;
    for (let i = 0; i < 8; i++) {
      ctx.fillRect(i + 6, 9 - i, 2, 2);
    }
    
    // Blade highlight
    ctx.fillStyle = blade.light;
    for (let i = 0; i < 7; i++) {
      ctx.fillRect(i + 7, 8 - i, 1, 1);
    }
    
    // Blade shadow
    ctx.fillStyle = blade.dark;
    for (let i = 0; i < 7; i++) {
      ctx.fillRect(i + 6, 10 - i, 1, 1);
    }
  }

  private static drawStick(ctx: CanvasRenderingContext2D, colors: any) {
    ctx.fillStyle = colors.main;
    for (let i = 0; i < 12; i++) {
      ctx.fillRect(i + 2, 13 - i, 1, 1);
    }
    ctx.fillStyle = colors.dark;
    for (let i = 0; i < 12; i++) {
      ctx.fillRect(i + 3, 13 - i, 1, 1);
    }
  }

  private static drawIngotOrGem(type: BlockType, ctx: CanvasRenderingContext2D, colors: any) {
    if (type === BlockType.DIAMOND || type === BlockType.QUARTZ) {
      // Gem shape
      ctx.fillStyle = colors.main;
      ctx.beginPath();
      ctx.moveTo(8, 3); ctx.lineTo(13, 8); ctx.lineTo(8, 13); ctx.lineTo(3, 8);
      ctx.fill();
      ctx.fillStyle = colors.light;
      ctx.fillRect(6, 6, 2, 2);
    } else {
      // Ingot shape
      ctx.fillStyle = colors.dark;
      ctx.fillRect(3, 8, 10, 5);
      ctx.fillStyle = colors.main;
      ctx.fillRect(4, 7, 10, 5);
      ctx.fillStyle = colors.light;
      ctx.fillRect(5, 7, 8, 1);
    }
  }

  private static drawBucket(type: BlockType, ctx: CanvasRenderingContext2D, colors: any) {
    ctx.fillStyle = colors.dark;
    ctx.fillRect(4, 5, 1, 7);
    ctx.fillRect(11, 5, 1, 7);
    ctx.fillRect(5, 12, 6, 1);
    
    ctx.fillStyle = colors.main;
    ctx.fillRect(5, 6, 6, 6);
    
    if (type === BlockType.WATER_BUCKET) {
      ctx.fillStyle = '#3b82f6';
      ctx.fillRect(5, 7, 6, 5);
      ctx.fillStyle = '#60a5fa';
      ctx.fillRect(6, 7, 2, 1);
    }
  }

  private static drawGenericItem(ctx: CanvasRenderingContext2D, colors: any) {
    ctx.fillStyle = colors.main;
    ctx.beginPath();
    ctx.arc(8, 8, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = colors.light;
    ctx.fillRect(6, 6, 2, 2);
  }
}
