import { CreatureConfig } from '../simulation/SimConfig';

/** @deprecated Use CreatureConfig from SimConfig */
export type CreatureTemplate = CreatureConfig;

export type CreatureState = 'idle' | 'wandering' | 'seeking_food' | 'fleeing' | 'dead';

export class Creature {
  config: CreatureConfig;
  /** @deprecated Use .config */
  get template(): CreatureConfig { return this.config; }

  x: number;
  y: number;
  z: number;
  health: number;
  hunger: number;
  age: number;
  targetX: number;
  targetZ: number;
  state: CreatureState;
  idleTimer: number;
  alive: boolean;
  facing: number;

  constructor(config: CreatureConfig, x: number, y: number, z: number) {
    this.config = config;
    this.x = x;
    this.y = y;
    this.z = z;
    this.health = config.maxHealth;
    this.hunger = 0;
    this.age = 0;
    this.targetX = x;
    this.targetZ = z;
    this.state = 'idle';
    this.idleTimer = 0.5 + Math.random() * 1.5;
    this.alive = true;
    this.facing = Math.random() * Math.PI * 2;
  }
}
