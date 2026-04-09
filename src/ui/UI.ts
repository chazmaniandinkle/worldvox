import { MapEditor, Tool } from '../editor/MapEditor';
import { SimEngine } from '../simulation/SimEngine';
import { World } from '../world/World';
import { BlockType, BLOCK_COLORS, BLOCK_NAMES, PAINTABLE_BLOCKS } from '../world/BlockTypes';
import { CreatureTemplate } from '../creatures/Creature';
import { CameraController, CameraSettings } from '../camera/CameraController';
import { CreatureRenderer } from '../creatures/CreatureRenderer';
import { Biome, BIOME_INFO } from '../world/TerrainGenerator';
import type { WorldSize } from '../main';

let speciesIdCounter = 0;

export class UI {
  private editor: MapEditor;
  private simEngine: SimEngine;
  private world: World;
  private cameraController: CameraController;
  private creatureRenderer: CreatureRenderer;
  private onNewWorld: (biome: Biome, seed?: number, size?: WorldSize) => void;
  private speciesListEl!: HTMLElement;
  private statsEl!: HTMLElement;
  private blockPalette!: HTMLElement;
  private creaturePanel!: HTMLElement;
  private settingsPanel!: HTMLElement;
  private inspectPanel!: HTMLElement;
  private elements: HTMLElement[] = [];
  private intervals: number[] = [];

  constructor(
    editor: MapEditor,
    simEngine: SimEngine,
    world: World,
    cameraController: CameraController,
    creatureRenderer: CreatureRenderer,
    onNewWorld: (biome: Biome, seed?: number, size?: WorldSize) => void,
  ) {
    this.editor = editor;
    this.simEngine = simEngine;
    this.world = world;
    this.cameraController = cameraController;
    this.creatureRenderer = creatureRenderer;
    this.onNewWorld = onNewWorld;
    this.createToolbar();
    this.createBlockPalette();
    this.createCreaturePanel();
    this.createSettingsPanel();
    this.createInspectPanel();
    this.createSpeciesList();
    this.createBottomBar();
    this.addDefaultSpecies();

    this.editor.onCreatureSelected = () => this.showInspectPanel();
  }

  /** Remove all DOM elements created by this UI instance. */
  dispose(): void {
    for (const el of this.elements) el.remove();
    for (const id of this.intervals) clearInterval(id);
    this.elements = [];
    this.intervals = [];
  }

  private addElement(el: HTMLElement): void {
    this.elements.push(el);
    document.body.appendChild(el);
  }

  private addInterval(fn: () => void, ms: number): void {
    this.intervals.push(setInterval(fn, ms) as unknown as number);
  }

  private createToolbar(): void {
    const bar = document.createElement('div');
    bar.className = 'toolbar';

    const tools: { name: string; tool: Tool }[] = [
      { name: '🖌 Paint', tool: 'paint' },
      { name: '⬆ Raise', tool: 'raise' },
      { name: '⬇ Lower', tool: 'lower' },
      { name: '🔲 Eraser', tool: 'eraser' },
      { name: '🌳 Tree', tool: 'tree' },
      { name: '🔥 Fire', tool: 'fire' },
      { name: '🐾 Spawn', tool: 'spawn' },
      { name: '☄ Meteor', tool: 'meteor' },
    ];

    for (const { name, tool } of tools) {
      const btn = document.createElement('button');
      btn.textContent = name;
      btn.dataset.tool = tool;
      if (tool === this.editor.tool) btn.classList.add('active');
      btn.addEventListener('click', () => {
        this.editor.tool = tool;
        bar.querySelectorAll('button').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        this.blockPalette.classList.toggle('visible', tool === 'paint' || tool === 'raise');
      });
      bar.appendChild(btn);
    }

    // Creature Creator toggle
    const ccBtn = document.createElement('button');
    ccBtn.textContent = '✚ Creator';
    ccBtn.addEventListener('click', () => {
      this.creaturePanel.classList.toggle('open');
      this.settingsPanel.classList.remove('open');
    });
    bar.appendChild(ccBtn);

    // Settings toggle
    const gearBtn = document.createElement('button');
    gearBtn.textContent = '⚙';
    gearBtn.addEventListener('click', () => {
      this.settingsPanel.classList.toggle('open');
      this.creaturePanel.classList.remove('open');
    });
    bar.appendChild(gearBtn);

    this.addElement(bar);
  }

  private createBlockPalette(): void {
    const palette = document.createElement('div');
    palette.className = 'block-palette visible';
    this.blockPalette = palette;

    for (const type of PAINTABLE_BLOCKS) {
      const swatch = document.createElement('div');
      swatch.className = 'block-swatch';
      const c = BLOCK_COLORS[type];
      swatch.style.background = `rgb(${c[0] * 255}, ${c[1] * 255}, ${c[2] * 255})`;
      swatch.title = BLOCK_NAMES[type];
      if (type === this.editor.blockType) swatch.classList.add('active');
      swatch.addEventListener('click', () => {
        this.editor.blockType = type;
        palette.querySelectorAll('.block-swatch').forEach((s) => s.classList.remove('active'));
        swatch.classList.add('active');
      });
      palette.appendChild(swatch);
    }

    this.addElement(palette);
  }

  private createCreaturePanel(): void {
    const panel = document.createElement('div');
    panel.className = 'creature-panel';
    this.creaturePanel = panel;

    panel.innerHTML = `
      <h3>Creature Creator</h3>
      <label>Name</label>
      <input type="text" id="cc-name" value="New Species" />
      <label>Color</label>
      <input type="color" id="cc-color" value="#e88844" />

      <div class="slider-row">
        <label>Size</label>
        <span class="slider-value" id="cc-size-val">1.0</span>
      </div>
      <input type="range" id="cc-size" min="0.3" max="2" step="0.1" value="1" />

      <div class="slider-row">
        <label>Speed</label>
        <span class="slider-value" id="cc-speed-val">2.0</span>
      </div>
      <input type="range" id="cc-speed" min="0.5" max="5" step="0.5" value="2" />

      <div class="slider-row">
        <label>Health</label>
        <span class="slider-value" id="cc-health-val">100</span>
      </div>
      <input type="range" id="cc-health" min="10" max="300" step="10" value="100" />

      <div class="slider-row">
        <label>Hunger Rate</label>
        <span class="slider-value" id="cc-hunger-val">1.0</span>
      </div>
      <input type="range" id="cc-hunger" min="0.2" max="3" step="0.2" value="1" />

      <div class="slider-row">
        <label>Reproduction</label>
        <span class="slider-value" id="cc-repro-val">0.5</span>
      </div>
      <input type="range" id="cc-repro" min="0.1" max="1" step="0.1" value="0.5" />

      <label>Diet</label>
      <select id="cc-diet">
        <option value="herbivore">🌿 Herbivore</option>
        <option value="carnivore">🥩 Carnivore</option>
        <option value="omnivore">🍽 Omnivore</option>
      </select>

      <label>Behavior</label>
      <select id="cc-behavior">
        <option value="passive">😊 Passive</option>
        <option value="neutral">😐 Neutral</option>
        <option value="aggressive">😠 Aggressive</option>
      </select>

      <div class="panel-sep"></div>
      <button class="btn-create" id="cc-create">Create Species</button>
    `;

    this.addElement(panel);

    // Wire slider value displays
    for (const id of ['size', 'speed', 'health', 'hunger', 'repro']) {
      const slider = panel.querySelector(`#cc-${id}`) as HTMLInputElement;
      const display = panel.querySelector(`#cc-${id}-val`) as HTMLElement;
      slider.addEventListener('input', () => {
        display.textContent = slider.value;
      });
    }

    // Create button
    panel.querySelector('#cc-create')!.addEventListener('click', () => {
      this.createSpecies();
    });
  }

  private createSettingsPanel(): void {
    const panel = document.createElement('div');
    panel.className = 'creature-panel'; // reuse same panel styling
    this.settingsPanel = panel;

    const s = this.cameraController.settings;

    panel.innerHTML = `
      <h3>Controls</h3>

      <label>Two-finger scroll</label>
      <select id="st-scroll-action">
        <option value="orbit" ${s.scrollAction === 'orbit' ? 'selected' : ''}>Orbit</option>
        <option value="pan" ${s.scrollAction === 'pan' ? 'selected' : ''}>Pan</option>
      </select>
      <span class="brush-info" style="display:block;margin:-6px 0 10px">Shift+scroll does the other</span>

      <div class="panel-sep"></div>
      <h3>Orbit</h3>
      <label><input type="checkbox" id="st-inv-orbit-x" ${s.invertOrbitX ? 'checked' : ''} /> Invert X</label>
      <label><input type="checkbox" id="st-inv-orbit-y" ${s.invertOrbitY ? 'checked' : ''} /> Invert Y</label>
      <div class="slider-row">
        <label>Speed</label>
        <span class="slider-value" id="st-orbit-speed-val">${s.orbitSpeed.toFixed(1)}</span>
      </div>
      <input type="range" id="st-orbit-speed" min="0.2" max="5" step="0.2" value="${s.orbitSpeed}" />

      <div class="panel-sep"></div>
      <h3>Pan</h3>
      <label><input type="checkbox" id="st-inv-pan-x" ${s.invertPanX ? 'checked' : ''} /> Invert X</label>
      <label><input type="checkbox" id="st-inv-pan-y" ${s.invertPanY ? 'checked' : ''} /> Invert Y</label>
      <div class="slider-row">
        <label>Speed</label>
        <span class="slider-value" id="st-pan-speed-val">${s.panSpeed.toFixed(1)}</span>
      </div>
      <input type="range" id="st-pan-speed" min="0.2" max="5" step="0.2" value="${s.panSpeed}" />

      <div class="panel-sep"></div>
      <h3>Zoom</h3>
      <div class="slider-row">
        <label>Speed</label>
        <span class="slider-value" id="st-zoom-speed-val">${s.zoomSpeed.toFixed(1)}</span>
      </div>
      <input type="range" id="st-zoom-speed" min="0.2" max="5" step="0.2" value="${s.zoomSpeed}" />

      <div class="panel-sep"></div>
      <h3>New World</h3>
      <select id="st-biome">
        ${(Object.keys(BIOME_INFO) as Biome[]).map(
          (b) => `<option value="${b}">${BIOME_INFO[b].name}</option>`,
        ).join('')}
      </select>
      <button class="btn-create" id="st-new-world">Generate New World</button>
    `;

    this.addElement(panel);

    // Wire everything up
    const get = <T extends HTMLElement>(id: string) => panel.querySelector(`#${id}`) as T;

    get<HTMLSelectElement>('st-scroll-action').addEventListener('change', (e) => {
      this.cameraController.updateSettings({
        scrollAction: (e.target as HTMLSelectElement).value as CameraSettings['scrollAction'],
      });
    });

    get<HTMLInputElement>('st-inv-orbit-x').addEventListener('change', (e) => {
      this.cameraController.updateSettings({ invertOrbitX: (e.target as HTMLInputElement).checked });
    });
    get<HTMLInputElement>('st-inv-orbit-y').addEventListener('change', (e) => {
      this.cameraController.updateSettings({ invertOrbitY: (e.target as HTMLInputElement).checked });
    });
    get<HTMLInputElement>('st-inv-pan-x').addEventListener('change', (e) => {
      this.cameraController.updateSettings({ invertPanX: (e.target as HTMLInputElement).checked });
    });
    get<HTMLInputElement>('st-inv-pan-y').addEventListener('change', (e) => {
      this.cameraController.updateSettings({ invertPanY: (e.target as HTMLInputElement).checked });
    });

    for (const [key, id] of [
      ['orbitSpeed', 'st-orbit-speed'],
      ['panSpeed', 'st-pan-speed'],
      ['zoomSpeed', 'st-zoom-speed'],
    ] as const) {
      const slider = get<HTMLInputElement>(id);
      const display = get<HTMLElement>(`${id}-val`);
      slider.addEventListener('input', () => {
        display.textContent = parseFloat(slider.value).toFixed(1);
        this.cameraController.updateSettings({ [key]: parseFloat(slider.value) });
      });
    }

    get<HTMLButtonElement>('st-new-world').addEventListener('click', () => {
      const biome = get<HTMLSelectElement>('st-biome').value as Biome;
      this.onNewWorld(biome);
    });
  }

  private createInspectPanel(): void {
    const panel = document.createElement('div');
    panel.className = 'inspect-panel';
    this.inspectPanel = panel;
    this.addElement(panel);

    // Close on click outside
    document.addEventListener('mousedown', (e) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.inspect-panel') && !target.closest('canvas')) {
        this.inspectPanel.classList.remove('open');
        this.creatureRenderer.selected = null;
      }
    });

    // Live update
    this.addInterval(() => {
      const c = this.creatureRenderer.selected;
      if (!c || !c.alive) {
        this.inspectPanel.classList.remove('open');
        return;
      }
      if (!this.inspectPanel.classList.contains('open')) return;

      const healthPct = Math.max(0, (c.health / c.template.maxHealth) * 100);
      const hungerPct = Math.min(100, c.hunger);
      const healthColor = healthPct > 60 ? '#5c5' : healthPct > 30 ? '#da3' : '#d44';
      const hungerColor = hungerPct < 40 ? '#5c5' : hungerPct < 70 ? '#da3' : '#d44';

      const stateLabels: Record<string, string> = {
        idle: '😴 Idle',
        wandering: '🚶 Wandering',
        seeking_food: '🍽 Seeking Food',
        fleeing: '🏃 Fleeing!',
        dead: '💀 Dead',
      };

      this.inspectPanel.innerHTML = `
        <div class="inspect-header">
          <div class="inspect-color" style="background:${c.template.color}"></div>
          <div>
            <div class="inspect-name">${c.template.name}</div>
            <div class="inspect-state">${stateLabels[c.state] ?? c.state}</div>
          </div>
          <button class="inspect-close">&times;</button>
        </div>

        <div class="inspect-bars">
          <div class="inspect-bar-row">
            <span class="inspect-bar-label">Health</span>
            <div class="inspect-bar-track">
              <div class="inspect-bar-fill" style="width:${healthPct}%;background:${healthColor}"></div>
            </div>
            <span class="inspect-bar-val">${Math.round(c.health)}/${c.template.maxHealth}</span>
          </div>
          <div class="inspect-bar-row">
            <span class="inspect-bar-label">Hunger</span>
            <div class="inspect-bar-track">
              <div class="inspect-bar-fill" style="width:${hungerPct}%;background:${hungerColor}"></div>
            </div>
            <span class="inspect-bar-val">${Math.round(c.hunger)}</span>
          </div>
        </div>

        <div class="inspect-stats">
          <div class="inspect-stat"><span>Age</span><span>${c.age.toFixed(1)}s</span></div>
          <div class="inspect-stat"><span>Speed</span><span>${c.template.speed}</span></div>
          <div class="inspect-stat"><span>Size</span><span>${c.template.size}</span></div>
          <div class="inspect-stat"><span>Diet</span><span>${c.template.diet}</span></div>
          <div class="inspect-stat"><span>Behavior</span><span>${c.template.behavior}</span></div>
          <div class="inspect-stat"><span>Position</span><span>${c.x.toFixed(1)}, ${c.z.toFixed(1)}</span></div>
        </div>
      `;

      this.inspectPanel.querySelector('.inspect-close')!.addEventListener('click', () => {
        this.inspectPanel.classList.remove('open');
        this.creatureRenderer.selected = null;
      });
    }, 200);
  }

  private showInspectPanel(): void {
    this.inspectPanel.classList.add('open');
    // Close other panels
    this.creaturePanel.classList.remove('open');
    this.settingsPanel.classList.remove('open');
  }

  private createSpecies(): void {
    const name = (document.getElementById('cc-name') as HTMLInputElement).value || 'Unnamed';
    const color = (document.getElementById('cc-color') as HTMLInputElement).value;
    const size = parseFloat((document.getElementById('cc-size') as HTMLInputElement).value);
    const speed = parseFloat((document.getElementById('cc-speed') as HTMLInputElement).value);
    const maxHealth = parseInt((document.getElementById('cc-health') as HTMLInputElement).value);
    const hungerRate = parseFloat((document.getElementById('cc-hunger') as HTMLInputElement).value);
    const reproductionRate = parseFloat((document.getElementById('cc-repro') as HTMLInputElement).value);
    const diet = (document.getElementById('cc-diet') as HTMLSelectElement).value as CreatureTemplate['diet'];
    const behavior = (document.getElementById('cc-behavior') as HTMLSelectElement).value as CreatureTemplate['behavior'];

    const template: CreatureTemplate = {
      id: `species_${speciesIdCounter++}`,
      name,
      color,
      size,
      speed,
      maxHealth,
      hungerRate,
      reproductionRate,
      diet,
      behavior,
    };

    this.simEngine.addSpecies(template);
    this.editor.selectedSpecies = template;
    this.updateSpeciesList();
  }

  private createSpeciesList(): void {
    const list = document.createElement('div');
    list.className = 'species-list';
    list.innerHTML = '<h3>Species</h3>';
    this.speciesListEl = list;
    this.addElement(list);
  }

  updateSpeciesList(): void {
    const items = this.speciesListEl.querySelectorAll('.species-item');
    items.forEach((i) => i.remove());

    for (const sp of this.simEngine.species) {
      const item = document.createElement('div');
      item.className = 'species-item';
      if (this.editor.selectedSpecies?.id === sp.id) item.classList.add('active');

      const count = this.simEngine.creatures.filter(
        (c) => c.alive && c.template.id === sp.id,
      ).length;

      item.innerHTML = `
        <div class="species-color" style="background:${sp.color}"></div>
        <span class="species-name">${sp.name}</span>
        <span class="species-count">${count}</span>
      `;

      item.addEventListener('click', () => {
        this.editor.selectedSpecies = sp;
        this.editor.tool = 'spawn';
        // Update toolbar active state
        document.querySelectorAll('.toolbar button').forEach((b) => {
          const el = b as HTMLElement;
          el.classList.toggle('active', el.dataset.tool === 'spawn');
        });
        this.blockPalette.classList.remove('visible');
        this.updateSpeciesList();
      });

      this.speciesListEl.appendChild(item);
    }
  }

  private createBottomBar(): void {
    const bar = document.createElement('div');
    bar.className = 'bottom-bar';

    // Play/pause
    const playBtn = document.createElement('button');
    playBtn.textContent = '⏸';
    playBtn.classList.add('active');
    playBtn.addEventListener('click', () => {
      this.simEngine.playing = !this.simEngine.playing;
      playBtn.textContent = this.simEngine.playing ? '⏸' : '▶';
      playBtn.classList.toggle('active', this.simEngine.playing);
    });
    bar.appendChild(playBtn);

    // Speed buttons
    for (const spd of [1, 2, 5, 10]) {
      const btn = document.createElement('button');
      btn.textContent = `${spd}x`;
      if (spd === 1) btn.classList.add('active');
      btn.addEventListener('click', () => {
        this.simEngine.speed = spd;
        bar.querySelectorAll('button').forEach((b) => {
          if (b.textContent?.endsWith('x')) b.classList.remove('active');
        });
        btn.classList.add('active');
      });
      bar.appendChild(btn);
    }

    const div = document.createElement('div');
    div.className = 'divider';
    bar.appendChild(div);

    this.statsEl = document.createElement('span');
    this.statsEl.className = 'stat';
    bar.appendChild(this.statsEl);

    // Brush size display with +/- buttons
    const div2 = document.createElement('div');
    div2.className = 'divider';
    bar.appendChild(div2);

    const brushMinus = document.createElement('button');
    brushMinus.textContent = '−';
    brushMinus.addEventListener('click', () => this.editor.setBrushSize(this.editor.brushSize - 1));
    bar.appendChild(brushMinus);

    const brushLabel = document.createElement('span');
    brushLabel.className = 'stat';
    brushLabel.textContent = `Brush: ${this.editor.brushSize}`;
    bar.appendChild(brushLabel);

    const brushPlus = document.createElement('button');
    brushPlus.textContent = '+';
    brushPlus.addEventListener('click', () => this.editor.setBrushSize(this.editor.brushSize + 1));
    bar.appendChild(brushPlus);

    this.editor.onBrushSizeChange = (size) => {
      brushLabel.textContent = `Brush: ${size}`;
    };

    this.addElement(bar);

    const vegEl = document.createElement('span');
    vegEl.className = 'stat';
    bar.appendChild(vegEl);

    // Update stats periodically
    this.addInterval(() => {
      const alive = this.simEngine.creatures.filter((c) => c.alive).length;
      const v = this.simEngine.vegStats;
      this.statsEl.textContent = `Creatures: ${alive}`;
      vegEl.textContent = `🌿${v.grass} 🌳${v.trees} 🍃${v.leaves}`;
      this.updateSpeciesList();
    }, 500);
  }

  private addDefaultSpecies(): void {
    const defaults: Omit<CreatureTemplate, 'id'>[] = [
      {
        name: 'Bunny',
        color: '#ddbbaa',
        size: 0.5,
        speed: 3,
        maxHealth: 40,
        hungerRate: 1.2,
        reproductionRate: 0.8,
        diet: 'herbivore',
        behavior: 'passive',
      },
      {
        name: 'Wolf',
        color: '#666677',
        size: 1.0,
        speed: 2.5,
        maxHealth: 120,
        hungerRate: 0.8,
        reproductionRate: 0.3,
        diet: 'carnivore',
        behavior: 'aggressive',
      },
      {
        name: 'Cow',
        color: '#cc9966',
        size: 1.5,
        speed: 1.2,
        maxHealth: 200,
        hungerRate: 0.6,
        reproductionRate: 0.4,
        diet: 'herbivore',
        behavior: 'neutral',
      },
    ];

    for (const d of defaults) {
      const template: CreatureTemplate = { ...d, id: `species_${speciesIdCounter++}` };
      this.simEngine.addSpecies(template);
    }

    this.editor.selectedSpecies = this.simEngine.species[0];
    this.updateSpeciesList();
  }
}
