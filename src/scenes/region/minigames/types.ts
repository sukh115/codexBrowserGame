export type MinigameType = "timing" | "rhythm" | "memory";

export interface MinigameSpot {
  readonly id: string;
  readonly type: MinigameType;
  readonly rewardNoteId: string;
  readonly label: string;
  readonly u: number;
  readonly v: number;
}

export const MINIGAME_SPOTS: readonly MinigameSpot[] = [
  { id: "timing-game", type: "timing", rewardNoteId: "note-5", label: "앰프 조율", u: 0.095, v: 0.43 },
  { id: "rhythm-game", type: "rhythm", rewardNoteId: "note-6", label: "페달 리듬", u: 0.34, v: 0.72 },
  { id: "memory-game", type: "memory", rewardNoteId: "note-7", label: "CRT 멜로디", u: 0.885, v: 0.49 },
];
