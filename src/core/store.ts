import { GAME_EVENTS } from "./constants";
import type { RegionId } from "./assetManifest";

export type SceneId = "loading" | "overworld" | "region";

export interface GameState {
  readonly collectedNotes: readonly string[];
  readonly clearedMinigames: readonly string[];
  readonly currentScene: SceneId;
  readonly currentRegion: RegionId;
  readonly muted: boolean;
  readonly completed: boolean;
}

class GameStore extends EventTarget {
  private state: GameState = {
    collectedNotes: [],
    clearedMinigames: [],
    currentScene: "loading",
    currentRegion: "music-shop",
    muted: false,
    completed: false,
  };

  get snapshot(): GameState {
    return this.state;
  }

  setState(patch: Partial<GameState>): void {
    this.state = { ...this.state, ...patch };
    this.dispatchEvent(new CustomEvent<GameState>(GAME_EVENTS.STATE_CHANGE, { detail: this.state }));
  }

  collectNote(noteId: string): void {
    if (this.state.collectedNotes.includes(noteId)) return;
    const collectedNotes = [...this.state.collectedNotes, noteId];
    this.setState({
      collectedNotes,
      completed: collectedNotes.length >= 7,
    });
  }
}

export const gameStore = new GameStore();
