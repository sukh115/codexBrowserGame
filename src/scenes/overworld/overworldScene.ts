import * as THREE from "three";
import type { GameScene } from "../../core/engine";
import { GAME_EVENTS, WORLD } from "../../core/constants";
import { PointerInput, type TapDetail } from "../../core/input";
import { ASSET_MANIFEST, type RegionId } from "../../core/assetManifest";
import { gsap } from "gsap";
import { OverworldCharacterController } from "./characterController";
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
  private readonly characterController = new OverworldCharacterController(
    ASSET_MANIFEST.characterModel,
    ASSET_MANIFEST.dracoDecoderPath,
  );
  private readonly character = this.characterController.group;
  private readonly marker: THREE.Mesh<THREE.RingGeometry, THREE.MeshBasicMaterial>;
  private readonly entrance = new THREE.Group();
  private readonly entranceWaves: Array<THREE.Mesh<THREE.RingGeometry, THREE.MeshBasicMaterial>> = [];
  private readonly secondEntrance = new THREE.Group();
  private readonly secondEntranceWaves: Array<THREE.Mesh<THREE.RingGeometry, THREE.MeshBasicMaterial>> = [];
  private readonly footsteps: Array<THREE.Mesh<THREE.RingGeometry, THREE.MeshBasicMaterial>> = [];
  private readonly portalLabelTextures: THREE.CanvasTexture[] = [];
  private readonly portalVisuals = new Map<RegionId, {
    readonly base: THREE.Mesh<THREE.CylinderGeometry, THREE.MeshStandardMaterial>;
    readonly label: string;
    readonly primaryColor: number;
    readonly sprite: THREE.Sprite;
  }>();
  private readonly portalGuide = document.createElement("div");
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
  private guideElapsed = 0;
  private readonly previousCharacterPosition = new THREE.Vector3();
  private readonly propLoader = new OverworldPropLoader(this.scene, ASSET_MANIFEST.dracoDecoderPath);

  constructor(
    private readonly canvas: HTMLCanvasElement,
    overlayRoot: HTMLElement,
    private readonly onEnterRegion: (regionId: RegionId) => void,
    private readonly spawnAtRegion: RegionId | null = null,
    private readonly onRegionProximityChange: (regionId: RegionId, proximity: number) => void = () => {},
    private completedRegions: readonly RegionId[] = [],
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
    this.portalGuide.className = "portal-guide";
    overlayRoot.append(this.portalGuide);
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
    this.createPortalProps();
    this.createFootsteps();
    this.propLoader.load(ASSET_MANIFEST.overworldProps);
    this.destination.copy(this.character.position);
    // 지역에서 돌아올 때 월드 원점이 아니라 실제 캐릭터 출구 위치에서 카메라를 시작한다.
    this.camera.position.copy(this.character.position).add(this.cameraOffset);
    this.cameraTarget.set(this.character.position.x, 0.7, this.character.position.z);
    this.camera.lookAt(this.cameraTarget);
  }

  update(deltaSeconds: number): void {
    if (this.moving) {
      this.direction.subVectors(this.destination, this.character.position);
      const distance = this.direction.length();
      if (distance <= WORLD.ARRIVAL_RADIUS) {
        this.character.position.copy(this.destination);
        this.character.position.y = 0;
        this.moving = false;
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
      }
    } else {
      this.walkTime += deltaSeconds * 1.8;
    }
    this.characterController.update(deltaSeconds, this.moving);

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
    this.guideElapsed += deltaSeconds;
    if (this.guideElapsed >= 0.2) {
      this.guideElapsed = 0;
      this.updatePortalGuide(Math.sqrt(firstDistanceSquared), Math.sqrt(secondDistanceSquared));
    }
    const linearProximity = THREE.MathUtils.clamp(
      1 - distanceToEntrance / ASSET_MANIFEST.overworldEntrance.audioRadius,
      0,
      1,
    );
    // 가장자리에서 볼륨이 갑자기 튀지 않도록 부드러운 감쇠 곡선을 쓴다.
    this.onRegionProximityChange(
      this.activeRegionId,
      linearProximity * linearProximity * (3 - 2 * linearProximity),
    );

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

  syncCompletedRegions(completedRegions: readonly RegionId[]): void {
    if (completedRegions.length === this.completedRegions.length
      && completedRegions.every((regionId) => this.completedRegions.includes(regionId))) return;
    this.completedRegions = completedRegions;
    for (const [regionId, visual] of this.portalVisuals) {
      const completed = completedRegions.includes(regionId);
      const color = completed ? 0xf3df8d : visual.primaryColor;
      visual.base.material.color.setHex(color);
      visual.base.material.emissive.setHex(color);
      visual.base.material.emissiveIntensity = completed ? 0.65 : 0.2;
      const texture = this.createPortalLabelTexture(`${completed ? "✓ " : ""}${visual.label}`, color);
      const previous = visual.sprite.material.map;
      visual.sprite.material.map = texture;
      visual.sprite.material.needsUpdate = true;
      const textureIndex = previous instanceof THREE.CanvasTexture
        ? this.portalLabelTextures.indexOf(previous)
        : -1;
      if (textureIndex >= 0) this.portalLabelTextures[textureIndex] = texture;
      else this.portalLabelTextures.push(texture);
      previous?.dispose();
    }
  }

  dispose(): void {
    this.onRegionProximityChange(this.activeRegionId, 0);
    this.input.removeEventListener(GAME_EVENTS.POINT, this.onPoint as EventListener);
    this.input.dispose();
    this.characterController.dispose();
    this.propLoader.dispose();
    this.portalLabelTextures.forEach((texture) => texture.dispose());
    this.enterButton.removeEventListener("pointerup", this.startEntrance);
    this.enterButton.remove();
    this.portalGuide.remove();
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
    this.createPortal(
      "music-shop",
      this.entrance,
      this.entranceWaves,
      this.entrancePosition,
      0xf08a5d,
      0x67e8d2,
      "악기점",
      this.completedRegions.includes("music-shop"),
    );
  }

  private createSecondEntrance(): void {
    this.createPortal(
      "neon-forest",
      this.secondEntrance,
      this.secondEntranceWaves,
      this.secondEntrancePosition,
      0x718b61,
      0xc5a96b,
      "버려진 온실",
      this.completedRegions.includes("neon-forest"),
    );
  }

  private createPortal(
    regionId: RegionId,
    group: THREE.Group,
    waves: Array<THREE.Mesh<THREE.RingGeometry, THREE.MeshBasicMaterial>>,
    position: THREE.Vector3,
    primaryColor: number,
    accentColor: number,
    label: string,
    completed: boolean,
  ): void {
    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(1.1, 1.1, 0.12, 32),
      new THREE.MeshStandardMaterial({
        color: completed ? 0xf3df8d : primaryColor,
        emissive: completed ? 0xf3df8d : primaryColor,
        emissiveIntensity: completed ? 0.65 : 0.2,
      }),
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
    const labelTexture = this.createPortalLabelTexture(`${completed ? "✓ " : ""}${label}`, completed ? 0xf3df8d : primaryColor);
    const labelSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: labelTexture, transparent: true, depthTest: false }));
    labelSprite.position.y = 4.8;
    labelSprite.scale.set(3.8, 0.95, 1);
    this.portalLabelTextures.push(labelTexture);
    this.portalVisuals.set(regionId, { base, label, primaryColor, sprite: labelSprite });
    group.add(base, ring, glow, beacon, labelSprite);
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

  private updatePortalGuide(shopDistance: number, greenhouseDistance: number): void {
    const shopComplete = this.completedRegions.includes("music-shop");
    const greenhouseComplete = this.completedRegions.includes("neon-forest");
    this.portalGuide.innerHTML = `
      <span class="${this.activeRegionId === "music-shop" ? "is-nearest" : ""}">${shopComplete ? "✓" : "♪"} 악기점 <b>${shopDistance.toFixed(1)}m</b></span>
      <span class="${this.activeRegionId === "neon-forest" ? "is-nearest" : ""}">${greenhouseComplete ? "✓" : "♧"} 온실 <b>${greenhouseDistance.toFixed(1)}m</b></span>
    `;
  }

  private createPortalProps(): void {
    const speakerMaterial = new THREE.MeshStandardMaterial({ color: 0x43384e, roughness: 0.8 });
    const speakerGeometry = new THREE.BoxGeometry(0.8, 1.15, 0.55);
    for (const offset of [-1.8, 1.8]) {
      const speaker = new THREE.Mesh(speakerGeometry.clone(), speakerMaterial.clone());
      speaker.position.set(this.entrancePosition.x + offset, 0.58, this.entrancePosition.z + 0.4);
      this.scene.add(speaker);
    }
    const potGeometry = new THREE.CylinderGeometry(0.24, 0.34, 0.48, 10);
    const potMaterial = new THREE.MeshStandardMaterial({ color: 0x8b5d42, roughness: 1 });
    const pots = new THREE.InstancedMesh(potGeometry, potMaterial, 6);
    const matrix = new THREE.Matrix4();
    for (let index = 0; index < 6; index += 1) {
      const angle = (index / 6) * Math.PI * 2;
      matrix.makeTranslation(
        this.secondEntrancePosition.x + Math.cos(angle) * 2.1,
        0.24,
        this.secondEntrancePosition.z + Math.sin(angle) * 2.1,
      );
      pots.setMatrixAt(index, matrix);
    }
    this.scene.add(pots);
  }

  private createPortalLabelTexture(label: string, color: number): THREE.CanvasTexture {
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 128;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("포털 라벨을 만들 수 없습니다.");
    context.fillStyle = "rgba(20, 24, 25, .82)";
    context.beginPath();
    context.roundRect(8, 8, 496, 112, 30);
    context.fill();
    context.strokeStyle = `#${color.toString(16).padStart(6, "0")}`;
    context.lineWidth = 8;
    context.stroke();
    context.fillStyle = "#fff9df";
    context.font = "700 46px sans-serif";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(label, 256, 66);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
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
    const worldToCanvas = (value: number): number => ((value + WORLD.HALF_SIZE) / WORLD.SIZE) * canvas.width;
    context.lineCap = "round";
    context.setLineDash([22, 16]);
    context.lineWidth = 11;
    context.strokeStyle = "rgba(230, 132, 89, .5)";
    context.beginPath();
    context.moveTo(512, 512);
    context.quadraticCurveTo(650, 430, worldToCanvas(this.entrancePosition.x), worldToCanvas(this.entrancePosition.z));
    context.stroke();
    context.strokeStyle = "rgba(104, 145, 91, .55)";
    context.beginPath();
    context.moveTo(512, 512);
    context.quadraticCurveTo(380, 600, worldToCanvas(this.secondEntrancePosition.x), worldToCanvas(this.secondEntrancePosition.z));
    context.stroke();
    context.setLineDash([]);
    context.fillStyle = "rgba(82, 91, 91, .62)";
    context.font = "700 25px sans-serif";
    context.fillText("악기점 →", worldToCanvas(6), worldToCanvas(-3));
    context.fillText("← 버려진 온실", worldToCanvas(-8), worldToCanvas(6));
    context.strokeStyle = "rgba(109, 137, 102, .35)";
    context.lineWidth = 4;
    for (let index = 0; index < 18; index += 1) {
      const x = 90 + ((index * 157) % 840);
      const y = 80 + ((index * 223) % 840);
      context.beginPath();
      context.moveTo(x, y + 18);
      context.quadraticCurveTo(x - 14, y, x - 25, y + 6);
      context.moveTo(x, y + 18);
      context.quadraticCurveTo(x + 14, y, x + 25, y + 6);
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
