import * as THREE from "three";
import type { GameScene } from "../../core/engine";
import type { RegionManifest } from "../../core/assetManifest";
import { NoteField } from "./noteField";
import { INPUT_LIMITS } from "../../core/constants";
import { MinigameController } from "./minigames/controller";
import { ReactiveLayer } from "./reactiveLayer";
import { TapRipplePool } from "./tapRipplePool";
import type { SfxPlayer } from "../../audio/sfx";
import { REGION_PLACEMENTS } from "../../regionData";
import { MUSIC_SHOP_DIALOGUE } from "../../regionData/musicShopDialogue";
import { NpcDialogue } from "./npcDialogue";

const BACKGROUND_HEIGHT = 10;
const MIN_ZOOM = 1;
const MAX_ZOOM = 5;

export class RegionScene implements GameScene {
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.OrthographicCamera(-10, 10, 5, -5, 0.1, 20);
  private readonly background: THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>;
  private readonly exitButton = document.createElement("button");
  private readonly noteField: NoteField;
  private readonly minigames: MinigameController;
  private readonly npcDialogue: NpcDialogue | null;
  private readonly reactiveLayer: ReactiveLayer;
  private readonly tapRipples = new TapRipplePool();
  private readonly pointers = new Map<number, THREE.Vector2>();
  private readonly tapWorldPosition = new THREE.Vector3();
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
  private exiting = false;
  private readonly placementEditorEnabled = new URLSearchParams(window.location.search).get("debug") === "1";
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
    private readonly sfxPlayer: SfxPlayer,
    getRhythmAssist: () => boolean,
    private readonly getReducedMotion: () => boolean,
  ) {
    const width = BACKGROUND_HEIGHT * manifest.aspectRatio;
    const placement = REGION_PLACEMENTS[manifest.id];
    this.reactiveLayer = new ReactiveLayer(
      overlayRoot,
      manifest.id,
      this.createPlaceholderTexture(),
      manifest.baseBrightness,
      manifest.baseSaturation,
      manifest.noteGoal,
    );
    this.background = new THREE.Mesh(
      new THREE.PlaneGeometry(width, BACKGROUND_HEIGHT),
      this.reactiveLayer.background.material,
    );
    this.noteField = new NoteField(
      placement.notes,
      collectedNotes,
      width,
      BACKGROUND_HEIGHT,
      manifest.noteGoal,
      onCollectNote,
    );
    this.collectedNotes = collectedNotes;
    this.minigames = new MinigameController(
      overlayRoot,
      width,
      BACKGROUND_HEIGHT,
      manifest.bpm,
      getTransportTime,
      this.sfxPlayer,
      manifest.musicalScale,
      getRhythmAssist,
      manifest.id,
      placement.minigames,
      clearedMinigames,
      (open) => this.setInputLocked(open),
      onClearMinigame,
    );
    this.npcDialogue = manifest.id === "music-shop"
      ? new NpcDialogue(
        overlayRoot,
        width,
        BACKGROUND_HEIGHT,
        0.323,
        0.61,
        MUSIC_SHOP_DIALOGUE,
        manifest.noteGoal,
        (open) => this.setInputLocked(open),
      )
      : null;
    this.npcDialogue?.setProgress(this.getCollectedCount(collectedNotes));
    this.loadBackground();
    this.exitButton.className = "exit-button";
    this.exitButton.textContent = "오버월드로 나가기";
    this.exitButton.addEventListener("pointerup", this.requestExit);
    overlayRoot.append(this.exitButton);
  }

  init(): void {
    this.scene.background = new THREE.Color(0x17142b);
    this.scene.add(this.background);
    this.scene.add(this.noteField.group);
    this.scene.add(this.tapRipples.group);
    this.camera.position.set(0, 0, 10);
    this.canvas.addEventListener("pointerdown", this.onPointerDown);
    this.canvas.addEventListener("pointermove", this.onPointerMove);
    this.canvas.addEventListener("pointerup", this.onPointerUp);
    this.canvas.addEventListener("pointercancel", this.onPointerCancel);
    this.canvas.addEventListener("wheel", this.onWheel, { passive: false });
  }

  update(deltaSeconds: number): void {
    const transportTime = this.getTransportTime();
    const reducedMotion = this.getReducedMotion();
    this.noteField.update(deltaSeconds, this.camera, transportTime, this.manifest.bpm, reducedMotion);
    this.tapRipples.update(deltaSeconds);
    this.minigames.update(this.camera, this.viewportWidth, this.viewportHeight, transportTime, reducedMotion);
    this.npcDialogue?.update(this.camera, this.viewportWidth, this.viewportHeight);
    this.reactiveLayer.update(this.collectedNotes, transportTime, this.manifest.bpm, reducedMotion);
    const nearestDistance = this.inputLocked
      ? null
      : this.noteField.getNearestUnfoundScreenDistance(this.camera);
    if (nearestDistance === null) {
      this.sfxPlayer.stopHum();
    } else {
      const audibleRadius = Math.hypot(this.viewportWidth, this.viewportHeight) * 0.55;
      const proximity = 1 - THREE.MathUtils.clamp(nearestDistance / audibleRadius, 0, 1);
      this.sfxPlayer.setHum(this.manifest.musicalScale[0], proximity * proximity);
    }
  }

  syncCollectedNotes(collectedNotes: readonly string[]): void {
    this.collectedNotes = collectedNotes;
    this.noteField.syncCollectedNotes(collectedNotes);
    this.npcDialogue?.setProgress(this.getCollectedCount(collectedNotes));
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
    // 세로 화면에서도 배경이 화면을 채우도록 높이를 기준으로 맞추고(cover),
    // 남는 가로는 드래그 팬으로 탐색한다. 가로 화면은 기존과 동일하게 폭을 채운다.
    let viewHeight = BACKGROUND_HEIGHT;
    let viewWidth = viewHeight * aspect;
    if (viewWidth > backgroundWidth) {
      viewWidth = backgroundWidth;
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
    this.canvas.removeEventListener("pointercancel", this.onPointerCancel);
    this.canvas.removeEventListener("wheel", this.onWheel);
    this.exitButton.removeEventListener("pointerup", this.requestExit);
    this.exitButton.remove();
    this.background.geometry.dispose();
    const backgroundTexture = this.background.material.uniforms.map.value as THREE.Texture;
    backgroundTexture.dispose();
    this.noteField.dispose();
    this.tapRipples.dispose();
    this.sfxPlayer.stopHum();
    this.minigames.dispose();
    this.npcDialogue?.dispose();
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
      const touch = event.pointerType === "touch";
      const distanceLimit = touch ? 14 : INPUT_LIMITS.TAP_DISTANCE_PX;
      const durationLimit = touch ? 420 : INPUT_LIMITS.TAP_DURATION_MS;
      if (distance < distanceLimit && duration < durationLimit) {
        if (this.placementEditorEnabled && event.shiftKey) {
          this.logPlacementSnippet(event.clientX, event.clientY);
        } else {
          const collected = this.noteField.collectAt(event.clientX, event.clientY, this.camera);
          if (!collected) this.playBackgroundTap(event.clientX, event.clientY);
        }
      }
    }
    this.releasePointer(event.pointerId);
  };

  private readonly onPointerCancel = (event: PointerEvent): void => {
    this.releasePointer(event.pointerId);
  };

  private releasePointer(pointerId: number): void {
    this.pointers.delete(pointerId);
    const remaining = this.pointers.entries().next().value as [number, THREE.Vector2] | undefined;
    if (!remaining) {
      this.dragPointerId = null;
      this.lastPinchDistance = 0;
      return;
    }
    this.dragPointerId = remaining[0];
    this.lastPointerX = remaining[1].x;
    this.lastPointerY = remaining[1].y;
    this.lastPinchDistance = 0;
  }

  private readonly onWheel = (event: WheelEvent): void => {
    event.preventDefault();
    if (this.inputLocked) return;
    this.setZoom(this.camera.zoom * Math.exp(-event.deltaY * 0.0015));
  };

  private readonly requestExit = (): void => {
    if (this.exiting) return;
    this.exiting = true;
    this.setInputLocked(true);
    this.exitButton.disabled = true;
    this.onExit();
  };

  private setZoom(zoom: number): void {
    this.camera.zoom = THREE.MathUtils.clamp(zoom, MIN_ZOOM, MAX_ZOOM);
    this.camera.updateProjectionMatrix();
    this.clampCamera();
  }

  private playBackgroundTap(clientX: number, clientY: number): void {
    const scale = this.manifest.musicalScale;
    if (scale.length === 0) return;
    this.tapWorldPosition.set(
      (clientX / this.viewportWidth) * 2 - 1,
      -(clientY / this.viewportHeight) * 2 + 1,
      0,
    ).unproject(this.camera);
    this.tapWorldPosition.z = 0.22;
    const backgroundV = THREE.MathUtils.clamp(0.5 - this.tapWorldPosition.y / BACKGROUND_HEIGHT, 0, 1);
    const scaleIndex = Math.round((1 - backgroundV) * (scale.length - 1));
    this.sfxPlayer.playPluck(scale[scaleIndex]);
    this.tapRipples.play(this.tapWorldPosition);
  }

  private logPlacementSnippet(clientX: number, clientY: number): void {
    const bounds = this.canvas.getBoundingClientRect();
    const screenX = clientX - bounds.left;
    const screenY = clientY - bounds.top;
    this.tapWorldPosition.set(
      (screenX / bounds.width) * 2 - 1,
      -(screenY / bounds.height) * 2 + 1,
      0,
    ).unproject(this.camera);
    const backgroundWidth = BACKGROUND_HEIGHT * this.manifest.aspectRatio;
    const snippet = {
      u: Number(THREE.MathUtils.clamp(this.tapWorldPosition.x / backgroundWidth + 0.5, 0, 1).toFixed(3)),
      v: Number(THREE.MathUtils.clamp(0.5 - this.tapWorldPosition.y / BACKGROUND_HEIGHT, 0, 1).toFixed(3)),
    };
    console.log(
      `[RegionEditor] ${this.manifest.id}\n${JSON.stringify(snippet, null, 2)}`,
      {
        zoom: Number(this.camera.zoom.toFixed(3)),
        screen: { x: Math.round(screenX), y: Math.round(screenY) },
      },
    );
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

  private getCollectedCount(collectedNotes: readonly string[]): number {
    return collectedNotes.filter((id) => id.startsWith("note-")).length;
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
        this.reactiveLayer.background.setTexture(texture).dispose();
      },
      undefined,
      () => {
        // 에셋 전달 전에도 전체 게임 흐름은 중단하지 않는다.
        console.warn(`[RegionScene] 배경 로드 실패, 플레이스홀더 유지: ${this.manifest.background}`);
      },
    );
  }
}
