import * as THREE from "three";

const COLORS = {
  cream: 0xfff2dc,
  mint: 0x69c99a,
  mintDark: 0x347c65,
  orange: 0xf0783c,
  charcoal: 0x283438,
} as const;

export function applyConceptCharacterStyle(model: THREE.Group): void {
  softenRobotMaterials(model);
  const scale = model.scale.x;
  if (scale <= 0) return;

  const overlay = new THREE.Group();
  overlay.name = "ConceptCharacterOverlay";
  overlay.scale.setScalar(1 / scale);
  overlay.position.y = -model.position.y / scale;

  const cream = new THREE.MeshStandardMaterial({ color: COLORS.cream, roughness: 0.92 });
  const mint = new THREE.MeshStandardMaterial({ color: COLORS.mint, roughness: 0.86 });
  const mintDark = new THREE.MeshStandardMaterial({ color: COLORS.mintDark, roughness: 0.82 });
  const orange = new THREE.MeshStandardMaterial({ color: COLORS.orange, roughness: 0.8 });
  const charcoal = new THREE.MeshStandardMaterial({ color: COLORS.charcoal, roughness: 0.9 });

  const hoodie = new THREE.Mesh(new THREE.CapsuleGeometry(0.4, 0.56, 5, 12), mint);
  hoodie.position.set(0, 1.03, 0.015);
  hoodie.scale.z = 0.76;

  const hood = new THREE.Mesh(new THREE.TorusGeometry(0.35, 0.075, 8, 22, Math.PI * 1.35), mintDark);
  hood.position.set(0, 1.4, -0.04);
  hood.rotation.set(Math.PI / 2, 0, -Math.PI * 0.18);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.46, 24, 18), cream);
  head.position.set(0, 1.78, 0.02);
  head.scale.z = 0.9;

  const headband = new THREE.Mesh(new THREE.TorusGeometry(0.46, 0.055, 8, 28, Math.PI), mint);
  headband.position.set(0, 1.82, 0.015);
  headband.rotation.z = Math.PI / 2;

  const earGeometry = new THREE.CylinderGeometry(0.145, 0.145, 0.105, 18);
  const leftEar = new THREE.Mesh(earGeometry, mintDark);
  leftEar.position.set(-0.45, 1.76, 0.02);
  leftEar.rotation.z = Math.PI / 2;
  const rightEar = leftEar.clone();
  rightEar.position.x = 0.45;

  const faceZ = 0.43;
  const eyeGeometry = new THREE.SphereGeometry(0.042, 10, 8);
  const leftEye = new THREE.Mesh(eyeGeometry, orange);
  leftEye.position.set(-0.14, 1.83, faceZ);
  const rightEye = leftEye.clone();
  rightEye.position.x = 0.14;
  const barGeometry = new THREE.BoxGeometry(0.3, 0.03, 0.025);
  const upperBar = new THREE.Mesh(barGeometry, orange);
  upperBar.position.set(0, 1.7, faceZ + 0.012);
  const lowerBar = upperBar.clone();
  lowerBar.position.y = 1.64;

  const pouch = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.2, 0.08), mintDark);
  pouch.position.set(0, 0.9, 0.34);
  const pouchLine = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.025, 0.015), charcoal);
  pouchLine.position.set(0, 0.93, 0.385);

  overlay.add(
    hoodie,
    hood,
    head,
    headband,
    leftEar,
    rightEar,
    leftEye,
    rightEye,
    upperBar,
    lowerBar,
    pouch,
    pouchLine,
  );
  model.add(overlay);
}

function softenRobotMaterials(model: THREE.Group): void {
  model.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    const name = object.name.toLowerCase();
    for (const material of materials) {
      if (!(material instanceof THREE.MeshStandardMaterial)) continue;
      material.metalness = 0;
      material.roughness = 0.88;
      if (name.includes("eye") || name.includes("mouth")) material.color.setHex(COLORS.orange);
      else if (name.includes("head")) material.color.setHex(COLORS.cream);
      else material.color.lerp(new THREE.Color(COLORS.charcoal), 0.38);
    }
  });
}
