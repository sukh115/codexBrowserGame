export type RegionId = "music-shop" | "neon-forest";

export interface RegionManifest {
  readonly id: RegionId;
  readonly title: string;
  readonly background: string | null;
  readonly bpm: number;
  readonly aspectRatio: number;
  readonly stems: readonly StemManifest[];
  readonly noteStemMapping: Readonly<Record<string, string | null>>;
  readonly noteEffectMapping: Readonly<Record<string, MusicEffect | null>>;
}

export type MusicEffect = "rhythm-accent" | "open-filter" | "completion-boost";

export interface StemManifest {
  readonly id: string;
  readonly path: string | null;
}

const PLACEHOLDER_STEMS = [
  { id: "rhythm", path: null },
  { id: "bass", path: null },
  { id: "harmony", path: null },
  { id: "melody", path: null },
] as const;

const NOTE_STEM_MAPPING = {
  "note-1": "rhythm",
  "note-2": null,
  "note-3": "bass",
  "note-4": "harmony",
  "note-5": null,
  "note-6": "melody",
  "note-7": null,
} as const;

const NOTE_EFFECT_MAPPING = {
  "note-1": null,
  "note-2": "rhythm-accent",
  "note-3": null,
  "note-4": null,
  "note-5": "open-filter",
  "note-6": null,
  "note-7": "completion-boost",
} as const;

export const ASSET_MANIFEST = {
  characterModel: null as string | null,
  overworldGround: null as string | null,
  regions: {
    "music-shop": {
      id: "music-shop",
      title: "잠든 악기점",
      background: "/assets/textures/music-shop.png",
      bpm: 120,
      aspectRatio: 2,
      stems: PLACEHOLDER_STEMS,
      noteStemMapping: NOTE_STEM_MAPPING,
      noteEffectMapping: NOTE_EFFECT_MAPPING,
    },
    "neon-forest": {
      id: "neon-forest",
      title: "네온 숲",
      background: null,
      bpm: 120,
      aspectRatio: 2,
      stems: PLACEHOLDER_STEMS,
      noteStemMapping: NOTE_STEM_MAPPING,
      noteEffectMapping: NOTE_EFFECT_MAPPING,
    },
  } satisfies Record<RegionId, RegionManifest>,
  overworldEntrance: {
    regionId: "music-shop" as RegionId,
    position: { x: 7, z: -5 },
    activationRadius: 2,
    audioRadius: 16,
    minimumVolume: 0.02,
    maximumVolume: 0.42,
  },
} as const;
