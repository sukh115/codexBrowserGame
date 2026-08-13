export type RegionId = "music-shop" | "neon-forest";

export interface RegionManifest {
  readonly id: RegionId;
  readonly title: string;
  readonly background: string | null;
  readonly bpm: number;
}

export const ASSET_MANIFEST = {
  characterModel: null as string | null,
  overworldGround: null as string | null,
  regions: {
    "music-shop": {
      id: "music-shop",
      title: "잠든 악기점",
      background: null,
      bpm: 120,
    },
    "neon-forest": {
      id: "neon-forest",
      title: "네온 숲",
      background: null,
      bpm: 120,
    },
  } satisfies Record<RegionId, RegionManifest>,
} as const;
