export class SfxPlayer {
  private context: AudioContext | null = null;
  private muted = false;

  async unlock(): Promise<void> {
    if (!this.context) this.context = new AudioContext();
    await this.context.resume();
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
  }

  playFound(): void {
    if (!this.context || this.muted) return;
    const now = this.context.currentTime;
    const gain = this.context.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.2, now + 0.01);
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
}
