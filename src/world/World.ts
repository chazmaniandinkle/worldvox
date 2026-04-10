import { BlockType } from './BlockTypes';

export const MAX_FLUID_LEVEL = 8;
/** @deprecated Use MAX_FLUID_LEVEL */
export const MAX_WATER_LEVEL = MAX_FLUID_LEVEL;

export class World {
  readonly width: number;
  readonly height: number;
  readonly depth: number;
  private blocks: Uint8Array;
  private fluidLevels: Uint8Array;

  constructor(width = 64, height = 32, depth = 64) {
    this.width = width;
    this.height = height;
    this.depth = depth;
    const size = width * height * depth;
    this.blocks = new Uint8Array(size);
    this.fluidLevels = new Uint8Array(size);
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
    if (type === BlockType.WATER || type === BlockType.LAVA) {
      if (this.fluidLevels[idx] === 0) {
        this.fluidLevels[idx] = MAX_FLUID_LEVEL;
      }
    } else {
      this.fluidLevels[idx] = 0;
    }
  }

  // ─── Fluid level (works for both water and lava) ───

  getFluidLevel(x: number, y: number, z: number): number {
    if (!this.inBounds(x, y, z)) return 0;
    return this.fluidLevels[this.index(x, y, z)];
  }

  /** Set fluid level. Level 0 removes the fluid block. */
  setFluidLevel(x: number, y: number, z: number, level: number, type: BlockType): void {
    if (!this.inBounds(x, y, z)) return;
    const idx = this.index(x, y, z);
    if (level <= 0) {
      this.fluidLevels[idx] = 0;
      if (this.blocks[idx] === type) {
        this.blocks[idx] = BlockType.AIR;
      }
    } else {
      this.fluidLevels[idx] = Math.min(level, MAX_FLUID_LEVEL);
      this.blocks[idx] = type;
    }
  }

  // ─── Convenience aliases for water ───

  getWaterLevel(x: number, y: number, z: number): number {
    return this.getFluidLevel(x, y, z);
  }

  setWaterLevel(x: number, y: number, z: number, level: number): void {
    this.setFluidLevel(x, y, z, level, BlockType.WATER);
  }

  getLavaLevel(x: number, y: number, z: number): number {
    return this.getFluidLevel(x, y, z);
  }

  setLavaLevel(x: number, y: number, z: number, level: number): void {
    this.setFluidLevel(x, y, z, level, BlockType.LAVA);
  }

  // ─── Height queries ───

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

  getGroundHeight(x: number, z: number): number {
    for (let y = this.height - 1; y >= 0; y--) {
      const block = this.getBlock(x, y, z);
      if (
        block !== BlockType.AIR &&
        block !== BlockType.WATER &&
        block !== BlockType.LAVA &&
        block !== BlockType.WOOD &&
        block !== BlockType.LEAVES &&
        block !== BlockType.FIRE
      ) {
        return y;
      }
    }
    return 0;
  }
}
