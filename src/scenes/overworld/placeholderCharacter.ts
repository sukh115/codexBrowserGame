import * as THREE from "three";

export interface PlaceholderCharacterRig {
  readonly group: THREE.Group;
  readonly torso: THREE.Mesh;
  readonly head: THREE.Mesh;
  readonly leftArm: THREE.Group;
  readonly rightArm: THREE.Group;
  readonly leftLeg: THREE.Group;
  readonly rightLeg: THREE.Group;
}

export function createPlaceholderCharacter(): PlaceholderCharacterRig {
  const character = new THREE.Group();
  const hoodie = new THREE.MeshStandardMaterial({ color: 0x72b98c, roughness: 0.9 });
  const face = new THREE.MeshStandardMaterial({ color: 0xfff8e8, roughness: 0.96 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x273238, roughness: 0.86 });
  const accent = new THREE.MeshStandardMaterial({ color: 0xf08a5d, roughness: 0.75 });
  const sole = new THREE.MeshStandardMaterial({ color: 0x526167, roughness: 0.9 });

  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.38, 0.54, 6, 14), hoodie);
  torso.position.y = 0.94;
  torso.scale.set(1, 1, 0.72);

  const hood = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.08, 8, 22, Math.PI * 1.35), hoodie);
  hood.position.set(0, 1.36, -0.08);
  hood.rotation.set(Math.PI / 2, 0, -Math.PI * 0.18);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.54, 24, 18), face);
  head.position.y = 1.78;
  head.scale.set(1, 0.96, 0.9);

  const headband = new THREE.Mesh(new THREE.TorusGeometry(0.45, 0.055, 8, 24, Math.PI), hoodie);
  headband.position.set(0, 1.82, 0);
  headband.rotation.z = Math.PI / 2;

  const earGeometry = new THREE.CylinderGeometry(0.15, 0.15, 0.1, 16);
  const leftEar = new THREE.Mesh(earGeometry, hoodie);
  leftEar.position.set(-0.46, 1.76, 0);
  leftEar.rotation.z = Math.PI / 2;
  const rightEar = leftEar.clone();
  rightEar.position.x = 0.46;

  const eyeGeometry = new THREE.SphereGeometry(0.044, 10, 8);
  const leftEye = new THREE.Mesh(eyeGeometry, accent);
  leftEye.position.set(-0.15, 1.82, 0.485);
  const rightEye = leftEye.clone();
  rightEye.position.x = 0.14;
  const repeatBarGeometry = new THREE.CapsuleGeometry(0.018, 0.28, 3, 8);
  repeatBarGeometry.rotateZ(Math.PI / 2);
  const upperRepeatBar = new THREE.Mesh(repeatBarGeometry, accent);
  upperRepeatBar.position.set(0, 1.69, 0.49);
  const lowerRepeatBar = upperRepeatBar.clone();
  lowerRepeatBar.position.y = 1.63;

  const limbGeometry = new THREE.CapsuleGeometry(0.085, 0.42, 4, 9);
  const leftArm = new THREE.Group();
  leftArm.position.set(-0.42, 1.2, 0);
  leftArm.rotation.z = 0.16;
  const leftArmMesh = new THREE.Mesh(limbGeometry, hoodie);
  leftArmMesh.position.y = -0.28;
  leftArm.add(leftArmMesh);
  const rightArm = new THREE.Group();
  rightArm.position.set(0.42, 1.2, 0);
  rightArm.rotation.z = -0.16;
  const rightArmMesh = leftArmMesh.clone();
  rightArm.add(rightArmMesh);

  const legGeometry = new THREE.CapsuleGeometry(0.105, 0.4, 4, 9);
  const leftLeg = new THREE.Group();
  leftLeg.position.set(-0.17, 0.55, 0);
  const leftLegMesh = new THREE.Mesh(legGeometry, dark);
  leftLegMesh.position.y = -0.27;
  leftLeg.add(leftLegMesh);
  const rightLeg = new THREE.Group();
  rightLeg.position.set(0.17, 0.55, 0);
  const rightLegMesh = leftLegMesh.clone();
  rightLeg.add(rightLegMesh);

  const shoeGeometry = new THREE.CapsuleGeometry(0.1, 0.22, 4, 9);
  shoeGeometry.rotateX(Math.PI / 2);
  const leftShoe = new THREE.Mesh(shoeGeometry, sole);
  leftShoe.position.set(0, -0.55, 0.1);
  leftShoe.scale.set(1.05, 0.72, 1);
  leftLeg.add(leftShoe);
  const rightShoe = leftShoe.clone();
  rightLeg.add(rightShoe);

  const cableCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.45, 1.72, -0.02),
    new THREE.Vector3(-0.55, 1.1, 0.03),
    new THREE.Vector3(-0.42, 0.58, 0.08),
  ]);
  const cable = new THREE.Mesh(new THREE.TubeGeometry(cableCurve, 12, 0.018, 5, false), accent);

  character.add(
    torso,
    hood,
    head,
    headband,
    leftEar,
    rightEar,
    leftEye,
    rightEye,
    upperRepeatBar,
    lowerRepeatBar,
    leftArm,
    rightArm,
    leftLeg,
    rightLeg,
    cable,
  );
  character.scale.setScalar(1.2);
  return { group: character, torso, head, leftArm, rightArm, leftLeg, rightLeg };
}
