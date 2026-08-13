export class Tutorial {
  readonly element = document.createElement("div");
  private readonly text = document.createElement("p");
  private readonly button = document.createElement("button");
  private step = 0;

  constructor(overlayRoot: HTMLElement, private readonly onComplete: () => void) {
    this.element.className = "tutorial-tip";
    this.button.textContent = "알겠어요";
    this.button.addEventListener("pointerup", this.advance);
    this.element.append(this.text, this.button);
    overlayRoot.append(this.element);
  }

  showMovement(): void {
    if (this.step > 0) return;
    this.text.textContent = "바닥을 누르거나 드래그해 이동하세요. 음악이 커지는 방향에 입구가 있어요.";
    this.element.classList.add("is-visible");
  }

  showRegion(): void {
    if (this.step > 1) return;
    this.step = 1;
    this.text.textContent = "화면을 드래그하고 확대해 숨은 음표 4개와 네온 장비 3개를 찾아보세요.";
    this.element.classList.add("is-visible");
  }

  dispose(): void {
    this.button.removeEventListener("pointerup", this.advance);
    this.element.remove();
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
