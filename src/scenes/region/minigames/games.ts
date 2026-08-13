import type { MinigameFrame } from "./frame";
import type { MinigameType } from "./types";

export type StopGame = () => void;

export function startMinigame(
  type: MinigameType,
  frame: MinigameFrame,
  bpm: number,
  getTransportTime: () => number,
  playTone: (index: number) => void,
  rhythmAssist: boolean,
  onClear: () => void,
): StopGame {
  if (type === "timing") return startTiming(frame, onClear);
  if (type === "rhythm") return startRhythm(frame, bpm, getTransportTime, rhythmAssist, onClear);
  return startMemory(frame, playTone, onClear);
}

function startTiming(frame: MinigameFrame, onClear: () => void): StopGame {
  const track = document.createElement("button");
  track.className = "timing-track";
  track.innerHTML = "<i class=\"timing-target\"></i><i class=\"timing-cursor\"></i>";
  frame.stage.append(track);
  const cursor = track.querySelector<HTMLElement>(".timing-cursor");
  let success = 0;
  let start = performance.now();
  let frameId = 0;
  const loop = (time: number): void => {
    const phase = ((time - start) / (1250 / (1 + success * 0.1))) % 2;
    const position = phase <= 1 ? phase : 2 - phase;
    if (cursor) cursor.style.left = `${position * 100}%`;
    frameId = requestAnimationFrame(loop);
  };
  const tap = (): void => {
    const position = Number.parseFloat(cursor?.style.left ?? "0");
    if (position >= 42 && position <= 58) {
      success += 1;
      frame.status.textContent = `성공 ${success}/3`;
      start = performance.now();
      if (success >= 3) {
        cancelAnimationFrame(frameId);
        frame.status.textContent = "조율 완료! ♪ 획득";
        track.disabled = true;
        window.setTimeout(onClear, 500);
      }
    } else frame.status.textContent = "조금 더 정확하게!";
  };
  track.addEventListener("pointerdown", tap);
  frameId = requestAnimationFrame(loop);
  return () => {
    cancelAnimationFrame(frameId);
    track.removeEventListener("pointerdown", tap);
  };
}

function startRhythm(
  frame: MinigameFrame,
  bpm: number,
  getTransportTime: () => number,
  assist: boolean,
  onClear: () => void,
): StopGame {
  const track = document.createElement("div");
  track.className = "rhythm-track";
  const line = document.createElement("i");
  line.className = "rhythm-judge-line";
  const pad = document.createElement("button");
  pad.className = "rhythm-pad";
  pad.textContent = "TAP";
  track.append(line);
  frame.stage.append(track, pad);
  const beatSeconds = 60 / bpm;
  const firstBeat = Math.ceil(getTransportTime() / beatSeconds) + 2;
  const practiceCount = 4;
  const scoredCount = 16;
  const targets = Array.from({ length: practiceCount + scoredCount }, (_, index) => (firstBeat + index) * beatSeconds);
  const notes = targets.map(() => {
    const note = document.createElement("i");
    note.className = "rhythm-note";
    track.append(note);
    return note;
  });
  notes.slice(0, practiceCount).forEach((note) => note.classList.add("is-practice"));
  const judged = Array.from({ length: targets.length }, () => false);
  let judgedCount = 0;
  let score = 0;
  let combo = 0;
  let animationFrame = 0;
  let finished = false;
  const finish = (): void => {
    if (finished || judgedCount < scoredCount) return;
    finished = true;
    const accuracy = score / scoredCount;
    if (accuracy >= 0.7) {
      frame.status.textContent = `정확도 ${Math.round(accuracy * 100)}% · 클리어!`;
      window.setTimeout(onClear, 650);
    } else {
      frame.status.textContent = `정확도 ${Math.round(accuracy * 100)}% · 닫고 다시 도전하세요`;
    }
  };
  const animate = (): void => {
    const now = getTransportTime();
    targets.forEach((target, index) => {
      if (judged[index]) return;
      const timeUntil = target - now;
      const progress = 1 - timeUntil / 2;
      notes[index].style.top = `${progress * 82}%`;
      notes[index].hidden = progress < -0.05 || progress > 1.15;
      if (timeUntil < -(assist ? 0.28 : 0.2)) {
        judged[index] = true;
        notes[index].classList.add("is-miss");
        if (index >= practiceCount) {
          judgedCount += 1;
          combo = 0;
          frame.status.textContent = `Miss · ${judgedCount}/${scoredCount} · Combo 0`;
        }
      }
    });
    finish();
    if (!finished) animationFrame = requestAnimationFrame(animate);
  };
  const tap = (): void => {
    if (finished) return;
    const now = getTransportTime();
    let nearestIndex = -1;
    let nearestError = Number.POSITIVE_INFINITY;
    targets.forEach((target, index) => {
      if (judged[index]) return;
      const error = Math.abs(now - target);
      if (error < nearestError) {
        nearestError = error;
        nearestIndex = index;
      }
    });
    if (nearestIndex < 0 || nearestError > (assist ? 0.28 : 0.2)) {
      frame.status.textContent = "Miss · 판정선에서 탭하세요";
      return;
    }
    const result = nearestError <= (assist ? 0.12 : 0.08) ? "Perfect" : "Good";
    judged[nearestIndex] = true;
    notes[nearestIndex].classList.add(result === "Perfect" ? "is-perfect" : "is-good");
    if (nearestIndex < practiceCount) {
      frame.status.textContent = `연습 ${nearestIndex + 1}/${practiceCount} · ${result}`;
    } else {
      if (result === "Perfect") score += 1;
      if (result === "Good") score += 0.7;
      judgedCount += 1;
      combo += 1;
      frame.status.textContent = `${result} · ${judgedCount}/${scoredCount} · Combo ${combo}`;
    }
    pad.classList.remove("is-hit");
    requestAnimationFrame(() => pad.classList.add("is-hit"));
    finish();
  };
  pad.addEventListener("pointerdown", tap);
  frame.status.textContent = "첫 4노트는 연습입니다 · 판정선에서 탭하세요";
  animationFrame = requestAnimationFrame(animate);
  return () => {
    cancelAnimationFrame(animationFrame);
    pad.removeEventListener("pointerdown", tap);
  };
}

function startMemory(frame: MinigameFrame, playTone: (index: number) => void, onClear: () => void): StopGame {
  const buttons = Array.from({ length: 4 }, (_, index) => {
    const button = document.createElement("button");
    button.className = `memory-key key-${index + 1}`;
    button.textContent = `${index + 1}`;
    frame.stage.append(button);
    return button;
  });
  let round = 1;
  let sequence: number[] = [];
  let inputIndex = 0;
  let accepting = false;
  const timers: number[] = [];
  const flashKey = (value: number, className = "is-pressed", duration = 190): void => {
    const button = buttons[value];
    button.classList.remove("is-pressed", "is-wrong");
    requestAnimationFrame(() => button.classList.add(className));
    timers.push(window.setTimeout(() => button.classList.remove(className), duration));
    playTone(value);
  };
  const playRound = (): void => {
    sequence = Array.from({ length: round + 2 }, () => Math.floor(Math.random() * 4));
    inputIndex = 0;
    accepting = false;
    frame.status.textContent = `라운드 ${round}/3 · 순서를 기억하세요`;
    sequence.forEach((value, index) => {
      timers.push(window.setTimeout(() => flashKey(value, "is-lit", 300), 550 + index * 520));
    });
    timers.push(window.setTimeout(() => {
      accepting = true;
      frame.status.textContent = "같은 순서로 입력하세요";
    }, 650 + sequence.length * 520));
  };
  const listeners = buttons.map((button, value) => {
    const listener = (): void => {
      if (!accepting) return;
      if (sequence[inputIndex] !== value) {
        flashKey(value, "is-wrong");
        frame.status.textContent = `순서가 달라요 · ${inputIndex}/${sequence.length}까지 성공`;
        timers.push(window.setTimeout(playRound, 650));
        accepting = false;
        return;
      }
      flashKey(value);
      inputIndex += 1;
      frame.status.textContent = `좋아요 · ${inputIndex}/${sequence.length}`;
      if (inputIndex === sequence.length) {
        round += 1;
        if (round > 3) {
          frame.status.textContent = "기억 완료! ♪ 획득";
          timers.push(window.setTimeout(onClear, 500));
        } else timers.push(window.setTimeout(playRound, 550));
      }
    };
    button.addEventListener("pointerdown", listener);
    return listener;
  });
  playRound();
  return () => {
    timers.forEach(window.clearTimeout);
    buttons.forEach((button, index) => button.removeEventListener("pointerdown", listeners[index]));
  };
}
