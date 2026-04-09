import * as THREE from 'three';
import { World } from '../world/World';
import { WorldRenderer } from '../world/WorldRenderer';
import { BlockType, isSolid } from '../world/BlockTypes';
import { SimEngine } from '../simulation/SimEngine';
import { CreatureTemplate } from '../creatures/Creature';
import { CreatureRenderer } from '../creatures/CreatureRenderer';
import { placeTree } from '../world/TerrainGenerator';

export type Tool = 'paint' | 'raise' | 'lower' | 'spawn' | 'meteor' | 'eraser' | 'tree' | 'fire';

export class MapEditor {
  tool: Tool = 'paint';
  blockType: BlockType = BlockType.GRASS;
  brushSize = 1;
  selectedSpecies: CreatureTemplate | null = null;
  onBrushSizeChange?: (size: number) => void;
  onCreatureSelected?: () => void;
  creatureRenderer: CreatureRenderer | null = null;

  private world: World;
  private worldRenderer: WorldRenderer;
  private camera: THREE.Camera;
  private domElement: HTMLElement;
  private simEngine: SimEngine;
  private scene: THREE.Scene;

  private raycaster = new THREE.Raycaster();
  private mouse = new THREE.Vector2(-999, -999);
  private highlight: THREE.Mesh;
  private isMouseDown = false;

  constructor(
    world: World,
    worldRenderer: WorldRenderer,
    camera: THREE.Camera,
    domElement: HTMLElement,
    simEngine: SimEngine,
    scene: THREE.Scene,
  ) {
    this.world = world;
    this.worldRenderer = worldRenderer;
    this.camera = camera;
    this.domElement = domElement;
    this.simEngine = simEngine;
    this.scene = scene;

    const geo = new THREE.BoxGeometry(1.02, 1.02, 1.02);
    const mat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      wireframe: true,
      transparent: true,
      opacity: 0.5,
    });
    this.highlight = new THREE.Mesh(geo, mat);
    this.highlight.visible = false;
    this.scene.add(this.highlight);

    this.setupEvents();
  }

  private setupEvents(): void {
    this.domElement.addEventListener('mousemove', (e) => {
      this.mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
      this.mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;

      if (this.isMouseDown) {
        this.applyTool();
      }
    });

    this.domElement.addEventListener('mousedown', (e) => {
      if (e.button !== 0) return;
      // Ignore clicks on UI elements
      if ((e.target as HTMLElement).closest('.toolbar, .block-palette, .creature-panel, .species-list, .bottom-bar, .inspect-panel')) return;

      // Try to pick a creature first
      if (this.creatureRenderer) {
        this.raycaster.setFromCamera(this.mouse, this.camera);
        const picked = this.creatureRenderer.pickCreature(this.raycaster);
        if (picked) {
          this.creatureRenderer.selected = picked;
          this.onCreatureSelected?.();
          return; // don't apply tool when selecting a creature
        }
      }

      this.isMouseDown = true;
      this.applyTool();
    });

    window.addEventListener('mouseup', (e) => {
      if (e.button === 0) this.isMouseDown = false;
    });

    // Brush size with [ and ]
    window.addEventListener('keydown', (e) => {
      if (e.key === '[') this.setBrushSize(this.brushSize - 1);
      if (e.key === ']') this.setBrushSize(this.brushSize + 1);
    });
  }

  update(): void {
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const meshes = this.worldRenderer.getChunkMeshes();
    const hits = this.raycaster.intersectObjects(meshes);

    if (hits.length > 0) {
      const hit = hits[0];
      const normal = hit.face!.normal;
      const point = hit.point;

      // Block that was hit
      const bx = Math.floor(point.x - normal.x * 0.01);
      const by = Math.floor(point.y - normal.y * 0.01);
      const bz = Math.floor(point.z - normal.z * 0.01);

      if (this.tool === 'raise' || this.tool === 'spawn' || this.tool === 'tree') {
        // Show on the face side
        const ax = Math.floor(point.x + normal.x * 0.01);
        const ay = Math.floor(point.y + normal.y * 0.01);
        const az = Math.floor(point.z + normal.z * 0.01);
        this.highlight.position.set(ax + 0.5, ay + 0.5, az + 0.5);
      } else {
        this.highlight.position.set(bx + 0.5, by + 0.5, bz + 0.5);
      }

      this.highlight.visible = true;
      this.highlight.scale.setScalar(this.brushSize === 1 ? 1 : this.brushSize * 2 - 0.5);
    } else {
      this.highlight.visible = false;
    }
  }

  private applyTool(): void {
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const meshes = this.worldRenderer.getChunkMeshes();
    const hits = this.raycaster.intersectObjects(meshes);
    if (hits.length === 0) return;

    const hit = hits[0];
    const normal = hit.face!.normal;
    const point = hit.point;

    const bx = Math.floor(point.x - normal.x * 0.01);
    const by = Math.floor(point.y - normal.y * 0.01);
    const bz = Math.floor(point.z - normal.z * 0.01);

    const ax = Math.floor(point.x + normal.x * 0.01);
    const ay = Math.floor(point.y + normal.y * 0.01);
    const az = Math.floor(point.z + normal.z * 0.01);

    const r = this.brushSize - 1;

    switch (this.tool) {
      case 'paint':
        this.forBrush(bx, by, bz, r, (x, y, z) => {
          if (this.world.getBlock(x, y, z) !== BlockType.AIR) {
            this.world.setBlock(x, y, z, this.blockType);
            this.worldRenderer.markDirty(x, y, z);
          }
        });
        break;

      case 'raise':
        this.forBrush(ax, ay, az, r, (x, y, z) => {
          if (this.world.getBlock(x, y, z) === BlockType.AIR) {
            this.world.setBlock(x, y, z, this.blockType);
            this.worldRenderer.markDirty(x, y, z);
          }
        });
        break;

      case 'lower':
      case 'eraser':
        this.forBrush(bx, by, bz, r, (x, y, z) => {
          if (this.world.getBlock(x, y, z) !== BlockType.AIR) {
            this.world.setBlock(x, y, z, BlockType.AIR);
            this.worldRenderer.markDirty(x, y, z);
          }
        });
        break;

      case 'spawn':
        if (this.selectedSpecies) {
          this.simEngine.spawnCreature(this.selectedSpecies, ax + 0.5, az + 0.5);
        }
        break;

      case 'tree':
        this.applyTree(ax, ay, az);
        break;

      case 'fire':
        this.forBrush(bx, by, bz, r, (x, y, z) => {
          const block = this.world.getBlock(x, y, z);
          if (block === BlockType.WOOD || block === BlockType.LEAVES || block === BlockType.GRASS) {
            this.world.setBlock(x, y, z, BlockType.FIRE);
            this.worldRenderer.markDirty(x, y, z);
          }
        });
        break;

      case 'meteor':
        this.applyMeteor(bx, by, bz);
        break;
    }
  }

  private forBrush(
    cx: number,
    cy: number,
    cz: number,
    r: number,
    fn: (x: number, y: number, z: number) => void,
  ): void {
    for (let dx = -r; dx <= r; dx++) {
      for (let dy = -r; dy <= r; dy++) {
        for (let dz = -r; dz <= r; dz++) {
          if (dx * dx + dy * dy + dz * dz <= r * r + r) {
            fn(cx + dx, cy + dy, cz + dz);
          }
        }
      }
    }
  }

  setBrushSize(size: number): void {
    this.brushSize = Math.max(1, Math.min(5, size));
    this.onBrushSizeChange?.(this.brushSize);
  }

  private applyTree(cx: number, cy: number, cz: number): void {
    const r = this.brushSize - 1;
    const placed = new Set<string>();

    for (let dx = -r; dx <= r; dx++) {
      for (let dz = -r; dz <= r; dz++) {
        if (dx * dx + dz * dz > r * r + r) continue;
        const tx = cx + dx;
        const tz = cz + dz;
        // Find the solid ground at this xz
        const gy = this.world.getSolidHeight(tx, tz);
        const surface = this.world.getBlock(tx, gy, tz);
        if (!isSolid(surface)) continue;
        // Don't stack trees on wood/leaves
        if (surface === BlockType.WOOD || surface === BlockType.LEAVES) continue;
        // Spacing: skip if too close to another tree we just placed
        const key = `${Math.floor(tx / 3)},${Math.floor(tz / 3)}`;
        if (placed.has(key)) continue;
        placed.add(key);

        const changed = placeTree(this.world, tx, gy + 1, tz);
        for (const [bx, by, bz] of changed) {
          this.worldRenderer.markDirty(bx, by, bz);
        }
      }
    }
  }

  private applyMeteor(cx: number, cy: number, cz: number): void {
    const radius = 3 + this.brushSize;
    for (let dx = -radius; dx <= radius; dx++) {
      for (let dy = -radius; dy <= radius; dy++) {
        for (let dz = -radius; dz <= radius; dz++) {
          if (dx * dx + dy * dy + dz * dz <= radius * radius) {
            const x = cx + dx;
            const y = cy + dy;
            const z = cz + dz;
            if (this.world.getBlock(x, y, z) !== BlockType.AIR) {
              this.world.setBlock(x, y, z, BlockType.AIR);
              this.worldRenderer.markDirty(x, y, z);
            }
          }
        }
      }
    }
    // Lava at the bottom
    for (let dx = -2; dx <= 2; dx++) {
      for (let dz = -2; dz <= 2; dz++) {
        if (dx * dx + dz * dz <= 4) {
          const y = cy - radius + 1;
          if (this.world.inBounds(cx + dx, y, cz + dz)) {
            this.world.setBlock(cx + dx, y, cz + dz, BlockType.LAVA);
            this.worldRenderer.markDirty(cx + dx, y, cz + dz);
          }
        }
      }
    }
    // Kill creatures in blast radius
    for (const c of this.simEngine.creatures) {
      const dx = c.x - cx;
      const dy = c.y - cy;
      const dz = c.z - cz;
      if (dx * dx + dy * dy + dz * dz < (radius + 2) * (radius + 2)) {
        c.health = 0;
        c.alive = false;
      }
    }
  }
}
