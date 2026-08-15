import type { SfxPlayer } from "../../../audio/sfx";
import type { TuningVoice } from "../../../audio/minigameVoices";
import type { MinigameFrame } from "./frame";
import type { StopGame } from "./games";

const STRING_SCALE_INDEXES = [0, 3, 5] as const;

export function startTuning(
  frame: MinigameFrame,
  scale: readonly number[],
  assist: boolean,
  sfx: SfxPlayer,
  onClear: () => void,
): StopGame {
  const canvas = document.createElement("canvas");
  canvas.className = "tuning-wave";
  canvas.width = 560;
  canvas.height = 150;
  const track = document.createElement("div");
  track.className = "tuning-track";
  track.setAttribute("role", "slider");
  track.setAttribute("aria-label", "조율 보정 슬라이더");
  track.setAttribute("aria-valuemin", "-50");
  track.setAttribute("aria-valuemax", "50");
  const knob = document.createElement("i");
  knob.className = "tuning-knob";
  track.append(knob);
  frame.stage.append(canvas, track);
  const context = canvas.getContext("2d");
  if (!context) throw new Error("조율 파형 캔버스를 만들 수 없습니다.");

  const tolerance = assist ? 8 : 4;
  let stringIndex = 0;
  let initialDetune = 0;
  let correction = 0;
  let heldSeconds = 0;
  let matchedSince = 0;
  let frameId = 0;
  let clearTimer = 0;
  let activePointer: number | null = null;
  let voice: TuningVoice | null = null;
  let complete = false;

  const randomDetune = (): number => {
    const amount = 25 + Math.random() * 15;
    return Math.random() < 0.5 ? -amount : amount;
  };

  const updateCorrection = (clientX: number): void => {
    const bounds = track.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (clientX - bounds.left) / bounds.width));
    correction = -50 + ratio * 100;
    knob.style.left = `${ratio * 100}%`;
    track.setAttribute("aria-valuenow", correction.toFixed(1));
    voice?.setDetune(initialDetune + correction);
  };

  const beginString = (): void => {
    voice?.stop();
    initialDetune = randomDetune();
    correction = 0;
    heldSeconds = 0;
    matchedSince = 0;
    knob.style.left = "50%";
    const frequency = scale[Math.min(STRING_SCALE_INDEXES[stringIndex], scale.length - 1)] ?? 220;
    voice = sfx.createTuningVoice(frequency, initialDetune);
    frame.status.textContent = `${stringIndex + 1}/3번 줄 · 맥놀이가 잔잔해지도록 조절하세요`;
  };

  const draw = (time: number): void => {
    const error = Math.abs(initialDetune + correction);
    if (error <= tolerance) {
      if (matchedSince === 0) matchedSince = time;
      heldSeconds = (time - matchedSince) / 1000;
    } else {
      matchedSince = 0;
      heldSeconds = 0;
    }
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.strokeStyle = error <= tolerance ? "#f6df91" : "#70e1d3";
    context.lineWidth = 3;
    context.beginPath();
    const amplitude = 5 + Math.min(42, error * 0.75);
    for (let x = 0; x <= canvas.width; x += 4) {
      const beat = Math.sin(time * 0.004 * Math.max(0.35, error / 8));
      const y = canvas.height / 2 + Math.sin(x * 0.055 + time * 0.01) * amplitude * beat;
      if (x === 0) context.moveTo(x, y);
      else context.lineTo(x, y);
    }
    context.stroke();
    context.fillStyle = "#eee9c8";
    context.font = "bold 17px sans-serif";
    context.textAlign = "center";
    context.fillText(`차이 ${error.toFixed(1)} cent · 유지 ${heldSeconds.toFixed(1)}/1.2초`, canvas.width / 2, 132);
    if (!complete && heldSeconds >= 1.2) {
      voice?.stop();
      voice = null;
      sfx.playInstrument("melody", scale[Math.min(STRING_SCALE_INDEXES[stringIndex], scale.length - 1)] ?? 220);
      stringIndex += 1;
      if (stringIndex >= 3) {
        complete = true;
        frame.status.textContent = "세 줄의 조율이 맞았습니다!";
        clearTimer = window.setTimeout(onClear, 650);
      } else beginString();
    }
    frameId = requestAnimationFrame(draw);
  };

  const onPointerDown = (event: PointerEvent): void => {
    if (activePointer !== null || complete) return;
    activePointer = event.pointerId;
    track.setPointerCapture(event.pointerId);
    updateCorrection(event.clientX);
  };
  const onPointerMove = (event: PointerEvent): void => {
    if (event.pointerId === activePointer) updateCorrection(event.clientX);
  };
  const onPointerUp = (event: PointerEvent): void => {
    if (event.pointerId === activePointer) activePointer = null;
  };

  track.addEventListener("pointerdown", onPointerDown);
  track.addEventListener("pointermove", onPointerMove);
  track.addEventListener("pointerup", onPointerUp);
  track.addEventListener("pointercancel", onPointerUp);
  beginString();
  frameId = requestAnimationFrame(draw);
  return () => {
    cancelAnimationFrame(frameId);
    window.clearTimeout(clearTimer);
    voice?.stop();
    track.removeEventListener("pointerdown", onPointerDown);
    track.removeEventListener("pointermove", onPointerMove);
    track.removeEventListener("pointerup", onPointerUp);
    track.removeEventListener("pointercancel", onPointerUp);
  };
}
