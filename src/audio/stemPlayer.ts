import type { StemManifest } from "../core/assetManifest";

interface ActiveStem {
  readonly source: AudioBufferSourceNode;
  readonly gain: GainNode;
}

export class StemPlayer {
  private context: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private readonly activeStems = new Map<string, ActiveStem>();
  private unlocked = false;
  private started = false;

  constructor(private readonly bpm: number) {}

  async unlock(): Promise<void> {
    if (!this.context) {
      this.context = new AudioContext();
      this.masterGain = this.context.createGain();
      this.masterGain.gain.value = 0.3;
      this.masterGain.connect(this.context.destination);
    }
    await this.context.resume();
    this.unlocked = true;
  }

  async start(stems: readonly StemManifest[]): Promise<void> {
    if (!this.unlocked || !this.context || !this.masterGain || this.started) return;
    const buffers = await Promise.all(stems.map((stem, index) => this.loadBuffer(stem, index)));
    const startTime = this.context.currentTime + 0.08;
    stems.forEach((stem, index) => {
      if (!this.context || !this.masterGain) return;
      const source = this.context.createBufferSource();
      const gain = this.context.createGain();
      source.buffer = buffers[index];
      source.loop = true;
      gain.gain.value = 0;
      source.connect(gain).connect(this.masterGain);
      source.start(startTime);
      this.activeStems.set(stem.id, { source, gain });
    });
    this.started = true;
  }

  unlockStem(id: string, fadeSeconds = 2): void {
    const active = this.activeStems.get(id);
    if (!active || !this.context) return;
    const now = this.context.currentTime;
    active.gain.gain.cancelScheduledValues(now);
    active.gain.gain.setValueAtTime(active.gain.gain.value, now);
    active.gain.gain.linearRampToValueAtTime(1, now + fadeSeconds);
  }

  lockAll(fadeSeconds = 0.1): void {
    if (!this.context) return;
    const now = this.context.currentTime;
    for (const { gain } of this.activeStems.values()) {
      gain.gain.cancelScheduledValues(now);
      gain.gain.setValueAtTime(gain.gain.value, now);
      gain.gain.linearRampToValueAtTime(0, now + fadeSeconds);
    }
  }

  setMasterVolume(volume: number, fadeSeconds = 0.35): void {
    if (!this.context || !this.masterGain) return;
    const now = this.context.currentTime;
    this.masterGain.gain.cancelScheduledValues(now);
    this.masterGain.gain.setValueAtTime(this.masterGain.gain.value, now);
    this.masterGain.gain.linearRampToValueAtTime(Math.max(0, volume), now + fadeSeconds);
  }

  setMuted(muted: boolean): void {
    this.setMasterVolume(muted ? 0 : 1, 0.12);
  }

  getBpm(): number {
    return this.bpm;
  }

  dispose(): void {
    for (const { source, gain } of this.activeStems.values()) {
      source.stop();
      source.disconnect();
      gain.disconnect();
    }
    this.activeStems.clear();
    this.masterGain?.disconnect();
    void this.context?.close();
    this.context = null;
    this.masterGain = null;
    this.started = false;
    this.unlocked = false;
  }

  private async loadBuffer(stem: StemManifest, index: number): Promise<AudioBuffer> {
    if (!this.context) throw new Error("AudioContext가 준비되지 않았습니다.");
    if (!stem.path) return this.renderPlaceholder(index);
    try {
      const response = await fetch(stem.path);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await this.context.decodeAudioData(await response.arrayBuffer());
    } catch (error) {
      console.warn(`[StemPlayer] ${stem.id} 로드 실패, 플레이스홀더 사용`, error);
      return this.renderPlaceholder(index);
    }
  }

  private async renderPlaceholder(trackIndex: number): Promise<AudioBuffer> {
    const sampleRate = 44_100;
    const beatDuration = 60 / this.bpm;
    const duration = beatDuration * 16;
    const offline = new OfflineAudioContext(2, Math.ceil(sampleRate * duration), sampleRate);
    const output = offline.createGain();
    output.gain.value = trackIndex === 0 ? 0.22 : 0.12;
    output.connect(offline.destination);

    if (trackIndex === 0) this.scheduleRhythm(offline, output, beatDuration);
    if (trackIndex === 1) this.scheduleBass(offline, output, beatDuration);
    if (trackIndex === 2) this.scheduleHarmony(offline, output, beatDuration);
    if (trackIndex === 3) this.scheduleMelody(offline, output, beatDuration);
    return offline.startRendering();
  }

  private scheduleRhythm(context: OfflineAudioContext, output: GainNode, beat: number): void {
    for (let step = 0; step < 32; step += 1) {
      const time = step * beat * 0.5;
      if (step % 2 === 0) this.scheduleTone(context, output, 75, time, 0.09, "sine", 1.7);
      this.scheduleTone(context, output, 4200, time, 0.025, "square", 0.12);
    }
  }

  private scheduleBass(context: OfflineAudioContext, output: GainNode, beat: number): void {
    const notes = [55, 55, 65.41, 49];
    for (let step = 0; step < 16; step += 1) {
      this.scheduleTone(context, output, notes[Math.floor(step / 4)], step * beat, beat * 0.7, "sawtooth", 0.7);
    }
  }

  private scheduleHarmony(context: OfflineAudioContext, output: GainNode, beat: number): void {
    const chords = [[220, 261.63, 329.63], [196, 246.94, 293.66], [174.61, 220, 261.63], [196, 246.94, 329.63]];
    chords.forEach((chord, chordIndex) => {
      chord.forEach((frequency) => this.scheduleTone(
        context, output, frequency, chordIndex * beat * 4, beat * 3.8, "sine", 0.34,
      ));
    });
  }

  private scheduleMelody(context: OfflineAudioContext, output: GainNode, beat: number): void {
    const notes = [440, 493.88, 523.25, 659.25, 523.25, 493.88, 392, 440];
    for (let step = 0; step < 16; step += 1) {
      this.scheduleTone(context, output, notes[step % notes.length], step * beat, beat * 0.38, "triangle", 0.55);
    }
  }

  private scheduleTone(
    context: OfflineAudioContext,
    output: GainNode,
    frequency: number,
    start: number,
    duration: number,
    type: OscillatorType,
    level: number,
  ): void {
    const oscillator = context.createOscillator();
    const envelope = context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, start);
    envelope.gain.setValueAtTime(0.0001, start);
    envelope.gain.exponentialRampToValueAtTime(level, start + 0.008);
    envelope.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    oscillator.connect(envelope).connect(output);
    oscillator.start(start);
    oscillator.stop(start + duration + 0.01);
  }
}
