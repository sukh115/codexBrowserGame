import * as THREE from "three";
import type { GameScene } from "../../core/engine";
import { GAME_EVENTS, WORLD } from "../../core/constants";
import { PointerInput, type TapDetail } from "../../core/input";

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
  private readonly ground: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshStandardMaterial>;
  private readonly character = new THREE.Group();
  private readonly marker: THREE.Mesh<THREE.RingGeometry, THREE.MeshBasicMaterial>;
  private moving = false;
  private walkTime = 0;

  constructor(private readonly canvas: HTMLCanvasElement) {
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
  }

  init(): void {
    this.scene.background = new THREE.Color(0xffffff);
    this.scene.add(new THREE.HemisphereLight(0xffffff, 0xb9ae98, 2.3));
    const sun = new THREE.DirectionalLight(0xffffff, 2.2);
    sun.position.set(8, 15, 6);
    this.scene.add(sun, this.ground, this.marker);
    this.createCharacter();
    this.createBoundary();
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
      } else {
        this.direction.normalize();
        this.character.position.addScaledVector(this.direction, Math.min(WORLD.MOVE_SPEED * deltaSeconds, distance));
        this.character.rotation.y = Math.atan2(this.direction.x, this.direction.z);
        this.walkTime += deltaSeconds * 10;
        this.character.position.y = Math.abs(Math.sin(this.walkTime)) * 0.12;
      }
    }

    this.marker.material.opacity = Math.max(0, this.marker.material.opacity - deltaSeconds * 1.5);
    this.cameraTarget.copy(this.character.position).add(this.cameraOffset);
    this.camera.position.lerp(this.cameraTarget, 1 - Math.pow(0.001, deltaSeconds));
    this.cameraTarget.copy(this.character.position);
    this.cameraTarget.y += 0.7;
    this.camera.lookAt(this.cameraTarget);
  }

  resize(width: number, height: number): void {
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }

  dispose(): void {
    this.input.removeEventListener(GAME_EVENTS.POINT, this.onPoint as EventListener);
    this.input.dispose();
    this.scene.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
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
    const green = new THREE.MeshStandardMaterial({ color: 0x78b58b, roughness: 0.9 });
    const orange = new THREE.MeshStandardMaterial({ color: 0xf08a5d, roughness: 0.9 });
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.38, 0.8, 5, 12), green);
    body.position.y = 0.82;
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.44, 20, 14), orange);
    head.position.y = 1.65;
    this.character.add(body, head);
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
