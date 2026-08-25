import * as THREE from "three";
import type { DialogueStage } from "../../regionData/musicShopDialogue";

const EDGE_MARGIN_PX = 58;

export class NpcDialogue {
  private readonly button = document.createElement("button");
  private readonly overlay = document.createElement("section");
  private readonly text = document.createElement("p");
  private readonly progress = document.createElement("span");
  private readonly portrait = document.createElement("img");
  private readonly nextButton = document.createElement("button");
  private readonly closeButton = document.createElement("button");
  private readonly worldPosition = new THREE.Vector3();
  private readonly projected = new THREE.Vector3();
  private lineIndex = 0;
  private collectedCount = 0;
  private open = false;

  constructor(
    overlayRoot: HTMLElement,
    private readonly backgroundWidth: number,
    private readonly backgroundHeight: number,
    private readonly u: number,
    private readonly v: number,
    private readonly stages: readonly DialogueStage[],
    private readonly portraits: readonly string[],
    private readonly noteGoal: number,
    private readonly onModalChange: (open: boolean) => void,
  ) {
    this.button.className = "npc-dialogue-trigger";
    this.button.innerHTML = "<b>♬</b><span>다카포</span>";
    this.button.setAttribute("aria-label", "다카포와 대화");
    this.button.addEventListener("pointerup", this.show);

    this.overlay.className = "npc-dialogue-overlay";
    this.overlay.setAttribute("role", "dialog");
    this.overlay.setAttribute("aria-label", "다카포와의 대화");
    this.overlay.setAttribute("aria-modal", "true");
    this.overlay.setAttribute("aria-hidden", "true");
    this.overlay.setAttribute("aria-live", "polite");
    const panel = document.createElement("div");
    panel.className = "npc-dialogue-panel";
    const header = document.createElement("header");
    const name = document.createElement("strong");
    name.textContent = "다카포";
    this.progress.className = "npc-dialogue-progress";
    header.append(name, this.progress);
    const body = document.createElement("div");
    body.className = "npc-dialogue-body";
    this.portrait.className = "npc-dialogue-portrait";
    this.portrait.alt = "다카포의 표정";
    this.portrait.draggable = false;
    this.text.className = "npc-dialogue-text";
    body.append(this.portrait, this.text);
    const actions = document.createElement("div");
    actions.className = "npc-dialogue-actions";
    this.closeButton.textContent = "닫기";
    this.nextButton.textContent = "다음";
    this.closeButton.addEventListener("pointerup", this.hide);
    this.nextButton.addEventListener("pointerup", this.advance);
    document.addEventListener("keydown", this.handleKeyDown);
    actions.append(this.closeButton, this.nextButton);
    panel.append(header, body, actions);
    this.overlay.append(panel);
    overlayRoot.append(this.button, this.overlay);
  }

  update(camera: THREE.OrthographicCamera, width: number, height: number): void {
    this.worldPosition.set(
      (this.u - 0.5) * this.backgroundWidth,
      (0.5 - this.v) * this.backgroundHeight,
      0.3,
    );
    this.projected.copy(this.worldPosition).project(camera);
    const screenX = (this.projected.x * 0.5 + 0.5) * width;
    const screenY = (-this.projected.y * 0.5 + 0.5) * height;
    this.button.style.left = `${screenX}px`;
    this.button.style.top = `${screenY}px`;
    this.button.hidden = screenX < EDGE_MARGIN_PX
      || screenX > width - EDGE_MARGIN_PX
      || screenY < EDGE_MARGIN_PX
      || screenY > height - EDGE_MARGIN_PX;
  }

  setProgress(count: number): void {
    this.collectedCount = Math.max(0, Math.min(this.noteGoal, count));
    if (this.open) this.renderLine();
  }

  dispose(): void {
    this.button.removeEventListener("pointerup", this.show);
    this.closeButton.removeEventListener("pointerup", this.hide);
    this.nextButton.removeEventListener("pointerup", this.advance);
    document.removeEventListener("keydown", this.handleKeyDown);
    this.button.remove();
    this.overlay.remove();
  }

  private readonly show = (): void => {
    this.lineIndex = 0;
    this.open = true;
    this.overlay.classList.add("is-open");
    this.overlay.setAttribute("aria-hidden", "false");
    this.onModalChange(true);
    this.renderLine();
    this.nextButton.focus();
  };

  private readonly hide = (): void => {
    this.open = false;
    this.overlay.classList.remove("is-open");
    this.overlay.setAttribute("aria-hidden", "true");
    this.onModalChange(false);
    this.button.focus();
  };

  private readonly handleKeyDown = (event: KeyboardEvent): void => {
    if (event.key !== "Escape" || !this.open) return;
    event.preventDefault();
    this.hide();
  };

  private readonly advance = (): void => {
    const stage = this.getStage();
    if (this.lineIndex >= stage.lines.length - 1) {
      this.hide();
      return;
    }
    this.lineIndex += 1;
    this.renderLine();
  };

  private renderLine(): void {
    const stage = this.getStage();
    this.lineIndex = Math.min(this.lineIndex, stage.lines.length - 1);
    this.progress.textContent = `기억 ${this.collectedCount}/${this.noteGoal}`;
    this.portrait.src = this.portraits[this.collectedCount]
      ?? this.portraits[this.portraits.length - 1]
      ?? "";
    this.text.textContent = stage.lines[this.lineIndex];
    this.nextButton.textContent = this.lineIndex >= stage.lines.length - 1 ? "대화 마치기" : "다음";
  }

  private getStage(): DialogueStage {
    return this.stages[this.collectedCount] ?? this.stages[this.stages.length - 1];
  }
}
