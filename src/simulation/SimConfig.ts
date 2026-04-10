import { BlockType } from '../world/BlockTypes';

// ─── Creature Behavior Parameters ───

export interface BehaviorParams {
  fleeFromTags: string[];
  fleeDetectionRange: number;
  fleeDistance: number;
  wanderRangeMin: number;
  wanderRangeMax: number;
  idleDurationMin: number;
  idleDurationMax: number;
  hungerSeekThreshold: number;
  starvationThreshold: number;
  starvationDamagePerSec: number;
  attackDamage: number;
  huntDetectionRange: number;
}

export interface DietParams {
  edibleBlocks: {
    type: BlockType;
    hungerReduction: number;
    healthGain: number;
    replacedBy: BlockType;
  }[];
  preyTags: string[];
  preyHungerReduction: number;
  preyHealthGain: number;
}

export interface ReproductionParams {
  rate: number;
  minHealthPercent: number;
  maxHunger: number;
  mateRange: number;
  hungerCost: number;
  requiresMate: boolean;
}

// ─── Full Creature Config ───

export interface CreatureConfig {
  id: string;
  name: string;
  tags: string[];
  color: string;
  size: number;
  speed: number;
  maxHealth: number;
  hungerRate: number;
  diet: 'herbivore' | 'carnivore' | 'omnivore';
  behavior: 'passive' | 'aggressive' | 'neutral';
  behaviorParams: BehaviorParams;
  dietParams: DietParams;
  reproductionParams: ReproductionParams;
}

// ─── Environment Parameters ───

export interface EnvironmentParams {
  grassRegrowth: {
    checksPerTick: number;
    requiresAdjacentGrass: boolean;
    tickInterval: number;
  };
  treeSpread: {
    attemptsPerTick: number;
    chance: number;
    range: number;
    tickInterval: number;
  };
  water: {
    tickInterval: number;
  };
  lava: {
    tickInterval: number;
  };
  fire: {
    tickInterval: number;
    spreadChance: number;
    burnoutChance: number;
    damageRange: number;
    damagePerTick: number;
  };
}

// ─── Simulation Config ───

export interface SimulationConfig {
  name: string;
  description: string;
  version: string;
  creatures: CreatureConfig[];
  environment: EnvironmentParams;
  initialSpawns: {
    speciesId: string;
    count: number;
    area?: { x: number; z: number; radius: number };
  }[];
  recording: {
    enabled: boolean;
    sampleInterval: number;
  };
}

// ──────────────────────────────────────────
//  DEFAULTS (match prior hardcoded behavior)
// ──────────────────────────────────────────

export const DEFAULT_BEHAVIOR_PASSIVE: BehaviorParams = {
  fleeFromTags: ['aggressive', 'carnivore'],
  fleeDetectionRange: 8,
  fleeDistance: 8,
  wanderRangeMin: 6,
  wanderRangeMax: 14,
  idleDurationMin: 1,
  idleDurationMax: 3,
  hungerSeekThreshold: 40,
  starvationThreshold: 80,
  starvationDamagePerSec: 5,
  attackDamage: 0,
  huntDetectionRange: 0,
};

export const DEFAULT_BEHAVIOR_AGGRESSIVE: BehaviorParams = {
  fleeFromTags: [],
  fleeDetectionRange: 0,
  fleeDistance: 0,
  wanderRangeMin: 6,
  wanderRangeMax: 14,
  idleDurationMin: 1,
  idleDurationMax: 3,
  hungerSeekThreshold: 40,
  starvationThreshold: 80,
  starvationDamagePerSec: 5,
  attackDamage: 30,
  huntDetectionRange: 12,
};

export const DEFAULT_BEHAVIOR_NEUTRAL: BehaviorParams = {
  fleeFromTags: [],
  fleeDetectionRange: 0,
  fleeDistance: 0,
  wanderRangeMin: 6,
  wanderRangeMax: 14,
  idleDurationMin: 1,
  idleDurationMax: 3,
  hungerSeekThreshold: 40,
  starvationThreshold: 80,
  starvationDamagePerSec: 5,
  attackDamage: 0,
  huntDetectionRange: 0,
};

export const DEFAULT_DIET_HERBIVORE: DietParams = {
  edibleBlocks: [
    { type: BlockType.GRASS, hungerReduction: 40, healthGain: 5, replacedBy: BlockType.DIRT },
  ],
  preyTags: [],
  preyHungerReduction: 0,
  preyHealthGain: 0,
};

export const DEFAULT_DIET_CARNIVORE: DietParams = {
  edibleBlocks: [],
  preyTags: ['passive', 'herbivore', 'neutral'],
  preyHungerReduction: 50,
  preyHealthGain: 10,
};

export const DEFAULT_DIET_OMNIVORE: DietParams = {
  edibleBlocks: [
    { type: BlockType.GRASS, hungerReduction: 30, healthGain: 3, replacedBy: BlockType.DIRT },
  ],
  preyTags: ['passive', 'herbivore'],
  preyHungerReduction: 40,
  preyHealthGain: 8,
};

export const DEFAULT_REPRODUCTION: ReproductionParams = {
  rate: 0.5,
  minHealthPercent: 0.7,
  maxHunger: 30,
  mateRange: 4,
  hungerCost: 20,
  requiresMate: true,
};

export const DEFAULT_ENVIRONMENT: EnvironmentParams = {
  grassRegrowth: { checksPerTick: 50, requiresAdjacentGrass: true, tickInterval: 2 },
  treeSpread: { attemptsPerTick: 10, chance: 0.3, range: 5, tickInterval: 5 },
  water: { tickInterval: 0.15 },
  lava: { tickInterval: 0.6 },
  fire: { tickInterval: 0.5, spreadChance: 0.25, burnoutChance: 0.15, damageRange: 2, damagePerTick: 3 },
};

// ─── Helpers ───

export function behaviorParamsForType(type: 'passive' | 'aggressive' | 'neutral'): BehaviorParams {
  switch (type) {
    case 'passive': return { ...DEFAULT_BEHAVIOR_PASSIVE };
    case 'aggressive': return { ...DEFAULT_BEHAVIOR_AGGRESSIVE };
    case 'neutral': return { ...DEFAULT_BEHAVIOR_NEUTRAL };
  }
}

export function dietParamsForType(type: 'herbivore' | 'carnivore' | 'omnivore'): DietParams {
  switch (type) {
    case 'herbivore': return { ...DEFAULT_DIET_HERBIVORE, edibleBlocks: [...DEFAULT_DIET_HERBIVORE.edibleBlocks] };
    case 'carnivore': return { ...DEFAULT_DIET_CARNIVORE, preyTags: [...DEFAULT_DIET_CARNIVORE.preyTags] };
    case 'omnivore': return { ...DEFAULT_DIET_OMNIVORE, edibleBlocks: [...DEFAULT_DIET_OMNIVORE.edibleBlocks], preyTags: [...DEFAULT_DIET_OMNIVORE.preyTags] };
  }
}

/** Convert a simple creature creator form into a full CreatureConfig. */
export function creatureConfigFromSimple(opts: {
  id: string;
  name: string;
  color: string;
  size: number;
  speed: number;
  maxHealth: number;
  hungerRate: number;
  reproductionRate: number;
  diet: 'herbivore' | 'carnivore' | 'omnivore';
  behavior: 'passive' | 'aggressive' | 'neutral';
}): CreatureConfig {
  const tags: string[] = [opts.diet, opts.behavior];
  if (opts.size < 0.7) tags.push('small');
  else if (opts.size > 1.3) tags.push('large');

  return {
    ...opts,
    tags,
    behaviorParams: behaviorParamsForType(opts.behavior),
    dietParams: dietParamsForType(opts.diet),
    reproductionParams: { ...DEFAULT_REPRODUCTION, rate: opts.reproductionRate },
  };
}
