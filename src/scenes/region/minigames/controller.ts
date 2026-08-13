import * as THREE from "three";
import { MinigameFrame } from "./frame";
import { startMinigame, type StopGame } from "./games";
import { MINIGAME_SPOTS, type MinigameSpot } from "./types";

export class MinigameController {
  private readonly buttons: HTMLButtonElement[] = [];
  private readonly frame: MinigameFrame;
  private activeSpot: MinigameSpot | null = null;
  private stopGame: StopGame | null = null;
  private readonly worldPosition = new THREE.Vector3();
  private readonly projected = new THREE.Vector3();

  constructor(
    overlayRoot: HTMLElement,
    private readonly backgroundWidth: number,
    private readonly backgroundHeight: number,
    private readonly bpm: number,
    private readonly getTransportTime: () => number,
    private readonly playTone: (index: number) => void,
    private readonly getRhythmAssist: () => boolean,
    cleared: readonly string[],
    private readonly onModalChange: (open: boolean) => void,
    private readonly onClear: (gameId: string, rewardNoteId: string) => void,
  ) {
    this.frame = new MinigameFrame(overlayRoot, () => this.close());
    MINIGAME_SPOTS.forEach((spot) => {
      const button = document.createElement("button");
      button.className = `minigame-entrance entrance-${spot.type}`;
      button.dataset.gameId = spot.id;
      this.setButtonContent(button, spot, cleared.includes(spot.id));
      button.disabled = cleared.includes(spot.id);
      button.addEventListener("pointerup", () => this.open(spot));
      overlayRoot.append(button);
      this.buttons.push(button);
    });
  }

  update(camera: THREE.OrthographicCamera, width: number, height: number): void {
    MINIGAME_SPOTS.forEach((spot, index) => {
      this.worldPosition.set(
        (spot.u - 0.5) * this.backgroundWidth,
        (0.5 - spot.v) * this.backgroundHeight,
        0.25,
      );
      this.projected.copy(this.worldPosition).project(camera);
      const button = this.buttons[index];
      button.style.left = `${(this.projected.x * 0.5 + 0.5) * width}px`;
      button.style.top = `${(-this.projected.y * 0.5 + 0.5) * height}px`;
      button.hidden = Math.abs(this.projected.x) > 1.1 || Math.abs(this.projected.y) > 1.1;
    });
  }

  syncCleared(cleared: readonly string[]): void {
    MINIGAME_SPOTS.forEach((spot, index) => {
      const complete = cleared.includes(spot.id);
      this.buttons[index].disabled = complete;
      this.setButtonContent(this.buttons[index], spot, complete);
    });
  }

  dispose(): void {
    this.stopGame?.();
    this.frame.element.remove();
    this.buttons.forEach((button) => button.remove());
  }

  private open(spot: MinigameSpot): void {
    if (this.activeSpot) return;
    this.activeSpot = spot;
    this.onModalChange(true);
    this.frame.open(spot);
    this.stopGame = startMinigame(
      spot.type,
      this.frame,
      this.bpm,
      this.getTransportTime,
      this.playTone,
      this.getRhythmAssist(),
      () => {
      this.onClear(spot.id, spot.rewardNoteId);
      this.close();
      },
    );
  }

  private close(): void {
    this.stopGame?.();
    this.stopGame = null;
    this.activeSpot = null;
    this.frame.close();
    this.onModalChange(false);
  }

  private setButtonContent(button: HTMLButtonElement, spot: MinigameSpot, complete: boolean): void {
    const icons: Record<MinigameSpot["type"], string> = {
      timing: "AMP",
      rhythm: "BEAT",
      memory: "CRT",
    };
    button.innerHTML = `<b>${complete ? "✓" : icons[spot.type]}</b><span>${complete ? "완료" : spot.label}</span>`;
  }
}
