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

  constructor(container: HTMLElement) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.domElement.className = "game-canvas";
    container.append(this.renderer.domElement);
    window.addEventListener("resize", this.handleResize);
  }

  setScene(scene: GameScene): void {
    this.activeScene = scene;
    scene.init();
    scene.resize(window.innerWidth, window.innerHeight);
  }

  start(): void {
    this.clock.start();
    this.animationFrame = requestAnimationFrame(this.tick);
  }

  dispose(): void {
    cancelAnimationFrame(this.animationFrame);
    window.removeEventListener("resize", this.handleResize);
    this.activeScene?.dispose();
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }

  private readonly tick = (): void => {
    const delta = Math.min(this.clock.getDelta(), 0.1);
    if (this.activeScene) {
      this.activeScene.update(delta);
      this.renderer.render(this.activeScene.scene, this.activeScene.camera);
    }
    this.animationFrame = requestAnimationFrame(this.tick);
  };

  private readonly handleResize = (): void => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(width, height);
    this.activeScene?.resize(width, height);
  };
}
