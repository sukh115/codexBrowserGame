import type { RegionId } from "../core/assetManifest";
import { MUSIC_SHOP_PLACEMENT } from "./musicShop";
import { NEON_FOREST_PLACEMENT } from "./neonForest";
import type { RegionPlacementData } from "./types";

export const REGION_PLACEMENTS = {
  "music-shop": MUSIC_SHOP_PLACEMENT,
  "neon-forest": NEON_FOREST_PLACEMENT,
} satisfies Record<RegionId, RegionPlacementData>;
