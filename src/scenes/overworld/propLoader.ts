import * as THREE from "three";
import { FBXLoader } from "three/examples/jsm/loaders/FBXLoader.js";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js";
import { MTLLoader } from "three/examples/jsm/loaders/MTLLoader.js";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { disposeObject3D } from "./resourceDisposal";

export interface PropConfig {
  readonly id: string;
  readonly path: string;
  readonly materialPath?: string;
  readonly position: { readonly x: number; readonly z: number };
  readonly targetHeight: number;
}

export class OverworldPropLoader {
  private readonly props: THREE.Group[] = [];
  private readonly dracoLoader = new DRACOLoader();
  private disposed = false;

  constructor(private readonly scene: THREE.Scene, dracoDecoderPath: string) {
    this.dracoLoader.setDecoderPath(dracoDecoderPath);
  }

  load(configs: readonly PropConfig[]): void {
    for (const config of configs) {
      if (config.path.toLowerCase().endsWith(".obj")) {
        this.loadObj(config);
      } else if (config.path.toLowerCase().endsWith(".glb")) {
        const loader = new GLTFLoader();
        loader.setDRACOLoader(this.dracoLoader);
        loader.load(
          config.path,
          (gltf) => this.addProp(gltf.scene, config, false),
          undefined,
          (error) => console.warn(`[Overworld] GLB 소품 로드 실패: ${config.id}`, error),
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

  private loadObj(config: PropConfig): void {
    const loadGeometry = (materials?: MTLLoader.MaterialCreator): void => {
      const loader = new OBJLoader();
      if (materials) loader.setMaterials(materials);
      loader.load(
        config.path,
        (object) => this.addProp(object, config, !materials),
        undefined,
        (error) => console.warn(`[Overworld] OBJ 소품 로드 실패: ${config.id}`, error),
      );
    };
    if (!config.materialPath) {
      loadGeometry();
      return;
    }
    new MTLLoader().load(
      config.materialPath,
      (materials) => {
        materials.preload();
        loadGeometry(materials);
      },
      undefined,
      (error) => {
        console.warn(`[Overworld] MTL 로드 실패, 임시 재질 사용: ${config.id}`, error);
        loadGeometry();
      },
    );
  }

  dispose(): void {
    this.disposed = true;
    this.dracoLoader.dispose();
    for (const prop of this.props) {
      this.scene.remove(prop);
      disposeObject3D(prop);
      prop.clear();
    }
    this.props.length = 0;
  }

  private addProp(object: THREE.Group, config: PropConfig, useFallbackMaterial: boolean): void {
    if (this.disposed) {
      disposeObject3D(object);
      object.clear();
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
