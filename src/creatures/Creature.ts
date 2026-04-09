export interface CreatureTemplate {
  id: string;
  name: string;
  color: string;       // hex, e.g. '#ff8844'
  size: number;        // 0.3 – 2.0
  speed: number;       // blocks per second
  maxHealth: number;
  hungerRate: number;  // hunger units per second
  reproductionRate: number; // probability per check
  diet: 'herbivore' | 'carnivore' | 'omnivore';
  behavior: 'passive' | 'aggressive' | 'neutral';
}

export type CreatureState = 'idle' | 'wandering' | 'seeking_food' | 'fleeing' | 'dead';

export class Creature {
  template: CreatureTemplate;
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
  facing: number; // radians, 0 = +Z direction

  constructor(template: CreatureTemplate, x: number, y: number, z: number) {
    this.template = template;
    this.x = x;
    this.y = y;
    this.z = z;
    this.health = template.maxHealth;
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
