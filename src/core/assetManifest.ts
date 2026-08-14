export type RegionId = "music-shop" | "neon-forest";

const assetPath = (path: string): string => `${import.meta.env.BASE_URL}${path.replace(/^\//, "")}`;

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

const GREENHOUSE_NOTE_STEM_MAPPING = {
  "greenhouse-note-1": "rhythm",
  "greenhouse-note-2": null,
  "greenhouse-note-3": "bass",
  "greenhouse-note-4": "harmony",
  "greenhouse-note-5": null,
  "greenhouse-note-6": "melody",
  "greenhouse-note-7": null,
} as const;

const GREENHOUSE_NOTE_EFFECT_MAPPING = {
  "greenhouse-note-1": null,
  "greenhouse-note-2": "rhythm-accent",
  "greenhouse-note-3": null,
  "greenhouse-note-4": null,
  "greenhouse-note-5": "open-filter",
  "greenhouse-note-6": null,
  "greenhouse-note-7": "completion-boost",
} as const;

export const ASSET_MANIFEST = {
  characterModel: assetPath("assets/models/robot-expressive.glb") as string | null,
  dracoDecoderPath: assetPath("assets/draco/"),
  overworldGround: null as string | null,
  overworldProps: [
    {
      id: "tree-test",
      path: assetPath("assets/models/tree-test.fbx"),
      position: { x: -5, z: -4 },
      targetHeight: 7.2,
    },
    {
      id: "tree-test-obj",
      path: assetPath("assets/models/tree-test.obj"),
      materialPath: assetPath("assets/models/tree-test.mtl"),
      position: { x: -9, z: -4 },
      targetHeight: 7.2,
    },
  ],
  regions: {
    "music-shop": {
      id: "music-shop",
      title: "잠든 악기점",
      background: assetPath("assets/textures/music-shop.webp"),
      bpm: 120,
      aspectRatio: 2,
      stems: PLACEHOLDER_STEMS,
      noteStemMapping: NOTE_STEM_MAPPING,
      noteEffectMapping: NOTE_EFFECT_MAPPING,
    },
    "neon-forest": {
      id: "neon-forest",
      title: "네온 숲",
      background: assetPath("assets/textures/abandoned-greenhouse.webp"),
      bpm: 96,
      aspectRatio: 1456 / 720,
      stems: PLACEHOLDER_STEMS,
      noteStemMapping: GREENHOUSE_NOTE_STEM_MAPPING,
      noteEffectMapping: GREENHOUSE_NOTE_EFFECT_MAPPING,
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
  overworldEntrances: [
    {
      regionId: "music-shop" as RegionId,
      position: { x: 7, z: -5 },
      activationRadius: 2,
      audioRadius: 16,
      minimumVolume: 0.02,
      maximumVolume: 0.42,
    },
    {
      regionId: "neon-forest" as RegionId,
      position: { x: -11, z: 8 },
      activationRadius: 2,
      audioRadius: 16,
      minimumVolume: 0.02,
      maximumVolume: 0.42,
    },
  ],
} as const;
