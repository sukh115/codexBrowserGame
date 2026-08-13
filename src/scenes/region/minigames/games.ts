import type { MinigameFrame } from "./frame";
import type { MinigameType } from "./types";

export type StopGame = () => void;

export function startMinigame(
  type: MinigameType,
  frame: MinigameFrame,
  bpm: number,
  onClear: () => void,
): StopGame {
  if (type === "timing") return startTiming(frame, onClear);
  if (type === "rhythm") return startRhythm(frame, bpm, onClear);
  return startMemory(frame, onClear);
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

function startRhythm(frame: MinigameFrame, bpm: number, onClear: () => void): StopGame {
  const pad = document.createElement("button");
  pad.className = "rhythm-pad";
  pad.textContent = "BEAT";
  frame.stage.append(pad);
  const interval = 60_000 / bpm;
  const started = performance.now() + interval;
  let hits = 0;
  let score = 0;
  const tap = (): void => {
    if (hits >= 16) return;
    const elapsed = performance.now() - started;
    const error = Math.abs(elapsed - Math.round(elapsed / interval) * interval);
    const result = error <= 90 ? "Perfect" : error <= 170 ? "Good" : "Miss";
    if (result === "Perfect") score += 1;
    if (result === "Good") score += 0.7;
    hits += 1;
    frame.status.textContent = `${result} · ${hits}/16`;
    pad.classList.remove("is-hit");
    requestAnimationFrame(() => pad.classList.add("is-hit"));
    if (hits === 16) {
      const accuracy = score / 16;
      if (accuracy >= 0.7) {
        frame.status.textContent = `정확도 ${Math.round(accuracy * 100)}% · 클리어!`;
        window.setTimeout(onClear, 550);
      } else {
        frame.status.textContent = `정확도 ${Math.round(accuracy * 100)}% · 다시 도전하세요`;
        hits = 0;
        score = 0;
      }
    }
  };
  pad.addEventListener("pointerdown", tap);
  frame.status.textContent = "박자에 맞춰 16번 탭하세요";
  return () => pad.removeEventListener("pointerdown", tap);
}

function startMemory(frame: MinigameFrame, onClear: () => void): StopGame {
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
  let audioContext: AudioContext | null = new AudioContext();
  void audioContext.resume();
  const timers: number[] = [];
  const flashKey = (value: number, className = "is-pressed", duration = 190): void => {
    const button = buttons[value];
    button.classList.remove("is-pressed", "is-wrong");
    requestAnimationFrame(() => button.classList.add(className));
    timers.push(window.setTimeout(() => button.classList.remove(className), duration));
    if (!audioContext) return;
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    const now = audioContext.currentTime;
    oscillator.type = "sine";
    oscillator.frequency.value = [261.63, 329.63, 392, 523.25][value];
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.13, now + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);
    oscillator.connect(gain).connect(audioContext.destination);
    oscillator.start(now);
    oscillator.stop(now + 0.2);
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
    void audioContext?.close();
  };
}
