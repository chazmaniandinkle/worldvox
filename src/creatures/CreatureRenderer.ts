import * as THREE from 'three';
import { Creature } from './Creature';

export class CreatureRenderer {
  private scene: THREE.Scene;
  private meshes = new Map<Creature, THREE.Group>();
  private selectionRing: THREE.Mesh | null = null;
  selected: Creature | null = null;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  /** Returns the creature whose mesh group was hit, or null. */
  pickCreature(raycaster: THREE.Raycaster): Creature | null {
    // Collect all child meshes and map them back to creatures
    const targets: THREE.Object3D[] = [];
    const meshToCreature = new Map<THREE.Object3D, Creature>();
    for (const [creature, group] of this.meshes) {
      group.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          targets.push(child);
          meshToCreature.set(child, creature);
        }
      });
    }
    const hits = raycaster.intersectObjects(targets);
    if (hits.length > 0) {
      return meshToCreature.get(hits[0].object) ?? null;
    }
    return null;
  }

  update(creatures: Creature[]): void {
    const alive = new Set(creatures);

    // Remove meshes for dead/removed creatures
    for (const [creature, group] of this.meshes) {
      if (!alive.has(creature)) {
        this.scene.remove(group);
        group.traverse((o) => {
          if (o instanceof THREE.Mesh) {
            o.geometry.dispose();
            (o.material as THREE.Material).dispose();
          }
        });
        this.meshes.delete(creature);
      }
    }

    // Add/update meshes
    for (const creature of creatures) {
      let group = this.meshes.get(creature);
      if (!group) {
        group = this.createCreatureMesh(creature);
        this.scene.add(group);
        this.meshes.set(creature, group);
      }
      group.position.set(creature.x, creature.y, creature.z);

      // Smooth rotation toward facing direction
      let current = group.rotation.y;
      let target = creature.facing;
      // Shortest angle delta
      let delta = target - current;
      while (delta > Math.PI) delta -= Math.PI * 2;
      while (delta < -Math.PI) delta += Math.PI * 2;
      group.rotation.y = current + delta * 0.2; // lerp factor
    }

    // Selection ring
    if (this.selected && this.selected.alive) {
      if (!this.selectionRing) {
        const geo = new THREE.RingGeometry(0.4, 0.55, 24);
        geo.rotateX(-Math.PI / 2);
        const mat = new THREE.MeshBasicMaterial({
          color: 0xffdd44,
          transparent: true,
          opacity: 0.7,
          side: THREE.DoubleSide,
        });
        this.selectionRing = new THREE.Mesh(geo, mat);
        this.scene.add(this.selectionRing);
      }
      const s = this.selected.template.size;
      this.selectionRing.scale.setScalar(s);
      this.selectionRing.position.set(this.selected.x, this.selected.y + 0.02, this.selected.z);
      this.selectionRing.visible = true;
    } else {
      if (this.selectionRing) this.selectionRing.visible = false;
      if (this.selected && !this.selected.alive) this.selected = null;
    }
  }

  private createCreatureMesh(creature: Creature): THREE.Group {
    const group = new THREE.Group();
    const color = new THREE.Color(creature.template.color);
    const s = creature.template.size;

    // Body
    const bodyGeo = new THREE.BoxGeometry(s * 0.6, s * 0.5, s * 0.8);
    const bodyMat = new THREE.MeshLambertMaterial({ color });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = s * 0.25;
    group.add(body);

    // Head
    const headGeo = new THREE.BoxGeometry(s * 0.4, s * 0.35, s * 0.4);
    const headMat = new THREE.MeshLambertMaterial({ color });
    const head = new THREE.Mesh(headGeo, headMat);
    head.position.set(0, s * 0.55, s * 0.35);
    group.add(head);

    // Eyes
    const eyeGeo = new THREE.BoxGeometry(s * 0.08, s * 0.08, s * 0.04);
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0x111111 });
    const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
    leftEye.position.set(-s * 0.1, s * 0.6, s * 0.56);
    group.add(leftEye);
    const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
    rightEye.position.set(s * 0.1, s * 0.6, s * 0.56);
    group.add(rightEye);

    return group;
  }
}
