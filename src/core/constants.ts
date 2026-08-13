export const GAME_EVENTS = {
  ASSET_PROGRESS: "game:asset-progress",
  ASSET_COMPLETE: "game:asset-complete",
  STATE_CHANGE: "game:state-change",
  TAP: "game:tap",
  POINT: "game:point",
} as const;

export const INPUT_LIMITS = {
  TAP_DISTANCE_PX: 8,
  TAP_DURATION_MS: 300,
} as const;

export const WORLD = {
  SIZE: 40,
  HALF_SIZE: 20,
  MOVE_SPEED: 5,
  ARRIVAL_RADIUS: 0.3,
} as const;
