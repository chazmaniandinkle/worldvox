export interface DataPoint {
  tick: number;
  time: number;
  populations: Record<string, number>;
  resources: { grass: number; trees: number; leaves: number };
  avgHealth: Record<string, number>;
  avgHunger: Record<string, number>;
  births: number;
  deaths: number;
}

export class DataRecorder {
  data: DataPoint[] = [];
  private maxPoints = 2000;

  record(point: DataPoint): void {
    this.data.push(point);
    if (this.data.length > this.maxPoints) {
      this.data = this.data.slice(-this.maxPoints);
    }
  }

  /** Get population time series for a species. Returns [time, count][] */
  populationSeries(speciesId: string): [number, number][] {
    return this.data.map((d) => [d.time, d.populations[speciesId] ?? 0]);
  }

  /** Get total population time series. */
  totalPopulationSeries(): [number, number][] {
    return this.data.map((d) => {
      const total = Object.values(d.populations).reduce((a, b) => a + b, 0);
      return [d.time, total];
    });
  }

  /** Get resource time series. Returns [time, { grass, trees, leaves }][] */
  resourceSeries(): [number, { grass: number; trees: number; leaves: number }][] {
    return this.data.map((d) => [d.time, d.resources]);
  }

  /** Export all data as CSV. */
  exportCSV(): string {
    if (this.data.length === 0) return '';

    // Collect all species ids
    const speciesIds = new Set<string>();
    for (const d of this.data) {
      for (const id of Object.keys(d.populations)) speciesIds.add(id);
    }
    const species = [...speciesIds];

    const header = [
      'tick', 'time',
      ...species.map((s) => `pop_${s}`),
      'grass', 'trees', 'leaves',
      ...species.map((s) => `avg_health_${s}`),
      ...species.map((s) => `avg_hunger_${s}`),
      'births', 'deaths',
    ].join(',');

    const rows = this.data.map((d) => [
      d.tick,
      d.time.toFixed(2),
      ...species.map((s) => d.populations[s] ?? 0),
      d.resources.grass, d.resources.trees, d.resources.leaves,
      ...species.map((s) => (d.avgHealth[s] ?? 0).toFixed(1)),
      ...species.map((s) => (d.avgHunger[s] ?? 0).toFixed(1)),
      d.births, d.deaths,
    ].join(','));

    return [header, ...rows].join('\n');
  }

  /** Export as JSON. */
  exportJSON(): string {
    return JSON.stringify(this.data, null, 2);
  }

  clear(): void {
    this.data = [];
  }
}
