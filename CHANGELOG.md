# Changelog

All notable changes to WorldVox will be documented in this file.

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
This project uses [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.3.0] - 2026-04-09

### Added
- Config-driven simulation harness (`SimConfig.ts`)
  - `CreatureConfig` with `BehaviorParams`, `DietParams`, `ReproductionParams`
  - `EnvironmentParams` for grass, tree, water, fire tuning
  - Tag-based creature interactions (flee/hunt by tags)
  - `creatureConfigFromSimple()` bridge for creature creator UI
- Event logging (`EventLog.ts`) — births, deaths, hunts, extinctions, starvation, fleeing
- Data recording (`DataRecorder.ts`) — population, resources, health/hunger time series
- Simulation dashboard (📊 button) — population chart, event feed, CSV/JSON export
- Creatures walk on ground only (`getGroundHeight()` skips wood/leaves/fire)

## [0.2.0] - 2026-04-09

### Added
- Themeable UI system with 4 built-in themes (Earthen Craft, Stone Tablet, Pixel Inventory, Neon Grid)
- `ThemeManager` engine with CSS variable injection, localStorage persistence, JSON import/export
- `UITheme` interface with 37 design tokens
- Theme picker in settings panel
- README and THEMING docs

## [0.1.0] - 2026-04-08

### Added
- Voxel world engine (64×32×64, chunk-based rendering with Three.js)
- Procedural terrain generation with 8 biomes (Classic, Flat, Forest, Beach, Desert, Mountains, Archipelago, Tundra)
- World size selection (32×32, 64×64, 128×128, 256×256)
- World picker overlay on startup
- Terrain editing tools: Paint, Raise, Lower, Eraser, Tree, Fire, Meteor
- Block palette with 10 block types
- Volumetric water (8-level flow, gravity, lateral equalization)
- Fire physics (spread, burnout, creature damage)
- Water/lava interaction (→ stone), water extinguishes fire
- Creature creator with customizable stats, diet, behavior
- 3 default species (Bunny, Wolf, Cow)
- Creature AI: wander, seek food, hunt, flee, reproduce
- Creature facing direction with smooth rotation
- Click-to-select creatures with inspect panel (live health/hunger bars, stats)
- Grass regrowth and natural tree spreading
- Vegetation tracking (grass, tree, leaf counts)
- Configurable camera controls (trackpad orbit/pan, pinch zoom, mouse fallbacks)
- Camera settings panel with invert/speed options (persisted to localStorage)
- Simulation controls: play/pause, speed (1×–10×)
- Brush size controls ([ ] keys, +/− buttons)
- Species list with live population counts
- Settings panel with camera controls and world regeneration
