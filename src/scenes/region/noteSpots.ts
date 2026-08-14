import type { RegionId } from "../../core/assetManifest";

export interface NoteSpot {
  readonly id: string;
  readonly u: number;
  readonly v: number;
  readonly glyph: "♪" | "♫" | "♩";
  readonly color: number;
  readonly rotation: number;
  readonly size: number;
  readonly kind?: "note" | "seed";
}

const DEFAULT_NOTE_SPOTS: readonly NoteSpot[] = [
  // 배경 오브젝트의 선과 색에 섞이도록 위치와 실루엣을 각각 다르게 둔다.
  { id: "note-1", u: 0.115, v: 0.205, glyph: "♪", color: 0x64f4e1, rotation: -0.18, size: 0.92 },
  { id: "note-2", u: 0.105, v: 0.565, glyph: "♩", color: 0xc874dc, rotation: 0.12, size: 0.82 },
  { id: "note-3", u: 0.292, v: 0.625, glyph: "♫", color: 0xe97ecf, rotation: -0.1, size: 0.86 },
  { id: "note-4", u: 0.493, v: 0.805, glyph: "♪", color: 0x62dfd5, rotation: 0.35, size: 0.78 },
];

export const NOTE_SPOTS: Readonly<Record<RegionId, readonly NoteSpot[]>> = {
  "music-shop": DEFAULT_NOTE_SPOTS,
  "neon-forest": [
    { id: "greenhouse-note-1", u: 0.13, v: 0.31, glyph: "♪", kind: "seed", color: 0xe5cf83, rotation: -0.18, size: 0.82 },
    { id: "greenhouse-note-2", u: 0.32, v: 0.18, glyph: "♫", kind: "seed", color: 0x9ac49a, rotation: 0.15, size: 0.75 },
    { id: "greenhouse-note-3", u: 0.47, v: 0.58, glyph: "♩", kind: "seed", color: 0xc2a4b1, rotation: -0.12, size: 0.78 },
    { id: "greenhouse-note-4", u: 0.86, v: 0.47, glyph: "♪", kind: "seed", color: 0xffe99a, rotation: 0.12, size: 1.08 },
  ],
};
