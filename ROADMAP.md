# WorldVox Roadmap

## Current State (v0.1)

Voxel sandbox with terrain editing, creature creator, volumetric water, fire physics,
8 biomes, config-driven simulation harness with data recording and export, themeable UI.

---

## Phase 1 — Polish & Feel

The sandbox works but doesn't *feel* alive yet. This phase makes the world
readable at a glance and the editor snappy.

- [ ] **Minimap** — Top-down pixel canvas showing terrain colors, water, creature dots,
      fire. Click to pan camera. Zoom level indicator. Toggle with `M`.
- [ ] **Pathfinding** — A* on the voxel grid so creatures walk around cliffs and water
      instead of beelining through terrain.
- [ ] **Aging & natural death** — Lifespan config per species. Creatures grow old, slow
      down, die. Juveniles smaller than adults.
- [ ] **Undo/Redo** — Ring buffer of world diffs. `Cmd+Z` / `Cmd+Shift+Z`.
- [ ] **Keyboard shortcuts** — Number keys for tools, `Space` pause, `M` minimap,
      `D` dashboard, `Esc` deselect.

## Phase 2 — God Powers & Environment

More ways to shape the world and more environmental dynamism.

- [ ] **Lightning** — Strikes a point, ignites flammable blocks, damages creatures.
      Chain lightning variant.
- [ ] **Tornado** — Moving vortex that displaces blocks and flings creatures.
- [ ] **Earthquake** — Randomized terrain displacement in a radius, opens crevasses.
- [ ] **Plague** — Spreads between creatures within range, configurable lethality.
- [ ] **Acid rain** — Dissolves leaves and damages creatures over an area.
- [ ] **Day/night cycle** — Ambient light shifts, creatures sleep at night (idle state),
      nocturnal species hunt at night.
- [ ] **Weather** — Rain (fills water), snow (converts grass to snow), fog (visual).

## Phase 3 — Creature Depth

Turn simple agents into believable organisms.

- [ ] **Traits & mutation** — Offspring inherit parent stats ± random drift. Over
      generations, populations adapt (faster prey, stronger predators).
- [ ] **Stamina/energy** — Creatures tire from running, need rest. Sprinting costs
      extra energy.
- [ ] **Pack behavior** — Social species form groups, hunt cooperatively, share threat
      detection.
- [ ] **Territorial ranges** — Species claim areas, defend against intruders of
      same species.
- [ ] **Creature animations** — Leg movement cycle, eating animation, idle fidget,
      death ragdoll.
- [ ] **Sound** — Ambient nature sounds, creature calls, tool sound effects.

## Phase 4 — Civilizations

The big differentiator. Creatures that build.

- [ ] **Settlements** — Creatures build huts near food sources. Huts as placeable
      multi-block structures.
- [ ] **Resource gathering** — Creatures collect wood, stone. Stockpiles near
      settlements.
- [ ] **Roads** — Pathfinding-optimized dirt paths between settlements.
- [ ] **Factions & diplomacy** — Species form factions with relationship scores.
      Trade, alliance, war.
- [ ] **Warfare** — Faction armies that march, siege, and conquer settlements.
- [ ] **Culture** — Factions develop names, flags (colored banners on buildings).

## Phase 5 — Persistence & Sharing

Make worlds permanent and shareable.

- [ ] **Save/Load** — Serialize world state (blocks, water levels, creatures, configs,
      event history) to JSON/binary. Multiple save slots.
- [ ] **World history timeline** — Scrollable timeline of major events (settlements
      founded, wars, extinctions). Integrated with dashboard.
- [ ] **Screenshot tool** — High-res capture with UI hidden.
- [ ] **Share configs** — Export/import simulation configs (creature species +
      environment params + initial spawns) as JSON files.
- [ ] **Replay system** — Record simulation as event stream, replay at any speed.

## Phase 6 — Performance & Scale

Enable truly large worlds.

- [ ] **Chunk streaming** — Only load/render chunks near the camera. Enable
      infinite-ish worlds.
- [ ] **Web Workers** — Offload simulation tick, water flow, and mesh generation
      to worker threads.
- [ ] **LOD** — Simplified meshes for distant chunks.
- [ ] **Frustum culling** — Skip rendering chunks outside the camera view.
- [ ] **Instanced rendering** — InstancedMesh for creatures instead of individual
      groups.

## Phase 7 — Platform

- [ ] **Mobile/touch controls** — Pinch, drag, tap-to-select.
- [ ] **Electron/Tauri wrapper** — Desktop app with native file save.
- [ ] **Multiplayer** — Shared world via WebSocket. Collaborative sandbox.
- [ ] **Mod API** — Plugin system for custom creature behaviors, block types,
      and god powers via JS modules.

---

*Phases are roughly ordered by impact and dependency but work within a phase
can happen in any order. Each checkbox is a standalone PR-sized feature.*
