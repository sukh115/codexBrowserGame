export type NoteGlyph = "♪" | "♫" | "♩";
export type NoteKind = "note" | "seed" | "secret";
export type NoteFindMode = "tap";

export interface NoteSpot {
  readonly id: string;
  readonly u: number;
  readonly v: number;
  readonly glyph: NoteGlyph;
  readonly color: number;
  readonly rotation: number;
  readonly size: number;
  readonly findMode: NoteFindMode;
  readonly kind?: NoteKind;
  readonly secret?: boolean;
}

export type MinigameType = "timing" | "rhythm" | "memory";

export interface MinigameSpot {
  readonly id: string;
  readonly type: MinigameType;
  readonly rewardNoteId: string;
  readonly label: string;
  readonly u: number;
  readonly v: number;
}

export interface RegionPlacementData {
  readonly notes: readonly NoteSpot[];
  readonly minigames: readonly MinigameSpot[];
}
