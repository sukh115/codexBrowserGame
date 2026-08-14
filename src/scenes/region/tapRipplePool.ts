import * as THREE from "three";

interface TapRipple {
  readonly mesh: THREE.Mesh<THREE.RingGeometry, THREE.MeshBasicMaterial>;
  elapsed: number;
  active: boolean;
}

export class TapRipplePool {
  readonly group = new THREE.Group();
  private readonly geometry = new THREE.RingGeometry(0.09, 0.14, 20);
  private readonly ripples: TapRipple[] = [];
  private nextIndex = 0;

  constructor() {
    for (let index = 0; index < 3; index += 1) {
      const material = new THREE.MeshBasicMaterial({
        color: 0x9ff5e5,
        transparent: true,
        depthTest: false,
        opacity: 0,
      });
      const mesh = new THREE.Mesh(this.geometry, material);
      mesh.visible = false;
      this.ripples.push({ mesh, elapsed: 0, active: false });
      this.group.add(mesh);
    }
  }

  play(position: THREE.Vector3): void {
    const ripple = this.ripples[this.nextIndex];
    this.nextIndex = (this.nextIndex + 1) % this.ripples.length;
    ripple.elapsed = 0;
    ripple.active = true;
    ripple.mesh.visible = true;
    ripple.mesh.position.copy(position);
    ripple.mesh.position.z = 0.22;
    ripple.mesh.scale.setScalar(1);
    ripple.mesh.material.opacity = 0.72;
  }

  update(deltaSeconds: number): void {
    for (const ripple of this.ripples) {
      if (!ripple.active) continue;
      ripple.elapsed += deltaSeconds;
      ripple.mesh.scale.setScalar(1 + ripple.elapsed * 5);
      ripple.mesh.material.opacity = Math.max(0, 0.72 * (1 - ripple.elapsed / 0.4));
      if (ripple.elapsed < 0.4) continue;
      ripple.active = false;
      ripple.mesh.visible = false;
    }
  }

  dispose(): void {
    this.geometry.dispose();
    for (const ripple of this.ripples) ripple.mesh.material.dispose();
    this.group.clear();
    this.ripples.length = 0;
  }
}
