import { GAME_EVENTS, INPUT_LIMITS } from "./constants";

export interface TapDetail {
  readonly clientX: number;
  readonly clientY: number;
}

export class PointerInput extends EventTarget {
  private pointerId: number | null = null;
  private startX = 0;
  private startY = 0;
  private startTime = 0;

  constructor(private readonly element: HTMLElement) {
    super();
    element.addEventListener("pointerdown", this.onPointerDown);
    element.addEventListener("pointerup", this.onPointerUp);
    element.addEventListener("pointercancel", this.onPointerCancel);
  }

  dispose(): void {
    this.element.removeEventListener("pointerdown", this.onPointerDown);
    this.element.removeEventListener("pointerup", this.onPointerUp);
    this.element.removeEventListener("pointercancel", this.onPointerCancel);
  }

  private readonly onPointerDown = (event: PointerEvent): void => {
    if (!event.isPrimary) return;
    this.pointerId = event.pointerId;
    this.startX = event.clientX;
    this.startY = event.clientY;
    this.startTime = performance.now();
    this.element.setPointerCapture(event.pointerId);
  };

  private readonly onPointerUp = (event: PointerEvent): void => {
    if (event.pointerId !== this.pointerId) return;
    const distance = Math.hypot(event.clientX - this.startX, event.clientY - this.startY);
    const duration = performance.now() - this.startTime;
    if (distance < INPUT_LIMITS.TAP_DISTANCE_PX && duration < INPUT_LIMITS.TAP_DURATION_MS) {
      const detail: TapDetail = { clientX: event.clientX, clientY: event.clientY };
      this.dispatchEvent(new CustomEvent<TapDetail>(GAME_EVENTS.TAP, { detail }));
    }
    this.pointerId = null;
  };

  private readonly onPointerCancel = (): void => {
    this.pointerId = null;
  };
}
