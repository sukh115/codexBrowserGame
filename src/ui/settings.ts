import type { GameState } from "../core/store";

export class SettingsPanel {
  readonly element = document.createElement("section");
  private readonly master = this.createRange("전체 볼륨", "master-volume");
  private readonly sfx = this.createRange("효과음", "sfx-volume");
  private readonly motion = this.createCheck("애니메이션 줄이기", "reduced-motion");
  private readonly assist = this.createCheck("리듬 판정 넓게", "rhythm-assist");

  constructor(
    overlayRoot: HTMLElement,
    onChange: (patch: Partial<GameState>) => void,
    onReplayTutorial: () => void,
    onResetAll: () => void,
  ) {
    this.element.className = "settings-panel";
    this.element.hidden = true;
    const open = document.createElement("button");
    open.className = "settings-open";
    open.textContent = "설정";
    const close = document.createElement("button");
    close.className = "settings-close";
    close.textContent = "닫기";
    const replayTutorial = document.createElement("button");
    replayTutorial.className = "settings-action";
    replayTutorial.textContent = "튜토리얼 다시 보기";
    const resetAll = document.createElement("button");
    resetAll.className = "settings-action is-danger";
    resetAll.textContent = "전체 진행 초기화";
    open.addEventListener("pointerup", () => {
      this.element.classList.add("is-open");
      overlayRoot.classList.add("is-settings-open");
    });
    close.addEventListener("pointerup", () => {
      this.element.classList.remove("is-open");
      overlayRoot.classList.remove("is-settings-open");
    });
    replayTutorial.addEventListener("pointerup", () => {
      this.element.classList.remove("is-open");
      overlayRoot.classList.remove("is-settings-open");
      onReplayTutorial();
    });
    resetAll.addEventListener("pointerup", () => {
      if (!window.confirm("모든 지역의 진행 상황을 초기화할까요? 볼륨과 접근성 설정은 유지됩니다.")) return;
      onResetAll();
    });
    this.master.input.addEventListener("input", () => onChange({ masterVolume: Number(this.master.input.value) }));
    this.sfx.input.addEventListener("input", () => onChange({ sfxVolume: Number(this.sfx.input.value) }));
    this.motion.input.addEventListener("change", () => onChange({ reducedMotion: this.motion.input.checked }));
    this.assist.input.addEventListener("change", () => onChange({ rhythmAssist: this.assist.input.checked }));
    this.element.append(
      open,
      this.master.label,
      this.sfx.label,
      this.motion.label,
      this.assist.label,
      replayTutorial,
      resetAll,
      close,
    );
    overlayRoot.append(this.element);
  }

  update(state: GameState): void {
    this.master.input.value = String(state.masterVolume);
    this.sfx.input.value = String(state.sfxVolume);
    this.motion.input.checked = state.reducedMotion;
    this.assist.input.checked = state.rhythmAssist;
    document.documentElement.classList.toggle("reduced-motion", state.reducedMotion);
  }

  show(): void {
    this.element.hidden = false;
  }

  private createRange(text: string, id: string): { label: HTMLLabelElement; input: HTMLInputElement } {
    const label = document.createElement("label");
    const input = document.createElement("input");
    input.type = "range";
    input.id = id;
    input.min = "0";
    input.max = "1";
    input.step = "0.05";
    label.htmlFor = id;
    label.append(text, input);
    return { label, input };
  }

  private createCheck(text: string, id: string): { label: HTMLLabelElement; input: HTMLInputElement } {
    const label = document.createElement("label");
    const input = document.createElement("input");
    input.type = "checkbox";
    input.id = id;
    label.htmlFor = id;
    label.append(input, text);
    return { label, input };
  }
}
