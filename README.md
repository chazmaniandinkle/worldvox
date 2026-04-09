<p align="center">
  <img src="docs/logo.svg" alt="WorldVox" width="480" />
</p>

<p align="center">
  <strong>Voxel god-game sandbox</strong> — shape terrain, grow ecosystems, design creatures, and watch it all burn.
</p>

<p align="center">
  <a href="#features">Features</a> · <a href="#getting-started">Getting Started</a> · <a href="#controls">Controls</a> · <a href="#biomes">Biomes</a> · <a href="#architecture">Architecture</a>
</p>

---

## Features

**Terrain sculpting** — Paint, raise, and lower terrain across 10 block types (grass, dirt, stone, sand, snow, wood, leaves, water, lava, fire). Adjustable brush sizes and four world scales from 32×32 to 256×256.

**Volumetric water** — Water flows downhill, fills basins, and settles at realistic levels through a cellular-automaton fluid simulation.

**Fire physics** — Fire spreads to flammable blocks (wood, leaves, grass), burns them away, and dies out when fuel is exhausted.

**Creature creator** — Design species with custom color, size, speed, diet (herbivore / carnivore / omnivore), behavior (passive / aggressive / neutral), and reproduction rate. Spawn them into your world and watch populations interact.

**Living ecosystems** — Grass spreads to adjacent dirt. Trees reproduce via seed dispersal. Creatures wander, seek food, flee predators, reproduce, and die. A full ecology emerges from simple rules.

**God powers** — Drop meteors that crater the landscape, ignite forests, spawn creatures, or plant trees with a single click.

**8 biome presets** — Classic rolling hills, flat canvas, dense forest, sandy beach, desert oasis, mountain peaks, archipelago islands, and frozen tundra. Each generates with a seeded noise function for infinite variation.

## Getting Started

```bash
git clone https://github.com/chazmaniandinkle/worldvox.git
cd worldvox
npm install
npm run dev
```

Open `http://localhost:5173` in your browser. That's it.

### Build for production

```bash
npm run build
npm run preview
```

## Controls

| Input | Action |
|-------|--------|
| Left click | Apply selected tool |
| Right click + drag | Rotate camera |
| Scroll wheel | Zoom in/out |
| Middle click + drag | Pan camera |

### Tools

| Tool | What it does |
|------|-------------|
| 🖌 Paint | Place blocks of the selected type |
| ⬆ Raise | Build terrain upward |
| ⬇ Lower | Dig terrain downward |
| 🔲 Eraser | Remove blocks |
| 🌳 Tree | Plant a tree |
| 🔥 Fire | Ignite a block |
| 🐾 Spawn | Place a creature of the selected species |
| ☄ Meteor | Drop a meteor at the cursor |

## Biomes

| Biome | Description |
|-------|-------------|
| Classic | Rolling hills with rivers and scattered forests |
| Flat World | Blank grass plain — a clean canvas |
| Dense Forest | Thick woodland with natural clearings |
| Beach | Sandy shores meeting shallow seas |
| Desert Oasis | Sweeping dunes around a central water source |
| Mountains | Towering peaks and carved valleys |
| Archipelago | Island chains in open water |
| Tundra | Frozen snowfields with ice lakes |

## Architecture

```
src/
├── main.ts                 # App bootstrap, scene setup, game loop
├── world/
│   ├── World.ts            # Voxel grid + water-level data
│   ├── BlockTypes.ts       # Block enum, colors, properties
│   ├── TerrainGenerator.ts # Biome generation (FBM noise)
│   └── WorldRenderer.ts    # Greedy meshing, chunk management
├── simulation/
│   └── SimEngine.ts        # Water flow, fire spread, grass/tree growth, creature AI
├── editor/
│   └── MapEditor.ts        # Raycasting, tool application, brush system
├── creatures/
│   ├── Creature.ts         # Creature data model + state machine
│   └── CreatureRenderer.ts # Three.js mesh generation for creatures
├── camera/
│   └── CameraController.ts # Orbit camera with pan/zoom
├── ui/
│   ├── UI.ts               # Toolbar, panels, species list, settings
│   └── styles.css          # All UI styling
└── utils/
    └── noise.ts            # Seeded Perlin noise + FBM
```

**Stack:** TypeScript · Three.js · Vite  
**Zero dependencies** beyond Three.js — no frameworks, no state libraries, no build plugins.

## License

MIT

---

<p align="center">
  <sub>Built by <a href="https://github.com/chazmaniandinkle">chazmaniandinkle</a></sub>
</p>
