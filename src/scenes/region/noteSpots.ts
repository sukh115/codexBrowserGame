import type { RegionId } from "../../core/assetManifest";

export interface NoteSpot {
  readonly id: string;
  readonly u: number;
  readonly v: number;
}

const DEFAULT_NOTE_SPOTS: readonly NoteSpot[] = [
  { id: "note-1", u: 0.13, v: 0.31 },
  { id: "note-2", u: 0.37, v: 0.68 },
  { id: "note-3", u: 0.66, v: 0.24 },
  { id: "note-4", u: 0.87, v: 0.61 },
  { id: "note-5", u: 0.24, v: 0.82 },
  { id: "note-6", u: 0.53, v: 0.46 },
  { id: "note-7", u: 0.76, v: 0.79 },
];

export const NOTE_SPOTS: Readonly<Record<RegionId, readonly NoteSpot[]>> = {
  "music-shop": DEFAULT_NOTE_SPOTS,
  "neon-forest": DEFAULT_NOTE_SPOTS,
};
