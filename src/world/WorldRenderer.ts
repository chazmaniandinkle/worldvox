import * as THREE from 'three';
import { World, MAX_WATER_LEVEL } from './World';
import { BlockType, BLOCK_COLORS, isTransparent } from './BlockTypes';

const CHUNK_SIZE = 16;

interface FaceDef {
  dir: [number, number, number];
  vertices: [number, number, number][];
}

const FACES: FaceDef[] = [
  { dir: [1, 0, 0], vertices: [[1, 0, 1], [1, 0, 0], [1, 1, 0], [1, 1, 1]] },
  { dir: [-1, 0, 0], vertices: [[0, 0, 0], [0, 0, 1], [0, 1, 1], [0, 1, 0]] },
  { dir: [0, 1, 0], vertices: [[0, 1, 1], [1, 1, 1], [1, 1, 0], [0, 1, 0]] },
  { dir: [0, -1, 0], vertices: [[0, 0, 0], [1, 0, 0], [1, 0, 1], [0, 0, 1]] },
  { dir: [0, 0, 1], vertices: [[0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1]] },
  { dir: [0, 0, -1], vertices: [[1, 0, 0], [0, 0, 0], [0, 1, 0], [1, 1, 0]] },
];

export class WorldRenderer {
  private scene: THREE.Scene;
  private world: World;
  private opaqueChunks = new Map<string, THREE.Mesh>();
  private waterChunks = new Map<string, THREE.Mesh>();
  private dirtyChunks = new Set<string>();
  private opaqueMaterial: THREE.MeshLambertMaterial;
  private waterMaterial: THREE.MeshLambertMaterial;

  constructor(scene: THREE.Scene, world: World) {
    this.scene = scene;
    this.world = world;
    this.opaqueMaterial = new THREE.MeshLambertMaterial({ vertexColors: true });
    this.waterMaterial = new THREE.MeshLambertMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.55,
      side: THREE.DoubleSide,
    });
    this.buildAll();
  }

  markDirty(bx: number, by: number, bz: number): void {
    const cx = Math.floor(bx / CHUNK_SIZE);
    const cy = Math.floor(by / CHUNK_SIZE);
    const cz = Math.floor(bz / CHUNK_SIZE);
    this.dirtyChunks.add(`${cx},${cy},${cz}`);
    // Mark neighbors if block is on chunk boundary
    if (bx % CHUNK_SIZE === 0 && cx > 0) this.dirtyChunks.add(`${cx - 1},${cy},${cz}`);
    if (bx % CHUNK_SIZE === CHUNK_SIZE - 1) this.dirtyChunks.add(`${cx + 1},${cy},${cz}`);
    if (by % CHUNK_SIZE === 0 && cy > 0) this.dirtyChunks.add(`${cx},${cy - 1},${cz}`);
    if (by % CHUNK_SIZE === CHUNK_SIZE - 1) this.dirtyChunks.add(`${cx},${cy + 1},${cz}`);
    if (bz % CHUNK_SIZE === 0 && cz > 0) this.dirtyChunks.add(`${cx},${cy},${cz - 1}`);
    if (bz % CHUNK_SIZE === CHUNK_SIZE - 1) this.dirtyChunks.add(`${cx},${cy},${cz + 1}`);
  }

  update(): void {
    for (const key of this.dirtyChunks) {
      this.rebuildChunk(key);
    }
    this.dirtyChunks.clear();
  }

  /** Collect all opaque chunk meshes (used for raycasting). */
  getChunkMeshes(): THREE.Mesh[] {
    return [...this.opaqueChunks.values(), ...this.waterChunks.values()];
  }

  private buildAll(): void {
    const cxMax = Math.ceil(this.world.width / CHUNK_SIZE);
    const cyMax = Math.ceil(this.world.height / CHUNK_SIZE);
    const czMax = Math.ceil(this.world.depth / CHUNK_SIZE);
    for (let cx = 0; cx < cxMax; cx++) {
      for (let cy = 0; cy < cyMax; cy++) {
        for (let cz = 0; cz < czMax; cz++) {
          this.rebuildChunk(`${cx},${cy},${cz}`);
        }
      }
    }
  }

  private rebuildChunk(key: string): void {
    const [cx, cy, cz] = key.split(',').map(Number);
    this.removeMesh(this.opaqueChunks, key);
    this.removeMesh(this.waterChunks, key);

    const opaquePos: number[] = [];
    const opaqueNorm: number[] = [];
    const opaqueCol: number[] = [];
    const opaqueIdx: number[] = [];

    const waterPos: number[] = [];
    const waterNorm: number[] = [];
    const waterCol: number[] = [];
    const waterIdx: number[] = [];

    const sx = cx * CHUNK_SIZE;
    const sy = cy * CHUNK_SIZE;
    const sz = cz * CHUNK_SIZE;

    for (let lx = 0; lx < CHUNK_SIZE; lx++) {
      for (let ly = 0; ly < CHUNK_SIZE; ly++) {
        for (let lz = 0; lz < CHUNK_SIZE; lz++) {
          const wx = sx + lx;
          const wy = sy + ly;
          const wz = sz + lz;

          if (!this.world.inBounds(wx, wy, wz)) continue;

          const block = this.world.getBlock(wx, wy, wz);
          if (block === BlockType.AIR) continue;

          const isWater = block === BlockType.WATER;
          const color = BLOCK_COLORS[block] ?? [1, 0, 1];
          const wHeight = isWater
            ? this.world.getWaterLevel(wx, wy, wz) / MAX_WATER_LEVEL
            : 1;

          const pos = isWater ? waterPos : opaquePos;
          const norm = isWater ? waterNorm : opaqueNorm;
          const col = isWater ? waterCol : opaqueCol;
          const idx = isWater ? waterIdx : opaqueIdx;

          for (const face of FACES) {
            const nx = wx + face.dir[0];
            const ny = wy + face.dir[1];
            const nz = wz + face.dir[2];
            const neighbor = this.world.getBlock(nx, ny, nz);

            if (isWater) {
              // Show face if neighbor is air, or if neighbor is water with a different level (top face only)
              if (neighbor === BlockType.AIR) {
                // show
              } else if (neighbor === BlockType.WATER && face.dir[1] === 1) {
                // Show top face if above water has lower level or is air
                continue; // top face of water covered by water above — skip
              } else {
                continue;
              }
            } else {
              if (!isTransparent(neighbor)) continue;
            }

            const vi = pos.length / 3;
            for (const v of face.vertices) {
              // Scale top vertices of water blocks by water level
              const vy = (isWater && v[1] === 1) ? wHeight : v[1];
              pos.push(wx + v[0], wy + vy, wz + v[2]);
              norm.push(face.dir[0], face.dir[1], face.dir[2]);
              col.push(color[0], color[1], color[2]);
            }
            idx.push(vi, vi + 1, vi + 2, vi, vi + 2, vi + 3);
          }
        }
      }
    }

    if (opaquePos.length > 0) {
      const mesh = this.buildMesh(opaquePos, opaqueNorm, opaqueCol, opaqueIdx, this.opaqueMaterial);
      this.scene.add(mesh);
      this.opaqueChunks.set(key, mesh);
    }

    if (waterPos.length > 0) {
      const mesh = this.buildMesh(waterPos, waterNorm, waterCol, waterIdx, this.waterMaterial);
      mesh.renderOrder = 1;
      this.scene.add(mesh);
      this.waterChunks.set(key, mesh);
    }
  }

  private buildMesh(
    pos: number[],
    norm: number[],
    col: number[],
    idx: number[],
    material: THREE.Material,
  ): THREE.Mesh {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('normal', new THREE.Float32BufferAttribute(norm, 3));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    geo.setIndex(idx);
    return new THREE.Mesh(geo, material);
  }

  private removeMesh(map: Map<string, THREE.Mesh>, key: string): void {
    const old = map.get(key);
    if (old) {
      this.scene.remove(old);
      old.geometry.dispose();
      map.delete(key);
    }
  }
}
