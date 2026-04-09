import { World, MAX_WATER_LEVEL } from '../world/World';
import { BlockType, isSolid, isFlammable } from '../world/BlockTypes';
import { Creature, CreatureTemplate } from '../creatures/Creature';
import { placeTree } from '../world/TerrainGenerator';

export interface VegetationStats {
  grass: number;
  trees: number;   // wood block count (proxy for tree trunks)
  leaves: number;
}

export class SimEngine {
  world: World;
  creatures: Creature[] = [];
  species: CreatureTemplate[] = [];
  playing = true;
  speed = 1;
  vegStats: VegetationStats = { grass: 0, trees: 0, leaves: 0 };

  private grassTimer = 0;
  private treeSpreadTimer = 0;
  private vegScanTimer = 0;
  private waterTimer = 0;
  private fireTimer = 0;
  onWorldEdit?: (x: number, y: number, z: number) => void;

  constructor(world: World) {
    this.world = world;
  }

  addSpecies(template: CreatureTemplate): void {
    this.species.push(template);
  }

  spawnCreature(template: CreatureTemplate, x: number, z: number): Creature {
    const bx = Math.floor(x);
    const bz = Math.floor(z);
    const y = this.world.getSolidHeight(bx, bz) + 1;
    const c = new Creature(template, x, y, z);
    this.creatures.push(c);
    return c;
  }

  update(dt: number): void {
    const sdt = dt * this.speed;

    for (const c of this.creatures) {
      if (!c.alive) continue;
      this.updateCreature(c, sdt);
    }

    this.creatures = this.creatures.filter((c) => c.alive);

    // Grass regrowth
    this.grassTimer += sdt;
    if (this.grassTimer >= 2) {
      this.grassTimer = 0;
      this.regrowGrass();
    }

    // Tree spreading
    this.treeSpreadTimer += sdt;
    if (this.treeSpreadTimer >= 5) {
      this.treeSpreadTimer = 0;
      this.spreadTrees();
    }

    // Water flow (faster tick for smooth volumetric flow)
    this.waterTimer += sdt;
    if (this.waterTimer >= 0.15) {
      this.waterTimer = 0;
      this.simulateWater();
    }

    // Fire spread
    this.fireTimer += sdt;
    if (this.fireTimer >= 0.5) {
      this.fireTimer = 0;
      this.simulateFire();
    }

    // Vegetation scan
    this.vegScanTimer += sdt;
    if (this.vegScanTimer >= 3) {
      this.vegScanTimer = 0;
      this.scanVegetation();
    }
  }

  private updateCreature(c: Creature, dt: number): void {
    c.age += dt;
    c.hunger += c.template.hungerRate * dt;

    if (c.hunger > 80) {
      c.health -= dt * 5;
    }
    if (c.health <= 0) {
      c.alive = false;
      return;
    }

    switch (c.state) {
      case 'idle':
        c.idleTimer -= dt;
        if (c.idleTimer <= 0) {
          if (c.hunger > 40) {
            c.state = 'seeking_food';
          } else {
            c.state = 'wandering';
            this.pickWanderTarget(c);
          }
        }
        break;

      case 'wandering':
        this.moveToward(c, c.targetX, c.targetZ, dt);
        if (this.atTarget(c)) {
          c.state = 'idle';
          c.idleTimer = 1 + Math.random() * 2;
          this.tryReproduce(c);
        }
        break;

      case 'seeking_food':
        this.seekFood(c, dt);
        break;

      case 'fleeing': {
        this.moveToward(c, c.targetX, c.targetZ, dt);
        if (this.atTarget(c)) {
          c.state = 'idle';
          c.idleTimer = 0.5;
        }
        break;
      }
    }

    // Check for threats (passive creatures flee aggressive ones)
    if (c.template.behavior === 'passive' && c.state !== 'fleeing') {
      const threat = this.nearestThreat(c);
      if (threat) {
        const dx = c.x - threat.x;
        const dz = c.z - threat.z;
        const len = Math.sqrt(dx * dx + dz * dz) || 1;
        c.targetX = c.x + (dx / len) * 8;
        c.targetZ = c.z + (dz / len) * 8;
        c.targetX = Math.max(1, Math.min(this.world.width - 2, c.targetX));
        c.targetZ = Math.max(1, Math.min(this.world.depth - 2, c.targetZ));
        c.state = 'fleeing';
      }
    }

    // Snap Y to terrain
    const gy = this.world.getSolidHeight(Math.floor(c.x), Math.floor(c.z));
    c.y = gy + 1;
  }

  private pickWanderTarget(c: Creature): void {
    const range = 6 + Math.random() * 8;
    const angle = Math.random() * Math.PI * 2;
    c.targetX = Math.max(1, Math.min(this.world.width - 2, c.x + Math.cos(angle) * range));
    c.targetZ = Math.max(1, Math.min(this.world.depth - 2, c.z + Math.sin(angle) * range));
  }

  private moveToward(c: Creature, tx: number, tz: number, dt: number): void {
    const dx = tx - c.x;
    const dz = tz - c.z;
    const dist = Math.sqrt(dx * dx + dz * dz);
    if (dist < 0.2) return;

    // Update facing direction
    c.facing = Math.atan2(dx, dz);

    const step = Math.min(c.template.speed * dt, dist);
    c.x += (dx / dist) * step;
    c.z += (dz / dist) * step;
  }

  private atTarget(c: Creature): boolean {
    const dx = c.targetX - c.x;
    const dz = c.targetZ - c.z;
    return dx * dx + dz * dz < 0.5;
  }

  private seekFood(c: Creature, dt: number): void {
    const diet = c.template.diet;

    if (diet === 'herbivore' || diet === 'omnivore') {
      // Try to eat grass under feet
      const bx = Math.floor(c.x);
      const bz = Math.floor(c.z);
      const gy = this.world.getSolidHeight(bx, bz);
      if (this.world.getBlock(bx, gy, bz) === BlockType.GRASS) {
        this.world.setBlock(bx, gy, bz, BlockType.DIRT);
        this.onWorldEdit?.(bx, gy, bz);
        c.hunger = Math.max(0, c.hunger - 40);
        c.health = Math.min(c.template.maxHealth, c.health + 5);
        c.state = 'idle';
        c.idleTimer = 1;
        return;
      }
    }

    if (diet === 'carnivore' || diet === 'omnivore') {
      // Hunt nearest prey
      const prey = this.nearestPrey(c);
      if (prey) {
        this.moveToward(c, prey.x, prey.z, dt);
        const dx = c.x - prey.x;
        const dz = c.z - prey.z;
        if (dx * dx + dz * dz < 1) {
          prey.health -= 30;
          c.hunger = Math.max(0, c.hunger - 50);
          c.health = Math.min(c.template.maxHealth, c.health + 10);
          c.state = 'idle';
          c.idleTimer = 1.5;
        }
        return;
      }
    }

    // Wander while searching
    if (this.atTarget(c)) {
      this.pickWanderTarget(c);
    }
    this.moveToward(c, c.targetX, c.targetZ, dt);
  }

  private nearestPrey(c: Creature): Creature | null {
    let best: Creature | null = null;
    let bestDist = 12 * 12;
    for (const other of this.creatures) {
      if (other === c || !other.alive) continue;
      if (other.template.id === c.template.id) continue;
      if (other.template.behavior === 'aggressive') continue; // don't hunt predators
      const dx = c.x - other.x;
      const dz = c.z - other.z;
      const d = dx * dx + dz * dz;
      if (d < bestDist) {
        bestDist = d;
        best = other;
      }
    }
    return best;
  }

  private nearestThreat(c: Creature): Creature | null {
    let best: Creature | null = null;
    let bestDist = 8 * 8;
    for (const other of this.creatures) {
      if (other === c || !other.alive) continue;
      if (other.template.behavior !== 'aggressive') continue;
      if (other.template.diet === 'herbivore') continue;
      const dx = c.x - other.x;
      const dz = c.z - other.z;
      const d = dx * dx + dz * dz;
      if (d < bestDist) {
        bestDist = d;
        best = other;
      }
    }
    return best;
  }

  private tryReproduce(c: Creature): void {
    if (c.hunger > 30 || c.health < c.template.maxHealth * 0.7) return;
    if (Math.random() > c.template.reproductionRate * 0.1) return;

    // Need a nearby mate of same species
    for (const other of this.creatures) {
      if (other === c || !other.alive) continue;
      if (other.template.id !== c.template.id) continue;
      const dx = c.x - other.x;
      const dz = c.z - other.z;
      if (dx * dx + dz * dz < 4) {
        const nx = c.x + (Math.random() - 0.5) * 3;
        const nz = c.z + (Math.random() - 0.5) * 3;
        this.spawnCreature(c.template, nx, nz);
        c.hunger += 20;
        return;
      }
    }
  }

  private simulateWater(): void {
    // Process top-to-bottom so gravity resolves in one pass
    for (let y = this.world.height - 1; y >= 0; y--) {
      for (let x = 0; x < this.world.width; x++) {
        for (let z = 0; z < this.world.depth; z++) {
          if (this.world.getBlock(x, y, z) !== BlockType.WATER) continue;
          this.flowWaterBlock(x, y, z);
        }
      }
    }
  }

  private flowWaterBlock(x: number, y: number, z: number): void {
    let level = this.world.getWaterLevel(x, y, z);
    if (level <= 0) return;

    // ── Gravity: flow down ──
    if (y > 0) {
      const below = this.world.getBlock(x, y - 1, z);

      // Water extinguishes fire
      if (below === BlockType.FIRE) {
        this.world.setBlock(x, y - 1, z, BlockType.AIR);
        this.onWorldEdit?.(x, y - 1, z);
      }

      // Water + lava = stone (consumes water)
      if (below === BlockType.LAVA) {
        this.world.setBlock(x, y - 1, z, BlockType.STONE);
        this.world.setWaterLevel(x, y, z, level - 1);
        this.onWorldEdit?.(x, y - 1, z);
        this.onWorldEdit?.(x, y, z);
        return;
      }

      const belowNow = this.world.getBlock(x, y - 1, z);
      if (belowNow === BlockType.AIR) {
        // Pour everything down
        this.world.setWaterLevel(x, y - 1, z, Math.min(MAX_WATER_LEVEL, level));
        this.world.setWaterLevel(x, y, z, 0);
        this.onWorldEdit?.(x, y, z);
        this.onWorldEdit?.(x, y - 1, z);
        return;
      }

      if (belowNow === BlockType.WATER) {
        const belowLevel = this.world.getWaterLevel(x, y - 1, z);
        if (belowLevel < MAX_WATER_LEVEL) {
          const transfer = Math.min(level, MAX_WATER_LEVEL - belowLevel);
          this.world.setWaterLevel(x, y - 1, z, belowLevel + transfer);
          this.world.setWaterLevel(x, y, z, level - transfer);
          this.onWorldEdit?.(x, y, z);
          this.onWorldEdit?.(x, y - 1, z);
          level -= transfer;
          if (level <= 0) return;
        }
      }
    }

    // ── Lateral flow: equalize with neighbors ──
    if (level <= 1) return; // need at least 2 to share

    const dirs: [number, number][] = [[-1, 0], [1, 0], [0, -1], [0, 1]];
    // Shuffle to avoid directional bias
    for (let i = dirs.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [dirs[i], dirs[j]] = [dirs[j], dirs[i]];
    }

    for (const [dx, dz] of dirs) {
      if (level <= 1) break;
      const nx = x + dx;
      const nz = z + dz;
      const nb = this.world.getBlock(nx, y, nz);

      // Extinguish adjacent fire
      if (nb === BlockType.FIRE) {
        this.world.setBlock(nx, y, nz, BlockType.AIR);
        this.world.setWaterLevel(x, y, z, level - 1);
        level--;
        this.onWorldEdit?.(nx, y, nz);
        this.onWorldEdit?.(x, y, z);
        continue;
      }

      // Lava interaction
      if (nb === BlockType.LAVA) {
        this.world.setBlock(nx, y, nz, BlockType.STONE);
        this.world.setWaterLevel(x, y, z, level - 1);
        level--;
        this.onWorldEdit?.(nx, y, nz);
        this.onWorldEdit?.(x, y, z);
        continue;
      }

      if (nb !== BlockType.AIR && nb !== BlockType.WATER) continue;

      const nLevel = nb === BlockType.WATER ? this.world.getWaterLevel(nx, y, nz) : 0;
      if (nLevel < level - 1) {
        // Transfer 1 unit toward equilibrium
        this.world.setWaterLevel(nx, y, nz, nLevel + 1);
        this.world.setWaterLevel(x, y, z, level - 1);
        level--;
        this.onWorldEdit?.(nx, y, nz);
        this.onWorldEdit?.(x, y, z);
      }
    }
  }

  private simulateFire(): void {
    // Find fire blocks and spread/burn
    const fires: [number, number, number][] = [];
    // Sample random columns for fire
    const checks = 150;
    for (let i = 0; i < checks; i++) {
      const x = Math.floor(Math.random() * this.world.width);
      const z = Math.floor(Math.random() * this.world.depth);
      for (let y = 0; y < this.world.height; y++) {
        if (this.world.getBlock(x, y, z) === BlockType.FIRE) {
          fires.push([x, y, z]);
        }
      }
    }

    for (const [fx, fy, fz] of fires) {
      // Spread to adjacent flammable blocks
      for (const [dx, dy, dz] of [[-1,0,0],[1,0,0],[0,-1,0],[0,1,0],[0,0,-1],[0,0,1]]) {
        const nx = fx + dx, ny = fy + dy, nz = fz + dz;
        const neighbor = this.world.getBlock(nx, ny, nz);
        if (isFlammable(neighbor) && Math.random() < 0.25) {
          this.world.setBlock(nx, ny, nz, BlockType.FIRE);
          this.onWorldEdit?.(nx, ny, nz);
        }
      }

      // Fire burns out
      if (Math.random() < 0.15) {
        // Check if there's a solid block below — leave dirt. Otherwise air.
        const below = this.world.getBlock(fx, fy - 1, fz);
        if (isSolid(below)) {
          this.world.setBlock(fx, fy, fz, BlockType.AIR);
        } else {
          this.world.setBlock(fx, fy, fz, BlockType.AIR);
        }
        this.onWorldEdit?.(fx, fy, fz);
      }

      // Fire damages nearby creatures
      for (const c of this.creatures) {
        if (!c.alive) continue;
        const dx = c.x - fx;
        const dy = c.y - fy;
        const dz = c.z - fz;
        if (dx * dx + dy * dy + dz * dz < 4) {
          c.health -= 3;
          // Make creature flee
          if (c.state !== 'fleeing') {
            const angle = Math.atan2(dz, dx);
            c.targetX = Math.max(1, Math.min(this.world.width - 2, c.x + Math.cos(angle) * 10));
            c.targetZ = Math.max(1, Math.min(this.world.depth - 2, c.z + Math.sin(angle) * 10));
            c.state = 'fleeing';
          }
        }
      }
    }
  }

  private regrowGrass(): void {
    const checks = 50;
    for (let i = 0; i < checks; i++) {
      const x = Math.floor(Math.random() * this.world.width);
      const z = Math.floor(Math.random() * this.world.depth);
      const y = this.world.getSolidHeight(x, z);
      if (this.world.getBlock(x, y, z) !== BlockType.DIRT) continue;

      // Check if any neighbor is grass
      for (const [dx, dz] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
        const nx = x + dx;
        const nz = z + dz;
        const ny = this.world.getSolidHeight(nx, nz);
        if (this.world.getBlock(nx, ny, nz) === BlockType.GRASS) {
          this.world.setBlock(x, y, z, BlockType.GRASS);
          this.onWorldEdit?.(x, y, z);
          break;
        }
      }
    }
  }

  private spreadTrees(): void {
    const attempts = 10;
    for (let i = 0; i < attempts; i++) {
      const x = Math.floor(Math.random() * this.world.width);
      const z = Math.floor(Math.random() * this.world.depth);
      const y = this.world.getSolidHeight(x, z);
      const surface = this.world.getBlock(x, y, z);
      if (surface !== BlockType.GRASS) continue;

      // Check if there's a tree nearby (leaves within 5 blocks)
      let nearTree = false;
      for (let dx = -5; dx <= 5 && !nearTree; dx++) {
        for (let dz = -5; dz <= 5 && !nearTree; dz++) {
          if (dx * dx + dz * dz > 25) continue;
          for (let dy = 1; dy <= 8; dy++) {
            if (this.world.getBlock(x + dx, y + dy, z + dz) === BlockType.LEAVES) {
              nearTree = true;
              break;
            }
          }
        }
      }
      if (!nearTree) continue;

      // Small chance to grow
      if (Math.random() > 0.3) continue;

      // Make sure there's space (no wood/leaves at trunk position)
      if (this.world.getBlock(x, y + 1, z) !== BlockType.AIR) continue;

      const changed = placeTree(this.world, x, y + 1, z);
      for (const [bx, by, bz] of changed) {
        this.onWorldEdit?.(bx, by, bz);
      }
    }
  }

  private scanVegetation(): void {
    let grass = 0, trees = 0, leaves = 0;
    for (let x = 0; x < this.world.width; x++) {
      for (let z = 0; z < this.world.depth; z++) {
        for (let y = 0; y < this.world.height; y++) {
          const b = this.world.getBlock(x, y, z);
          if (b === BlockType.GRASS) grass++;
          else if (b === BlockType.WOOD) trees++;
          else if (b === BlockType.LEAVES) leaves++;
        }
      }
    }
    this.vegStats = { grass, trees, leaves };
  }
}
