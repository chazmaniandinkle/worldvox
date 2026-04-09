import { World } from '../world/World';
import { BlockType, BLOCK_COLORS } from '../world/BlockTypes';
import { Creature } from '../creatures/Creature';

/**
 * Top-down pixel minimap rendered to a canvas element.
 * Shows terrain colors, water, fire, and creature dots.
 * Click to pan camera to that world position.
 */
export class Minimap {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private world: World;
  private container: HTMLElement;
  private imageData: ImageData;
  private visible = true;
  private interval: number;

  /** Callback: receives world (x, z) when the user clicks the minimap. */
  onClickPosition?: (x: number, z: number) => void;

  /** Provide a getter so the minimap can read live creatures. */
  getCreatures: () => Creature[] = () => [];

  constructor(world: World) {
    this.world = world;

    this.container = document.createElement('div');
    this.container.className = 'minimap';

    this.canvas = document.createElement('canvas');
    this.canvas.width = world.width;
    this.canvas.height = world.depth;
    this.container.appendChild(this.canvas);

    this.ctx = this.canvas.getContext('2d')!;
    this.ctx.imageSmoothingEnabled = false;
    this.imageData = this.ctx.createImageData(world.width, world.depth);

    document.body.appendChild(this.container);

    // Click to jump camera
    this.canvas.addEventListener('click', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const scaleX = this.world.width / rect.width;
      const scaleZ = this.world.depth / rect.height;
      const wx = e.offsetX * scaleX;
      const wz = e.offsetY * scaleZ;
      this.onClickPosition?.(wx, wz);
    });

    // Refresh at ~4fps (lightweight)
    this.interval = setInterval(() => this.render(), 250) as unknown as number;
    this.render();
  }

  toggle(): void {
    this.visible = !this.visible;
    this.container.style.display = this.visible ? 'block' : 'none';
  }

  dispose(): void {
    clearInterval(this.interval);
    this.container.remove();
  }

  private render(): void {
    if (!this.visible) return;

    const w = this.world.width;
    const d = this.world.depth;
    const data = this.imageData.data;

    // Draw terrain
    for (let x = 0; x < w; x++) {
      for (let z = 0; z < d; z++) {
        const h = this.world.getHeight(x, z);
        const block = this.world.getBlock(x, h, z);

        let r: number, g: number, b: number;

        if (block === BlockType.AIR) {
          r = 20; g = 20; b = 30; // void
        } else if (block === BlockType.FIRE) {
          // Animated fire flicker
          const flicker = 0.8 + Math.random() * 0.2;
          r = 255 * flicker; g = 140 * flicker; b = 0;
        } else {
          const c = BLOCK_COLORS[block] ?? [1, 0, 1];
          // Height shading: brighter at higher elevations
          const shade = 0.7 + (h / this.world.height) * 0.3;
          r = c[0] * 255 * shade;
          g = c[1] * 255 * shade;
          b = c[2] * 255 * shade;
        }

        const idx = (z * w + x) * 4;
        data[idx] = r;
        data[idx + 1] = g;
        data[idx + 2] = b;
        data[idx + 3] = 255;
      }
    }

    this.ctx.putImageData(this.imageData, 0, 0);

    // Draw creature dots on top
    const creatures = this.getCreatures();
    for (const c of creatures) {
      if (!c.alive) continue;
      const cx = Math.floor(c.x);
      const cz = Math.floor(c.z);
      if (cx < 0 || cx >= w || cz < 0 || cz >= d) continue;

      this.ctx.fillStyle = c.config.color;
      // Dot size scales with creature size, minimum 1px
      const dotSize = Math.max(1, Math.round(c.config.size));
      this.ctx.fillRect(cx, cz, dotSize, dotSize);
    }
  }
}
