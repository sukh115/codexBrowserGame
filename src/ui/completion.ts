import { gsap } from "gsap";

export class CompletionOverlay {
  readonly element = document.createElement("section");
  private readonly title = document.createElement("h2");
  private readonly subtitle = document.createElement("p");
  private readonly particles = document.createElement("div");
  private readonly beatFlash = document.createElement("div");
  private timeline: gsap.core.Timeline | null = null;

  constructor(overlayRoot: HTMLElement) {
    this.element.className = "completion-overlay";
    this.title.textContent = "잠든 악기점의 노래가 완성되었어요";
    this.subtitle.textContent = "모든 소리가 다시 깨어났습니다";
    this.particles.className = "completion-particles";
    this.beatFlash.className = "completion-beat-flash";
    for (let index = 0; index < 28; index += 1) {
      const particle = document.createElement("i");
      particle.style.setProperty("--particle-x", `${(index * 37) % 100}%`);
      particle.style.setProperty("--particle-delay", `${(index % 7) * 0.06}s`);
      particle.style.setProperty("--particle-color", index % 3 === 0 ? "#63f3df" : index % 3 === 1 ? "#e97ac7" : "#a37ae6");
      this.particles.append(particle);
    }
    this.element.append(this.beatFlash, this.particles, this.title, this.subtitle);
    overlayRoot.append(this.element);
  }

  show(onUnlock: () => void): void {
    this.timeline?.kill();
    this.element.classList.add("is-visible");
    this.timeline = gsap.timeline({
      onComplete: () => {
        this.element.classList.remove("is-visible");
      },
    });
    this.timeline
      .fromTo(this.element, { opacity: 0 }, { opacity: 1, duration: 0.35 })
      .fromTo(this.title, { scale: 0.45, y: 26 }, { scale: 1, y: 0, duration: 0.8, ease: "back.out(1.7)" }, 0.15)
      .fromTo(this.subtitle, { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.45 }, 0.7)
      .call(onUnlock, [], 2)
      .to([this.title, this.subtitle], { opacity: 0, y: -15, duration: 0.55 }, 3.2)
      .to(this.element, { opacity: 0, duration: 0.45 }, 3.35);
  }

  hide(): void {
    this.timeline?.kill();
    this.timeline = null;
    this.element.classList.remove("is-visible");
    gsap.set(this.element, { clearProps: "opacity" });
  }
}
