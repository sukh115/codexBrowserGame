import { GAME_EVENTS, GAME_STORAGE_KEY } from "./constants";
import { ASSET_MANIFEST, type RegionId } from "./assetManifest";

const CURRENT_SAVE_VERSION = 3;

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
  readonly celebratedRegions: readonly RegionId[];
  readonly tutorialCompleted: boolean;
  readonly masterVolume: number;
  readonly sfxVolume: number;
  readonly reducedMotion: boolean;
  readonly rhythmAssist: boolean;
}

export interface NoteCollectedDetail {
  readonly noteId: string;
  readonly regionId: RegionId;
}

export interface RegionProgressResetDetail {
  readonly regionId: RegionId;
}

export interface RegionEnteredDetail {
  readonly regionId: RegionId;
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
    saveVersion: CURRENT_SAVE_VERSION,
    collectedNotes: [],
    clearedMinigames: [],
    currentScene: "loading",
    currentRegion: "music-shop",
    muted: false,
    completed: false,
    completedRegions: [],
    celebratedRegions: [],
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
    this.persist();
    this.dispatchEvent(new CustomEvent<GameState>(GAME_EVENTS.STATE_CHANGE, { detail: this.state }));
  }

  enterRegion(regionId: RegionId): void {
    const completed = getNoteCountForRegion(this.state.collectedNotes, regionId) >= ASSET_MANIFEST.regions[regionId].noteGoal;
    this.setState({ currentScene: "region", currentRegion: regionId, completed });
    this.dispatchEvent(new CustomEvent<RegionEnteredDetail>(GAME_EVENTS.REGION_ENTERED, {
      detail: { regionId },
    }));
  }

  celebrateRegion(regionId: RegionId): void {
    if (this.state.celebratedRegions.includes(regionId)) return;
    this.setState({ celebratedRegions: [...this.state.celebratedRegions, regionId] });
  }

  collectNote(noteId: string): void {
    if (this.state.collectedNotes.includes(noteId)) return;
    const collectedNotes = [...this.state.collectedNotes, noteId];
    const completed = getRegionNoteCount({ ...this.state, collectedNotes })
      >= ASSET_MANIFEST.regions[this.state.currentRegion].noteGoal;
    const completedRegions = completed && !this.state.completedRegions.includes(this.state.currentRegion)
      ? [...this.state.completedRegions, this.state.currentRegion]
      : this.state.completedRegions;
    this.setState({ collectedNotes, completed, completedRegions });
    this.dispatchEvent(new CustomEvent<NoteCollectedDetail>(GAME_EVENTS.NOTE_COLLECTED, {
      detail: { noteId, regionId: this.state.currentRegion },
    }));
  }

  clearMinigame(gameId: string, rewardNoteId: string): void {
    if (this.state.clearedMinigames.includes(gameId)) return;
    const clearedMinigames = [...this.state.clearedMinigames, gameId];
    const noteWasNew = !this.state.collectedNotes.includes(rewardNoteId);
    const collectedNotes = !noteWasNew
      ? [...this.state.collectedNotes]
      : [...this.state.collectedNotes, rewardNoteId];
    const completed = getRegionNoteCount({ ...this.state, collectedNotes })
      >= ASSET_MANIFEST.regions[this.state.currentRegion].noteGoal;
    const completedRegions = completed && !this.state.completedRegions.includes(this.state.currentRegion)
      ? [...this.state.completedRegions, this.state.currentRegion]
      : this.state.completedRegions;
    this.setState({
      clearedMinigames,
      collectedNotes,
      completed,
      completedRegions,
    });
    if (noteWasNew) {
      this.dispatchEvent(new CustomEvent<NoteCollectedDetail>(GAME_EVENTS.NOTE_COLLECTED, {
        detail: { noteId: rewardNoteId, regionId: this.state.currentRegion },
      }));
    }
  }

  resetCurrentRegion(): void {
    const greenhouse = this.state.currentRegion === "neon-forest";
    const notePrefix = greenhouse ? "greenhouse-note-" : "note-";
    const gamePrefix = greenhouse ? "greenhouse-" : "";
    this.setState({
      collectedNotes: this.state.collectedNotes.filter((id) => !id.startsWith(notePrefix)
        && id !== `secret-${this.state.currentRegion}`),
      clearedMinigames: this.state.clearedMinigames.filter((id) => greenhouse
        ? !id.startsWith(gamePrefix)
        : id.startsWith("greenhouse-")),
      completed: false,
      completedRegions: this.state.completedRegions.filter((id) => id !== this.state.currentRegion),
      celebratedRegions: this.state.celebratedRegions.filter((id) => id !== this.state.currentRegion),
    });
    this.dispatchEvent(new CustomEvent<RegionProgressResetDetail>(GAME_EVENTS.REGION_PROGRESS_RESET, {
      detail: { regionId: this.state.currentRegion },
    }));
  }

  resetAll(): void {
    const settings = {
      muted: this.state.muted,
      tutorialCompleted: this.state.tutorialCompleted,
      masterVolume: this.state.masterVolume,
      sfxVolume: this.state.sfxVolume,
      reducedMotion: this.state.reducedMotion,
      rhythmAssist: this.state.rhythmAssist,
    };
    this.state = {
      ...this.initialState,
      ...settings,
      currentScene: this.state.currentScene,
      currentRegion: this.state.currentRegion,
    };
    this.persist();
    this.dispatchEvent(new CustomEvent<GameState>(GAME_EVENTS.STATE_CHANGE, { detail: this.state }));
    this.dispatchEvent(new Event(GAME_EVENTS.ALL_PROGRESS_RESET));
  }

  private load(): GameState {
    try {
      const value: unknown = JSON.parse(localStorage.getItem(GAME_STORAGE_KEY) ?? "null");
      if (!value || typeof value !== "object") return this.initialState;
      const stored = value as Partial<GameState>;
      const storedVersion = typeof stored.saveVersion === "number" ? stored.saveVersion : 1;
      if (!Number.isInteger(storedVersion) || storedVersion > CURRENT_SAVE_VERSION) return this.initialState;
      if (!Array.isArray(stored.collectedNotes) || !Array.isArray(stored.clearedMinigames)) {
        return this.initialState;
      }
      const collectedNotes = stored.collectedNotes.filter((item): item is string => typeof item === "string");
      const completedRegions: RegionId[] = [];
      if (getNoteCountForRegion(collectedNotes, "music-shop") >= ASSET_MANIFEST.regions["music-shop"].noteGoal) completedRegions.push("music-shop");
      if (getNoteCountForRegion(collectedNotes, "neon-forest") >= ASSET_MANIFEST.regions["neon-forest"].noteGoal) completedRegions.push("neon-forest");
      const currentRegion = stored.currentRegion === "neon-forest" ? "neon-forest" : "music-shop";
      const celebratedRegions = Array.isArray(stored.celebratedRegions)
        ? stored.celebratedRegions.filter((item): item is RegionId => item === "music-shop" || item === "neon-forest")
        : [];
      return {
        ...this.initialState,
        // 구버전 저장은 현재 필드만 명시적으로 골라 기본값과 병합한다.
        saveVersion: CURRENT_SAVE_VERSION,
        collectedNotes,
        clearedMinigames: stored.clearedMinigames.filter((item): item is string => typeof item === "string"),
        currentRegion,
        completedRegions,
        celebratedRegions,
        completed: completedRegions.includes(currentRegion),
        currentScene: "loading",
        muted: typeof stored.muted === "boolean" ? stored.muted : this.initialState.muted,
        tutorialCompleted: typeof stored.tutorialCompleted === "boolean"
          ? stored.tutorialCompleted
          : this.initialState.tutorialCompleted,
        masterVolume: this.readVolume(stored.masterVolume, this.initialState.masterVolume),
        sfxVolume: this.readVolume(stored.sfxVolume, this.initialState.sfxVolume),
        reducedMotion: typeof stored.reducedMotion === "boolean"
          ? stored.reducedMotion
          : this.initialState.reducedMotion,
        rhythmAssist: typeof stored.rhythmAssist === "boolean"
          ? stored.rhythmAssist
          : this.initialState.rhythmAssist,
      };
    } catch {
      return this.initialState;
    }
  }

  private persist(): void {
    try {
      localStorage.setItem(GAME_STORAGE_KEY, JSON.stringify(this.state));
    } catch (error) {
      // 저장소가 막혀도 현재 세션 플레이는 계속되어야 한다.
      console.warn("[Store] 진행 상황을 브라우저에 저장하지 못했습니다.", error);
    }
  }

  private readVolume(value: unknown, fallback: number): number {
    return typeof value === "number" && Number.isFinite(value)
      ? Math.max(0, Math.min(1, value))
      : fallback;
  }
}

export const gameStore = new GameStore();
