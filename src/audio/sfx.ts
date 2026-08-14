export class SfxPlayer {
  private context: AudioContext | null = null;
  private muted = false;
  private volume = 1;
  private humGain: GainNode | null = null;
  private humRoot: OscillatorNode | null = null;
  private humOvertone: OscillatorNode | null = null;
  private humOvertoneGain: GainNode | null = null;
  private humIntensity = 0;

  async unlock(): Promise<void> {
    if (!this.context) this.context = new AudioContext();
    await this.context.resume();
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    this.updateHumGain(0.04);
  }

  setVolume(volume: number): void {
    this.volume = Math.max(0, Math.min(1, volume));
    this.updateHumGain(0.04);
  }

  playFound(): void {
    if (!this.context || this.muted) return;
    const now = this.context.currentTime;
    const gain = this.context.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.2 * this.volume, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.38);
    gain.connect(this.context.destination);
    [659.25, 880].forEach((frequency, index) => {
      const oscillator = this.context?.createOscillator();
      if (!oscillator) return;
      oscillator.type = "sine";
      oscillator.frequency.value = frequency;
      oscillator.connect(gain);
      oscillator.start(now + index * 0.08);
      oscillator.stop(now + 0.4);
    });
  }

  playComplete(): void {
    if (!this.context || this.muted) return;
    const now = this.context.currentTime;
    const gain = this.context.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.16 * this.volume, now + 0.025);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 2.4);
    gain.connect(this.context.destination);
    [261.63, 329.63, 392, 523.25].forEach((frequency, index) => {
      const oscillator = this.context?.createOscillator();
      if (!oscillator) return;
      oscillator.type = index < 3 ? "sine" : "triangle";
      oscillator.frequency.value = frequency;
      oscillator.connect(gain);
      oscillator.start(now + index * 0.12);
      oscillator.stop(now + 2.45);
    });
  }

  playTone(index: number, duration = 0.18): void {
    if (!this.context || this.muted) return;
    const frequencies = [261.63, 329.63, 392, 523.25] as const;
    const frequency = frequencies[index];
    if (!frequency) return;
    const now = this.context.currentTime;
    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();
    oscillator.type = "sine";
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.13 * this.volume, now + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    oscillator.connect(gain).connect(this.context.destination);
    oscillator.start(now);
    oscillator.stop(now + duration + 0.02);
  }

  playPluck(frequency: number): void {
    if (!this.context || this.muted) return;
    const now = this.context.currentTime;
    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();
    oscillator.type = "triangle";
    oscillator.frequency.setValueAtTime(frequency, now);
    oscillator.frequency.exponentialRampToValueAtTime(frequency * 0.995, now + 0.32);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.12 * this.volume, now + 0.006);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.36);
    oscillator.connect(gain).connect(this.context.destination);
    oscillator.start(now);
    oscillator.stop(now + 0.38);
  }

  playArpeggio(scale: readonly number[]): void {
    if (!this.context || this.muted || scale.length === 0) return;
    const context = this.context;
    const now = context.currentTime;
    const noteIndexes = [0, 2, 4, 7] as const;
    noteIndexes.forEach((scaleIndex, index) => {
      const frequency = scale[Math.min(scaleIndex, scale.length - 1)];
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      if (!oscillator || !gain || frequency === undefined) return;
      const start = now + index * 0.09;
      oscillator.type = "triangle";
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.11 * this.volume, start + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.28);
      oscillator.connect(gain).connect(context.destination);
      oscillator.start(start);
      oscillator.stop(start + 0.3);
    });
  }

  setHum(frequency: number, intensity: number): void {
    if (!this.context) return;
    if (!this.humGain || !this.humRoot || !this.humOvertone) this.startHum(frequency);
    if (!this.humRoot || !this.humOvertone) return;
    const now = this.context.currentTime;
    this.humRoot.frequency.setTargetAtTime(frequency, now, 0.04);
    this.humOvertone.frequency.setTargetAtTime(frequency * 2, now, 0.04);
    this.humIntensity = Math.max(0, Math.min(1, intensity));
    this.updateHumGain(0.08);
  }

  stopHum(): void {
    this.humRoot?.stop();
    this.humOvertone?.stop();
    this.humRoot?.disconnect();
    this.humOvertone?.disconnect();
    this.humOvertoneGain?.disconnect();
    this.humGain?.disconnect();
    this.humRoot = null;
    this.humOvertone = null;
    this.humOvertoneGain = null;
    this.humGain = null;
    this.humIntensity = 0;
  }

  private startHum(frequency: number): void {
    if (!this.context) return;
    this.stopHum();
    this.humGain = this.context.createGain();
    this.humRoot = this.context.createOscillator();
    this.humOvertone = this.context.createOscillator();
    this.humOvertoneGain = this.context.createGain();
    this.humRoot.type = "sine";
    this.humOvertone.type = "sine";
    this.humRoot.frequency.value = frequency;
    this.humOvertone.frequency.value = frequency * 2;
    this.humGain.gain.value = 0;
    this.humOvertoneGain.gain.value = 0.28;
    this.humRoot.connect(this.humGain);
    this.humOvertone.connect(this.humOvertoneGain).connect(this.humGain);
    this.humGain.connect(this.context.destination);
    this.humRoot.start();
    this.humOvertone.start();
  }

  private updateHumGain(timeConstant: number): void {
    if (!this.context || !this.humGain) return;
    const target = this.muted ? 0 : this.humIntensity * this.volume * 0.022;
    this.humGain.gain.setTargetAtTime(target, this.context.currentTime, timeConstant);
  }
}
