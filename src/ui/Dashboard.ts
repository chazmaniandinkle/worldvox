import { SimEngine } from '../simulation/SimEngine';
import { SimEvent } from '../simulation/EventLog';

export class Dashboard {
  private panel: HTMLElement;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private feedEl: HTMLElement;
  private simEngine: SimEngine;
  private interval: number;

  constructor(simEngine: SimEngine) {
    this.simEngine = simEngine;
    this.panel = document.createElement('div');
    this.panel.className = 'dashboard-panel';
    this.panel.innerHTML = `
      <div class="dash-header">
        <h3>Simulation Dashboard</h3>
        <button class="inspect-close" id="dash-close">&times;</button>
      </div>
      <div class="dash-section">
        <div class="dash-label">Population</div>
        <canvas id="dash-pop-chart" width="320" height="100"></canvas>
      </div>
      <div class="dash-section">
        <div class="dash-label">Event Log</div>
        <div class="dash-feed" id="dash-feed"></div>
      </div>
      <div class="dash-section dash-export-row">
        <button class="btn-create" id="dash-export-csv" style="font-size:11px;padding:6px">Export Data CSV</button>
        <button class="btn-create" id="dash-export-events" style="font-size:11px;padding:6px">Export Events CSV</button>
        <button class="btn-create" id="dash-export-json" style="font-size:11px;padding:6px">Export Data JSON</button>
      </div>
      <div class="dash-section">
        <div class="dash-label">Sim Time: <span id="dash-time">0.0s</span> | Tick: <span id="dash-tick">0</span></div>
      </div>
    `;

    document.body.appendChild(this.panel);

    this.canvas = this.panel.querySelector('#dash-pop-chart') as HTMLCanvasElement;
    this.ctx = this.canvas.getContext('2d')!;
    this.feedEl = this.panel.querySelector('#dash-feed') as HTMLElement;

    this.panel.querySelector('#dash-close')!.addEventListener('click', () => this.hide());

    this.panel.querySelector('#dash-export-csv')!.addEventListener('click', () => {
      this.download('worldvox-data.csv', simEngine.dataRecorder.exportCSV());
    });
    this.panel.querySelector('#dash-export-events')!.addEventListener('click', () => {
      this.download('worldvox-events.csv', simEngine.eventLog.exportCSV());
    });
    this.panel.querySelector('#dash-export-json')!.addEventListener('click', () => {
      this.download('worldvox-data.json', simEngine.dataRecorder.exportJSON());
    });

    this.interval = setInterval(() => this.refresh(), 500) as unknown as number;
  }

  show(): void { this.panel.classList.add('open'); }
  hide(): void { this.panel.classList.remove('open'); }
  toggle(): void { this.panel.classList.toggle('open'); }
  get visible(): boolean { return this.panel.classList.contains('open'); }

  dispose(): void {
    clearInterval(this.interval);
    this.panel.remove();
  }

  private refresh(): void {
    if (!this.panel.classList.contains('open')) return;
    this.drawPopulationChart();
    this.updateFeed();
    (this.panel.querySelector('#dash-time') as HTMLElement).textContent =
      this.simEngine.eventLog.getTime().toFixed(1) + 's';
    (this.panel.querySelector('#dash-tick') as HTMLElement).textContent =
      String(this.simEngine.eventLog.getTick());
  }

  private drawPopulationChart(): void {
    const data = this.simEngine.dataRecorder.data;
    if (data.length < 2) return;

    const w = this.canvas.width;
    const h = this.canvas.height;
    const ctx = this.ctx;

    ctx.clearRect(0, 0, w, h);

    // Grid
    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx.lineWidth = 1;
    for (let y = 0; y < h; y += 20) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
    }

    // Collect species colors
    const speciesMap = new Map<string, string>();
    for (const sp of this.simEngine.species) {
      speciesMap.set(sp.id, sp.color);
    }

    // Find max population for scaling
    let maxPop = 1;
    for (const d of data) {
      for (const count of Object.values(d.populations)) {
        if (count > maxPop) maxPop = count;
      }
    }

    const xScale = w / Math.max(1, data.length - 1);
    const yScale = (h - 10) / maxPop;

    // Draw a line per species
    for (const [id, color] of speciesMap) {
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      let started = false;
      for (let i = 0; i < data.length; i++) {
        const pop = data[i].populations[id] ?? 0;
        const x = i * xScale;
        const y = h - 5 - pop * yScale;
        if (!started) { ctx.moveTo(x, y); started = true; }
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }

    // Legend
    let lx = 4;
    ctx.font = '10px sans-serif';
    for (const sp of this.simEngine.species) {
      const count = this.simEngine.creatures.filter(
        (c) => c.alive && c.config.id === sp.id
      ).length;
      ctx.fillStyle = sp.color;
      ctx.fillRect(lx, 4, 8, 8);
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      const label = `${sp.name}: ${count}`;
      ctx.fillText(label, lx + 10, 12);
      lx += ctx.measureText(label).width + 20;
    }
  }

  private updateFeed(): void {
    const events = this.simEngine.eventLog.recent(20);
    this.feedEl.innerHTML = events
      .map((e) => `<div class="dash-event ${e.type}">${this.formatTime(e.time)} ${this.icon(e.type)} ${e.details}</div>`)
      .join('');
  }

  private formatTime(t: number): string {
    const m = Math.floor(t / 60);
    const s = Math.floor(t % 60);
    return `<span class="dash-time-stamp">${m}:${s.toString().padStart(2, '0')}</span>`;
  }

  private icon(type: SimEvent['type']): string {
    const icons: Record<string, string> = {
      birth: '🐣', death: '💀', hunt_kill: '⚔', eat_block: '🍽',
      extinction: '☠', starvation: '😵', reproduction: '💕', flee: '🏃',
      fire_ignite: '🔥', fire_extinguish: '💧',
    };
    return icons[type] ?? '•';
  }

  private download(filename: string, content: string): void {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }
}
