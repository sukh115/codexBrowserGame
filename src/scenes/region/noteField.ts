import * as THREE from "three";
import type { NoteSpot } from "./noteSpots";

interface NoteObject {
  readonly id: string;
  readonly sprite: THREE.Sprite;
  active: boolean;
}

interface BurstEffect {
  readonly mesh: THREE.Mesh<THREE.RingGeometry, THREE.MeshBasicMaterial>;
  elapsed: number;
}

export class NoteField {
  readonly group = new THREE.Group();
  private readonly texture = this.createNoteTexture();
  private readonly notes: NoteObject[] = [];
  private readonly bursts: BurstEffect[] = [];
  private readonly projected = new THREE.Vector3();
  private viewportWidth = 1;
  private viewportHeight = 1;
  private idleSeconds = 0;
  private hintNote: NoteObject | null = null;
  private hintElapsed = 0;

  constructor(
    spots: readonly NoteSpot[],
    collectedNotes: readonly string[],
    backgroundWidth: number,
    backgroundHeight: number,
    private readonly onCollect: (noteId: string) => void,
  ) {
    for (const spot of spots) {
      const material = new THREE.SpriteMaterial({
        map: this.texture,
        transparent: true,
        depthTest: false,
      });
      const sprite = new THREE.Sprite(material);
      sprite.position.set(
        (spot.u - 0.5) * backgroundWidth,
        (0.5 - spot.v) * backgroundHeight,
        0.15,
      );
      const active = !collectedNotes.includes(spot.id);
      sprite.visible = active;
      this.notes.push({ id: spot.id, sprite, active });
      this.group.add(sprite);
    }
  }

  update(deltaSeconds: number, camera: THREE.OrthographicCamera): void {
    const worldSize = (20 * (camera.top - camera.bottom)) / (this.viewportHeight * camera.zoom);
    for (const note of this.notes) {
      if (!note.active) continue;
      const pulse = note === this.hintNote ? 1 + Math.sin(this.hintElapsed * 7) * 0.28 : 1;
      note.sprite.scale.setScalar(worldSize * pulse);
    }

    this.idleSeconds += deltaSeconds;
    if (this.idleSeconds >= 60 && !this.hintNote) {
      this.hintNote = this.notes.find((note) => note.active) ?? null;
      this.hintElapsed = 0;
    }
    if (this.hintNote) {
      this.hintElapsed += deltaSeconds;
      const material = this.hintNote.sprite.material;
      material.opacity = 0.62 + Math.sin(this.hintElapsed * 7) * 0.28;
      if (this.hintElapsed >= 3) {
        material.opacity = 1;
        this.hintNote = null;
        this.idleSeconds = 0;
      }
    }

    for (let index = this.bursts.length - 1; index >= 0; index -= 1) {
      const burst = this.bursts[index];
      burst.elapsed += deltaSeconds;
      burst.mesh.scale.setScalar(1 + burst.elapsed * 4);
      burst.mesh.material.opacity = Math.max(0, 1 - burst.elapsed * 2.5);
      if (burst.elapsed >= 0.4) {
        this.group.remove(burst.mesh);
        burst.mesh.geometry.dispose();
        burst.mesh.material.dispose();
        this.bursts.splice(index, 1);
      }
    }
  }

  resize(width: number, height: number): void {
    this.viewportWidth = width;
    this.viewportHeight = height;
  }

  collectAt(clientX: number, clientY: number, camera: THREE.OrthographicCamera): boolean {
    let nearest: NoteObject | null = null;
    let nearestDistance = 24;
    for (const note of this.notes) {
      if (!note.active) continue;
      this.projected.copy(note.sprite.position).project(camera);
      const screenX = (this.projected.x * 0.5 + 0.5) * this.viewportWidth;
      const screenY = (-this.projected.y * 0.5 + 0.5) * this.viewportHeight;
      const distance = Math.hypot(clientX - screenX, clientY - screenY);
      if (distance < nearestDistance) {
        nearest = note;
        nearestDistance = distance;
      }
    }
    if (!nearest) return false;
    nearest.active = false;
    nearest.sprite.visible = false;
    this.createBurst(nearest.sprite.position);
    this.idleSeconds = 0;
    this.hintNote = null;
    this.onCollect(nearest.id);
    return true;
  }

  syncCollectedNotes(collectedNotes: readonly string[]): void {
    for (const note of this.notes) {
      note.active = !collectedNotes.includes(note.id);
      note.sprite.visible = note.active;
      note.sprite.material.opacity = 1;
    }
    this.hintNote = null;
    this.hintElapsed = 0;
    this.idleSeconds = 0;
  }

  dispose(): void {
    for (const note of this.notes) note.sprite.material.dispose();
    for (const burst of this.bursts) {
      burst.mesh.geometry.dispose();
      burst.mesh.material.dispose();
    }
    this.texture.dispose();
    this.group.clear();
    this.notes.length = 0;
    this.bursts.length = 0;
  }

  private createBurst(position: THREE.Vector3): void {
    const mesh = new THREE.Mesh(
      new THREE.RingGeometry(0.18, 0.25, 24),
      new THREE.MeshBasicMaterial({ color: 0xffef8b, transparent: true, depthTest: false }),
    );
    mesh.position.copy(position);
    mesh.position.z = 0.2;
    this.group.add(mesh);
    this.bursts.push({ mesh, elapsed: 0 });
  }

  private createNoteTexture(): THREE.CanvasTexture {
    const canvas = document.createElement("canvas");
    canvas.width = 128;
    canvas.height = 128;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("음표 텍스처를 만들 수 없습니다.");
    context.shadowColor = "#62ffe5";
    context.shadowBlur = 14;
    context.fillStyle = "#fff4a8";
    context.font = "bold 96px serif";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText("♪", 64, 67);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }
}
