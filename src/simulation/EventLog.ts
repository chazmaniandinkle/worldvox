export type SimEventType =
  | 'birth'
  | 'death'
  | 'hunt_kill'
  | 'eat_block'
  | 'extinction'
  | 'fire_ignite'
  | 'fire_extinguish'
  | 'starvation'
  | 'reproduction'
  | 'flee';

export interface SimEvent {
  tick: number;
  time: number;
  type: SimEventType;
  species?: string;
  details: string;
  position?: { x: number; z: number };
}

export class EventLog {
  events: SimEvent[] = [];
  private tick = 0;
  private time = 0;
  private maxEvents = 5000;

  /** Call each simulation tick to keep the clock in sync. */
  advanceTick(dt: number): void {
    this.tick++;
    this.time += dt;
  }

  getTick(): number { return this.tick; }
  getTime(): number { return this.time; }

  emit(type: SimEventType, details: string, species?: string, position?: { x: number; z: number }): void {
    this.events.push({ tick: this.tick, time: this.time, type, species, details, position });
    if (this.events.length > this.maxEvents) {
      this.events = this.events.slice(-this.maxEvents);
    }
  }

  /** Get the last N events, newest first. */
  recent(n = 50): SimEvent[] {
    return this.events.slice(-n).reverse();
  }

  /** Get all events of a given type. */
  byType(type: SimEventType): SimEvent[] {
    return this.events.filter((e) => e.type === type);
  }

  /** Count events of a type within the last N seconds of sim time. */
  countRecent(type: SimEventType, windowSec: number): number {
    const cutoff = this.time - windowSec;
    return this.events.filter((e) => e.type === type && e.time >= cutoff).length;
  }

  /** Export all events as CSV string. */
  exportCSV(): string {
    const header = 'tick,time,type,species,details,x,z';
    const rows = this.events.map((e) =>
      `${e.tick},${e.time.toFixed(2)},${e.type},${e.species ?? ''},${JSON.stringify(e.details)},${e.position?.x ?? ''},${e.position?.z ?? ''}`,
    );
    return [header, ...rows].join('\n');
  }

  clear(): void {
    this.events = [];
    this.tick = 0;
    this.time = 0;
  }
}
