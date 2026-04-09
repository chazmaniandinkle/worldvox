import { World, MAX_WATER_LEVEL } from '../world/World';
import { BlockType, isSolid, isFlammable } from '../world/BlockTypes';
import { Creature } from '../creatures/Creature';
import { placeTree } from '../world/TerrainGenerator';
import {
  CreatureConfig,
  EnvironmentParams,
  DEFAULT_ENVIRONMENT,
} from './SimConfig';
import { EventLog } from './EventLog';
import { DataRecorder, DataPoint } from './DataRecorder';

export interface VegetationStats {
  grass: number;
  trees: number;
  leaves: number;
}

export class SimEngine {
  world: World;
  creatures: Creature[] = [];
  species: CreatureConfig[] = [];
  playing = true;
  speed = 1;
  vegStats: VegetationStats = { grass: 0, trees: 0, leaves: 0 };
  env: EnvironmentParams;
  eventLog: EventLog;
  dataRecorder: DataRecorder;

  private grassTimer = 0;
  private treeSpreadTimer = 0;
  private vegScanTimer = 0;
  private waterTimer = 0;
  private fireTimer = 0;
  private recordTimer = 0;
  private recordInterval = 2; // seconds between data samples
  private birthsSinceLastRecord = 0;
  private deathsSinceLastRecord = 0;
  onWorldEdit?: (x: number, y: number, z: number) => void;

  constructor(world: World, env?: EnvironmentParams) {
    this.world = world;
    this.env = env ?? { ...DEFAULT_ENVIRONMENT };
    this.eventLog = new EventLog();
    this.dataRecorder = new DataRecorder();
  }

  addSpecies(config: CreatureConfig): void {
    this.species.push(config);
  }

  spawnCreature(config: CreatureConfig, x: number, z: number): Creature {
    const bx = Math.floor(x);
    const bz = Math.floor(z);
    const y = this.world.getSolidHeight(bx, bz) + 1;
    const c = new Creature(config, x, y, z);
    this.creatures.push(c);
    this.eventLog.emit('birth', `${config.name} born`, config.id, { x: bx, z: bz });
    this.birthsSinceLastRecord++;
    return c;
  }

  update(dt: number): void {
    const sdt = dt * this.speed;
    this.eventLog.advanceTick(sdt);

    // Track previous alive counts per species for extinction detection
    const prevCounts = new Map<string, number>();
    for (const sp of this.species) {
      prevCounts.set(sp.id, this.creatures.filter((c) => c.alive && c.config.id === sp.id).length);
    }

    for (const c of this.creatures) {
      if (!c.alive) continue;
      this.updateCreature(c, sdt);
    }

    // Remove dead, emit death events
    const newCreatures: Creature[] = [];
    for (const c of this.creatures) {
      if (c.alive) {
        newCreatures.push(c);
      } else {
        this.eventLog.emit('death', `${c.config.name} died (age ${c.age.toFixed(1)}s)`, c.config.id, {
          x: Math.floor(c.x),
          z: Math.floor(c.z),
        });
        this.deathsSinceLastRecord++;
      }
    }
    this.creatures = newCreatures;

    // Check for extinctions
    for (const sp of this.species) {
      const prev = prevCounts.get(sp.id) ?? 0;
      const now = this.creatures.filter((c) => c.alive && c.config.id === sp.id).length;
      if (prev > 0 && now === 0) {
        this.eventLog.emit('extinction', `${sp.name} went extinct!`, sp.id);
      }
    }

    // Environment ticks
    const e = this.env;

    this.grassTimer += sdt;
    if (this.grassTimer >= e.grassRegrowth.tickInterval) {
      this.grassTimer = 0;
      this.regrowGrass();
    }

    this.treeSpreadTimer += sdt;
    if (this.treeSpreadTimer >= e.treeSpread.tickInterval) {
      this.treeSpreadTimer = 0;
      this.spreadTrees();
    }

    this.waterTimer += sdt;
    if (this.waterTimer >= e.water.tickInterval) {
      this.waterTimer = 0;
      this.simulateWater();
    }

    this.fireTimer += sdt;
    if (this.fireTimer >= e.fire.tickInterval) {
      this.fireTimer = 0;
      this.simulateFire();
    }

    this.vegScanTimer += sdt;
    if (this.vegScanTimer >= 3) {
      this.vegScanTimer = 0;
      this.scanVegetation();
    }

    // Data recording
    this.recordTimer += sdt;
    if (this.recordTimer >= this.recordInterval) {
      this.recordTimer = 0;
      this.recordDataPoint();
    }
  }

  // ─── Creature Update (config-driven) ───

  private updateCreature(c: Creature, dt: number): void {
    const bp = c.config.behaviorParams;

    c.age += dt;
    c.hunger += c.config.hungerRate * dt;

    if (c.hunger > bp.starvationThreshold) {
      c.health -= dt * bp.starvationDamagePerSec;
      if (c.health <= 0) {
        c.alive = false;
        this.eventLog.emit('starvation', `${c.config.name} starved`, c.config.id, {
          x: Math.floor(c.x), z: Math.floor(c.z),
        });
        return;
      }
    }
    if (c.health <= 0) {
      c.alive = false;
      return;
    }

    switch (c.state) {
      case 'idle':
        c.idleTimer -= dt;
        if (c.idleTimer <= 0) {
          if (c.hunger > bp.hungerSeekThreshold) {
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
          c.idleTimer = bp.idleDurationMin + Math.random() * (bp.idleDurationMax - bp.idleDurationMin);
          this.tryReproduce(c);
        }
        break;

      case 'seeking_food':
        this.seekFood(c, dt);
        break;

      case 'fleeing':
        this.moveToward(c, c.targetX, c.targetZ, dt);
        if (this.atTarget(c)) {
          c.state = 'idle';
          c.idleTimer = 0.5;
        }
        break;
    }

    // Threat detection (tag-based)
    if (bp.fleeFromTags.length > 0 && c.state !== 'fleeing') {
      const threat = this.nearestWithTags(c, bp.fleeFromTags, bp.fleeDetectionRange);
      if (threat) {
        const dx = c.x - threat.x;
        const dz = c.z - threat.z;
        const len = Math.sqrt(dx * dx + dz * dz) || 1;
        c.targetX = Math.max(1, Math.min(this.world.width - 2, c.x + (dx / len) * bp.fleeDistance));
        c.targetZ = Math.max(1, Math.min(this.world.depth - 2, c.z + (dz / len) * bp.fleeDistance));
        c.state = 'fleeing';
        this.eventLog.emit('flee', `${c.config.name} flees from ${threat.config.name}`, c.config.id, {
          x: Math.floor(c.x), z: Math.floor(c.z),
        });
      }
    }

    // Snap Y to terrain
    const gy = this.world.getSolidHeight(Math.floor(c.x), Math.floor(c.z));
    c.y = gy + 1;
  }

  private pickWanderTarget(c: Creature): void {
    const bp = c.config.behaviorParams;
    const range = bp.wanderRangeMin + Math.random() * (bp.wanderRangeMax - bp.wanderRangeMin);
    const angle = Math.random() * Math.PI * 2;
    c.targetX = Math.max(1, Math.min(this.world.width - 2, c.x + Math.cos(angle) * range));
    c.targetZ = Math.max(1, Math.min(this.world.depth - 2, c.z + Math.sin(angle) * range));
  }

  private moveToward(c: Creature, tx: number, tz: number, dt: number): void {
    const dx = tx - c.x;
    const dz = tz - c.z;
    const dist = Math.sqrt(dx * dx + dz * dz);
    if (dist < 0.2) return;
    c.facing = Math.atan2(dx, dz);
    const step = Math.min(c.config.speed * dt, dist);
    c.x += (dx / dist) * step;
    c.z += (dz / dist) * step;
  }

  private atTarget(c: Creature): boolean {
    const dx = c.targetX - c.x;
    const dz = c.targetZ - c.z;
    return dx * dx + dz * dz < 0.5;
  }

  private seekFood(c: Creature, dt: number): void {
    const dp = c.config.dietParams;

    // Try edible blocks underfoot
    if (dp.edibleBlocks.length > 0) {
      const bx = Math.floor(c.x);
      const bz = Math.floor(c.z);
      const gy = this.world.getSolidHeight(bx, bz);
      const block = this.world.getBlock(bx, gy, bz);

      for (const eb of dp.edibleBlocks) {
        if (block === eb.type) {
          this.world.setBlock(bx, gy, bz, eb.replacedBy);
          this.onWorldEdit?.(bx, gy, bz);
          c.hunger = Math.max(0, c.hunger - eb.hungerReduction);
          c.health = Math.min(c.config.maxHealth, c.health + eb.healthGain);
          c.state = 'idle';
          c.idleTimer = 1;
          this.eventLog.emit('eat_block', `${c.config.name} ate block`, c.config.id, { x: bx, z: bz });
          return;
        }
      }
    }

    // Hunt prey (tag-based)
    if (dp.preyTags.length > 0) {
      const bp = c.config.behaviorParams;
      const prey = this.nearestWithTags(c, dp.preyTags, bp.huntDetectionRange);
      if (prey) {
        this.moveToward(c, prey.x, prey.z, dt);
        const dx = c.x - prey.x;
        const dz = c.z - prey.z;
        if (dx * dx + dz * dz < 1) {
          prey.health -= bp.attackDamage;
          c.hunger = Math.max(0, c.hunger - dp.preyHungerReduction);
          c.health = Math.min(c.config.maxHealth, c.health + dp.preyHealthGain);
          c.state = 'idle';
          c.idleTimer = 1.5;
          if (prey.health <= 0) {
            prey.alive = false;
            this.eventLog.emit('hunt_kill', `${c.config.name} killed ${prey.config.name}`, c.config.id, {
              x: Math.floor(prey.x), z: Math.floor(prey.z),
            });
          }
        }
        return;
      }
    }

    // Wander while searching
    if (this.atTarget(c)) this.pickWanderTarget(c);
    this.moveToward(c, c.targetX, c.targetZ, dt);
  }

  /** Find nearest creature that has any of the given tags. */
  private nearestWithTags(c: Creature, tags: string[], range: number): Creature | null {
    let best: Creature | null = null;
    let bestDist = range * range;
    for (const other of this.creatures) {
      if (other === c || !other.alive) continue;
      if (other.config.id === c.config.id) continue;
      if (!other.config.tags.some((t) => tags.includes(t))) continue;
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
    const rp = c.config.reproductionParams;
    if (c.hunger > rp.maxHunger) return;
    if (c.health < c.config.maxHealth * rp.minHealthPercent) return;
    if (Math.random() > rp.rate * 0.1) return;

    if (rp.requiresMate) {
      for (const other of this.creatures) {
        if (other === c || !other.alive) continue;
        if (other.config.id !== c.config.id) continue;
        const dx = c.x - other.x;
        const dz = c.z - other.z;
        if (dx * dx + dz * dz < rp.mateRange * rp.mateRange) {
          const nx = c.x + (Math.random() - 0.5) * 3;
          const nz = c.z + (Math.random() - 0.5) * 3;
          this.spawnCreature(c.config, nx, nz);
          c.hunger += rp.hungerCost;
          this.eventLog.emit('reproduction', `${c.config.name} reproduced`, c.config.id, {
            x: Math.floor(c.x), z: Math.floor(c.z),
          });
          return;
        }
      }
    } else {
      const nx = c.x + (Math.random() - 0.5) * 3;
      const nz = c.z + (Math.random() - 0.5) * 3;
      this.spawnCreature(c.config, nx, nz);
      c.hunger += rp.hungerCost;
    }
  }

  // ─── Environment (config-driven) ───

  private simulateWater(): void {
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

    if (y > 0) {
      const below = this.world.getBlock(x, y - 1, z);
      if (below === BlockType.FIRE) {
        this.world.setBlock(x, y - 1, z, BlockType.AIR);
        this.onWorldEdit?.(x, y - 1, z);
      }
      if (below === BlockType.LAVA) {
        this.world.setBlock(x, y - 1, z, BlockType.STONE);
        this.world.setWaterLevel(x, y, z, level - 1);
        this.onWorldEdit?.(x, y - 1, z);
        this.onWorldEdit?.(x, y, z);
        return;
      }
      const belowNow = this.world.getBlock(x, y - 1, z);
      if (belowNow === BlockType.AIR) {
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

    if (level <= 1) return;
    const dirs: [number, number][] = [[-1, 0], [1, 0], [0, -1], [0, 1]];
    for (let i = dirs.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [dirs[i], dirs[j]] = [dirs[j], dirs[i]];
    }
    for (const [dx, dz] of dirs) {
      if (level <= 1) break;
      const nx = x + dx;
      const nz = z + dz;
      const nb = this.world.getBlock(nx, y, nz);
      if (nb === BlockType.FIRE) {
        this.world.setBlock(nx, y, nz, BlockType.AIR);
        this.world.setWaterLevel(x, y, z, level - 1);
        level--;
        this.onWorldEdit?.(nx, y, nz);
        this.onWorldEdit?.(x, y, z);
        continue;
      }
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
        this.world.setWaterLevel(nx, y, nz, nLevel + 1);
        this.world.setWaterLevel(x, y, z, level - 1);
        level--;
        this.onWorldEdit?.(nx, y, nz);
        this.onWorldEdit?.(x, y, z);
      }
    }
  }

  private simulateFire(): void {
    const fp = this.env.fire;
    const fires: [number, number, number][] = [];
    const checks = 150;
    for (let i = 0; i < checks; i++) {
      const x = Math.floor(Math.random() * this.world.width);
      const z = Math.floor(Math.random() * this.world.depth);
      for (let y = 0; y < this.world.height; y++) {
        if (this.world.getBlock(x, y, z) === BlockType.FIRE) fires.push([x, y, z]);
      }
    }
    for (const [fx, fy, fz] of fires) {
      for (const [dx, dy, dz] of [[-1,0,0],[1,0,0],[0,-1,0],[0,1,0],[0,0,-1],[0,0,1]]) {
        const nx = fx + dx, ny = fy + dy, nz = fz + dz;
        if (isFlammable(this.world.getBlock(nx, ny, nz)) && Math.random() < fp.spreadChance) {
          this.world.setBlock(nx, ny, nz, BlockType.FIRE);
          this.onWorldEdit?.(nx, ny, nz);
        }
      }
      if (Math.random() < fp.burnoutChance) {
        this.world.setBlock(fx, fy, fz, BlockType.AIR);
        this.onWorldEdit?.(fx, fy, fz);
      }
      for (const c of this.creatures) {
        if (!c.alive) continue;
        const dx = c.x - fx, dy = c.y - fy, dz = c.z - fz;
        if (dx * dx + dy * dy + dz * dz < fp.damageRange * fp.damageRange) {
          c.health -= fp.damagePerTick;
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
    const gp = this.env.grassRegrowth;
    for (let i = 0; i < gp.checksPerTick; i++) {
      const x = Math.floor(Math.random() * this.world.width);
      const z = Math.floor(Math.random() * this.world.depth);
      const y = this.world.getSolidHeight(x, z);
      if (this.world.getBlock(x, y, z) !== BlockType.DIRT) continue;
      if (gp.requiresAdjacentGrass) {
        let found = false;
        for (const [dx, dz] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
          if (this.world.getBlock(x + dx, this.world.getSolidHeight(x + dx, z + dz), z + dz) === BlockType.GRASS) {
            found = true;
            break;
          }
        }
        if (!found) continue;
      }
      this.world.setBlock(x, y, z, BlockType.GRASS);
      this.onWorldEdit?.(x, y, z);
    }
  }

  private spreadTrees(): void {
    const tp = this.env.treeSpread;
    for (let i = 0; i < tp.attemptsPerTick; i++) {
      const x = Math.floor(Math.random() * this.world.width);
      const z = Math.floor(Math.random() * this.world.depth);
      const y = this.world.getSolidHeight(x, z);
      if (this.world.getBlock(x, y, z) !== BlockType.GRASS) continue;
      let nearTree = false;
      for (let dx = -tp.range; dx <= tp.range && !nearTree; dx++) {
        for (let dz = -tp.range; dz <= tp.range && !nearTree; dz++) {
          if (dx * dx + dz * dz > tp.range * tp.range) continue;
          for (let dy = 1; dy <= 8; dy++) {
            if (this.world.getBlock(x + dx, y + dy, z + dz) === BlockType.LEAVES) {
              nearTree = true;
              break;
            }
          }
        }
      }
      if (!nearTree || Math.random() > tp.chance) continue;
      if (this.world.getBlock(x, y + 1, z) !== BlockType.AIR) continue;
      const changed = placeTree(this.world, x, y + 1, z);
      for (const [bx, by, bz] of changed) this.onWorldEdit?.(bx, by, bz);
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

  // ─── Data Recording ───

  private recordDataPoint(): void {
    const populations: Record<string, number> = {};
    const healthSums: Record<string, number> = {};
    const hungerSums: Record<string, number> = {};

    for (const sp of this.species) {
      populations[sp.id] = 0;
      healthSums[sp.id] = 0;
      hungerSums[sp.id] = 0;
    }

    for (const c of this.creatures) {
      if (!c.alive) continue;
      populations[c.config.id] = (populations[c.config.id] ?? 0) + 1;
      healthSums[c.config.id] = (healthSums[c.config.id] ?? 0) + c.health;
      hungerSums[c.config.id] = (hungerSums[c.config.id] ?? 0) + c.hunger;
    }

    const avgHealth: Record<string, number> = {};
    const avgHunger: Record<string, number> = {};
    for (const sp of this.species) {
      const count = populations[sp.id] || 1;
      avgHealth[sp.id] = healthSums[sp.id] / count;
      avgHunger[sp.id] = hungerSums[sp.id] / count;
    }

    const point: DataPoint = {
      tick: this.eventLog.getTick(),
      time: this.eventLog.getTime(),
      populations,
      resources: { ...this.vegStats },
      avgHealth,
      avgHunger,
      births: this.birthsSinceLastRecord,
      deaths: this.deathsSinceLastRecord,
    };

    this.dataRecorder.record(point);
    this.birthsSinceLastRecord = 0;
    this.deathsSinceLastRecord = 0;
  }
}
