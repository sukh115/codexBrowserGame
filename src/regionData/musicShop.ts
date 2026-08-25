import type { RegionPlacementData } from "./types";

export const MUSIC_SHOP_PLACEMENT = {
  notes: [
    { id: "note-1", u: 0.24, v: 0.34, glyph: "♪", color: 0x64f4e1, rotation: -0.18, size: 0.92, findMode: "tap" },
    { id: "note-2", u: 0.105, v: 0.565, glyph: "♩", color: 0xc874dc, rotation: 0.12, size: 0.82, findMode: "tap" },
    { id: "note-7", u: 0.73, v: 0.76, glyph: "♫", color: 0xffe991, rotation: -0.08, size: 0.88, findMode: "tap" },
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
  // 좌표 에디터로 재배치 필요: 최종 배경 오브젝트에 맞춰 UV를 확정한다.
  minigames: [
    { id: "timing-game", type: "timing", rewardNoteId: "note-3", label: "앰프 타이밍", u: 0.095, v: 0.43 },
    { id: "rhythm-game", type: "rhythm", rewardNoteId: "note-4", label: "페달 리듬", u: 0.34, v: 0.72 },
    { id: "memory-game", type: "memory", rewardNoteId: "note-5", label: "CRT 멜로디", u: 0.885, v: 0.49 },
    { id: "tuning-game", type: "tuning", rewardNoteId: "note-6", label: "기타 줄 조율", u: 0.58, v: 0.31 },
  ],
} satisfies RegionPlacementData;
