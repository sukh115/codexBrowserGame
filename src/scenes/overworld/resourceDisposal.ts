import * as THREE from "three";

export function disposeObject3D(root: THREE.Object3D): void {
  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();
  const textures = new Set<THREE.Texture>();
  const skeletons = new Set<THREE.Skeleton>();

  root.traverse((object) => {
    if (object instanceof THREE.SkinnedMesh) skeletons.add(object.skeleton);
    if (!(object instanceof THREE.Mesh)) return;
    geometries.add(object.geometry);
    const meshMaterials = Array.isArray(object.material) ? object.material : [object.material];
    for (const material of meshMaterials) {
      materials.add(material);
      const values = Object.values(material as unknown as Record<string, unknown>);
      for (const value of values) {
        if (value instanceof THREE.Texture) textures.add(value);
      }
    }
  });

  skeletons.forEach((skeleton) => skeleton.dispose());
  textures.forEach((texture) => texture.dispose());
  materials.forEach((material) => material.dispose());
  geometries.forEach((geometry) => geometry.dispose());
}
