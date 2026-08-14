import * as THREE from "three";
import type { GameScene } from "../../core/engine";
import { GAME_EVENTS, WORLD } from "../../core/constants";
import { PointerInput, type TapDetail } from "../../core/input";
import { ASSET_MANIFEST, type RegionId } from "../../core/assetManifest";
import { gsap } from "gsap";
import { createPlaceholderCharacter } from "./placeholderCharacter";
import { OverworldPropLoader } from "./propLoader";

export class OverworldScene implements GameScene {
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera(42, 1, 0.1, 120);
  private readonly input: PointerInput;
  private readonly raycaster = new THREE.Raycaster();
  private readonly pointer = new THREE.Vector2();
  private readonly destination = new THREE.Vector3();
  private readonly direction = new THREE.Vector3();
  private readonly cameraTarget = new THREE.Vector3();
  private readonly cameraOffset = new THREE.Vector3(15, 18, 15);
  private readonly baseCameraOffset = new THREE.Vector3(15, 18, 15);
  private readonly ground: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshStandardMaterial>;
  private readonly characterRig = createPlaceholderCharacter();
  private readonly character = this.characterRig.group;
  private readonly marker: THREE.Mesh<THREE.RingGeometry, THREE.MeshBasicMaterial>;
  private readonly entrance = new THREE.Group();
  private readonly entranceWaves: Array<THREE.Mesh<THREE.RingGeometry, THREE.MeshBasicMaterial>> = [];
  private readonly secondEntrance = new THREE.Group();
  private readonly secondEntranceWaves: Array<THREE.Mesh<THREE.RingGeometry, THREE.MeshBasicMaterial>> = [];
  private readonly footsteps: Array<THREE.Mesh<THREE.RingGeometry, THREE.MeshBasicMaterial>> = [];
  private readonly entrancePosition = new THREE.Vector3(
    ASSET_MANIFEST.overworldEntrance.position.x,
    0,
    ASSET_MANIFEST.overworldEntrance.position.z,
  );
  private readonly secondEntrancePosition = new THREE.Vector3(-11, 0, 8);
  private readonly activeEntrancePosition = new THREE.Vector3();
  private activeRegionId: RegionId = "music-shop";
  private readonly enterButton = document.createElement("button");
  private moving = false;
  private walkTime = 0;
  private entering = false;
  private footstepIndex = 0;
  private footstepDistance = 0;
  private readonly previousCharacterPosition = new THREE.Vector3();
  private readonly propLoader = new OverworldPropLoader(this.scene);

  constructor(
    private readonly canvas: HTMLCanvasElement,
    overlayRoot: HTMLElement,
    private readonly onEnterRegion: (regionId: RegionId) => void,
    private readonly spawnAtRegion: RegionId | null = null,
    private readonly onRegionProximityChange: (proximity: number) => void = () => {},
  ) {
    this.input = new PointerInput(canvas);
    this.input.addEventListener(GAME_EVENTS.POINT, this.onPoint as EventListener);

    const paperTexture = this.createPaperTexture();
    this.ground = new THREE.Mesh(
      new THREE.PlaneGeometry(WORLD.SIZE, WORLD.SIZE),
      new THREE.MeshStandardMaterial({ map: paperTexture, roughness: 1 }),
    );
    this.ground.rotation.x = -Math.PI / 2;

    this.marker = new THREE.Mesh(
      new THREE.RingGeometry(0.28, 0.38, 32),
      new THREE.MeshBasicMaterial({ color: 0xf08a5d, transparent: true, opacity: 0 }),
    );
    this.marker.rotation.x = -Math.PI / 2;
    this.marker.position.y = 0.025;

    this.enterButton.className = "context-button";
    this.enterButton.textContent = "음악이 들리는 곳으로 들어가기";
    this.enterButton.hidden = true;
    this.enterButton.addEventListener("pointerup", this.startEntrance);
    overlayRoot.append(this.enterButton);
  }

  init(): void {
    this.scene.background = new THREE.Color(0xffffff);
    this.scene.add(new THREE.HemisphereLight(0xffffff, 0xb9ae98, 2.3));
    const sun = new THREE.DirectionalLight(0xffffff, 2.2);
    sun.position.set(8, 15, 6);
    this.scene.add(sun, this.ground, this.marker);
    this.createCharacter();
    if (this.spawnAtRegion) {
      this.character.position.copy(
        this.spawnAtRegion === "neon-forest" ? this.secondEntrancePosition : this.entrancePosition,
      );
      this.character.position.z += 2.7;
    }
    this.createBoundary();
    this.createEntrance();
    this.createSecondEntrance();
    this.createFootsteps();
    this.propLoader.load(ASSET_MANIFEST.overworldProps);
    this.destination.copy(this.character.position);
    this.camera.position.copy(this.cameraOffset);
    this.camera.lookAt(this.character.position);
  }

  update(deltaSeconds: number): void {
    if (this.moving) {
      this.direction.subVectors(this.destination, this.character.position);
      const distance = this.direction.length();
      if (distance <= WORLD.ARRIVAL_RADIUS) {
        this.character.position.copy(this.destination);
        this.character.position.y = 0;
        this.moving = false;
        this.resetWalkPose();
      } else {
        this.previousCharacterPosition.copy(this.character.position);
        this.direction.normalize();
        this.character.position.addScaledVector(this.direction, Math.min(WORLD.MOVE_SPEED * deltaSeconds, distance));
        this.footstepDistance += this.previousCharacterPosition.distanceTo(this.character.position);
        if (this.footstepDistance >= 0.72) {
          this.footstepDistance = 0;
          this.placeFootstep();
        }
        this.character.rotation.y = Math.atan2(this.direction.x, this.direction.z);
        this.walkTime += deltaSeconds * 10;
        this.character.position.y = Math.abs(Math.sin(this.walkTime)) * 0.12;
        this.updateWalkPose();
      }
    } else {
      this.walkTime += deltaSeconds * 1.8;
      this.updateIdlePose();
    }

    this.marker.material.opacity = Math.max(0, this.marker.material.opacity - deltaSeconds * 1.5);
    for (const footstep of this.footsteps) {
      footstep.material.opacity = Math.max(0, footstep.material.opacity - deltaSeconds * 0.8);
      footstep.scale.multiplyScalar(1 + deltaSeconds * 0.35);
    }
    this.entrance.rotation.y += deltaSeconds * 0.45;
    this.secondEntrance.rotation.y -= deltaSeconds * 0.38;
    for (let index = 0; index < this.entranceWaves.length; index += 1) {
      const wave = this.entranceWaves[index];
      const phase = (this.walkTime * 0.35 + index / this.entranceWaves.length) % 1;
      wave.scale.setScalar(0.7 + phase * 1.45);
      wave.material.opacity = (1 - phase) * 0.42;
    }
    for (let index = 0; index < this.secondEntranceWaves.length; index += 1) {
      const wave = this.secondEntranceWaves[index];
      const phase = (this.walkTime * 0.3 + index / this.secondEntranceWaves.length) % 1;
      wave.scale.setScalar(0.7 + phase * 1.45);
      wave.material.opacity = (1 - phase) * 0.42;
    }
    const firstDistanceSquared = this.character.position.distanceToSquared(this.entrancePosition);
    const secondDistanceSquared = this.character.position.distanceToSquared(this.secondEntrancePosition);
    const useSecondEntrance = secondDistanceSquared < firstDistanceSquared;
    this.activeEntrancePosition.copy(useSecondEntrance ? this.secondEntrancePosition : this.entrancePosition);
    this.activeRegionId = useSecondEntrance ? "neon-forest" : "music-shop";
    const nearestDistanceSquared = Math.min(firstDistanceSquared, secondDistanceSquared);
    const nearEntrance = nearestDistanceSquared <= ASSET_MANIFEST.overworldEntrance.activationRadius ** 2;
    this.enterButton.hidden = !nearEntrance || this.entering;
    this.enterButton.textContent = this.activeRegionId === "neon-forest" ? "버려진 온실로 들어가기" : "악기점으로 들어가기";
    const distanceToEntrance = Math.sqrt(nearestDistanceSquared);
    const linearProximity = THREE.MathUtils.clamp(
      1 - distanceToEntrance / ASSET_MANIFEST.overworldEntrance.audioRadius,
      0,
      1,
    );
    // 가장자리에서 볼륨이 갑자기 튀지 않도록 부드러운 감쇠 곡선을 쓴다.
    this.onRegionProximityChange(linearProximity * linearProximity * (3 - 2 * linearProximity));

    if (this.entering) return;
    // 캐릭터의 보행 바운스는 연출용이며 카메라 추적 높이에는 반영하지 않는다.
    this.cameraTarget.set(this.character.position.x, 0, this.character.position.z).add(this.cameraOffset);
    this.camera.position.lerp(this.cameraTarget, 1 - Math.pow(0.001, deltaSeconds));
    this.cameraTarget.set(this.character.position.x, 0.7, this.character.position.z);
    this.camera.lookAt(this.cameraTarget);
  }

  resize(width: number, height: number): void {
    this.camera.aspect = width / height;
    const portraitScale = THREE.MathUtils.clamp(1 / this.camera.aspect, 1, 1.65);
    this.cameraOffset.copy(this.baseCameraOffset).multiplyScalar(portraitScale);
    this.camera.updateProjectionMatrix();
  }

  dispose(): void {
    this.onRegionProximityChange(0);
    this.input.removeEventListener(GAME_EVENTS.POINT, this.onPoint as EventListener);
    this.input.dispose();
    this.propLoader.dispose();
    this.enterButton.removeEventListener("pointerup", this.startEntrance);
    this.enterButton.remove();
    this.scene.traverse((object) => {
      if (!(object instanceof THREE.Mesh) && !(object instanceof THREE.Line)) return;
      object.geometry.dispose();
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      for (const material of materials) {
        if (material instanceof THREE.MeshStandardMaterial) material.map?.dispose();
        material.dispose();
      }
    });
    this.scene.clear();
  }

  private readonly onPoint = (event: CustomEvent<TapDetail>): void => {
    const bounds = this.canvas.getBoundingClientRect();
    this.pointer.set(
      ((event.detail.clientX - bounds.left) / bounds.width) * 2 - 1,
      -((event.detail.clientY - bounds.top) / bounds.height) * 2 + 1,
    );
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const hit = this.raycaster.intersectObject(this.ground, false)[0];
    if (!hit) return;
    this.destination.set(
      THREE.MathUtils.clamp(hit.point.x, -WORLD.HALF_SIZE + 0.5, WORLD.HALF_SIZE - 0.5),
      0,
      THREE.MathUtils.clamp(hit.point.z, -WORLD.HALF_SIZE + 0.5, WORLD.HALF_SIZE - 0.5),
    );
    this.marker.position.set(this.destination.x, 0.025, this.destination.z);
    this.marker.material.opacity = 1;
    this.moving = true;
  };

  private createCharacter(): void {
    this.scene.add(this.character);
  }

  private updateWalkPose(): void {
    const stride = Math.sin(this.walkTime) * 0.72;
    const counterStride = Math.sin(this.walkTime + Math.PI) * 0.62;
    this.characterRig.leftArm.rotation.x = stride;
    this.characterRig.rightArm.rotation.x = -stride;
    this.characterRig.leftLeg.rotation.x = counterStride;
    this.characterRig.rightLeg.rotation.x = -counterStride;
    this.characterRig.torso.rotation.z = Math.sin(this.walkTime * 0.5) * 0.055;
    this.characterRig.head.rotation.z = -this.characterRig.torso.rotation.z * 0.7;
    this.characterRig.head.rotation.y = Math.sin(this.walkTime * 0.5) * 0.06;
  }

  private updateIdlePose(): void {
    const breath = Math.sin(this.walkTime) * 0.018;
    this.character.position.y = Math.max(0, breath);
    this.characterRig.torso.scale.y = 1 + breath * 0.45;
    this.characterRig.head.position.y = 1.78 + breath * 0.35;
    this.characterRig.head.rotation.y = Math.sin(this.walkTime * 0.42) * 0.035;
    this.characterRig.leftArm.rotation.x *= 0.88;
    this.characterRig.rightArm.rotation.x *= 0.88;
    this.characterRig.leftLeg.rotation.x *= 0.82;
    this.characterRig.rightLeg.rotation.x *= 0.82;
    this.characterRig.torso.rotation.z *= 0.88;
    this.characterRig.head.rotation.z *= 0.88;
  }

  private resetWalkPose(): void {
    this.characterRig.torso.scale.y = 1;
  }

  private createBoundary(): void {
    const points = [
      new THREE.Vector3(-WORLD.HALF_SIZE, 0.035, -WORLD.HALF_SIZE),
      new THREE.Vector3(WORLD.HALF_SIZE, 0.035, -WORLD.HALF_SIZE),
      new THREE.Vector3(WORLD.HALF_SIZE, 0.035, WORLD.HALF_SIZE),
      new THREE.Vector3(-WORLD.HALF_SIZE, 0.035, WORLD.HALF_SIZE),
      new THREE.Vector3(-WORLD.HALF_SIZE, 0.035, -WORLD.HALF_SIZE),
    ];
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    this.scene.add(new THREE.Line(geometry, new THREE.LineBasicMaterial({ color: 0xe9a37e })));
  }

  private createEntrance(): void {
    this.createPortal(this.entrance, this.entranceWaves, this.entrancePosition, 0xf08a5d, 0x67e8d2);
  }

  private createSecondEntrance(): void {
    this.createPortal(this.secondEntrance, this.secondEntranceWaves, this.secondEntrancePosition, 0x718b61, 0xc5a96b);
  }

  private createPortal(
    group: THREE.Group,
    waves: Array<THREE.Mesh<THREE.RingGeometry, THREE.MeshBasicMaterial>>,
    position: THREE.Vector3,
    primaryColor: number,
    accentColor: number,
  ): void {
    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(1.1, 1.1, 0.12, 32),
      new THREE.MeshStandardMaterial({ color: primaryColor, emissive: primaryColor, emissiveIntensity: 0.2 }),
    );
    base.position.y = 0.06;
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.82, 0.09, 10, 40),
      new THREE.MeshBasicMaterial({ color: accentColor }),
    );
    ring.position.y = 1.15;
    const glow = new THREE.PointLight(primaryColor, 2.5, 7);
    glow.position.y = 1.3;
    const beacon = new THREE.Mesh(
      new THREE.CylinderGeometry(0.32, 0.85, 7, 18, 1, true),
      new THREE.MeshBasicMaterial({ color: accentColor, transparent: true, opacity: 0.12, side: THREE.DoubleSide }),
    );
    beacon.position.y = 3.55;
    group.add(base, ring, glow, beacon);
    for (let index = 0; index < 3; index += 1) {
      const wave = new THREE.Mesh(
        new THREE.RingGeometry(0.75, 0.82, 32),
        new THREE.MeshBasicMaterial({ color: index % 2 === 0 ? accentColor : primaryColor, transparent: true }),
      );
      wave.rotation.x = -Math.PI / 2;
      wave.position.y = 0.04;
      waves.push(wave);
      group.add(wave);
    }
    group.position.copy(position);
    this.scene.add(group);
  }

  private createFootsteps(): void {
    for (let index = 0; index < 12; index += 1) {
      const footstep = new THREE.Mesh(
        new THREE.RingGeometry(0.1, 0.16, 12),
        new THREE.MeshBasicMaterial({ color: index % 2 === 0 ? 0x67e8d2 : 0xe97ac7, transparent: true, opacity: 0 }),
      );
      footstep.rotation.x = -Math.PI / 2;
      footstep.position.y = 0.04;
      this.footsteps.push(footstep);
      this.scene.add(footstep);
    }
  }

  private placeFootstep(): void {
    const footstep = this.footsteps[this.footstepIndex];
    footstep.position.set(this.character.position.x, 0.04, this.character.position.z);
    footstep.scale.setScalar(1);
    footstep.material.opacity = 0.48;
    this.footstepIndex = (this.footstepIndex + 1) % this.footsteps.length;
  }

  private readonly startEntrance = (): void => {
    if (this.entering) return;
    this.entering = true;
    this.moving = false;
    this.enterButton.hidden = true;
    gsap.to(this.camera.position, {
      x: this.activeEntrancePosition.x + 3.5,
      y: 4.5,
      z: this.activeEntrancePosition.z + 3.5,
      duration: 0.55,
      ease: "power2.inOut",
      onUpdate: () => this.camera.lookAt(this.activeEntrancePosition.x, 0.8, this.activeEntrancePosition.z),
      onComplete: () => this.onEnterRegion(this.activeRegionId),
    });
  };

  private createPaperTexture(): THREE.CanvasTexture {
    const canvas = document.createElement("canvas");
    canvas.width = 1024;
    canvas.height = 1024;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Canvas 2D 컨텍스트를 만들 수 없습니다.");
    context.fillStyle = "#f9f7f0";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.strokeStyle = "#c9d8de";
    context.lineWidth = 2;
    for (let index = 0; index <= 8; index += 1) {
      const position = index * 128;
      context.beginPath();
      context.moveTo(position, 0);
      context.lineTo(position, canvas.height);
      context.stroke();
      context.beginPath();
      context.moveTo(0, position);
      context.lineTo(canvas.width, position);
      context.stroke();
    }
    context.fillStyle = "#9aa9ad";
    context.font = "bold 34px sans-serif";
    context.textAlign = "center";
    context.fillText("3D OVERWORLD · PLACEHOLDER", 512, 520);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }
}
