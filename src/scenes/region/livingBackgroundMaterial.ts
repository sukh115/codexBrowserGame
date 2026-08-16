import * as THREE from "three";
import { gsap } from "gsap";

export class LivingBackgroundMaterial {
  readonly material: THREE.ShaderMaterial;
  private readonly saturation: { value: number };
  private readonly brightness: { value: number };
  private readonly baseBrightness: number;
  private readonly baseSaturation: number;

  constructor(texture: THREE.Texture, baseBrightness: number, baseSaturation: number, private readonly noteGoal: number) {
    this.baseBrightness = THREE.MathUtils.clamp(baseBrightness, 0, 1);
    this.baseSaturation = THREE.MathUtils.clamp(baseSaturation, 0, 1);
    this.saturation = { value: this.baseSaturation };
    this.brightness = { value: this.baseBrightness };
    this.material = new THREE.ShaderMaterial({
      uniforms: {
        map: { value: texture },
        saturation: this.saturation,
        brightness: this.brightness,
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D map;
        uniform float saturation;
        uniform float brightness;
        varying vec2 vUv;
        void main() {
          vec4 source = texture2D(map, vUv);
          float luminance = dot(source.rgb, vec3(0.2126, 0.7152, 0.0722));
          vec3 color = mix(vec3(luminance), source.rgb, saturation) * brightness;
          gl_FragColor = vec4(color, source.a);
        }
      `,
    });
  }

  setTexture(texture: THREE.Texture): THREE.Texture {
    const previous = this.material.uniforms.map.value as THREE.Texture;
    this.material.uniforms.map.value = texture;
    return previous;
  }

  setProgress(count: number, reducedMotion: boolean): void {
    const progress = THREE.MathUtils.clamp(count / this.noteGoal, 0, 1);
    const saturation = THREE.MathUtils.lerp(this.baseSaturation, 1, progress);
    const brightness = THREE.MathUtils.lerp(this.baseBrightness, 1, progress);
    gsap.killTweensOf([this.saturation, this.brightness]);
    if (reducedMotion) {
      this.saturation.value = saturation;
      this.brightness.value = brightness;
      return;
    }
    gsap.to(this.saturation, { value: saturation, duration: 0.7, ease: "power2.out" });
    gsap.to(this.brightness, { value: brightness, duration: 0.7, ease: "power2.out" });
  }

  dispose(): void {
    gsap.killTweensOf([this.saturation, this.brightness]);
    this.material.dispose();
  }
}
