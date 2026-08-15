import type { RegionPlacementData } from "./types";

export const MUSIC_SHOP_PLACEMENT = {
  notes: [
    { id: "note-1", u: 0.24, v: 0.34, glyph: "♪", color: 0x64f4e1, rotation: -0.18, size: 0.92, findMode: "tap" },
    { id: "note-2", u: 0.105, v: 0.565, glyph: "♩", color: 0xc874dc, rotation: 0.12, size: 0.82, findMode: "tap" },
    { id: "note-3", u: 0.292, v: 0.625, glyph: "♫", color: 0xe97ecf, rotation: -0.1, size: 0.86, findMode: "tap" },
    { id: "note-4", u: 0.493, v: 0.805, glyph: "♪", color: 0x62dfd5, rotation: 0.35, size: 0.78, findMode: "tap" },
    {
      id: "secret-music-shop",
      u: 0.72,
      v: 0.2,
      glyph: "♫",
      kind: "secret",
      secret: true,
      color: 0xffe991,
      rotation: 0.08,
      size: 0.9,
      findMode: "tap",
    },
  ],
  minigames: [
    { id: "timing-game", type: "timing", rewardNoteId: "note-5", label: "앰프 조율", u: 0.095, v: 0.43 },
    { id: "rhythm-game", type: "rhythm", rewardNoteId: "note-6", label: "페달 리듬", u: 0.34, v: 0.72 },
    { id: "memory-game", type: "memory", rewardNoteId: "note-7", label: "CRT 멜로디", u: 0.885, v: 0.49 },
  ],
} satisfies RegionPlacementData;
