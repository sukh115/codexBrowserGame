import { GAME_EVENTS } from "./constants";
import type { RegionId } from "./assetManifest";

export type SceneId = "loading" | "overworld" | "region";

export interface GameState {
  readonly saveVersion: number;
  readonly collectedNotes: readonly string[];
  readonly clearedMinigames: readonly string[];
  readonly currentScene: SceneId;
  readonly currentRegion: RegionId;
  readonly muted: boolean;
  readonly completed: boolean;
  readonly completedRegions: readonly RegionId[];
  readonly tutorialCompleted: boolean;
  readonly masterVolume: number;
  readonly sfxVolume: number;
  readonly reducedMotion: boolean;
  readonly rhythmAssist: boolean;
}

export function getRegionNoteCount(state: Pick<GameState, "collectedNotes" | "currentRegion">): number {
  return getNoteCountForRegion(state.collectedNotes, state.currentRegion);
}

export function getNoteCountForRegion(collectedNotes: readonly string[], regionId: RegionId): number {
  const prefix = regionId === "neon-forest" ? "greenhouse-note-" : "note-";
  return collectedNotes.filter((id) => id.startsWith(prefix)).length;
}

class GameStore extends EventTarget {
  private readonly initialState: GameState = {
    saveVersion: 2,
    collectedNotes: [],
    clearedMinigames: [],
    currentScene: "loading",
    currentRegion: "music-shop",
    muted: false,
    completed: false,
    completedRegions: [],
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
    const completed = getRegionNoteCount({ ...this.state, collectedNotes }) >= 7;
    const completedRegions = completed && !this.state.completedRegions.includes(this.state.currentRegion)
      ? [...this.state.completedRegions, this.state.currentRegion]
      : this.state.completedRegions;
    this.setState({ collectedNotes, completed, completedRegions });
  }

  clearMinigame(gameId: string, rewardNoteId: string): void {
    if (this.state.clearedMinigames.includes(gameId)) return;
    const clearedMinigames = [...this.state.clearedMinigames, gameId];
    const collectedNotes = this.state.collectedNotes.includes(rewardNoteId)
      ? [...this.state.collectedNotes]
      : [...this.state.collectedNotes, rewardNoteId];
    const completed = getRegionNoteCount({ ...this.state, collectedNotes }) >= 7;
    const completedRegions = completed && !this.state.completedRegions.includes(this.state.currentRegion)
      ? [...this.state.completedRegions, this.state.currentRegion]
      : this.state.completedRegions;
    this.setState({
      clearedMinigames,
      collectedNotes,
      completed,
      completedRegions,
    });
  }

  resetCurrentRegion(): void {
    const greenhouse = this.state.currentRegion === "neon-forest";
    const notePrefix = greenhouse ? "greenhouse-note-" : "note-";
    const gamePrefix = greenhouse ? "greenhouse-" : "";
    this.setState({
      collectedNotes: this.state.collectedNotes.filter((id) => !id.startsWith(notePrefix)),
      clearedMinigames: this.state.clearedMinigames.filter((id) => greenhouse
        ? !id.startsWith(gamePrefix)
        : id.startsWith("greenhouse-")),
      completed: false,
      completedRegions: this.state.completedRegions.filter((id) => id !== this.state.currentRegion),
    });
  }

  resetAll(): void {
    this.state = {
      ...this.initialState,
      currentScene: this.state.currentScene,
      currentRegion: this.state.currentRegion,
    };
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
      const collectedNotes = stored.collectedNotes.filter((item): item is string => typeof item === "string");
      const completedRegions: RegionId[] = [];
      if (getNoteCountForRegion(collectedNotes, "music-shop") >= 7) completedRegions.push("music-shop");
      if (getNoteCountForRegion(collectedNotes, "neon-forest") >= 7) completedRegions.push("neon-forest");
      const currentRegion = stored.currentRegion === "neon-forest" ? "neon-forest" : "music-shop";
      return {
        ...this.initialState,
        ...stored,
        saveVersion: 2,
        collectedNotes,
        clearedMinigames: stored.clearedMinigames.filter((item): item is string => typeof item === "string"),
        currentRegion,
        completedRegions,
        completed: completedRegions.includes(currentRegion),
        currentScene: "loading",
      };
    } catch {
      return this.initialState;
    }
  }
}

export const gameStore = new GameStore();
