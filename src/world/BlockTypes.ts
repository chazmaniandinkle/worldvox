export enum BlockType {
  AIR = 0,
  GRASS = 1,
  DIRT = 2,
  STONE = 3,
  WATER = 4,
  SAND = 5,
  SNOW = 6,
  WOOD = 7,
  LEAVES = 8,
  LAVA = 9,
  FIRE = 10,
}

export const BLOCK_COLORS: Record<number, [number, number, number]> = {
  [BlockType.GRASS]: [0.36, 0.68, 0.25],
  [BlockType.DIRT]: [0.55, 0.37, 0.24],
  [BlockType.STONE]: [0.5, 0.5, 0.5],
  [BlockType.WATER]: [0.15, 0.35, 0.75],
  [BlockType.SAND]: [0.86, 0.82, 0.62],
  [BlockType.SNOW]: [0.93, 0.93, 0.97],
  [BlockType.WOOD]: [0.45, 0.3, 0.15],
  [BlockType.LEAVES]: [0.2, 0.55, 0.15],
  [BlockType.LAVA]: [0.9, 0.3, 0.05],
  [BlockType.FIRE]: [1.0, 0.55, 0.0],
};

export const BLOCK_NAMES: Record<number, string> = {
  [BlockType.GRASS]: 'Grass',
  [BlockType.DIRT]: 'Dirt',
  [BlockType.STONE]: 'Stone',
  [BlockType.WATER]: 'Water',
  [BlockType.SAND]: 'Sand',
  [BlockType.SNOW]: 'Snow',
  [BlockType.WOOD]: 'Wood',
  [BlockType.LEAVES]: 'Leaves',
  [BlockType.LAVA]: 'Lava',
  [BlockType.FIRE]: 'Fire',
};

export const PAINTABLE_BLOCKS = [
  BlockType.GRASS,
  BlockType.DIRT,
  BlockType.STONE,
  BlockType.WATER,
  BlockType.SAND,
  BlockType.SNOW,
  BlockType.WOOD,
  BlockType.LEAVES,
  BlockType.LAVA,
  BlockType.FIRE,
];

export function isTransparent(type: BlockType): boolean {
  return type === BlockType.AIR || type === BlockType.WATER || type === BlockType.LAVA || type === BlockType.FIRE;
}

export function isFluid(type: BlockType): boolean {
  return type === BlockType.WATER || type === BlockType.LAVA;
}

export function isSolid(type: BlockType): boolean {
  return type !== BlockType.AIR && type !== BlockType.WATER && type !== BlockType.LAVA && type !== BlockType.FIRE;
}

export function isFlammable(type: BlockType): boolean {
  return type === BlockType.WOOD || type === BlockType.LEAVES || type === BlockType.GRASS;
}
