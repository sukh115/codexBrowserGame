export class LoadingScreen {
  readonly element = document.createElement("section");
  private readonly fill = document.createElement("div");
  private readonly status = document.createElement("p");
  private readonly button = document.createElement("button");
  private readonly credits = document.createElement("button");

  constructor() {
    this.element.className = "loading-screen";
    this.element.innerHTML = "<p class=\"eyebrow\">A MUSIC EXPLORATION</p><h1>잃어버린 노래</h1><p class=\"play-guide\">오버월드를 움직여 악기점에 들어가고, 숨은 음표와 미니게임으로 노래를 완성하세요.</p>";
    const track = document.createElement("div");
    track.className = "loading-track";
    this.fill.className = "loading-fill";
    this.status.textContent = "세계를 그리고 있어요… 0%";
    this.button.className = "start-button";
    this.button.textContent = "탐험 시작";
    this.button.hidden = true;
    this.credits.className = "credits-button";
    this.credits.textContent = "크레딧";
    this.credits.addEventListener("pointerup", this.toggleCredits);
    track.append(this.fill);
    this.element.append(track, this.status, this.button, this.credits);
  }

  setProgress(progress: number): void {
    const percent = Math.round(progress * 100);
    this.fill.style.transform = `scaleX(${progress})`;
    this.status.textContent = `세계를 그리고 있어요… ${percent}%`;
  }

  complete(): void {
    this.setProgress(1);
    this.status.textContent = "준비됐어요. 흰 바닥을 눌러 이동해 보세요.";
    this.button.hidden = false;
  }

  onStart(callback: () => void): void {
    this.button.addEventListener("pointerup", callback, { once: true });
  }

  hide(): void {
    this.element.classList.add("is-hidden");
    this.element.addEventListener("transitionend", () => this.element.remove(), { once: true });
  }

  private readonly toggleCredits = (): void => {
    const existing = this.element.querySelector(".credits-card");
    if (existing) {
      existing.remove();
      return;
    }
    const card = document.createElement("div");
    card.className = "credits-card";
    card.innerHTML = "<strong>잃어버린 노래</strong><span>기획 · 디자인 · 사운드 · 개발 팀 프로젝트</span><small>Three.js · GSAP · Web Audio API · Codex Collaboration</small>";
    this.element.append(card);
  };
}
