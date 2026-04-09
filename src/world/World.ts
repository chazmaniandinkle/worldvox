import { BlockType } from './BlockTypes';

export const MAX_WATER_LEVEL = 8;

export class World {
  readonly width: number;
  readonly height: number;
  readonly depth: number;
  private blocks: Uint8Array;
  private waterLevels: Uint8Array;

  constructor(width = 64, height = 32, depth = 64) {
    this.width = width;
    this.height = height;
    this.depth = depth;
    const size = width * height * depth;
    this.blocks = new Uint8Array(size);
    this.waterLevels = new Uint8Array(size);
  }

  private index(x: number, y: number, z: number): number {
    return x + z * this.width + y * this.width * this.depth;
  }

  inBounds(x: number, y: number, z: number): boolean {
    return x >= 0 && x < this.width && y >= 0 && y < this.height && z >= 0 && z < this.depth;
  }

  getBlock(x: number, y: number, z: number): BlockType {
    if (!this.inBounds(x, y, z)) return BlockType.AIR;
    return this.blocks[this.index(x, y, z)] as BlockType;
  }

  setBlock(x: number, y: number, z: number, type: BlockType): void {
    if (!this.inBounds(x, y, z)) return;
    const idx = this.index(x, y, z);
    this.blocks[idx] = type;
    if (type === BlockType.WATER) {
      // Default to full if not already set
      if (this.waterLevels[idx] === 0) {
        this.waterLevels[idx] = MAX_WATER_LEVEL;
      }
    } else {
      this.waterLevels[idx] = 0;
    }
  }

  getWaterLevel(x: number, y: number, z: number): number {
    if (!this.inBounds(x, y, z)) return 0;
    return this.waterLevels[this.index(x, y, z)];
  }

  /** Set water level directly. Level 0 removes the water block. */
  setWaterLevel(x: number, y: number, z: number, level: number): void {
    if (!this.inBounds(x, y, z)) return;
    const idx = this.index(x, y, z);
    if (level <= 0) {
      this.waterLevels[idx] = 0;
      if (this.blocks[idx] === BlockType.WATER) {
        this.blocks[idx] = BlockType.AIR;
      }
    } else {
      this.waterLevels[idx] = Math.min(level, MAX_WATER_LEVEL);
      this.blocks[idx] = BlockType.WATER;
    }
  }

  getHeight(x: number, z: number): number {
    for (let y = this.height - 1; y >= 0; y--) {
      if (this.getBlock(x, y, z) !== BlockType.AIR) return y;
    }
    return 0;
  }

  getSolidHeight(x: number, z: number): number {
    for (let y = this.height - 1; y >= 0; y--) {
      const block = this.getBlock(x, y, z);
      if (block !== BlockType.AIR && block !== BlockType.WATER) return y;
    }
    return 0;
  }
}
