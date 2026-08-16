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
    const goalReached = count >= this.noteGoal;
    const progress = Math.pow(THREE.MathUtils.clamp(count / this.noteGoal, 0, 1), 0.7);
    // 진행 중에는 원색(1.0)을 살짝 넘겨 변화가 보이게 하고, 완성 순간 정확히 원색으로 정돈한다
    const saturation = goalReached ? 1 : THREE.MathUtils.lerp(this.baseSaturation, 1.18, progress);
    const brightness = goalReached ? 1 : THREE.MathUtils.lerp(this.baseBrightness, 1.12, progress);
    gsap.killTweensOf([this.saturation, this.brightness]);
    if (reducedMotion) {
      this.saturation.value = saturation;
      this.brightness.value = brightness;
      return;
    }
    if (count > 0 && !goalReached) {
      // 수집 순간 서지: 배경이 확 피어올랐다가 새 레벨로 가라앉는다
      this.brightness.value = Math.min(1.4, brightness + 0.28);
      this.saturation.value = Math.min(1.35, saturation + 0.22);
    }
    gsap.to(this.saturation, { value: saturation, duration: 1.1, ease: "power2.out" });
    gsap.to(this.brightness, { value: brightness, duration: 1.1, ease: "power2.out" });
  }

  dispose(): void {
    gsap.killTweensOf([this.saturation, this.brightness]);
    this.material.dispose();
  }
}
