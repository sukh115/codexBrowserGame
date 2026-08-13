import { AssetLoader } from "./core/assets";
import { Engine } from "./core/engine";
import { GAME_EVENTS } from "./core/constants";
import { gameStore } from "./core/store";
import { SceneManager } from "./scenes/sceneManager";
import { OverworldScene } from "./scenes/overworld/overworldScene";
import { LoadingScreen } from "./ui/loading";
import { RegionScene } from "./scenes/region/regionScene";
import { ASSET_MANIFEST, type RegionManifest } from "./core/assetManifest";
import { StemPlayer } from "./audio/stemPlayer";
import { SfxPlayer } from "./audio/sfx";
import { Hud } from "./ui/hud";

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
      }
    });
    hud = new Hud(
      overlay,
      () => gameStore.setState({ muted: !gameStore.snapshot.muted }),
      () => gameStore.reset(),
    );
    hud.update(gameStore.snapshot);
    gameStore.setState({ currentScene: "overworld" });
    const showOverworld = (): void => {
      gameStore.setState({ currentScene: "overworld" });
      if (!gameStore.snapshot.muted) stemPlayer.setMasterVolume(0.3);
      sceneManager.transitionTo(new OverworldScene(engine.renderer.domElement, overlay, showRegion, true));
    };
    const showRegion = (): void => {
      const region = ASSET_MANIFEST.regions[gameStore.snapshot.currentRegion];
      gameStore.setState({ currentScene: "region" });
      if (!gameStore.snapshot.muted) stemPlayer.setMasterVolume(1);
      sceneManager.transitionTo(new RegionScene(
        engine.renderer.domElement,
        overlay,
        region,
        showOverworld,
        gameStore.snapshot.collectedNotes,
        (noteId) => {
          sfxPlayer.playFound();
          gameStore.collectNote(noteId);
        },
      ));
    };
    sceneManager.show(new OverworldScene(engine.renderer.domElement, overlay, showRegion));
    loading.hide();
    engine.start();
  });

  // 외부 에셋이 없는 현재 단계도 동일한 로딩 흐름을 유지한다.
  requestAnimationFrame(() => loader.complete());

  gameStore.addEventListener(GAME_EVENTS.STATE_CHANGE, (event) => {
    const state = (event as CustomEvent<typeof gameStore.snapshot>).detail;
    hud?.update(state);
    sfxPlayer.setMuted(state.muted);
    stemPlayer.setMasterVolume(state.muted ? 0 : state.currentScene === "region" ? 1 : 0.3);
    if (state.collectedNotes.length === 0) stemPlayer.lockAll();
    const region: RegionManifest = ASSET_MANIFEST.regions[state.currentRegion];
    for (const noteId of state.collectedNotes) {
      const stemId = region.noteStemMapping[noteId];
      if (stemId) stemPlayer.unlockStem(stemId);
    }
  });

  // 실제 수집 오브젝트가 붙기 전 스템 조합을 빠르게 검증하기 위한 임시 입력이다.
  window.addEventListener("keydown", (event) => {
    const number = Number(event.key);
    if (number >= 1 && number <= 7) gameStore.collectNote(`note-${number}`);
  });
}
