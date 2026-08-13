import * as THREE from "three";
import { FBXLoader } from "three/examples/jsm/loaders/FBXLoader.js";

export interface PropConfig {
  readonly id: string;
  readonly path: string;
  readonly position: { readonly x: number; readonly z: number };
  readonly targetHeight: number;
}

export class OverworldPropLoader {
  private readonly props: THREE.Group[] = [];
  private disposed = false;

  constructor(private readonly scene: THREE.Scene) {}

  load(configs: readonly PropConfig[]): void {
    const loader = new FBXLoader();
    for (const config of configs) {
      loader.load(
        config.path,
        (object) => this.addProp(object, config),
        undefined,
        (error) => console.warn(`[Overworld] 소품 로드 실패: ${config.id}`, error),
      );
    }
  }

  dispose(): void {
    this.disposed = true;
    for (const prop of this.props) {
      this.scene.remove(prop);
      prop.traverse((object) => {
        if (!(object instanceof THREE.Mesh)) return;
        object.geometry.dispose();
        const materials = Array.isArray(object.material) ? object.material : [object.material];
        for (const material of materials) {
          if (material instanceof THREE.MeshStandardMaterial) {
            material.map?.dispose();
            material.normalMap?.dispose();
          }
          material.dispose();
        }
      });
    }
    this.props.length = 0;
  }

  private addProp(object: THREE.Group, config: PropConfig): void {
    if (this.disposed) {
      object.traverse((child) => {
        if (child instanceof THREE.Mesh) child.geometry.dispose();
      });
      return;
    }
    const box = new THREE.Box3().setFromObject(object);
    const size = new THREE.Vector3();
    box.getSize(size);
    if (size.y > 0) object.scale.setScalar(config.targetHeight / size.y);
    box.setFromObject(object);
    object.position.set(config.position.x, -box.min.y, config.position.z);
    object.traverse((child) => {
      if (!(child instanceof THREE.Mesh)) return;
      child.castShadow = false;
      child.receiveShadow = false;
    });
    this.props.push(object);
    this.scene.add(object);
  }
}
