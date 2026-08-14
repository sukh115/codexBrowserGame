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
  root.append(overlay);
  const engine = new Engine(root);
  const sceneManager = new SceneManager(engine, overlay);
  const loader = new AssetLoader();
  const loading = new LoadingScreen();
  const initialRegion: RegionManifest = ASSET_MANIFEST.regions[gameStore.snapshot.currentRegion];
  const stemPlayer = new StemPlayer(initialRegion.bpm);
  const sfxPlayer = new SfxPlayer();
  let hud: Hud | null = null;
  let activeRegionScene: RegionScene | null = null;
  const completionOverlay = new CompletionOverlay(overlay);
  const tutorial = new Tutorial(overlay, () => gameStore.setState({ tutorialCompleted: true }));
  const settings = new SettingsPanel(
    overlay,
    (patch) => gameStore.setState(patch),
    () => tutorial.replay(),
    () => gameStore.resetAll(),
  );
  let wasCompleted = gameStore.snapshot.completed;
  overlay.append(loading.element);

  loader.addEventListener(GAME_EVENTS.ASSET_PROGRESS, (event) => {
    loading.setProgress((event as CustomEvent<number>).detail);
  });
  loader.addEventListener(GAME_EVENTS.ASSET_COMPLETE, () => loading.complete());
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
      () => {
        stemPlayer.setMasterVolume(1);
        completionOverlay.show(gameStore.snapshot.currentRegion, () => {});
      },
    );
    hud.update(gameStore.snapshot);
    settings.update(gameStore.snapshot);
    settings.show();
    gameStore.setState({ currentScene: "overworld" });
    const showOverworld = (): void => {
      activeRegionScene = null;
      gameStore.setState({ currentScene: "overworld" });
      sceneManager.transitionTo(new OverworldScene(
        engine.renderer.domElement,
        overlay,
        showRegion,
        gameStore.snapshot.currentRegion,
        updateOverworldAudio,
        gameStore.snapshot.completedRegions,
      ));
    };
    const showRegion = (regionId: RegionId): void => {
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
          sfxPlayer.playFound();
          gameStore.collectNote(noteId);
        },
        gameStore.snapshot.clearedMinigames,
        (gameId, rewardNoteId) => {
          sfxPlayer.playFound();
          gameStore.clearMinigame(gameId, rewardNoteId);
        },
        () => stemPlayer.getTransportTime(),
        (index) => sfxPlayer.playTone(index),
        () => gameStore.snapshot.rhythmAssist,
      );
      sceneManager.transitionTo(activeRegionScene);
      if (!gameStore.snapshot.tutorialCompleted) tutorial.showRegion();
    };
    const updateOverworldAudio = (proximity: number): void => {
      if (gameStore.snapshot.muted || gameStore.snapshot.currentScene !== "overworld") return;
      const { minimumVolume, maximumVolume } = ASSET_MANIFEST.overworldEntrance;
      stemPlayer.setMasterVolume(
        minimumVolume + (maximumVolume - minimumVolume) * proximity,
        0.12,
      );
    };
    sceneManager.show(new OverworldScene(
      engine.renderer.domElement,
      overlay,
      showRegion,
      null,
      updateOverworldAudio,
      gameStore.snapshot.completedRegions,
    ));
    loading.hide();
    engine.start();
    if (!gameStore.snapshot.tutorialCompleted) tutorial.showMovement();
  });

  // 외부 에셋이 없는 현재 단계도 동일한 로딩 흐름을 유지한다.
  void loader.preloadImages(Object.values(ASSET_MANIFEST.regions)
    .map((region) => region.background)
    .filter((background): background is string => background !== null));

  gameStore.addEventListener(GAME_EVENTS.STATE_CHANGE, (event) => {
    const state = (event as CustomEvent<typeof gameStore.snapshot>).detail;
    hud?.update(state);
    settings.update(state);
    stemPlayer.setUserVolume(state.masterVolume);
    sfxPlayer.setVolume(state.sfxVolume);
    activeRegionScene?.syncCollectedNotes(state.collectedNotes);
    activeRegionScene?.syncClearedMinigames(state.clearedMinigames);
    sfxPlayer.setMuted(state.muted);
    if (state.muted || state.currentScene === "region") {
      stemPlayer.setMasterVolume(state.muted ? 0 : 1);
    }
    if (!wasCompleted && state.completed) {
      activeRegionScene?.setInputLocked(true);
      sfxPlayer.playComplete();
      completionOverlay.show(state.currentRegion, () => activeRegionScene?.setInputLocked(false));
    }
    if (wasCompleted && !state.completed) {
      completionOverlay.hide();
      activeRegionScene?.setInputLocked(false);
    }
    wasCompleted = state.completed;
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
  });

  gameStore.addEventListener(GAME_EVENTS.ALL_PROGRESS_RESET, () => stemPlayer.lockAll());

  // 실제 수집 오브젝트가 붙기 전 스템 조합을 빠르게 검증하기 위한 임시 입력이다.
  window.addEventListener("keydown", (event) => {
    const number = Number(event.key);
    if (number >= 1 && number <= 7) {
      const prefix = gameStore.snapshot.currentRegion === "neon-forest" ? "greenhouse-note-" : "note-";
      gameStore.collectNote(`${prefix}${number}`);
    }
  });
}
