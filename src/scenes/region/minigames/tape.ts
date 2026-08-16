import type { SfxPlayer } from "../../../audio/sfx";
import type { MinigameFrame } from "./frame";
import type { StopGame } from "./games";

type TapePhase = "reference" | "play" | "completion" | "done";

export function startTape(
  frame: MinigameFrame,
  scale: readonly number[],
  rhythmAssist: boolean,
  sfx: SfxPlayer,
  onClear: () => void,
): StopGame {
  const minimumTargetRate = rhythmAssist ? 0.7 : 0.8;
  const maximumTargetRate = rhythmAssist ? 1.4 : 1.25;
  const targetSeconds = 5;
  const graceSeconds = 0.4;
  const referenceSeconds = 1.92;
  const completionSeconds = 1.9;
  const progressThresholds = [0.25, 0.5, 0.75] as const;
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
  const gaugeLabel = document.createElement("span");
  gaugeLabel.className = "tape-gauge-label";
  gaugeLabel.textContent = "정속 유지";
  gauge.append(gaugeFill, gaugeLabel);
  deck.append(leftReel, tapeLine, rightReel, gauge);
  frame.stage.append(deck);

  const speedStatus = document.createElement("span");
  const rateStatus = document.createElement("strong");
  const progressStatus = document.createElement("span");
  frame.status.classList.add("tape-status");

  const voice = sfx.createTapeVoice(scale);
  let activePointer: number | null = null;
  let lastX = 0;
  let movedPx = 0;
  let smoothedRate = 0.3;
  let progressSeconds = 0;
  let graceRemaining = 0;
  let lastFrameTime = performance.now();
  let reelRotation = 0;
  let frameId = 0;
  let clearTimer = 0;
  let hasInteracted = false;
  let phase: TapePhase = "reference";
  let phaseElapsed = 0;
  let wasInTargetRange = false;
  let lastBandTransitionTime = Number.NEGATIVE_INFINITY;
  let nextProgressTick = 0;

  deck.classList.add("is-reference");
  voice?.setPlaybackRate(1);
  voice?.setActive(true);
  frame.status.textContent = "이 속도를 기억하세요";

  const updateStatus = (): void => {
    const inTargetRange = smoothedRate >= minimumTargetRate && smoothedRate <= maximumTargetRate;
    speedStatus.textContent = `속도 ${smoothedRate.toFixed(2)}×`;
    rateStatus.textContent = inTargetRange
      ? "정속이에요"
      : smoothedRate < minimumTargetRate ? "너무 느려요" : "너무 빨라요";
    progressStatus.textContent = `안정 재생 ${progressSeconds.toFixed(1)}/${targetSeconds.toFixed(1)}초`;
    frame.status.classList.toggle("is-target-rate", inTargetRange);
    frame.status.replaceChildren(speedStatus, rateStatus, progressStatus);
  };

  const draw = (time: number): void => {
    const delta = Math.min(0.05, Math.max(0, (time - lastFrameTime) / 1000));
    lastFrameTime = time;

    if (phase === "reference") {
      phaseElapsed += delta;
      reelRotation += delta * 220;
      if (phaseElapsed >= referenceSeconds) {
        phase = "play";
        phaseElapsed = 0;
        smoothedRate = 0;
        deck.classList.remove("is-reference");
        voice?.setActive(false);
        frame.status.textContent = "이제 릴을 문질러 그 속도를 찾으세요";
      }
      leftReel.style.transform = `rotate(${reelRotation}deg)`;
      rightReel.style.transform = `rotate(${reelRotation}deg)`;
      frameId = requestAnimationFrame(draw);
      return;
    }

    if (phase === "completion") {
      phaseElapsed += delta;
      const visualRate = Math.max(0.18, 1 - phaseElapsed / completionSeconds * 0.82);
      reelRotation += visualRate * delta * 220;
      leftReel.style.transform = `rotate(${reelRotation}deg)`;
      rightReel.style.transform = `rotate(${reelRotation}deg)`;
      if (phaseElapsed >= completionSeconds) {
        phase = "done";
        voice?.setActive(false);
        sfx.playArpeggio(scale);
        deck.classList.remove("is-target-rate", "is-completing");
        frame.status.classList.remove("is-target-rate");
        frame.status.textContent = "원래 속도의 멜로디를 복원했어요!";
        clearTimer = window.setTimeout(onClear, 750);
      }
      frameId = requestAnimationFrame(draw);
      return;
    }

    if (phase === "done") {
      frameId = requestAnimationFrame(draw);
      return;
    }

    const dragging = activePointer !== null;
    const speed = delta > 0 ? movedPx / delta : 0;
    movedPx = 0;
    const rawRate = dragging ? Math.max(0, Math.min(2, speed / 400)) : 0;
    smoothedRate += (rawRate - smoothedRate) * Math.min(1, delta * 8);
    voice?.setPlaybackRate(Math.max(0.3, smoothedRate));
    const inTargetRange = smoothedRate >= minimumTargetRate && smoothedRate <= maximumTargetRate;
    if (inTargetRange !== wasInTargetRange) {
      const transitionInterval = time - lastBandTransitionTime;
      deck.classList.toggle("is-target-rate", inTargetRange);
      if (inTargetRange && transitionInterval >= 200) sfx.playTapeLock();
      wasInTargetRange = inTargetRange;
      lastBandTransitionTime = time;
    }
    if (dragging && inTargetRange) {
      graceRemaining = graceSeconds;
      progressSeconds = Math.min(targetSeconds, progressSeconds + delta);
    } else if (dragging && graceRemaining > 0) {
      graceRemaining = Math.max(0, graceRemaining - delta);
    }
    reelRotation += dragging ? smoothedRate * delta * 220 : 0;
    leftReel.style.transform = `rotate(${reelRotation}deg)`;
    rightReel.style.transform = `rotate(${reelRotation}deg)`;
    gaugeFill.style.width = `${(progressSeconds / targetSeconds) * 100}%`;
    while (nextProgressTick < progressThresholds.length
      && progressSeconds / targetSeconds >= progressThresholds[nextProgressTick]) {
      sfx.playTone(nextProgressTick + 1, 0.11);
      nextProgressTick += 1;
    }
    if (hasInteracted) updateStatus();
    if (progressSeconds >= targetSeconds) {
      phase = "completion";
      phaseElapsed = 0;
      activePointer = null;
      movedPx = 0;
      smoothedRate = 1;
      voice?.setPlaybackRate(1);
      voice?.setActive(true);
      deck.classList.add("is-target-rate", "is-completing");
      frame.status.classList.add("is-target-rate");
      frame.status.textContent = "찾았어요! 완성된 속도로 재생 중…";
    }
    frameId = requestAnimationFrame(draw);
  };

  const onPointerDown = (event: PointerEvent): void => {
    if (phase !== "play" || activePointer !== null) return;
    activePointer = event.pointerId;
    hasInteracted = true;
    lastX = event.clientX;
    movedPx = 0;
    deck.setPointerCapture(event.pointerId);
    voice?.setPlaybackRate(Math.max(0.3, smoothedRate));
    voice?.setActive(true);
  };
  const onPointerMove = (event: PointerEvent): void => {
    if (event.pointerId !== activePointer) return;
    movedPx += Math.abs(event.clientX - lastX);
    lastX = event.clientX;
  };
  const onPointerUp = (event: PointerEvent): void => {
    if (event.pointerId !== activePointer) return;
    activePointer = null;
    graceRemaining = 0;
    voice?.setActive(false);
  };

  deck.addEventListener("pointerdown", onPointerDown);
  deck.addEventListener("pointermove", onPointerMove);
  deck.addEventListener("pointerup", onPointerUp);
  deck.addEventListener("pointercancel", onPointerUp);
  frameId = requestAnimationFrame(draw);
  return () => {
    cancelAnimationFrame(frameId);
    window.clearTimeout(clearTimer);
    voice?.stop();
    frame.status.classList.remove("tape-status", "is-target-rate");
    deck.removeEventListener("pointerdown", onPointerDown);
    deck.removeEventListener("pointermove", onPointerMove);
    deck.removeEventListener("pointerup", onPointerUp);
    deck.removeEventListener("pointercancel", onPointerUp);
  };
}
