import * as THREE from 'three';

export interface CameraSettings {
  scrollAction: 'orbit' | 'pan';       // what bare two-finger scroll does
  invertOrbitX: boolean;
  invertOrbitY: boolean;
  invertPanX: boolean;
  invertPanY: boolean;
  orbitSpeed: number;                   // 0.1 – 5
  panSpeed: number;                     // 0.1 – 5
  zoomSpeed: number;                    // 0.1 – 5
}

export const DEFAULT_SETTINGS: CameraSettings = {
  scrollAction: 'orbit',
  invertOrbitX: false,
  invertOrbitY: false,
  invertPanX: false,
  invertPanY: false,
  orbitSpeed: 1,
  panSpeed: 1,
  zoomSpeed: 1,
};

const STORAGE_KEY = 'worldvox_camera_settings';

function loadSettings(): CameraSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch { /* ignore */ }
  return { ...DEFAULT_SETTINGS };
}

function saveSettings(s: CameraSettings): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
}

export class CameraController {
  settings: CameraSettings;
  onChange?: () => void;

  private camera: THREE.PerspectiveCamera;
  private domElement: HTMLElement;

  private target = new THREE.Vector3(32, 5, 32);
  private spherical = new THREE.Spherical(60, Math.PI * 0.3, Math.PI * 0.25);

  private baseRotateSpeed = 0.003;
  private basePanSpeed = 0.4;
  private baseZoomSpeed = 0.008;

  constructor(camera: THREE.PerspectiveCamera, domElement: HTMLElement) {
    this.camera = camera;
    this.domElement = domElement;
    this.settings = loadSettings();
    this.setupEvents();
    this.updateCamera();
  }

  updateSettings(partial: Partial<CameraSettings>): void {
    Object.assign(this.settings, partial);
    saveSettings(this.settings);
    this.onChange?.();
  }

  private orbit(dx: number, dy: number): void {
    const s = this.baseRotateSpeed * this.settings.orbitSpeed;
    const sx = this.settings.invertOrbitX ? -1 : 1;
    const sy = this.settings.invertOrbitY ? -1 : 1;
    this.spherical.theta += dx * s * sx;
    this.spherical.phi = Math.max(
      0.1,
      Math.min(Math.PI * 0.48, this.spherical.phi + dy * s * sy),
    );
  }

  private pan(dx: number, dy: number): void {
    const forward = new THREE.Vector3();
    this.camera.getWorldDirection(forward);
    forward.y = 0;
    forward.normalize();

    const right = new THREE.Vector3();
    right.crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();

    const s = this.spherical.radius * 0.0015 * this.basePanSpeed * this.settings.panSpeed;
    const sx = this.settings.invertPanX ? -1 : 1;
    const sy = this.settings.invertPanY ? -1 : 1;
    this.target.addScaledVector(right, dx * s * sx);
    this.target.addScaledVector(forward, -dy * s * sy);
  }

  private zoom(delta: number): void {
    this.spherical.radius *= 1 + delta * this.baseZoomSpeed * this.settings.zoomSpeed;
    this.spherical.radius = Math.max(5, Math.min(200, this.spherical.radius));
  }

  private setupEvents(): void {
    // ─── Trackpad / wheel ───
    this.domElement.addEventListener(
      'wheel',
      (e) => {
        e.preventDefault();

        // Pinch-to-zoom (browser sends ctrlKey for trackpad pinch)
        if (e.ctrlKey || e.metaKey) {
          this.zoom(e.deltaY);
          return;
        }

        const primary = this.settings.scrollAction;
        const secondary = primary === 'orbit' ? 'pan' : 'orbit';
        const action = e.shiftKey ? secondary : primary;

        if (action === 'orbit') {
          this.orbit(e.deltaX, e.deltaY);
        } else {
          this.pan(e.deltaX, e.deltaY);
        }
      },
      { passive: false },
    );

    // ─── Mouse fallbacks ───
    let isRightDrag = false;
    let isMiddleDrag = false;
    let lastX = 0;
    let lastY = 0;

    this.domElement.addEventListener('mousedown', (e) => {
      if (e.button === 2) isRightDrag = true;
      if (e.button === 1) isMiddleDrag = true;
      lastX = e.clientX;
      lastY = e.clientY;
    });

    window.addEventListener('mouseup', (e) => {
      if (e.button === 2) isRightDrag = false;
      if (e.button === 1) isMiddleDrag = false;
    });

    window.addEventListener('mousemove', (e) => {
      const dx = e.clientX - lastX;
      const dy = e.clientY - lastY;
      lastX = e.clientX;
      lastY = e.clientY;

      if (isRightDrag) this.orbit(-dx, -dy);
      if (isMiddleDrag) this.pan(-dx, dy);
    });

    this.domElement.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  private updateCamera(): void {
    const offset = new THREE.Vector3().setFromSpherical(this.spherical);
    this.camera.position.copy(this.target).add(offset);
    this.camera.lookAt(this.target);
  }

  update(): void {
    this.updateCamera();
  }
}
