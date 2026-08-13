import * as THREE from "three";
import { GAME_EVENTS } from "./constants";

export class AssetLoader extends EventTarget {
  readonly manager = new THREE.LoadingManager();

  constructor() {
    super();
    this.manager.onProgress = (_url, loaded, total) => {
      this.dispatchEvent(new CustomEvent<number>(GAME_EVENTS.ASSET_PROGRESS, {
        detail: total === 0 ? 1 : loaded / total,
      }));
    };
    this.manager.onLoad = () => this.complete();
  }

  complete(): void {
    this.dispatchEvent(new Event(GAME_EVENTS.ASSET_COMPLETE));
  }
}
