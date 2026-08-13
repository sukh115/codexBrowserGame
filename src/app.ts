import { AssetLoader } from "./core/assets";
import { Engine } from "./core/engine";
import { GAME_EVENTS } from "./core/constants";
import { gameStore } from "./core/store";
import { SceneManager } from "./scenes/sceneManager";
import { OverworldScene } from "./scenes/overworld/overworldScene";
import { LoadingScreen } from "./ui/loading";
import { RegionScene } from "./scenes/region/regionScene";
import { ASSET_MANIFEST } from "./core/assetManifest";

export function bootstrap(root: HTMLElement): void {
  const overlay = document.createElement("div");
  overlay.className = "ui-layer";
  root.append(overlay);

  const engine = new Engine(root);
  const sceneManager = new SceneManager(engine, overlay);
  const loader = new AssetLoader();
  const loading = new LoadingScreen();
  overlay.append(loading.element);

  loader.addEventListener(GAME_EVENTS.ASSET_PROGRESS, (event) => {
    loading.setProgress((event as CustomEvent<number>).detail);
  });
  loader.addEventListener(GAME_EVENTS.ASSET_COMPLETE, () => loading.complete());
  loading.onStart(() => {
    gameStore.setState({ currentScene: "overworld" });
    const showOverworld = (): void => {
      gameStore.setState({ currentScene: "overworld" });
      sceneManager.transitionTo(new OverworldScene(engine.renderer.domElement, overlay, showRegion, true));
    };
    const showRegion = (): void => {
      const region = ASSET_MANIFEST.regions[gameStore.snapshot.currentRegion];
      gameStore.setState({ currentScene: "region" });
      sceneManager.transitionTo(new RegionScene(engine.renderer.domElement, overlay, region, showOverworld));
    };
    sceneManager.show(new OverworldScene(engine.renderer.domElement, overlay, showRegion));
    loading.hide();
    engine.start();
  });

  // 외부 에셋이 없는 현재 단계도 동일한 로딩 흐름을 유지한다.
  requestAnimationFrame(() => loader.complete());
}
