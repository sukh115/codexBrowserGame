import * as THREE from "three";
import type { RegionId } from "../../core/assetManifest";
import { LivingBackgroundMaterial } from "./livingBackgroundMaterial";

export class ReactiveLayer {
  readonly background: LivingBackgroundMaterial;
  readonly element = document.createElement("div");
  private readonly crt = document.createElement("i");
  private readonly neon = document.createElement("i");
  private readonly bass = document.createElement("i");
  private beatTime = 0;
  private progressCount = -1;
  private reducedMotion = false;

  constructor(
    overlayRoot: HTMLElement,
    private readonly regionId: RegionId,
    texture: THREE.Texture,
    baseBrightness: number,
    baseSaturation: number,
    noteGoal: number,
  ) {
    this.background = new LivingBackgroundMaterial(texture, baseBrightness, baseSaturation, noteGoal);
    this.element.className = "region-reactive-layer";
    this.element.classList.toggle("is-greenhouse", regionId === "neon-forest");
    this.crt.className = "reactive-crt";
    this.neon.className = "reactive-neon";
    this.bass.className = "reactive-bass";
    this.element.append(this.crt, this.neon, this.bass);
    overlayRoot.append(this.element);
  }

  update(collected: readonly string[], transportTime: number, bpm: number, reducedMotion: boolean): void {
    const prefix = this.regionId === "neon-forest" ? "greenhouse-" : "";
    this.element.classList.toggle("has-rhythm", collected.includes(`${prefix}note-1`));
    this.element.classList.toggle("has-bass", collected.includes(`${prefix}note-3`));
    this.element.classList.toggle("has-harmony", collected.includes(`${prefix}note-4`));
    this.element.classList.toggle("has-melody", collected.includes(`${prefix}note-6`));
    const count = collected.filter((id) => id.startsWith(`${prefix}note-`)).length;
    if (count !== this.progressCount || reducedMotion !== this.reducedMotion) {
      this.progressCount = count;
      this.reducedMotion = reducedMotion;
      this.background.setProgress(count, reducedMotion);
    }
    const beat = Math.floor(transportTime / (60 / bpm));
    if (beat !== this.beatTime) {
      this.beatTime = beat;
      this.element.classList.remove("on-beat");
      requestAnimationFrame(() => this.element.classList.add("on-beat"));
    }
  }

  dispose(): void {
    this.background.dispose();
    this.element.remove();
  }
}
