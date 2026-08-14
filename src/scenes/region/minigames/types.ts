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

export const GREENHOUSE_MINIGAME_SPOTS: readonly MinigameSpot[] = [
  { id: "timing-game", type: "timing", rewardNoteId: "note-5", label: "덩굴의 맥박", u: 0.74, v: 0.27 },
  { id: "rhythm-game", type: "rhythm", rewardNoteId: "note-6", label: "유리창 빗방울", u: 0.53, v: 0.16 },
  { id: "memory-game", type: "memory", rewardNoteId: "note-7", label: "발광 식물의 신호", u: 0.22, v: 0.72 },
];
