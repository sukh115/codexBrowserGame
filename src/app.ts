import { AssetLoader } from "./core/assets";
import { Engine } from "./core/engine";
import { GAME_EVENTS } from "./core/constants";
import {
  gameStore,
  type NoteCollectedDetail,
  type RegionEnteredDetail,
  type RegionProgressResetDetail,
} from "./core/store";
import { SceneManager } from "./scenes/sceneManager";
import { OverworldScene } from "./scenes/overworld/overworldScene";
import { LoadingScreen } from "./ui/loading";
import { RegionScene } from "./scenes/region/regionScene";
import { ASSET_MANIFEST, type RegionId, type RegionManifest } from "./core/assetManifest";
import { StemPlayer } from "./audio/stemPlayer";
import { SfxPlayer } from "./audio/sfx";
import { Hud } from "./ui/hud";
import { CompletionOverlay } from "./ui/completion";
import { Tutorial } from "./ui/tutorial";
import { SettingsPanel } from "./ui/settings";

export function bootstrap(root: HTMLElement): void {
  const overlay = document.createElement("div");
  overlay.className = "ui-layer";
  overlay.dataset.scene = gameStore.snapshot.currentScene;
  root.append(overlay);
  let engine: Engine;
  try {
    engine = new Engine(root);
  } catch (error) {
    overlay.remove();
    showWebGlFallback(root);
    console.error("[App] WebGLRenderer 생성 실패", error);
    return;
  }
  const sceneManager = new SceneManager(engine, overlay);
  const loader = new AssetLoader();
  const loading = new LoadingScreen();
  const initialRegion: RegionManifest = ASSET_MANIFEST.regions[gameStore.snapshot.currentRegion];
  const stemPlayer = new StemPlayer(initialRegion.bpm);
  const sfxPlayer = new SfxPlayer();
  let hud: Hud | null = null;
  let activeRegionScene: RegionScene | null = null;
  let activeOverworldScene: OverworldScene | null = null;
  const completionOverlay = new CompletionOverlay(overlay);
  const tutorial = new Tutorial(overlay, () => gameStore.setState({ tutorialCompleted: true }));
  const settings = new SettingsPanel(
    overlay,
    (patch) => gameStore.setState(patch),
    () => tutorial.replay(),
    () => gameStore.resetAll(),
  );
  const showCompletionIfNeeded = (state: typeof gameStore.snapshot): void => {
    if (state.currentScene !== "region" || !state.completed || !activeRegionScene
      || state.celebratedRegions.includes(state.currentRegion)) return;
    gameStore.celebrateRegion(state.currentRegion);
    activeRegionScene.setInputLocked(true);
    sfxPlayer.playComplete();
    completionOverlay.show(state.currentRegion, () => activeRegionScene?.setInputLocked(false));
  };
  let overworldAudioRegion: RegionId = initialRegion.id;
  let audioSwitchToken = 0;
  let imageProgress = 0;
  let audioProgress = 0;
  const backgrounds = Object.values(ASSET_MANIFEST.regions)
    .map((region) => region.background)
    .filter((background): background is string => background !== null);
  const updatePreloadProgress = (): void => {
    const total = backgrounds.length + initialRegion.stems.length;
    loading.setProgress(total === 0
      ? 1
      : (imageProgress * backgrounds.length + audioProgress * initialRegion.stems.length) / total);
  };
  overlay.append(loading.element);

  loader.addEventListener(GAME_EVENTS.ASSET_PROGRESS, (event) => {
    imageProgress = (event as CustomEvent<number>).detail;
    updatePreloadProgress();
  });
  loading.onStart(() => {
    void Promise.all([stemPlayer.unlock(), sfxPlayer.unlock()]).then(async () => {
      await stemPlayer.start(initialRegion.stems, initialRegion.id);
      for (const noteId of gameStore.snapshot.collectedNotes) {
        const stemId = initialRegion.noteStemMapping[noteId];
        if (stemId) stemPlayer.unlockStem(stemId, 0.05);
        const effect = initialRegion.noteEffectMapping[noteId];
        if (effect) stemPlayer.applyEffect(effect, 0.05);
      }
    });
    hud = new Hud(
      overlay,
      () => gameStore.setState({ muted: !gameStore.snapshot.muted }),
      () => gameStore.resetCurrentRegion(),
    );
    hud.update(gameStore.snapshot);
    settings.update(gameStore.snapshot);
    settings.show();
    gameStore.setState({ currentScene: "overworld" });
    const showOverworld = (): void => {
      activeRegionScene = null;
      gameStore.setState({ currentScene: "overworld" });
      activeOverworldScene = new OverworldScene(
        engine.renderer.domElement,
        overlay,
        showRegion,
        gameStore.snapshot.currentRegion,
        updateOverworldAudio,
        gameStore.snapshot.completedRegions,
        () => stemPlayer.getTransportTime(),
        () => gameStore.snapshot.reducedMotion,
      );
      sceneManager.transitionTo(activeOverworldScene);
    };
    const showRegion = (regionId: RegionId): void => {
      activeOverworldScene = null;
      const region: RegionManifest = ASSET_MANIFEST.regions[regionId];
      gameStore.enterRegion(regionId);
      if (!gameStore.snapshot.muted) stemPlayer.setMasterVolume(1);
      activeRegionScene = new RegionScene(
        engine.renderer.domElement,
        overlay,
        region,
        showOverworld,
        gameStore.snapshot.collectedNotes,
        (noteId) => {
          if (noteId.startsWith("secret-")) sfxPlayer.playArpeggio(region.musicalScale);
          else sfxPlayer.playFound();
          gameStore.collectNote(noteId);
        },
        gameStore.snapshot.clearedMinigames,
        (gameId, rewardNoteId) => {
          sfxPlayer.playFound();
          const stemId = region.noteStemMapping[rewardNoteId];
          if (stemId) stemPlayer.unlockStem(stemId, 0.5);
          gameStore.clearMinigame(gameId, rewardNoteId);
        },
        () => stemPlayer.getTransportTime(),
        sfxPlayer,
        () => gameStore.snapshot.rhythmAssist,
        () => gameStore.snapshot.reducedMotion,
      );
      sceneManager.transitionTo(activeRegionScene);
      showCompletionIfNeeded(gameStore.snapshot);
      if (!gameStore.snapshot.tutorialCompleted) tutorial.showRegion();
    };
    const updateOverworldAudio = (regionId: RegionId, proximity: number): void => {
      if (gameStore.snapshot.muted || gameStore.snapshot.currentScene !== "overworld") return;
      if (overworldAudioRegion !== regionId) {
        overworldAudioRegion = regionId;
        const switchToken = ++audioSwitchToken;
        const region: RegionManifest = ASSET_MANIFEST.regions[regionId];
        stemPlayer.lockAll();
        void stemPlayer.setRegion(region.stems, region.bpm, region.id).then(() => {
          if (switchToken !== audioSwitchToken || gameStore.snapshot.currentScene !== "overworld") return;
          for (const noteId of gameStore.snapshot.collectedNotes) {
            const stemId = region.noteStemMapping[noteId];
            if (stemId) stemPlayer.unlockStem(stemId, 0.12);
            const effect = region.noteEffectMapping[noteId];
            if (effect) stemPlayer.applyEffect(effect, 0.12);
          }
        });
      }
      const entrance = ASSET_MANIFEST.overworldEntrances.find((item) => item.regionId === regionId);
      if (!entrance) return;
      const { minimumVolume, maximumVolume } = entrance;
      stemPlayer.setMasterVolume(
        minimumVolume + (maximumVolume - minimumVolume) * proximity,
        0.12,
      );
    };
    activeOverworldScene = new OverworldScene(
      engine.renderer.domElement,
      overlay,
      showRegion,
      null,
      updateOverworldAudio,
      gameStore.snapshot.completedRegions,
      () => stemPlayer.getTransportTime(),
      () => gameStore.snapshot.reducedMotion,
    );
    sceneManager.show(activeOverworldScene);
    loading.hide();
    engine.start();
    if (!gameStore.snapshot.tutorialCompleted) tutorial.showMovement();
  });

  // 외부 에셋이 없는 현재 단계도 동일한 로딩 흐름을 유지한다.
  void Promise.all([
    loader.preloadImages(backgrounds),
    stemPlayer.preload(initialRegion.stems, initialRegion.id, initialRegion.bpm, (progress) => {
      audioProgress = progress;
      updatePreloadProgress();
    }),
  ]).then(() => loading.complete());

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") {
      void sfxPlayer.suspendForBackground();
      return;
    }
    void Promise.all([
      stemPlayer.resumeAndRestore(),
      sfxPlayer.resumeAndRestore(),
    ]);
  });

  gameStore.addEventListener(GAME_EVENTS.STATE_CHANGE, (event) => {
    const state = (event as CustomEvent<typeof gameStore.snapshot>).detail;
    overlay.dataset.scene = state.currentScene;
    hud?.update(state);
    settings.update(state);
    stemPlayer.setUserVolume(state.masterVolume);
    sfxPlayer.setVolume(state.sfxVolume);
    activeRegionScene?.syncCollectedNotes(state.collectedNotes);
    activeRegionScene?.syncClearedMinigames(state.clearedMinigames);
    activeOverworldScene?.syncCompletedRegions(state.completedRegions);
    sfxPlayer.setMuted(state.muted);
    if (state.muted || state.currentScene === "region") {
      stemPlayer.setMasterVolume(state.muted ? 0 : 1);
    }
    showCompletionIfNeeded(state);
  });

  gameStore.addEventListener(GAME_EVENTS.NOTE_COLLECTED, (event) => {
    const { noteId, regionId } = (event as CustomEvent<NoteCollectedDetail>).detail;
    if (regionId !== gameStore.snapshot.currentRegion) return;
    const region: RegionManifest = ASSET_MANIFEST.regions[regionId];
    const stemId = region.noteStemMapping[noteId];
    if (stemId) stemPlayer.unlockStem(stemId);
    const effect = region.noteEffectMapping[noteId];
    if (effect) stemPlayer.applyEffect(effect);
  });

  gameStore.addEventListener(GAME_EVENTS.REGION_ENTERED, (event) => {
    const { regionId } = (event as CustomEvent<RegionEnteredDetail>).detail;
    audioSwitchToken += 1;
    overworldAudioRegion = regionId;
    const region: RegionManifest = ASSET_MANIFEST.regions[regionId];
    stemPlayer.lockAll();
    void stemPlayer.setRegion(region.stems, region.bpm, region.id).then(() => {
      for (const noteId of gameStore.snapshot.collectedNotes) {
        const stemId = region.noteStemMapping[noteId];
        if (stemId) stemPlayer.unlockStem(stemId, 0.05);
        const effect = region.noteEffectMapping[noteId];
        if (effect) stemPlayer.applyEffect(effect, 0.05);
      }
    });
  });

  gameStore.addEventListener(GAME_EVENTS.REGION_PROGRESS_RESET, (event) => {
    const { regionId } = (event as CustomEvent<RegionProgressResetDetail>).detail;
    if (regionId === gameStore.snapshot.currentRegion) stemPlayer.lockAll();
    completionOverlay.hide();
    activeRegionScene?.setInputLocked(false);
  });

  gameStore.addEventListener(GAME_EVENTS.ALL_PROGRESS_RESET, () => {
    stemPlayer.lockAll();
    completionOverlay.hide();
    activeRegionScene?.setInputLocked(false);
  });

  // 실제 수집 오브젝트가 붙기 전 스템 조합을 빠르게 검증하기 위한 임시 입력이다.
  if (new URLSearchParams(window.location.search).has("debug")) {
    window.addEventListener("keydown", (event) => {
      const number = Number(event.key);
      if (number >= 1 && number <= 7) {
        const prefix = gameStore.snapshot.currentRegion === "neon-forest" ? "greenhouse-note-" : "note-";
        gameStore.collectNote(`${prefix}${number}`);
      }
    });
  }
}

function showWebGlFallback(root: HTMLElement): void {
  const fallback = document.createElement("main");
  fallback.className = "webgl-fallback";
  fallback.innerHTML = "<h1>그래픽을 시작할 수 없어요</h1><p>WebGL을 지원하는 최신 브라우저에서 다시 열거나 하드웨어 가속을 켜주세요.</p>";
  root.replaceChildren(fallback);
}
