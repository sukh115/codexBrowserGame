import * as THREE from "three";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import { FBXLoader } from "three/examples/jsm/loaders/FBXLoader.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { createPlaceholderCharacter, type PlaceholderCharacterRig } from "./placeholderCharacter";
import { disposeObject3D } from "./resourceDisposal";
import { applyConceptCharacterStyle } from "./characterStyle";

interface CharacterMotion {
  readonly group: THREE.Group;
  setMoving(moving: boolean): void;
  update(deltaSeconds: number): void;
  dispose(): void;
}

export class OverworldCharacterController {
  readonly group = new THREE.Group();
  private motion: CharacterMotion;
  private moving = false;
  private disposed = false;

  constructor(modelPath: string | null, dracoDecoderPath: string) {
    this.motion = new PlaceholderMotion(createPlaceholderCharacter());
    this.group.add(this.motion.group);
    if (modelPath) this.loadModel(modelPath, dracoDecoderPath);
  }

  update(deltaSeconds: number, moving: boolean): void {
    if (moving !== this.moving) {
      this.moving = moving;
      this.motion.setMoving(moving);
    }
    this.motion.update(deltaSeconds);
  }

  dispose(): void {
    this.disposed = true;
    this.group.remove(this.motion.group);
    this.motion.dispose();
    this.group.clear();
  }

  private loadModel(modelPath: string, dracoDecoderPath: string): void {
    if (modelPath.toLowerCase().endsWith(".fbx")) {
      this.loadFbxModel(modelPath);
      return;
    }
    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath(dracoDecoderPath);
    const loader = new GLTFLoader();
    loader.setDRACOLoader(dracoLoader);
    loader.load(
      modelPath,
      (gltf) => {
        dracoLoader.dispose();
        const loadedMotion = new GltfMotion(gltf.scene, gltf.animations);
        if (this.disposed) {
          loadedMotion.dispose();
          return;
        }
        this.group.remove(this.motion.group);
        this.motion.dispose();
        this.motion = loadedMotion;
        this.motion.setMoving(this.moving);
        this.group.add(this.motion.group);
        console.info(`[Character] GLB 로드 완료: ${modelPath}`);
      },
      undefined,
      (error) => {
        dracoLoader.dispose();
        if (!this.disposed) console.warn(`[Character] GLB 로드 실패, 플레이스홀더 유지: ${modelPath}`, error);
      },
    );
  }

  private loadFbxModel(modelPath: string): void {
    new FBXLoader().load(
      modelPath,
      (object) => {
        const loadedMotion = new FbxMotion(object, object.animations);
        if (this.disposed) {
          loadedMotion.dispose();
          return;
        }
        this.group.remove(this.motion.group);
        this.motion.dispose();
        this.motion = loadedMotion;
        this.motion.setMoving(this.moving);
        this.group.add(this.motion.group);
        console.info(`[Character] FBX 로드 완료: ${modelPath}`);
      },
      undefined,
      (error) => {
        if (!this.disposed) console.warn(`[Character] FBX 로드 실패, 플레이스홀더 유지: ${modelPath}`, error);
      },
    );
  }
}

class FbxMotion implements CharacterMotion {
  readonly group: THREE.Group;
  private readonly mixer: THREE.AnimationMixer;
  private readonly idleAction: THREE.AnimationAction | null;
  private readonly walkAction: THREE.AnimationAction | null;
  private activeAction: THREE.AnimationAction | null = null;
  private moving = false;
  private time = 0;
  private baseY = 0;

  constructor(group: THREE.Group, clips: readonly THREE.AnimationClip[]) {
    this.group = group;
    this.normalizeModel();
    this.applyFallbackMaterials();
    this.mixer = new THREE.AnimationMixer(group);
    this.idleAction = this.createAction(clips, ["idle"]);
    this.walkAction = this.createAction(clips, ["walk", "walking"]);
    this.activeAction = this.idleAction ?? this.walkAction;
    this.activeAction?.play();
    console.info(`[Character] FBX 애니메이션 클립: idle=${this.idleAction !== null}, walk=${this.walkAction !== null}`);
  }

  setMoving(moving: boolean): void {
    this.moving = moving;
    const nextAction = moving ? this.walkAction : this.idleAction;
    if (!nextAction || nextAction === this.activeAction) return;
    nextAction.reset().play();
    if (this.activeAction) this.activeAction.crossFadeTo(nextAction, 0.25, false);
    this.activeAction = nextAction;
  }

  update(deltaSeconds: number): void {
    this.mixer.update(deltaSeconds);
    if (this.activeAction) return;
    this.time += deltaSeconds * (this.moving ? 9 : 1.8);
    this.group.position.y = this.baseY + (this.moving
      ? Math.abs(Math.sin(this.time)) * 0.1
      : Math.max(0, Math.sin(this.time) * 0.018));
    this.group.rotation.z = this.moving ? Math.sin(this.time * 0.5) * 0.035 : 0;
  }

  dispose(): void {
    this.mixer.stopAllAction();
    this.mixer.uncacheRoot(this.group);
    disposeObject3D(this.group);
    this.group.clear();
  }

  private createAction(clips: readonly THREE.AnimationClip[], names: readonly string[]): THREE.AnimationAction | null {
    const clip = clips.find((candidate) => names.includes(candidate.name.toLowerCase()));
    return clip ? this.mixer.clipAction(clip) : null;
  }

  private normalizeModel(): void {
    const box = new THREE.Box3().setFromObject(this.group);
    const size = new THREE.Vector3();
    box.getSize(size);
    if (size.y > 0) this.group.scale.setScalar(2.2 / size.y);
    box.setFromObject(this.group);
    this.group.position.y = -box.min.y;
    this.baseY = this.group.position.y;
    this.group.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      object.castShadow = false;
      object.receiveShadow = false;
    });
  }

  private applyFallbackMaterials(): void {
    const colors: Readonly<Record<string, number>> = {
      hand_low: 0xe0aa8d,
      head_low: 0xe0aa8d,
      HP_low: 0x30233f,
      top_low: 0x68417d,
      bottom_low: 0x29263d,
      Box_low: 0x8f6557,
    };
    this.group.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      for (const material of materials) material.dispose();
      object.material = new THREE.MeshStandardMaterial({
        color: colors[object.name] ?? 0x67536f,
        roughness: 0.88,
        metalness: 0,
      });
    });
  }
}

class GltfMotion implements CharacterMotion {
  readonly group: THREE.Group;
  private readonly mixer: THREE.AnimationMixer;
  private readonly idleAction: THREE.AnimationAction | null;
  private readonly walkAction: THREE.AnimationAction | null;
  private activeAction: THREE.AnimationAction | null = null;
  private moving = false;

  constructor(group: THREE.Group, clips: readonly THREE.AnimationClip[]) {
    this.group = group;
    this.normalizeModel();
    applyConceptCharacterStyle(this.group);
    this.mixer = new THREE.AnimationMixer(group);
    this.idleAction = this.createAction(clips, ["idle"]);
    this.walkAction = this.createAction(clips, ["walk", "walking"]);
    this.activeAction = this.idleAction ?? this.walkAction;
    this.activeAction?.play();
    console.info(`[Character] 애니메이션 클립: idle=${this.idleAction !== null}, walk=${this.walkAction !== null}`);
  }

  setMoving(moving: boolean): void {
    if (this.moving === moving && this.activeAction) return;
    this.moving = moving;
    const nextAction = moving ? this.walkAction : this.idleAction;
    if (!nextAction || nextAction === this.activeAction) return;
    nextAction.reset().play();
    if (this.activeAction) this.activeAction.crossFadeTo(nextAction, 0.25, false);
    this.activeAction = nextAction;
  }

  update(deltaSeconds: number): void {
    this.mixer.update(deltaSeconds);
  }

  dispose(): void {
    this.mixer.stopAllAction();
    this.mixer.uncacheRoot(this.group);
    disposeObject3D(this.group);
    this.group.clear();
  }

  private createAction(clips: readonly THREE.AnimationClip[], names: readonly string[]): THREE.AnimationAction | null {
    const clip = clips.find((candidate) => names.includes(candidate.name.toLowerCase()));
    return clip ? this.mixer.clipAction(clip) : null;
  }

  private normalizeModel(): void {
    const box = new THREE.Box3().setFromObject(this.group);
    const size = new THREE.Vector3();
    box.getSize(size);
    if (size.y > 0) this.group.scale.setScalar(2.2 / size.y);
    box.setFromObject(this.group);
    this.group.position.y = -box.min.y;
    this.group.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      object.castShadow = false;
      object.receiveShadow = false;
    });
  }
}

class PlaceholderMotion implements CharacterMotion {
  readonly group: THREE.Group;
  private time = 0;
  private moving = false;

  constructor(private readonly rig: PlaceholderCharacterRig) {
    this.group = rig.group;
  }

  setMoving(moving: boolean): void {
    this.moving = moving;
    if (!moving) this.rig.torso.scale.y = 1;
  }

  update(deltaSeconds: number): void {
    this.time += deltaSeconds * (this.moving ? 10 : 1.8);
    if (this.moving) {
      const stride = Math.sin(this.time) * 0.72;
      const counterStride = Math.sin(this.time + Math.PI) * 0.62;
      this.group.position.y = Math.abs(Math.sin(this.time)) * 0.12;
      this.rig.leftArm.rotation.x = stride;
      this.rig.rightArm.rotation.x = -stride;
      this.rig.leftLeg.rotation.x = counterStride;
      this.rig.rightLeg.rotation.x = -counterStride;
      this.rig.torso.rotation.z = Math.sin(this.time * 0.5) * 0.055;
      this.rig.head.rotation.z = -this.rig.torso.rotation.z * 0.7;
      this.rig.head.rotation.y = Math.sin(this.time * 0.5) * 0.06;
      return;
    }
    const breath = Math.sin(this.time) * 0.018;
    this.group.position.y = Math.max(0, breath);
    this.rig.torso.scale.y = 1 + breath * 0.45;
    this.rig.head.position.y = 1.78 + breath * 0.35;
    this.rig.head.rotation.y = Math.sin(this.time * 0.42) * 0.035;
    this.rig.leftArm.rotation.x *= 0.88;
    this.rig.rightArm.rotation.x *= 0.88;
    this.rig.leftLeg.rotation.x *= 0.82;
    this.rig.rightLeg.rotation.x *= 0.82;
    this.rig.torso.rotation.z *= 0.88;
    this.rig.head.rotation.z *= 0.88;
  }

  dispose(): void {
    disposeObject3D(this.group);
    this.group.clear();
  }
}
