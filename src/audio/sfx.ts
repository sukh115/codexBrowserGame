export class SfxPlayer {
  private context: AudioContext | null = null;
  private muted = false;
  private volume = 1;

  async unlock(): Promise<void> {
    if (!this.context) this.context = new AudioContext();
    await this.context.resume();
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
  }

  setVolume(volume: number): void {
    this.volume = Math.max(0, Math.min(1, volume));
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
}
