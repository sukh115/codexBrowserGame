import { AssetLoader } from "./core/assets";
import { Engine } from "./core/engine";
import { GAME_EVENTS } from "./core/constants";
import { gameStore, getRegionNoteCount } from "./core/store";
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
  const settings = new SettingsPanel(overlay, (patch) => gameStore.setState(patch));
  const tutorial = new Tutorial(overlay, () => gameStore.setState({ tutorialCompleted: true }));
  let wasCompleted = gameStore.snapshot.completed;
  overlay.append(loading.element);

  loader.addEventListener(GAME_EVENTS.ASSET_PROGRESS, (event) => {
    loading.setProgress((event as CustomEvent<number>).detail);
  });
  loader.addEventListener(GAME_EVENTS.ASSET_COMPLETE, () => loading.complete());
  loading.onStart(() => {
    void Promise.all([stemPlayer.unlock(), sfxPlayer.unlock()]).then(async () => {
      await stemPlayer.start(initialRegion.stems);
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
      () => gameStore.reset(),
      () => {
        stemPlayer.setMasterVolume(1);
        completionOverlay.show(() => {});
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
      ));
    };
    const showRegion = (regionId: RegionId): void => {
      const region: RegionManifest = ASSET_MANIFEST.regions[regionId];
      const completed = getRegionNoteCount({
        collectedNotes: gameStore.snapshot.collectedNotes,
        currentRegion: regionId,
      }) >= 7;
      gameStore.setState({ currentScene: "region", currentRegion: regionId, completed });
      stemPlayer.lockAll();
      for (const noteId of gameStore.snapshot.collectedNotes) {
        const stemId = region.noteStemMapping[noteId];
        if (stemId) stemPlayer.unlockStem(stemId, 0.05);
        const effect = region.noteEffectMapping[noteId];
        if (effect) stemPlayer.applyEffect(effect, 0.05);
      }
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
    ));
    loading.hide();
    engine.start();
    if (!gameStore.snapshot.tutorialCompleted) tutorial.showMovement();
  });

  // 외부 에셋이 없는 현재 단계도 동일한 로딩 흐름을 유지한다.
  requestAnimationFrame(() => loader.complete());

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
    if (state.collectedNotes.length === 0) stemPlayer.lockAll();
    if (!wasCompleted && state.completed) {
      activeRegionScene?.setInputLocked(true);
      sfxPlayer.playComplete();
      completionOverlay.show(() => activeRegionScene?.setInputLocked(false));
    }
    if (wasCompleted && !state.completed) {
      completionOverlay.hide();
      activeRegionScene?.setInputLocked(false);
    }
    wasCompleted = state.completed;
    const region: RegionManifest = ASSET_MANIFEST.regions[state.currentRegion];
    for (const noteId of state.collectedNotes) {
      const stemId = region.noteStemMapping[noteId];
      if (stemId) stemPlayer.unlockStem(stemId);
      const effect = region.noteEffectMapping[noteId];
      if (effect) stemPlayer.applyEffect(effect);
    }
  });

  // 실제 수집 오브젝트가 붙기 전 스템 조합을 빠르게 검증하기 위한 임시 입력이다.
  window.addEventListener("keydown", (event) => {
    const number = Number(event.key);
    if (number >= 1 && number <= 7) gameStore.collectNote(`note-${number}`);
  });
}
