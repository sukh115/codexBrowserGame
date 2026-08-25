export type RegionId = "music-shop" | "neon-forest";

const assetPath = (path: string): string => `${import.meta.env.BASE_URL}${path.replace(/^\//, "")}`;

export interface RegionManifest {
  readonly id: RegionId;
  readonly title: string;
  readonly noteGoal: number;
  readonly background: string | null;
  readonly npc: RegionNpcManifest | null;
  readonly bpm: number;
  readonly musicalScale: readonly number[];
  readonly aspectRatio: number;
  readonly baseBrightness: number;
  readonly baseSaturation: number;
  readonly stems: readonly StemManifest[];
  readonly noteStemMapping: Readonly<Record<string, string | null>>;
  readonly noteEffectMapping: Readonly<Record<string, MusicEffect | null>>;
}

export interface RegionNpcManifest {
  readonly worldLayer: string;
  readonly portraits: readonly string[];
}

export type MusicEffect = "rhythm-accent" | "open-filter" | "completion-boost";

export interface StemManifest {
  readonly id: string;
  readonly path: string | null;
  readonly gain?: number;
  readonly initiallyUnlocked?: boolean;
}

const createFourStems = (regionId: RegionId): readonly StemManifest[] => [
  { id: "rhythm", path: assetPath(`assets/audio/stems/${regionId}-rhythm`) },
  { id: "bass", path: assetPath(`assets/audio/stems/${regionId}-bass`) },
  { id: "harmony", path: assetPath(`assets/audio/stems/${regionId}-harmony`) },
  { id: "melody", path: assetPath(`assets/audio/stems/${regionId}-melody`) },
];

const MUSIC_SHOP_STEMS = [
  {
    id: "rhythm",
    path: assetPath("assets/audio/stems/music-shop-rhythm"),
    initiallyUnlocked: true,
  },
  { id: "bass", path: assetPath("assets/audio/stems/music-shop-bass") },
  {
    id: "harmony",
    path: assetPath("assets/audio/stems/music-shop-harmony"),
    gain: 2,
  },
] as const satisfies readonly StemManifest[];

const NOTE_STEM_MAPPING = {
  "note-1": "rhythm",
  "note-2": null,
  "note-3": "bass",
  "note-4": null,
  "note-5": "harmony",
  "note-6": null,
  "note-7": null,
} as const;

const NOTE_EFFECT_MAPPING = {
  "note-1": null,
  "note-2": "rhythm-accent",
  "note-3": null,
  "note-4": null,
  "note-5": null,
  "note-6": "open-filter",
  "note-7": "completion-boost",
} as const;

const GREENHOUSE_NOTE_STEM_MAPPING = {
  "greenhouse-note-1": "rhythm",
  "greenhouse-note-2": null,
  "greenhouse-note-3": "bass",
  "greenhouse-note-4": "rhythm",
  "greenhouse-note-5": "melody",
  "greenhouse-note-6": "harmony",
  "greenhouse-note-7": null,
} as const;

const GREENHOUSE_NOTE_EFFECT_MAPPING = {
  "greenhouse-note-1": null,
  "greenhouse-note-2": "rhythm-accent",
  "greenhouse-note-3": null,
  "greenhouse-note-4": null,
  "greenhouse-note-5": null,
  "greenhouse-note-6": "open-filter",
  "greenhouse-note-7": "completion-boost",
} as const;

export const ASSET_MANIFEST = {
  characterModel: null as string | null,
  dracoDecoderPath: assetPath("assets/draco/"),
  overworldGround: null as string | null,
  overworldProps: [],
  regions: {
    "music-shop": {
      id: "music-shop",
      title: "잠든 악기점",
      noteGoal: 7,
      background: assetPath("assets/textures/music-shop.webp"),
      npc: {
        worldLayer: assetPath("assets/textures/npc/dacapo-world.webp"),
        portraits: [
          assetPath("assets/textures/npc/dacapo-calm.png"),
          assetPath("assets/textures/npc/dacapo-calm.png"),
          assetPath("assets/textures/npc/dacapo-calm.png"),
          assetPath("assets/textures/npc/dacapo-sigh.png"),
          assetPath("assets/textures/npc/dacapo-sigh.png"),
          assetPath("assets/textures/npc/dacapo-sigh.png"),
          assetPath("assets/textures/npc/dacapo-smile.png"),
          assetPath("assets/textures/npc/dacapo-smile.png"),
        ],
      },
      bpm: 100,
      musicalScale: [130.81, 155.56, 174.61, 196, 233.08, 261.63, 311.13, 349.23],
      aspectRatio: 1472 / 720,
      baseBrightness: 0.8,
      baseSaturation: 0.55,
      stems: MUSIC_SHOP_STEMS,
      noteStemMapping: NOTE_STEM_MAPPING,
      noteEffectMapping: NOTE_EFFECT_MAPPING,
    },
    "neon-forest": {
      id: "neon-forest",
      title: "네온 숲",
      noteGoal: 7,
      background: assetPath("assets/textures/abandoned-greenhouse.webp"),
      npc: null,
      bpm: 96,
      musicalScale: [146.83, 174.61, 196, 220, 261.63, 293.66, 349.23, 392],
      aspectRatio: 1456 / 720,
      baseBrightness: 0.72,
      baseSaturation: 0.45,
      stems: createFourStems("neon-forest"),
      noteStemMapping: GREENHOUSE_NOTE_STEM_MAPPING,
      noteEffectMapping: GREENHOUSE_NOTE_EFFECT_MAPPING,
    },
  } satisfies Record<RegionId, RegionManifest>,
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
