import { World } from './World';
import { BlockType } from './BlockTypes';
import { fbm, noise2D, seedNoise } from '../utils/noise';

export type Biome =
  | 'default'
  | 'flat'
  | 'forest'
  | 'beach'
  | 'desert'
  | 'mountains'
  | 'islands'
  | 'snow';

export const BIOME_INFO: Record<Biome, { name: string; description: string }> = {
  default:   { name: 'Classic',      description: 'Rolling hills, rivers, and forests' },
  flat:      { name: 'Flat World',   description: 'Blank canvas — flat grass plain' },
  forest:    { name: 'Dense Forest', description: 'Thick woodland with clearings' },
  beach:     { name: 'Beach',        description: 'Sandy shores and shallow seas' },
  desert:    { name: 'Desert Oasis', description: 'Dunes with a central oasis' },
  mountains: { name: 'Mountains',    description: 'Towering peaks and deep valleys' },
  islands:   { name: 'Archipelago',  description: 'Scattered islands in open water' },
  snow:      { name: 'Tundra',       description: 'Frozen snowfields with ice lakes' },
};

export function generateTerrain(world: World, seed = 42, biome: Biome = 'default'): void {
  seedNoise(seed);

  switch (biome) {
    case 'flat':      generateFlat(world); break;
    case 'forest':    generateForest(world, seed); break;
    case 'beach':     generateBeach(world, seed); break;
    case 'desert':    generateDesert(world, seed); break;
    case 'mountains': generateMountains(world, seed); break;
    case 'islands':   generateIslands(world, seed); break;
    case 'snow':      generateSnow(world, seed); break;
    default:          generateDefault(world, seed); break;
  }
}

// ─── Classic ───
function generateDefault(world: World, seed: number): void {
  const waterLevel = 8;

  for (let x = 0; x < world.width; x++) {
    for (let z = 0; z < world.depth; z++) {
      const raw = fbm(x * 0.015, z * 0.015, 5) * 14 + 13;
      const h = Math.max(1, Math.min(world.height - 2, Math.floor(raw)));
      fillColumn(world, x, z, h, waterLevel);
    }
  }
  scatterTrees(world, seed, waterLevel, 0.04);
}

// ─── Flat ───
function generateFlat(world: World): void {
  const h = 8;
  for (let x = 0; x < world.width; x++) {
    for (let z = 0; z < world.depth; z++) {
      for (let y = 0; y < h; y++) {
        world.setBlock(x, y, z, y < h - 3 ? BlockType.STONE : y < h - 1 ? BlockType.DIRT : BlockType.GRASS);
      }
    }
  }
}

// ─── Dense Forest ───
function generateForest(world: World, seed: number): void {
  const waterLevel = 6;
  for (let x = 0; x < world.width; x++) {
    for (let z = 0; z < world.depth; z++) {
      const raw = fbm(x * 0.02, z * 0.02, 4) * 6 + 10;
      const h = Math.max(1, Math.min(world.height - 8, Math.floor(raw)));
      fillColumn(world, x, z, h, waterLevel);
    }
  }
  scatterTrees(world, seed, waterLevel, 0.15); // very dense
}

// ─── Beach ───
function generateBeach(world: World, seed: number): void {
  const waterLevel = 10;
  for (let x = 0; x < world.width; x++) {
    for (let z = 0; z < world.depth; z++) {
      // Gentle slope from one side to the other
      const slope = (z / world.depth) * 12 + 4;
      const noise = fbm(x * 0.03, z * 0.03, 3) * 3;
      const h = Math.max(1, Math.min(world.height - 2, Math.floor(slope + noise)));

      for (let y = 0; y <= h; y++) {
        if (y < h - 2) {
          world.setBlock(x, y, z, BlockType.STONE);
        } else {
          world.setBlock(x, y, z, BlockType.SAND);
        }
      }
      for (let y = h + 1; y <= waterLevel; y++) {
        world.setBlock(x, y, z, BlockType.WATER);
      }
    }
  }
  // Palm-like trees on the beach
  for (let x = 3; x < world.width - 3; x++) {
    for (let z = 3; z < world.depth - 3; z++) {
      const h = world.getSolidHeight(x, z);
      if (world.getBlock(x, h, z) === BlockType.SAND && h > waterLevel && h < waterLevel + 4) {
        if (pseudoRandom(x, z, seed) < 0.03) {
          placeTreeInternal(world, x, h + 1, z, seed);
        }
      }
    }
  }
}

// ─── Desert Oasis ───
function generateDesert(world: World, seed: number): void {
  const cx = world.width / 2;
  const cz = world.depth / 2;

  for (let x = 0; x < world.width; x++) {
    for (let z = 0; z < world.depth; z++) {
      // Dune noise
      const dune = fbm(x * 0.04, z * 0.04, 4) * 8 + 8;
      // Depression in the center for the oasis
      const dx = (x - cx) / cx;
      const dz2 = (z - cz) / cz;
      const distSq = dx * dx + dz2 * dz2;
      const oasisDip = Math.max(0, (1 - distSq * 4)) * 6;
      const h = Math.max(1, Math.min(world.height - 2, Math.floor(dune - oasisDip)));

      for (let y = 0; y <= h; y++) {
        if (y < h - 1) {
          world.setBlock(x, y, z, BlockType.STONE);
        } else {
          world.setBlock(x, y, z, BlockType.SAND);
        }
      }

      // Oasis water
      const waterLevel = 5;
      if (distSq < 0.08) {
        for (let y = h + 1; y <= waterLevel; y++) {
          world.setBlock(x, y, z, BlockType.WATER);
        }
        // Grass around water
        if (distSq > 0.03 && distSq < 0.1 && h >= waterLevel) {
          world.setBlock(x, h, z, BlockType.GRASS);
        }
      }
    }
  }
  // Trees around oasis
  for (let x = 3; x < world.width - 3; x++) {
    for (let z = 3; z < world.depth - 3; z++) {
      const h = world.getSolidHeight(x, z);
      if (world.getBlock(x, h, z) === BlockType.GRASS) {
        if (pseudoRandom(x, z, seed) < 0.08) {
          placeTreeInternal(world, x, h + 1, z, seed);
        }
      }
    }
  }
}

// ─── Mountains ───
function generateMountains(world: World, seed: number): void {
  const waterLevel = 6;
  for (let x = 0; x < world.width; x++) {
    for (let z = 0; z < world.depth; z++) {
      const raw = fbm(x * 0.012, z * 0.012, 6) * 24 + 10;
      const h = Math.max(1, Math.min(world.height - 2, Math.floor(raw)));
      fillColumn(world, x, z, h, waterLevel);
    }
  }
  scatterTrees(world, seed, waterLevel, 0.03);
}

// ─── Archipelago ───
function generateIslands(world: World, seed: number): void {
  const waterLevel = 12;
  for (let x = 0; x < world.width; x++) {
    for (let z = 0; z < world.depth; z++) {
      // Islands via thresholded noise
      const n = fbm(x * 0.025, z * 0.025, 4);
      const islandMask = n > 0.05 ? (n - 0.05) * 20 : 0;
      const detail = fbm(x * 0.06, z * 0.06, 3) * 3;
      const h = Math.max(1, Math.min(world.height - 2, Math.floor(islandMask * 8 + detail + 5)));

      for (let y = 0; y <= h; y++) {
        if (y < h - 3) {
          world.setBlock(x, y, z, BlockType.STONE);
        } else if (y < h) {
          world.setBlock(x, y, z, BlockType.DIRT);
        } else if (h <= waterLevel + 1) {
          world.setBlock(x, y, z, BlockType.SAND);
        } else {
          world.setBlock(x, y, z, BlockType.GRASS);
        }
      }
      for (let y = h + 1; y <= waterLevel; y++) {
        world.setBlock(x, y, z, BlockType.WATER);
      }
    }
  }
  scatterTrees(world, seed, waterLevel, 0.05);
}

// ─── Tundra ───
function generateSnow(world: World, seed: number): void {
  const waterLevel = 7;
  for (let x = 0; x < world.width; x++) {
    for (let z = 0; z < world.depth; z++) {
      const raw = fbm(x * 0.018, z * 0.018, 4) * 10 + 10;
      const h = Math.max(1, Math.min(world.height - 2, Math.floor(raw)));

      for (let y = 0; y <= h; y++) {
        if (y < h - 3) {
          world.setBlock(x, y, z, BlockType.STONE);
        } else if (y < h) {
          world.setBlock(x, y, z, BlockType.DIRT);
        } else {
          world.setBlock(x, y, z, BlockType.SNOW);
        }
      }
      for (let y = h + 1; y <= waterLevel; y++) {
        world.setBlock(x, y, z, BlockType.WATER);
      }
    }
  }
  // Sparse trees
  for (let x = 3; x < world.width - 3; x++) {
    for (let z = 3; z < world.depth - 3; z++) {
      const h = world.getSolidHeight(x, z);
      if (world.getBlock(x, h, z) === BlockType.SNOW && h > waterLevel + 1) {
        if (pseudoRandom(x, z, seed) < 0.015) {
          placeTreeInternal(world, x, h + 1, z, seed);
        }
      }
    }
  }
}

// ─── Helpers ───

function fillColumn(world: World, x: number, z: number, h: number, waterLevel: number): void {
  for (let y = 0; y <= h; y++) {
    if (y < h - 3) {
      world.setBlock(x, y, z, BlockType.STONE);
    } else if (y < h) {
      world.setBlock(x, y, z, BlockType.DIRT);
    } else if (h <= waterLevel + 1) {
      world.setBlock(x, y, z, BlockType.SAND);
    } else if (h > 22) {
      world.setBlock(x, y, z, BlockType.SNOW);
    } else {
      world.setBlock(x, y, z, BlockType.GRASS);
    }
  }
  for (let y = h + 1; y <= waterLevel; y++) {
    world.setBlock(x, y, z, BlockType.WATER);
  }
}

function scatterTrees(world: World, seed: number, waterLevel: number, density: number): void {
  for (let x = 3; x < world.width - 3; x++) {
    for (let z = 3; z < world.depth - 3; z++) {
      const h = world.getSolidHeight(x, z);
      if (world.getBlock(x, h, z) === BlockType.GRASS && h > waterLevel + 2) {
        const local = (noise2D(x * 0.15 + 500, z * 0.15 + 500) + 1) * 0.5;
        if (pseudoRandom(x, z, seed) < local * density) {
          placeTreeInternal(world, x, h + 1, z, seed);
        }
      }
    }
  }
}

function pseudoRandom(x: number, z: number, seed: number): number {
  let h = (seed * 374761393 + x * 668265263 + z * 2147483647) | 0;
  h = ((h ^ (h >> 13)) * 1274126177) | 0;
  return (h & 0x7fffffff) / 0x7fffffff;
}

function placeTreeInternal(world: World, x: number, y: number, z: number, seed: number): void {
  const trunkH = 3 + ((pseudoRandom(x + 1, z + 1, seed) * 3) | 0);
  for (let i = 0; i < trunkH; i++) {
    world.setBlock(x, y + i, z, BlockType.WOOD);
  }
  const leafBase = y + trunkH - 1;
  for (let dx = -2; dx <= 2; dx++) {
    for (let dy = 0; dy <= 3; dy++) {
      for (let dz = -2; dz <= 2; dz++) {
        if (dx * dx + dy * dy + dz * dz <= 6) {
          if (world.getBlock(x + dx, leafBase + dy, z + dz) === BlockType.AIR) {
            world.setBlock(x + dx, leafBase + dy, z + dz, BlockType.LEAVES);
          }
        }
      }
    }
  }
}

/**
 * Place a tree at (x, y, z) and return all block positions that were modified.
 */
export function placeTree(world: World, x: number, y: number, z: number): [number, number, number][] {
  const trunkH = 3 + Math.floor(Math.random() * 3);
  const changed: [number, number, number][] = [];

  for (let i = 0; i < trunkH; i++) {
    if (world.getBlock(x, y + i, z) === BlockType.AIR || i === 0) {
      world.setBlock(x, y + i, z, BlockType.WOOD);
      changed.push([x, y + i, z]);
    }
  }

  const leafBase = y + trunkH - 1;
  for (let dx = -2; dx <= 2; dx++) {
    for (let dy = 0; dy <= 3; dy++) {
      for (let dz = -2; dz <= 2; dz++) {
        if (dx * dx + dy * dy + dz * dz <= 6) {
          const lx = x + dx, ly = leafBase + dy, lz = z + dz;
          if (world.getBlock(lx, ly, lz) === BlockType.AIR) {
            world.setBlock(lx, ly, lz, BlockType.LEAVES);
            changed.push([lx, ly, lz]);
          }
        }
      }
    }
  }

  return changed;
}
