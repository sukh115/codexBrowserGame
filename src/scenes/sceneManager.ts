import { gsap } from "gsap";
import type { Engine, GameScene } from "../core/engine";

export class SceneManager {
  private current: GameScene | null = null;
  private readonly fade: HTMLDivElement;
  private transitioning = false;

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
    if (this.transitioning) {
      scene.dispose();
      return;
    }
    this.transitioning = true;
    this.fade.classList.add("is-blocking");
    gsap.to(this.fade, {
      opacity: 1,
      duration: 0.4,
      onComplete: () => {
        this.show(scene);
        gsap.to(this.fade, {
          opacity: 0,
          duration: 0.4,
          onComplete: () => {
            this.transitioning = false;
            this.fade.classList.remove("is-blocking");
          },
        });
      },
    });
  }

  dispose(): void {
    gsap.killTweensOf(this.fade);
    this.current?.dispose();
    this.fade.remove();
  }
}
