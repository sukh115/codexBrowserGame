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

  async preloadImages(urls: readonly string[]): Promise<void> {
    if (urls.length === 0) {
      this.complete();
      return;
    }
    await Promise.all(urls.map((url) => new Promise<void>((resolve) => {
      this.manager.itemStart(url);
      const image = new Image();
      image.onload = () => {
        this.manager.itemEnd(url);
        resolve();
      };
      image.onerror = () => {
        this.manager.itemError(url);
        this.manager.itemEnd(url);
        resolve();
      };
      image.src = url;
    })));
  }
}
