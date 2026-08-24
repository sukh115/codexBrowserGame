import { getNoteCountForRegion, type GameState } from "../core/store";
import { ASSET_MANIFEST, type RegionId } from "../core/assetManifest";

export class Hud {
  readonly element = document.createElement("aside");
  private readonly muteButton = document.createElement("button");
  private readonly resetButton = document.createElement("button");
  private readonly menuButton = document.createElement("button");
  private readonly progress = document.createElement("div");
  private readonly actions = document.createElement("div");
  private currentScene: GameState["currentScene"] = "loading";

  constructor(
    overlayRoot: HTMLElement,
    onToggleMute: () => void,
    onResetRegion: () => void,
  ) {
    this.element.className = "hud";
    this.menuButton.className = "hud-button menu-toggle";
    this.menuButton.textContent = "메뉴";
    this.menuButton.setAttribute("aria-expanded", "false");
    this.muteButton.className = "hud-button mute-button";
    this.resetButton.className = "hud-button reset-button";
    this.resetButton.textContent = "현재 지역 초기화";
    this.progress.className = "world-progress";
    this.actions.className = "hud-actions";
    this.menuButton.addEventListener("pointerup", () => {
      const open = overlayRoot.classList.toggle("is-menu-open");
      this.menuButton.setAttribute("aria-expanded", String(open));
    });
    this.muteButton.addEventListener("pointerup", onToggleMute);
    this.resetButton.addEventListener("pointerup", () => {
      if (!window.confirm("현재 지역에서 모은 음표와 미니게임 기록을 초기화할까요?")) return;
      onResetRegion();
      this.closeMenu(overlayRoot);
    });
    this.actions.append(this.muteButton, this.resetButton);
    this.element.append(this.progress, this.menuButton, this.actions);
    overlayRoot.append(this.element);
  }

  update(state: GameState): void {
    if (this.currentScene !== state.currentScene) this.closeMenu(this.element.parentElement);
    this.currentScene = state.currentScene;
    this.element.classList.toggle("is-overworld", state.currentScene === "overworld");
    this.element.classList.toggle("is-region", state.currentScene === "region");
    const regionProgress = (["music-shop", "neon-forest"] satisfies RegionId[]).map((regionId) => {
      const manifest = ASSET_MANIFEST.regions[regionId];
      const count = getNoteCountForRegion(state.collectedNotes, regionId);
      const complete = state.completedRegions.includes(regionId);
      const secret = state.collectedNotes.includes(`secret-${regionId}`) ? " ★" : "";
      return `<span class="${state.currentRegion === regionId ? "is-current" : ""} ${complete ? "is-complete" : ""}">${complete ? "✓ " : ""}${manifest.title} ${count}/${manifest.noteGoal}${secret}</span>`;
    });
    this.progress.innerHTML = regionProgress.join("");
    this.muteButton.textContent = state.muted ? "소리 켜기" : "음소거";
  }

  private closeMenu(overlayRoot: HTMLElement | null): void {
    overlayRoot?.classList.remove("is-menu-open", "is-settings-open");
    overlayRoot?.querySelector(".settings-panel")?.classList.remove("is-open");
    this.menuButton.setAttribute("aria-expanded", "false");
  }
}
