import { getNoteCountForRegion, getRegionNoteCount, type GameState } from "../core/store";

export class Hud {
  readonly element = document.createElement("aside");
  private readonly counter = document.createElement("div");
  private readonly muteButton = document.createElement("button");
  private readonly resetButton = document.createElement("button");
  private readonly replayButton = document.createElement("button");
  private readonly progress = document.createElement("div");
  private previousCount = 0;

  constructor(
    overlayRoot: HTMLElement,
    onToggleMute: () => void,
    onReset: () => void,
    onReplay: () => void,
  ) {
    this.element.className = "hud";
    this.counter.className = "note-counter";
    this.muteButton.className = "hud-button mute-button";
    this.resetButton.className = "hud-button reset-button";
    this.resetButton.textContent = "처음부터";
    this.replayButton.className = "hud-button replay-button";
    this.replayButton.textContent = "완성곡 감상";
    this.replayButton.hidden = true;
    this.progress.className = "world-progress";
    this.muteButton.addEventListener("pointerup", onToggleMute);
    this.resetButton.addEventListener("pointerup", onReset);
    this.replayButton.addEventListener("pointerup", onReplay);
    this.element.append(this.counter, this.progress, this.muteButton, this.resetButton, this.replayButton);
    overlayRoot.append(this.element);
  }

  update(state: GameState): void {
    const regionCount = getRegionNoteCount(state);
    const shopCount = getNoteCountForRegion(state.collectedNotes, "music-shop");
    const greenhouseCount = getNoteCountForRegion(state.collectedNotes, "neon-forest");
    this.progress.innerHTML = `<span class="${state.currentRegion === "music-shop" ? "is-current" : ""}">악기점 ${shopCount}/7</span><span class="${state.currentRegion === "neon-forest" ? "is-current" : ""}">온실 ${greenhouseCount}/7</span>`;
    this.counter.textContent = state.completed ? "♪ 지역 노래 완성" : `♪ ${regionCount}/7`;
    this.counter.classList.toggle("is-complete", state.completed);
    this.replayButton.hidden = !state.completed;
    this.muteButton.textContent = state.muted ? "소리 켜기" : "음소거";
    if (regionCount > this.previousCount) {
      this.counter.classList.remove("is-pulsing");
      requestAnimationFrame(() => this.counter.classList.add("is-pulsing"));
    }
    this.previousCount = regionCount;
  }
}
