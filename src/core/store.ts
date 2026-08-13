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
  readonly tutorialCompleted: boolean;
  readonly masterVolume: number;
  readonly sfxVolume: number;
  readonly reducedMotion: boolean;
  readonly rhythmAssist: boolean;
}

class GameStore extends EventTarget {
  private readonly initialState: GameState = {
    collectedNotes: [],
    clearedMinigames: [],
    currentScene: "loading",
    currentRegion: "music-shop",
    muted: false,
    completed: false,
    tutorialCompleted: false,
    masterVolume: 1,
    sfxVolume: 1,
    reducedMotion: false,
    rhythmAssist: false,
  };
  private state: GameState = this.load();

  get snapshot(): GameState {
    return this.state;
  }

  setState(patch: Partial<GameState>): void {
    this.state = { ...this.state, ...patch };
    localStorage.setItem("lost-song-progress", JSON.stringify(this.state));
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

  clearMinigame(gameId: string, rewardNoteId: string): void {
    if (this.state.clearedMinigames.includes(gameId)) return;
    const clearedMinigames = [...this.state.clearedMinigames, gameId];
    const collectedNotes = this.state.collectedNotes.includes(rewardNoteId)
      ? [...this.state.collectedNotes]
      : [...this.state.collectedNotes, rewardNoteId];
    this.setState({ clearedMinigames, collectedNotes, completed: collectedNotes.length >= 7 });
  }

  reset(): void {
    this.state = { ...this.initialState, currentScene: this.state.currentScene };
    localStorage.removeItem("lost-song-progress");
    this.dispatchEvent(new CustomEvent<GameState>(GAME_EVENTS.STATE_CHANGE, { detail: this.state }));
  }

  private load(): GameState {
    try {
      const value: unknown = JSON.parse(localStorage.getItem("lost-song-progress") ?? "null");
      if (!value || typeof value !== "object") return this.initialState;
      const stored = value as Partial<GameState>;
      if (!Array.isArray(stored.collectedNotes) || !Array.isArray(stored.clearedMinigames)) {
        return this.initialState;
      }
      return {
        ...this.initialState,
        ...stored,
        collectedNotes: stored.collectedNotes.filter((item): item is string => typeof item === "string"),
        clearedMinigames: stored.clearedMinigames.filter((item): item is string => typeof item === "string"),
        currentScene: "loading",
      };
    } catch {
      return this.initialState;
    }
  }
}

export const gameStore = new GameStore();
