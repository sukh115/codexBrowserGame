import { gsap } from "gsap";
import type { Engine, GameScene } from "../core/engine";

export class SceneManager {
  private current: GameScene | null = null;
  private readonly fade: HTMLDivElement;

  constructor(private readonly engine: Engine, overlayRoot: HTMLElement) {
    this.fade = document.createElement("div");
    this.fade.className = "scene-fade";
    overlayRoot.append(this.fade);
  }

  show(scene: GameScene): void {
    this.current?.dispose();
    this.current = scene;
    this.engine.setScene(scene);
  }

  transitionTo(scene: GameScene): void {
    gsap.to(this.fade, {
      opacity: 1,
      duration: 0.4,
      onComplete: () => {
        this.show(scene);
        gsap.to(this.fade, { opacity: 0, duration: 0.4 });
      },
    });
  }

  dispose(): void {
    this.current?.dispose();
    this.fade.remove();
  }
}
