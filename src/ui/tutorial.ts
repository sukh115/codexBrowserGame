export class Tutorial {
  readonly element = document.createElement("div");
  private readonly text = document.createElement("p");
  private readonly button = document.createElement("button");
  private step = 0;

  constructor(overlayRoot: HTMLElement, private readonly onComplete: () => void) {
    this.element.className = "tutorial-tip";
    this.button.textContent = "다음";
    this.button.addEventListener("pointerup", this.advance);
    this.element.append(this.text, this.button);
    overlayRoot.append(this.element);
  }

  showMovement(): void {
    if (this.step > 0) return;
    this.text.textContent = "바닥을 짧게 누르면 이동합니다. 포털 안내에서 악기점과 버려진 온실의 거리와 진행도를 확인하세요.";
    this.element.classList.add("is-visible");
  }

  showRegion(): void {
    if (this.step > 1) return;
    this.step = 1;
    this.text.textContent = "좌우로 드래그해 가게 안을 둘러보세요. 악기점에서는 음표, 온실에서는 빛나는 소리 씨앗을 찾고, 표시된 오브젝트는 서로 다른 미니게임 입구입니다.";
    this.element.classList.add("is-visible");
  }

  dispose(): void {
    this.button.removeEventListener("pointerup", this.advance);
    this.element.remove();
  }

  replay(): void {
    this.step = 0;
    this.showMovement();
  }

  private readonly advance = (): void => {
    this.element.classList.remove("is-visible");
    if (this.step === 0) {
      this.step = 1;
      return;
    }
    this.step = 2;
    this.onComplete();
  };
}
