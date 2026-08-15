import type { RegionPlacementData } from "./types";

export const NEON_FOREST_PLACEMENT = {
  notes: [
    { id: "greenhouse-note-1", u: 0.24, v: 0.38, glyph: "♪", kind: "seed", color: 0xe5cf83, rotation: -0.18, size: 0.82, findMode: "tap" },
    { id: "greenhouse-note-2", u: 0.32, v: 0.18, glyph: "♫", kind: "seed", color: 0x9ac49a, rotation: 0.15, size: 0.75, findMode: "tap" },
    {
      id: "secret-neon-forest",
      u: 0.68,
      v: 0.72,
      glyph: "♫",
      kind: "secret",
      secret: true,
      color: 0xf6df8f,
      rotation: -0.1,
      size: 0.9,
      findMode: "tap",
    },
  ],
  // 임시 배치: 최종 배경 오브젝트에 맞춰 ?debug=1 좌표 에디터로 조정한다.
  minigames: [
    {
      id: "greenhouse-timing-game",
      type: "timing",
      rewardNoteId: "greenhouse-note-3",
      label: "덩굴의 맥박",
      u: 0.74,
      v: 0.27,
    },
    {
      id: "greenhouse-rhythm-game",
      type: "rhythm",
      rewardNoteId: "greenhouse-note-4",
      label: "유리창 빗방울",
      u: 0.53,
      v: 0.16,
    },
    {
      id: "greenhouse-memory-game",
      type: "memory",
      rewardNoteId: "greenhouse-note-5",
      label: "발광 식물의 신호",
      u: 0.22,
      v: 0.72,
    },
    {
      id: "greenhouse-pottery-game",
      type: "pottery",
      rewardNoteId: "greenhouse-note-6",
      label: "깨진 화분의 화음",
      u: 0.39,
      v: 0.78,
      pieceImagePaths: [null, null, null, null],
    },
    {
      id: "greenhouse-watering-game",
      type: "watering",
      rewardNoteId: "greenhouse-note-7",
      label: "박자 맞춰 물주기",
      u: 0.83,
      v: 0.68,
    },
  ],
} satisfies RegionPlacementData;
