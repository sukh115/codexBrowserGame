import type { RegionPlacementData } from "./types";

export const NEON_FOREST_PLACEMENT = {
  notes: [
    { id: "greenhouse-note-1", u: 0.24, v: 0.38, glyph: "♪", kind: "seed", color: 0xe5cf83, rotation: -0.18, size: 0.82, findMode: "tap" },
    { id: "greenhouse-note-2", u: 0.32, v: 0.18, glyph: "♫", kind: "seed", color: 0x9ac49a, rotation: 0.15, size: 0.75, findMode: "tap" },
    { id: "greenhouse-note-3", u: 0.47, v: 0.58, glyph: "♩", kind: "seed", color: 0xc2a4b1, rotation: -0.12, size: 0.78, findMode: "tap" },
    { id: "greenhouse-note-4", u: 0.86, v: 0.47, glyph: "♪", kind: "seed", color: 0xffe99a, rotation: 0.12, size: 1.08, findMode: "tap" },
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
  minigames: [
    {
      id: "greenhouse-timing-game",
      type: "timing",
      rewardNoteId: "greenhouse-note-5",
      label: "덩굴의 맥박",
      u: 0.74,
      v: 0.27,
    },
    {
      id: "greenhouse-rhythm-game",
      type: "rhythm",
      rewardNoteId: "greenhouse-note-6",
      label: "유리창 빗방울",
      u: 0.53,
      v: 0.16,
    },
    {
      id: "greenhouse-memory-game",
      type: "memory",
      rewardNoteId: "greenhouse-note-7",
      label: "발광 식물의 신호",
      u: 0.22,
      v: 0.72,
    },
  ],
} satisfies RegionPlacementData;
