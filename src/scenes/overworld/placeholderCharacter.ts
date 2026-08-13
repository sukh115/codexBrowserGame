import * as THREE from "three";

export function createPlaceholderCharacter(): THREE.Group {
  const character = new THREE.Group();
  const hoodie = new THREE.MeshStandardMaterial({ color: 0x78b58b, roughness: 0.9 });
  const skin = new THREE.MeshStandardMaterial({ color: 0xf08a5d, roughness: 0.92 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x293237, roughness: 0.82 });
  const accent = new THREE.MeshStandardMaterial({ color: 0xf08a5d, roughness: 0.75 });

  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.4, 0.62, 5, 12), hoodie);
  torso.position.y = 0.98;
  torso.scale.z = 0.78;

  const hood = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.08, 8, 22, Math.PI * 1.35), hoodie);
  hood.position.set(0, 1.38, -0.06);
  hood.rotation.set(Math.PI / 2, 0, -Math.PI * 0.18);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.48, 20, 16), skin);
  head.position.y = 1.78;
  head.scale.z = 0.9;

  const headband = new THREE.Mesh(new THREE.TorusGeometry(0.45, 0.055, 8, 24, Math.PI), hoodie);
  headband.position.set(0, 1.82, 0);
  headband.rotation.z = Math.PI / 2;

  const earGeometry = new THREE.CylinderGeometry(0.15, 0.15, 0.1, 16);
  const leftEar = new THREE.Mesh(earGeometry, hoodie);
  leftEar.position.set(-0.46, 1.76, 0);
  leftEar.rotation.z = Math.PI / 2;
  const rightEar = leftEar.clone();
  rightEar.position.x = 0.46;

  const eyeGeometry = new THREE.SphereGeometry(0.038, 8, 6);
  const leftEye = new THREE.Mesh(eyeGeometry, dark);
  leftEye.position.set(-0.14, 1.82, 0.43);
  const rightEye = leftEye.clone();
  rightEye.position.x = 0.14;
  const repeatBarGeometry = new THREE.BoxGeometry(0.28, 0.028, 0.025);
  const upperRepeatBar = new THREE.Mesh(repeatBarGeometry, dark);
  upperRepeatBar.position.set(0, 1.69, 0.445);
  const lowerRepeatBar = upperRepeatBar.clone();
  lowerRepeatBar.position.y = 1.63;

  const limbGeometry = new THREE.CapsuleGeometry(0.095, 0.5, 4, 8);
  const leftArm = new THREE.Mesh(limbGeometry, hoodie);
  leftArm.position.set(-0.47, 1.03, 0);
  leftArm.rotation.z = -0.18;
  const rightArm = leftArm.clone();
  rightArm.position.x = 0.47;
  rightArm.rotation.z = 0.18;

  const legGeometry = new THREE.CapsuleGeometry(0.11, 0.48, 4, 8);
  const leftLeg = new THREE.Mesh(legGeometry, dark);
  leftLeg.position.set(-0.18, 0.31, 0);
  const rightLeg = leftLeg.clone();
  rightLeg.position.x = 0.18;
  const shoeGeometry = new THREE.BoxGeometry(0.28, 0.14, 0.43);
  const leftShoe = new THREE.Mesh(shoeGeometry, dark);
  leftShoe.position.set(-0.18, 0.06, 0.09);
  const rightShoe = leftShoe.clone();
  rightShoe.position.x = 0.18;

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
    leftShoe,
    rightShoe,
    cable,
  );
  character.scale.setScalar(1.08);
  return character;
}
