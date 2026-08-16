import type { MinigameSpot } from "../../../regionData/types";

export class MinigameFrame {
  readonly element = document.createElement("section");
  readonly stage = document.createElement("div");
  readonly status = document.createElement("p");
  private readonly title = document.createElement("h2");
  private readonly closeButton = document.createElement("button");

  constructor(overlayRoot: HTMLElement, onClose: () => void) {
    this.element.className = "minigame-overlay";
    const panel = document.createElement("div");
    panel.className = "minigame-panel";
    this.title.className = "minigame-title";
    this.status.className = "minigame-status";
    this.stage.className = "minigame-stage";
    this.closeButton.className = "minigame-close";
    this.closeButton.textContent = "닫기";
    this.closeButton.addEventListener("pointerup", onClose);
    panel.append(this.title, this.status, this.stage, this.closeButton);
    this.element.append(panel);
    overlayRoot.append(this.element);
  }

  open(spot: MinigameSpot): void {
    this.title.textContent = spot.label;
    this.status.textContent = "준비하세요";
    this.stage.replaceChildren();
    this.stage.dataset.gameType = spot.type;
    this.element.classList.add("is-open");
  }

  close(): void {
    this.element.classList.remove("is-open");
    this.stage.replaceChildren();
    delete this.stage.dataset.gameType;
  }
}
