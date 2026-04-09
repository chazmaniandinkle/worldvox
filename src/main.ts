import * as THREE from 'three';
import { World } from './world/World';
import { generateTerrain, Biome, BIOME_INFO } from './world/TerrainGenerator';
import { WorldRenderer } from './world/WorldRenderer';
import { CameraController } from './camera/CameraController';
import { MapEditor } from './editor/MapEditor';
import { SimEngine } from './simulation/SimEngine';
import { CreatureRenderer } from './creatures/CreatureRenderer';
import { UI } from './ui/UI';
import { ThemeManager } from './ui/themes';

// ─── Theme ───
const themeManager = new ThemeManager();

// ─── Renderer ───
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
document.getElementById('app')!.appendChild(renderer.domElement);

// ─── Scene ───
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x7ec8e3);
scene.fog = new THREE.Fog(0x7ec8e3, 80, 180);

// ─── Lighting ───
const hemi = new THREE.HemisphereLight(0x88bbdd, 0x445533, 0.7);
scene.add(hemi);
const sun = new THREE.DirectionalLight(0xfff4e0, 1.0);
sun.position.set(40, 60, 30);
scene.add(sun);
const fill = new THREE.DirectionalLight(0xaaccff, 0.3);
fill.position.set(-30, 20, -20);
scene.add(fill);

// ─── Camera ───
const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 500);
const cameraController = new CameraController(camera, renderer.domElement);

// ─── Mutable game state ───
let world: World;
let worldRenderer: WorldRenderer;
let simEngine: SimEngine;
let creatureRenderer: CreatureRenderer;
let mapEditor: MapEditor;
let ui: UI | null = null;

export type WorldSize = 'small' | 'medium' | 'large' | 'huge';
export const WORLD_SIZES: Record<WorldSize, { w: number; h: number; d: number; label: string }> = {
  small:  { w: 32,  h: 24, d: 32,  label: '32×32' },
  medium: { w: 64,  h: 32, d: 64,  label: '64×64' },
  large:  { w: 128, h: 40, d: 128, label: '128×128' },
  huge:   { w: 256, h: 48, d: 256, label: '256×256' },
};

let currentSize: WorldSize = 'medium';

export function initWorld(biome: Biome, seed?: number, size?: WorldSize): void {
  const s = seed ?? Math.floor(Math.random() * 100000);
  if (size) currentSize = size;
  const dim = WORLD_SIZES[currentSize];

  // Clean up old state
  if (worldRenderer) {
    for (const mesh of worldRenderer.getChunkMeshes()) {
      scene.remove(mesh);
      mesh.geometry.dispose();
    }
  }
  if (creatureRenderer) {
    creatureRenderer.update([]);
  }

  world = new World(dim.w, dim.h, dim.d);
  generateTerrain(world, s, biome);
  worldRenderer = new WorldRenderer(scene, world);

  simEngine = new SimEngine(world);
  simEngine.onWorldEdit = (x, y, z) => worldRenderer.markDirty(x, y, z);
  creatureRenderer = new CreatureRenderer(scene);

  mapEditor = new MapEditor(world, worldRenderer, camera, renderer.domElement, simEngine, scene);
  mapEditor.creatureRenderer = creatureRenderer;

  if (ui) ui.dispose();
  ui = new UI(mapEditor, simEngine, world, cameraController, creatureRenderer, themeManager, initWorld);
}

// ─── Start with picker ───
showWorldPicker();

// ─── Game Loop ───
const clock = new THREE.Clock();
let started = false;

function animate(): void {
  requestAnimationFrame(animate);
  if (!started) return;

  const dt = Math.min(clock.getDelta(), 0.1);
  cameraController.update();

  if (simEngine && simEngine.playing) {
    simEngine.update(dt);
  }

  if (creatureRenderer && simEngine) creatureRenderer.update(simEngine.creatures);
  if (worldRenderer) worldRenderer.update();
  if (mapEditor) mapEditor.update();

  renderer.render(scene, camera);
}

animate();

// ─── Resize ───
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ─── World Picker Overlay ───
function showWorldPicker(): void {
  const overlay = document.createElement('div');
  overlay.id = 'world-picker';
  overlay.innerHTML = `
    <div class="picker-title">WorldVox</div>
    <div class="picker-subtitle">Choose a starting world</div>
    <div class="picker-sizes"></div>
    <div class="picker-grid"></div>
  `;
  document.body.appendChild(overlay);

  // Size selector
  const sizesEl = overlay.querySelector('.picker-sizes')!;
  let selectedSize: WorldSize = 'medium';
  for (const [key, val] of Object.entries(WORLD_SIZES)) {
    const btn = document.createElement('button');
    btn.className = 'picker-size-btn' + (key === selectedSize ? ' active' : '');
    btn.textContent = `${val.label}`;
    btn.addEventListener('click', () => {
      selectedSize = key as WorldSize;
      sizesEl.querySelectorAll('.picker-size-btn').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
    });
    sizesEl.appendChild(btn);
  }

  const biomes: Biome[] = ['default', 'flat', 'forest', 'beach', 'desert', 'mountains', 'islands', 'snow'];
  const icons: Record<string, string> = {
    default: '🌍', flat: '⬜', forest: '🌲', beach: '🏖',
    desert: '🏜', mountains: '⛰', islands: '🏝', snow: '❄',
  };

  const grid = overlay.querySelector('.picker-grid')!;

  for (const biome of biomes) {
    const info = BIOME_INFO[biome];
    const card = document.createElement('div');
    card.className = 'picker-card';
    card.innerHTML = `
      <div class="picker-icon">${icons[biome]}</div>
      <div class="picker-name">${info.name}</div>
      <div class="picker-desc">${info.description}</div>
    `;
    card.addEventListener('click', () => {
      overlay.remove();
      initWorld(biome, undefined, selectedSize);
      started = true;
      clock.getDelta();
    });
    grid.appendChild(card);
  }
}
