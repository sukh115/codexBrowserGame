import type { MinigameFrame } from "./frame";
import type { StopGame } from "./games";

const CANVAS_WIDTH = 620;
const CANVAS_HEIGHT = 310;

export function startWatering(
  frame: MinigameFrame,
  bpm: number,
  getTransportTime: () => number,
  scale: readonly number[],
  assist: boolean,
  playScaleTone: (frequency: number) => void,
  playDirt: () => void,
  playArpeggio: () => void,
  onClear: () => void,
): StopGame {
  const canvas = document.createElement("canvas");
  canvas.className = "watering-canvas";
  canvas.width = CANVAS_WIDTH;
  canvas.height = CANVAS_HEIGHT;
  const button = document.createElement("button");
  button.className = "watering-button";
  button.textContent = "물을 주세요";
  frame.stage.append(canvas, button);
  const context = canvas.getContext("2d");
  if (!context) throw new Error("물주기 미니게임 캔버스를 만들 수 없습니다.");

  const beatSeconds = 60 / bpm;
  const windowMs = assist ? 250 : 150;
  let growth = 0;
  let watering = false;
  let activePointer: number | null = null;
  let lastBeat = Number.NEGATIVE_INFINITY;
  let ringStartedAt = performance.now();
  let frameId = 0;
  let clearTimer = 0;
  let completed = false;

  const drawPlant = (): void => {
    const baseX = 330;
    const baseY = 265;
    const stemHeight = 45 + growth * 105;
    context.fillStyle = "#8c573c";
    context.beginPath();
    context.moveTo(baseX - 58, baseY - 25);
    context.lineTo(baseX + 58, baseY - 25);
    context.lineTo(baseX + 42, baseY + 25);
    context.lineTo(baseX - 42, baseY + 25);
    context.closePath();
    context.fill();
    context.strokeStyle = "#72a85d";
    context.lineWidth = 8;
    context.lineCap = "round";
    context.beginPath();
    context.moveTo(baseX, baseY - 24);
    context.quadraticCurveTo(baseX - 9, baseY - stemHeight * 0.55, baseX, baseY - stemHeight);
    context.stroke();
    if (growth >= 0.34) {
      context.fillStyle = "#79b968";
      context.beginPath();
      context.ellipse(baseX - 24, baseY - stemHeight * 0.55, 27, 12, -0.5, 0, Math.PI * 2);
      context.fill();
    }
    if (growth >= 0.67) {
      context.fillStyle = "#9dcc75";
      context.beginPath();
      context.ellipse(baseX + 25, baseY - stemHeight * 0.73, 28, 12, 0.48, 0, Math.PI * 2);
      context.fill();
    }
    if (completed) {
      for (let index = 0; index < 6; index += 1) {
        const angle = (Math.PI * 2 * index) / 6;
        context.fillStyle = "#e9c7dc";
        context.beginPath();
        context.ellipse(baseX + Math.cos(angle) * 18, baseY - stemHeight + Math.sin(angle) * 18, 17, 9, angle, 0, Math.PI * 2);
        context.fill();
      }
      context.fillStyle = "#f3d879";
      context.beginPath();
      context.arc(baseX, baseY - stemHeight, 10, 0, Math.PI * 2);
      context.fill();
    }
  };

  const draw = (time: number): void => {
    const transport = getTransportTime();
    const beat = Math.floor(transport / beatSeconds);
    if (beat !== lastBeat) {
      lastBeat = beat;
      ringStartedAt = time;
    }
    context.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    context.fillStyle = "rgba(8, 20, 17, .64)";
    context.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    const ringProgress = Math.min(1, (time - ringStartedAt) / Math.min(520, beatSeconds * 800));
    context.strokeStyle = `rgba(171, 220, 191, ${0.72 * (1 - ringProgress)})`;
    context.lineWidth = 4;
    context.beginPath();
    context.arc(108, 130, 28 + ringProgress * 62, 0, Math.PI * 2);
    context.stroke();
    context.fillStyle = "#789a79";
    context.beginPath();
    context.roundRect(52, 96, 100, 70, 18);
    context.fill();
    context.strokeStyle = "#a5c9a0";
    context.lineWidth = 10;
    context.beginPath();
    context.arc(57, 130, 38, Math.PI * 0.55, Math.PI * 1.45);
    context.stroke();
    context.fillStyle = "#8eae8c";
    context.beginPath();
    context.moveTo(145, 108);
    context.lineTo(225, 84);
    context.lineTo(230, 103);
    context.lineTo(149, 132);
    context.closePath();
    context.fill();
    if (watering) {
      context.strokeStyle = "rgba(130, 211, 221, .78)";
      context.lineWidth = 4;
      for (let index = 0; index < 5; index += 1) {
        context.beginPath();
        context.moveTo(226 + index * 3, 105);
        context.quadraticCurveTo(260 + index * 8, 160, 300 + index * 6, 218 + ((time / 18 + index * 11) % 16));
        context.stroke();
      }
    }
    drawPlant();
    context.fillStyle = "rgba(255,255,255,.13)";
    context.fillRect(445, 68, 34, 180);
    context.fillStyle = growth >= 1 ? "#e9d37b" : "#75b77d";
    context.fillRect(445, 248 - 180 * growth, 34, 180 * growth);
    context.fillStyle = "#eef3d0";
    context.font = "bold 18px sans-serif";
    context.textAlign = "center";
    context.fillText(`${Math.round(growth * 100)}%`, 462, 276);
    frameId = requestAnimationFrame(draw);
  };

  const onPointerDown = (event: PointerEvent): void => {
    if (activePointer !== null || completed) return;
    activePointer = event.pointerId;
    button.setPointerCapture(event.pointerId);
    watering = true;
    button.classList.add("is-watering");
    const transport = getTransportTime();
    const phase = ((transport % beatSeconds) + beatSeconds) % beatSeconds;
    const errorMs = Math.min(phase, beatSeconds - phase) * 1000;
    if (errorMs <= windowMs) {
      growth = Math.min(1, growth + 0.2);
      const stage = Math.min(3, Math.floor(growth * 3.01));
      const frequency = scale[Math.min([0, 2, 4, 7][stage], scale.length - 1)];
      if (frequency !== undefined) playScaleTone(frequency);
      frame.status.textContent = `좋은 박자! 성장 ${Math.round(growth * 100)}%`;
    } else {
      growth = Math.max(0, growth - 0.06);
      playDirt();
      frame.status.textContent = `박자를 놓쳤어요 · 성장 ${Math.round(growth * 100)}%`;
    }
    if (growth >= 1) {
      completed = true;
      button.disabled = true;
      frame.status.textContent = "꽃이 피었어요!";
      playArpeggio();
      clearTimer = window.setTimeout(onClear, 950);
    }
  };

  const stopWatering = (event: PointerEvent): void => {
    if (event.pointerId !== activePointer) return;
    activePointer = null;
    watering = false;
    button.classList.remove("is-watering");
  };

  frame.status.textContent = `퍼지는 링의 박자에 맞춰 누르세요 · 판정 ±${windowMs}ms`;
  button.addEventListener("pointerdown", onPointerDown);
  button.addEventListener("pointerup", stopWatering);
  button.addEventListener("pointercancel", stopWatering);
  button.addEventListener("lostpointercapture", stopWatering);
  frameId = requestAnimationFrame(draw);
  return () => {
    cancelAnimationFrame(frameId);
    window.clearTimeout(clearTimer);
    button.removeEventListener("pointerdown", onPointerDown);
    button.removeEventListener("pointerup", stopWatering);
    button.removeEventListener("pointercancel", stopWatering);
    button.removeEventListener("lostpointercapture", stopWatering);
  };
}
