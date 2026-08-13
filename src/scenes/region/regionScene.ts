import * as THREE from "three";
import type { GameScene } from "../../core/engine";
import type { RegionManifest } from "../../core/assetManifest";
import { NOTE_SPOTS } from "./noteSpots";
import { NoteField } from "./noteField";
import { INPUT_LIMITS } from "../../core/constants";
import { MinigameController } from "./minigames/controller";
import { ReactiveLayer } from "./reactiveLayer";

const BACKGROUND_HEIGHT = 10;
const MIN_ZOOM = 1;
const MAX_ZOOM = 5;

export class RegionScene implements GameScene {
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.OrthographicCamera(-10, 10, 5, -5, 0.1, 20);
  private readonly background: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;
  private readonly exitButton = document.createElement("button");
  private readonly noteField: NoteField;
  private readonly minigames: MinigameController;
  private readonly reactiveLayer: ReactiveLayer;
  private readonly pointers = new Map<number, THREE.Vector2>();
  private dragPointerId: number | null = null;
  private lastPointerX = 0;
  private lastPointerY = 0;
  private lastPinchDistance = 0;
  private viewportWidth = 1;
  private viewportHeight = 1;
  private disposed = false;
  private tapStartX = 0;
  private tapStartY = 0;
  private tapStartTime = 0;
  private inputLocked = false;
  private collectedNotes: readonly string[];

  constructor(
    private readonly canvas: HTMLCanvasElement,
    overlayRoot: HTMLElement,
    private readonly manifest: RegionManifest,
    private readonly onExit: () => void,
    collectedNotes: readonly string[],
    onCollectNote: (noteId: string) => void,
    clearedMinigames: readonly string[],
    onClearMinigame: (gameId: string, rewardNoteId: string) => void,
    private readonly getTransportTime: () => number,
    playTone: (index: number) => void,
    getRhythmAssist: () => boolean,
  ) {
    const width = BACKGROUND_HEIGHT * manifest.aspectRatio;
    this.background = new THREE.Mesh(
      new THREE.PlaneGeometry(width, BACKGROUND_HEIGHT),
      new THREE.MeshBasicMaterial({ map: this.createPlaceholderTexture() }),
    );
    this.noteField = new NoteField(
      NOTE_SPOTS[manifest.id],
      collectedNotes,
      width,
      BACKGROUND_HEIGHT,
      onCollectNote,
    );
    this.collectedNotes = collectedNotes;
    this.reactiveLayer = new ReactiveLayer(overlayRoot);
    this.minigames = new MinigameController(
      overlayRoot,
      width,
      BACKGROUND_HEIGHT,
      manifest.bpm,
      getTransportTime,
      playTone,
      getRhythmAssist,
      clearedMinigames,
      (open) => this.setInputLocked(open),
      onClearMinigame,
    );
    this.loadBackground();
    this.exitButton.className = "exit-button";
    this.exitButton.textContent = "오버월드로 나가기";
    this.exitButton.addEventListener("pointerup", this.onExit);
    overlayRoot.append(this.exitButton);
  }

  init(): void {
    this.scene.background = new THREE.Color(0x17142b);
    this.scene.add(this.background);
    this.scene.add(this.noteField.group);
    this.camera.position.set(0, 0, 10);
    this.canvas.addEventListener("pointerdown", this.onPointerDown);
    this.canvas.addEventListener("pointermove", this.onPointerMove);
    this.canvas.addEventListener("pointerup", this.onPointerUp);
    this.canvas.addEventListener("pointercancel", this.onPointerUp);
    this.canvas.addEventListener("wheel", this.onWheel, { passive: false });
  }

  update(deltaSeconds: number): void {
    this.noteField.update(deltaSeconds, this.camera);
    this.minigames.update(this.camera, this.viewportWidth, this.viewportHeight);
    this.reactiveLayer.update(this.collectedNotes, this.getTransportTime(), this.manifest.bpm);
  }

  syncCollectedNotes(collectedNotes: readonly string[]): void {
    this.collectedNotes = collectedNotes;
    this.noteField.syncCollectedNotes(collectedNotes);
  }

  syncClearedMinigames(cleared: readonly string[]): void {
    this.minigames.syncCleared(cleared);
  }

  setInputLocked(locked: boolean): void {
    this.inputLocked = locked;
    if (locked) this.pointers.clear();
  }

  resize(width: number, height: number): void {
    this.viewportWidth = width;
    this.viewportHeight = height;
    const aspect = width / height;
    const backgroundWidth = BACKGROUND_HEIGHT * this.manifest.aspectRatio;
    let viewWidth = backgroundWidth;
    let viewHeight = BACKGROUND_HEIGHT;
    if (aspect >= this.manifest.aspectRatio) {
      viewWidth = BACKGROUND_HEIGHT * aspect;
    } else {
      viewHeight = backgroundWidth / aspect;
    }
    this.camera.left = -viewWidth / 2;
    this.camera.right = viewWidth / 2;
    this.camera.top = viewHeight / 2;
    this.camera.bottom = -viewHeight / 2;
    this.camera.updateProjectionMatrix();
    this.noteField.resize(width, height);
    this.clampCamera();
  }

  dispose(): void {
    this.disposed = true;
    this.canvas.removeEventListener("pointerdown", this.onPointerDown);
    this.canvas.removeEventListener("pointermove", this.onPointerMove);
    this.canvas.removeEventListener("pointerup", this.onPointerUp);
    this.canvas.removeEventListener("pointercancel", this.onPointerUp);
    this.canvas.removeEventListener("wheel", this.onWheel);
    this.exitButton.removeEventListener("pointerup", this.onExit);
    this.exitButton.remove();
    this.background.geometry.dispose();
    this.background.material.map?.dispose();
    this.background.material.dispose();
    this.noteField.dispose();
    this.minigames.dispose();
    this.reactiveLayer.dispose();
    this.scene.clear();
    this.pointers.clear();
  }

  private readonly onPointerDown = (event: PointerEvent): void => {
    if (this.inputLocked) return;
    this.canvas.setPointerCapture(event.pointerId);
    this.pointers.set(event.pointerId, new THREE.Vector2(event.clientX, event.clientY));
    this.dragPointerId = event.pointerId;
    this.lastPointerX = event.clientX;
    this.lastPointerY = event.clientY;
    this.tapStartX = event.clientX;
    this.tapStartY = event.clientY;
    this.tapStartTime = performance.now();
    this.updatePinchDistance();
  };

  private readonly onPointerMove = (event: PointerEvent): void => {
    if (this.inputLocked) return;
    const pointer = this.pointers.get(event.pointerId);
    if (!pointer) return;
    pointer.set(event.clientX, event.clientY);
    if (this.pointers.size >= 2) {
      const distance = this.getPinchDistance();
      if (this.lastPinchDistance > 0) {
        this.setZoom(this.camera.zoom * (distance / this.lastPinchDistance));
      }
      this.lastPinchDistance = distance;
      return;
    }
    if (event.pointerId !== this.dragPointerId) return;
    const worldPerPixelX = (this.camera.right - this.camera.left) / (this.camera.zoom * this.viewportWidth);
    const worldPerPixelY = (this.camera.top - this.camera.bottom) / (this.camera.zoom * this.viewportHeight);
    this.camera.position.x -= (event.clientX - this.lastPointerX) * worldPerPixelX;
    this.camera.position.y += (event.clientY - this.lastPointerY) * worldPerPixelY;
    this.lastPointerX = event.clientX;
    this.lastPointerY = event.clientY;
    this.clampCamera();
  };

  private readonly onPointerUp = (event: PointerEvent): void => {
    if (this.inputLocked) return;
    if (this.pointers.size === 1) {
      const distance = Math.hypot(event.clientX - this.tapStartX, event.clientY - this.tapStartY);
      const duration = performance.now() - this.tapStartTime;
      if (distance < INPUT_LIMITS.TAP_DISTANCE_PX && duration < INPUT_LIMITS.TAP_DURATION_MS) {
        this.noteField.collectAt(event.clientX, event.clientY, this.camera);
      }
    }
    this.pointers.delete(event.pointerId);
    this.dragPointerId = null;
    this.lastPinchDistance = 0;
  };

  private readonly onWheel = (event: WheelEvent): void => {
    event.preventDefault();
    if (this.inputLocked) return;
    this.setZoom(this.camera.zoom * Math.exp(-event.deltaY * 0.0015));
  };

  private setZoom(zoom: number): void {
    this.camera.zoom = THREE.MathUtils.clamp(zoom, MIN_ZOOM, MAX_ZOOM);
    this.camera.updateProjectionMatrix();
    this.clampCamera();
  }

  private clampCamera(): void {
    const halfBackgroundWidth = (BACKGROUND_HEIGHT * this.manifest.aspectRatio) / 2;
    const halfBackgroundHeight = BACKGROUND_HEIGHT / 2;
    const halfViewWidth = (this.camera.right - this.camera.left) / (2 * this.camera.zoom);
    const halfViewHeight = (this.camera.top - this.camera.bottom) / (2 * this.camera.zoom);
    const maxX = Math.max(0, halfBackgroundWidth - halfViewWidth);
    const maxY = Math.max(0, halfBackgroundHeight - halfViewHeight);
    this.camera.position.x = THREE.MathUtils.clamp(this.camera.position.x, -maxX, maxX);
    this.camera.position.y = THREE.MathUtils.clamp(this.camera.position.y, -maxY, maxY);
  }

  private getPinchDistance(): number {
    const values = [...this.pointers.values()];
    return values.length < 2 ? 0 : values[0].distanceTo(values[1]);
  }

  private updatePinchDistance(): void {
    this.lastPinchDistance = this.getPinchDistance();
  }

  private createPlaceholderTexture(): THREE.CanvasTexture {
    const canvas = document.createElement("canvas");
    canvas.width = 2048;
    canvas.height = 1024;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Canvas 2D 컨텍스트를 만들 수 없습니다.");
    const gradient = context.createLinearGradient(0, 0, canvas.width, canvas.height);
    gradient.addColorStop(0, "#20183f");
    gradient.addColorStop(0.5, "#453064");
    gradient.addColorStop(1, "#173d48");
    context.fillStyle = gradient;
    context.fillRect(0, 0, canvas.width, canvas.height);
    const colors = ["#67e8d2", "#d976c5", "#8d72e1", "#f09b72"];
    for (let index = 0; index < 8; index += 1) {
      context.fillStyle = colors[index % colors.length];
      context.globalAlpha = 0.22;
      context.fillRect(index * 256 + 22, 120 + (index % 3) * 170, 185, 540 - (index % 3) * 80);
      context.globalAlpha = 1;
      context.fillStyle = "#f5efff";
      context.font = "bold 30px sans-serif";
      context.textAlign = "center";
      context.fillText(`${index + 1}`, index * 256 + 114, 880);
    }
    context.fillStyle = "#ffffff";
    context.font = "bold 66px sans-serif";
    context.textAlign = "center";
    context.fillText(this.manifest.title, 1024, 105);
    context.font = "28px sans-serif";
    context.fillText("드래그로 이동 · 휠 또는 핀치로 확대", 1024, 960);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }

  private loadBackground(): void {
    if (!this.manifest.background) return;
    new THREE.TextureLoader().load(
      this.manifest.background,
      (texture) => {
        if (this.disposed) {
          texture.dispose();
          return;
        }
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.magFilter = THREE.NearestFilter;
        texture.minFilter = THREE.LinearMipmapLinearFilter;
        const placeholder = this.background.material.map;
        this.background.material.map = texture;
        this.background.material.needsUpdate = true;
        placeholder?.dispose();
      },
      undefined,
      () => {
        // 에셋 전달 전에도 전체 게임 흐름은 중단하지 않는다.
        console.warn(`[RegionScene] 배경 로드 실패, 플레이스홀더 유지: ${this.manifest.background}`);
      },
    );
  }
}
