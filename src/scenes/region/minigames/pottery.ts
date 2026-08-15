import type { MinigameFrame } from "./frame";
import type { StopGame } from "./games";

interface PotPiece {
  readonly index: number;
  readonly homeX: number;
  readonly homeY: number;
  readonly targetX: number;
  readonly targetY: number;
  readonly width: number;
  readonly height: number;
  readonly color: string;
  readonly image: HTMLImageElement | null;
  x: number;
  y: number;
  placed: boolean;
}

const CANVAS_WIDTH = 620;
const CANVAS_HEIGHT = 390;
const POT_TOP = 58;
const POT_SLICE_HEIGHT = 43;
const POT_CENTER_X = CANVAS_WIDTH / 2;
const CHORD_INDEXES = [0, 2, 4, 7] as const;

export function startPottery(
  frame: MinigameFrame,
  scale: readonly number[],
  assist: boolean,
  imagePaths: readonly (string | null)[] | undefined,
  playScaleTone: (frequency: number) => void,
  playDirt: () => void,
  playArpeggio: () => void,
  onClear: () => void,
): StopGame {
  const canvas = document.createElement("canvas");
  canvas.className = "pottery-canvas";
  canvas.width = CANVAS_WIDTH;
  canvas.height = CANVAS_HEIGHT;
  canvas.setAttribute("aria-label", "화분 조각을 중앙 실루엣에 드래그해 맞추기");
  frame.stage.append(canvas);
  const context = canvas.getContext("2d");
  if (!context) throw new Error("화분 미니게임 캔버스를 만들 수 없습니다.");

  const homes = [90, 270, 430, 560];
  const colors = ["#b96f4f", "#a95f45", "#c47b57", "#99563e"];
  const pieces: PotPiece[] = homes.map((homeX, index) => {
    const topWidth = 178 - index * 22;
    const bottomWidth = 156 - index * 22;
    const imagePath = imagePaths?.[index];
    const image = imagePath ? new Image() : null;
    if (image && imagePath) image.src = imagePath;
    const targetY = POT_TOP + index * POT_SLICE_HEIGHT + POT_SLICE_HEIGHT / 2;
    return {
      index,
      homeX,
      homeY: 326,
      targetX: POT_CENTER_X,
      targetY,
      width: Math.max(topWidth, bottomWidth),
      height: POT_SLICE_HEIGHT,
      color: colors[index],
      image,
      x: homeX,
      y: 326,
      placed: false,
    };
  });

  let dragged: PotPiece | null = null;
  let pointerId: number | null = null;
  let offsetX = 0;
  let offsetY = 0;
  let frameId = 0;
  let sproutStartedAt = 0;
  let clearTimer = 0;

  const pointFromEvent = (event: PointerEvent): { x: number; y: number } => {
    const bounds = canvas.getBoundingClientRect();
    return {
      x: (event.clientX - bounds.left) * (canvas.width / bounds.width),
      y: (event.clientY - bounds.top) * (canvas.height / bounds.height),
    };
  };

  const drawPotPath = (piece: PotPiece, x: number, y: number): void => {
    const topWidth = 178 - piece.index * 22;
    const bottomWidth = 156 - piece.index * 22;
    context.beginPath();
    context.moveTo(x - topWidth / 2, y - piece.height / 2);
    context.lineTo(x + topWidth / 2, y - piece.height / 2);
    context.lineTo(x + bottomWidth / 2, y + piece.height / 2);
    context.lineTo(x - bottomWidth / 2, y + piece.height / 2);
    context.closePath();
  };

  const drawPiece = (piece: PotPiece): void => {
    context.save();
    drawPotPath(piece, piece.x, piece.y);
    context.clip();
    if (piece.image?.complete && piece.image.naturalWidth > 0) {
      context.drawImage(piece.image, piece.x - piece.width / 2, piece.y - piece.height / 2, piece.width, piece.height);
    } else {
      context.fillStyle = piece.color;
      context.fillRect(piece.x - piece.width / 2, piece.y - piece.height / 2, piece.width, piece.height);
      context.strokeStyle = "rgba(255,225,190,.38)";
      context.lineWidth = 2;
      context.beginPath();
      context.moveTo(piece.x - piece.width / 2, piece.y);
      context.lineTo(piece.x + piece.width / 2, piece.y - 5);
      context.stroke();
    }
    context.restore();
    drawPotPath(piece, piece.x, piece.y);
    context.strokeStyle = piece.placed ? "#f1dc9b" : "#633c2d";
    context.lineWidth = piece.placed ? 3 : 2;
    context.stroke();
  };

  const draw = (time: number): void => {
    context.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    context.fillStyle = "rgba(8, 19, 14, .62)";
    context.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    context.setLineDash([8, 7]);
    pieces.forEach((piece) => {
      drawPotPath(piece, piece.targetX, piece.targetY);
      context.fillStyle = "rgba(221, 197, 144, .07)";
      context.fill();
      context.strokeStyle = "rgba(225, 213, 166, .48)";
      context.lineWidth = 2;
      context.stroke();
    });
    context.setLineDash([]);
    pieces.forEach(drawPiece);

    if (sproutStartedAt > 0) {
      const progress = Math.min(1, (time - sproutStartedAt) / 850);
      const baseY = POT_TOP - 4;
      context.strokeStyle = "#85c86c";
      context.lineWidth = 7;
      context.lineCap = "round";
      context.beginPath();
      context.moveTo(POT_CENTER_X, baseY);
      context.quadraticCurveTo(POT_CENTER_X - 8, baseY - 42 * progress, POT_CENTER_X + 2, baseY - 76 * progress);
      context.stroke();
      if (progress > 0.45) {
        context.fillStyle = "#a9dc78";
        context.beginPath();
        context.ellipse(POT_CENTER_X - 16, baseY - 48 * progress, 20 * progress, 9 * progress, -0.45, 0, Math.PI * 2);
        context.ellipse(POT_CENTER_X + 17, baseY - 65 * progress, 20 * progress, 9 * progress, 0.45, 0, Math.PI * 2);
        context.fill();
      }
    }
    frameId = requestAnimationFrame(draw);
  };

  const onPointerDown = (event: PointerEvent): void => {
    if (pointerId !== null || sproutStartedAt > 0) return;
    const point = pointFromEvent(event);
    const hit = [...pieces].reverse().find((piece) => !piece.placed
      && Math.abs(point.x - piece.x) <= piece.width / 2
      && Math.abs(point.y - piece.y) <= piece.height / 2 + 12);
    if (!hit) return;
    pointerId = event.pointerId;
    dragged = hit;
    offsetX = point.x - hit.x;
    offsetY = point.y - hit.y;
    canvas.setPointerCapture(event.pointerId);
  };

  const onPointerMove = (event: PointerEvent): void => {
    if (event.pointerId !== pointerId || !dragged) return;
    const point = pointFromEvent(event);
    dragged.x = point.x - offsetX;
    dragged.y = point.y - offsetY;
  };

  const finishDrag = (event: PointerEvent): void => {
    if (event.pointerId !== pointerId || !dragged) return;
    const piece = dragged;
    const snapDistance = assist ? 48 : 32;
    const distance = Math.hypot(piece.x - piece.targetX, piece.y - piece.targetY);
    if (distance <= snapDistance) {
      piece.x = piece.targetX;
      piece.y = piece.targetY;
      piece.placed = true;
      const frequency = scale[Math.min(CHORD_INDEXES[piece.index], scale.length - 1)];
      if (frequency !== undefined) playScaleTone(frequency);
      const placedCount = pieces.filter((candidate) => candidate.placed).length;
      frame.status.textContent = `조각 ${placedCount}/4 · 제자리를 찾았어요`;
      if (placedCount === pieces.length) {
        sproutStartedAt = performance.now();
        frame.status.textContent = "화분 완성! 새싹이 돋아납니다";
        playArpeggio();
        clearTimer = window.setTimeout(onClear, 1250);
      }
    } else {
      piece.x = piece.homeX;
      piece.y = piece.homeY;
      frame.status.textContent = "조각이 맞지 않아요 · 다시 옮겨보세요";
      playDirt();
    }
    dragged = null;
    pointerId = null;
  };

  frame.status.textContent = `아래 조각을 중앙 실루엣에 맞추세요 · 스냅 ${assist ? 48 : 32}px`;
  canvas.addEventListener("pointerdown", onPointerDown);
  canvas.addEventListener("pointermove", onPointerMove);
  canvas.addEventListener("pointerup", finishDrag);
  canvas.addEventListener("pointercancel", finishDrag);
  frameId = requestAnimationFrame(draw);
  return () => {
    cancelAnimationFrame(frameId);
    window.clearTimeout(clearTimer);
    canvas.removeEventListener("pointerdown", onPointerDown);
    canvas.removeEventListener("pointermove", onPointerMove);
    canvas.removeEventListener("pointerup", finishDrag);
    canvas.removeEventListener("pointercancel", finishDrag);
  };
}
