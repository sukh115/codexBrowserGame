import * as THREE from "three";

export interface GameScene {
  readonly scene: THREE.Scene;
  readonly camera: THREE.Camera;
  init(): void;
  update(deltaSeconds: number): void;
  resize(width: number, height: number): void;
  dispose(): void;
}

export class Engine {
  readonly renderer: THREE.WebGLRenderer;
  private activeScene: GameScene | null = null;
  private readonly clock = new THREE.Clock();
  private animationFrame = 0;
  private readonly preferredPixelRatio: number;
  private frameTimeTotal = 0;
  private frameSamples = 0;

  constructor(container: HTMLElement) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    const lowPower = window.innerWidth <= 820 || navigator.hardwareConcurrency <= 4;
    this.preferredPixelRatio = Math.min(window.devicePixelRatio, lowPower ? 1.25 : 2);
    this.renderer.setPixelRatio(this.preferredPixelRatio);
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.domElement.className = "game-canvas";
    container.append(this.renderer.domElement);
    window.addEventListener("resize", this.handleResize);
    window.visualViewport?.addEventListener("resize", this.handleResize);
  }

  setScene(scene: GameScene): void {
    this.activeScene = scene;
    scene.init();
    const { width, height } = this.getViewportSize();
    scene.resize(width, height);
  }

  start(): void {
    this.clock.start();
    this.animationFrame = requestAnimationFrame(this.tick);
  }

  dispose(): void {
    cancelAnimationFrame(this.animationFrame);
    window.removeEventListener("resize", this.handleResize);
    window.visualViewport?.removeEventListener("resize", this.handleResize);
    this.activeScene?.dispose();
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }

  private readonly tick = (): void => {
    const delta = Math.min(this.clock.getDelta(), 0.1);
    this.frameTimeTotal += delta;
    this.frameSamples += 1;
    if (this.frameSamples >= 120) {
      const averageFrameTime = this.frameTimeTotal / this.frameSamples;
      const targetRatio = averageFrameTime > 1 / 40 ? Math.min(1, this.preferredPixelRatio) : this.preferredPixelRatio;
      if (Math.abs(this.renderer.getPixelRatio() - targetRatio) > 0.05) this.renderer.setPixelRatio(targetRatio);
      this.frameTimeTotal = 0;
      this.frameSamples = 0;
    }
    if (this.activeScene) {
      this.activeScene.update(delta);
      this.renderer.render(this.activeScene.scene, this.activeScene.camera);
    }
    this.animationFrame = requestAnimationFrame(this.tick);
  };

  private readonly handleResize = (): void => {
    const { width, height } = this.getViewportSize();
    this.renderer.setPixelRatio(Math.min(this.renderer.getPixelRatio(), this.preferredPixelRatio));
    this.renderer.setSize(width, height);
    this.activeScene?.resize(width, height);
  };

  private getViewportSize(): { width: number; height: number } {
    return {
      width: Math.max(1, Math.round(window.visualViewport?.width ?? window.innerWidth)),
      height: Math.max(1, Math.round(window.visualViewport?.height ?? window.innerHeight)),
    };
  }
}
