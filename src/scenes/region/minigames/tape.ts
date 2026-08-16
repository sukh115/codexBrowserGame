import type { SfxPlayer } from "../../../audio/sfx";
import type { MinigameFrame } from "./frame";
import type { StopGame } from "./games";

export function startTape(
  frame: MinigameFrame,
  scale: readonly number[],
  sfx: SfxPlayer,
  onClear: () => void,
): StopGame {
  const deck = document.createElement("div");
  deck.className = "tape-deck";
  deck.setAttribute("aria-label", "릴을 드래그해 테이프 속도 맞추기");
  const leftReel = document.createElement("i");
  const rightReel = document.createElement("i");
  leftReel.className = "tape-reel";
  rightReel.className = "tape-reel";
  const tapeLine = document.createElement("span");
  tapeLine.className = "tape-line";
  const gauge = document.createElement("div");
  gauge.className = "tape-gauge";
  const gaugeFill = document.createElement("i");
  gauge.append(gaugeFill);
  deck.append(leftReel, tapeLine, rightReel, gauge);
  frame.stage.append(deck);

  const voice = sfx.createTapeVoice(scale);
  let activePointer: number | null = null;
  let lastX = 0;
  let lastPointerTime = performance.now();
  let playbackRate = 0.3;
  let progressSeconds = 0;
  let lastFrameTime = performance.now();
  let reelRotation = 0;
  let frameId = 0;
  let clearTimer = 0;
  let complete = false;

  const draw = (time: number): void => {
    const delta = Math.min(0.05, Math.max(0, (time - lastFrameTime) / 1000));
    lastFrameTime = time;
    const dragging = activePointer !== null;
    if (time - lastPointerTime >= 120 && playbackRate > 0.3) {
      playbackRate += (0.3 - playbackRate) * Math.min(1, delta * 2);
      if (playbackRate < 0.305) playbackRate = 0.3;
      voice?.setPlaybackRate(playbackRate);
    }
    if (dragging && playbackRate >= 0.9 && playbackRate <= 1.1) {
      progressSeconds = Math.min(8, progressSeconds + delta);
    }
    reelRotation += dragging ? playbackRate * delta * 220 : 0;
    leftReel.style.transform = `rotate(${reelRotation}deg)`;
    rightReel.style.transform = `rotate(${reelRotation}deg)`;
    gaugeFill.style.width = `${(progressSeconds / 8) * 100}%`;
    frame.status.textContent = `속도 ${playbackRate.toFixed(2)}× · 안정 재생 ${progressSeconds.toFixed(1)}/8.0초`;
    if (!complete && progressSeconds >= 8) {
      complete = true;
      voice?.setActive(false);
      sfx.playArpeggio(scale);
      frame.status.textContent = "원래 속도의 멜로디를 복원했어요!";
      clearTimer = window.setTimeout(onClear, 650);
    }
    frameId = requestAnimationFrame(draw);
  };

  const onPointerDown = (event: PointerEvent): void => {
    if (activePointer !== null || complete) return;
    activePointer = event.pointerId;
    lastX = event.clientX;
    lastPointerTime = performance.now();
    deck.setPointerCapture(event.pointerId);
    voice?.setActive(true);
  };
  const onPointerMove = (event: PointerEvent): void => {
    if (event.pointerId !== activePointer) return;
    const now = performance.now();
    const seconds = Math.max(0.016, (now - lastPointerTime) / 1000);
    const speed = Math.abs(event.clientX - lastX) / seconds;
    playbackRate = Math.max(0.3, Math.min(2, 0.3 + speed / 145));
    voice?.setPlaybackRate(playbackRate);
    lastX = event.clientX;
    lastPointerTime = now;
  };
  const onPointerUp = (event: PointerEvent): void => {
    if (event.pointerId !== activePointer) return;
    activePointer = null;
    voice?.setActive(false);
  };

  deck.addEventListener("pointerdown", onPointerDown);
  deck.addEventListener("pointermove", onPointerMove);
  deck.addEventListener("pointerup", onPointerUp);
  deck.addEventListener("pointercancel", onPointerUp);
  frame.status.textContent = "릴을 일정한 속도로 좌우 드래그하세요";
  frameId = requestAnimationFrame(draw);
  return () => {
    cancelAnimationFrame(frameId);
    window.clearTimeout(clearTimer);
    voice?.stop();
    deck.removeEventListener("pointerdown", onPointerDown);
    deck.removeEventListener("pointermove", onPointerMove);
    deck.removeEventListener("pointerup", onPointerUp);
    deck.removeEventListener("pointercancel", onPointerUp);
  };
}
