import * as THREE from "three";
import { FBXLoader } from "three/examples/jsm/loaders/FBXLoader.js";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js";

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
    for (const config of configs) {
      if (config.path.toLowerCase().endsWith(".obj")) {
        new OBJLoader().load(
          config.path,
          (object) => this.addProp(object, config, true),
          undefined,
          (error) => console.warn(`[Overworld] OBJ 소품 로드 실패: ${config.id}`, error),
        );
      } else {
        new FBXLoader().load(
          config.path,
          (object) => this.addProp(object, config, false),
          undefined,
          (error) => console.warn(`[Overworld] FBX 소품 로드 실패: ${config.id}`, error),
        );
      }
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

  private addProp(object: THREE.Group, config: PropConfig, useFallbackMaterial: boolean): void {
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
      if (useFallbackMaterial) {
        const materials = Array.isArray(child.material) ? child.material : [child.material];
        for (const material of materials) material.dispose();
        child.material = new THREE.MeshStandardMaterial({ color: 0x78b58b, roughness: 0.92 });
      }
      child.castShadow = false;
      child.receiveShadow = false;
    });
    this.props.push(object);
    this.scene.add(object);
  }
}
