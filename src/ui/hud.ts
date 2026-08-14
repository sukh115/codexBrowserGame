import { getNoteCountForRegion, type GameState } from "../core/store";

export class Hud {
  readonly element = document.createElement("aside");
  private readonly muteButton = document.createElement("button");
  private readonly resetButton = document.createElement("button");
  private readonly replayButton = document.createElement("button");
  private readonly menuButton = document.createElement("button");
  private readonly progress = document.createElement("div");
  private readonly actions = document.createElement("div");
  private currentScene: GameState["currentScene"] = "loading";

  constructor(
    overlayRoot: HTMLElement,
    onToggleMute: () => void,
    onResetRegion: () => void,
    onReplay: () => void,
  ) {
    this.element.className = "hud";
    this.menuButton.className = "hud-button menu-toggle";
    this.menuButton.textContent = "메뉴";
    this.menuButton.setAttribute("aria-expanded", "false");
    this.muteButton.className = "hud-button mute-button";
    this.resetButton.className = "hud-button reset-button";
    this.resetButton.textContent = "현재 지역 초기화";
    this.replayButton.className = "hud-button replay-button";
    this.replayButton.textContent = "완성곡 감상";
    this.replayButton.hidden = true;
    this.progress.className = "world-progress";
    this.actions.className = "hud-actions";
    this.menuButton.addEventListener("pointerup", () => {
      const open = overlayRoot.classList.toggle("is-menu-open");
      this.menuButton.setAttribute("aria-expanded", String(open));
    });
    this.muteButton.addEventListener("pointerup", onToggleMute);
    this.resetButton.addEventListener("pointerup", () => {
      onResetRegion();
      this.closeMenu(overlayRoot);
    });
    this.replayButton.addEventListener("pointerup", () => {
      onReplay();
      this.closeMenu(overlayRoot);
    });
    this.actions.append(this.muteButton, this.resetButton, this.replayButton);
    this.element.append(this.progress, this.menuButton, this.actions);
    overlayRoot.append(this.element);
  }

  update(state: GameState): void {
    if (this.currentScene !== state.currentScene) this.closeMenu(this.element.parentElement);
    this.currentScene = state.currentScene;
    this.element.classList.toggle("is-overworld", state.currentScene === "overworld");
    this.element.classList.toggle("is-region", state.currentScene === "region");
    const shopCount = getNoteCountForRegion(state.collectedNotes, "music-shop");
    const greenhouseCount = getNoteCountForRegion(state.collectedNotes, "neon-forest");
    const shopComplete = state.completedRegions.includes("music-shop");
    const greenhouseComplete = state.completedRegions.includes("neon-forest");
    this.progress.innerHTML = `<span class="${state.currentRegion === "music-shop" ? "is-current" : ""} ${shopComplete ? "is-complete" : ""}">${shopComplete ? "✓ " : ""}악기점 ${shopCount}/7</span><span class="${state.currentRegion === "neon-forest" ? "is-current" : ""} ${greenhouseComplete ? "is-complete" : ""}">${greenhouseComplete ? "✓ " : ""}온실 ${greenhouseCount}/7</span>`;
    this.replayButton.hidden = !state.completed;
    this.muteButton.textContent = state.muted ? "소리 켜기" : "음소거";
  }

  private closeMenu(overlayRoot: HTMLElement | null): void {
    overlayRoot?.classList.remove("is-menu-open", "is-settings-open");
    overlayRoot?.querySelector(".settings-panel")?.classList.remove("is-open");
    this.menuButton.setAttribute("aria-expanded", "false");
  }
}
