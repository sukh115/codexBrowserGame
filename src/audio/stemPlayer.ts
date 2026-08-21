import type { StemManifest } from "../core/assetManifest";
import type { MusicEffect } from "../core/assetManifest";
import type { RegionId } from "../core/assetManifest";

interface ActiveStem {
  readonly source: AudioBufferSourceNode;
  readonly gain: GainNode;
}

const AUDIO_FORMATS = ["ogg", "m4a", "wav"] as const;
const PLACEHOLDER_SAMPLE_RATE = 48_000;
const BEATS_PER_LOOP = 16;
const LOOP_DURATION_TOLERANCE_SECONDS = 0.05;
const STEM_PEAK_LIMIT = 10 ** (-1 / 20);
const STEM_LEVEL = 0.72;
const RHYTHM_ACCENT_LEVEL = 0.86;
const COMPLETION_BOOST_LEVEL = 1.08;

export class StemPlayer {
  private context: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private masterFilter: BiquadFilterNode | null = null;
  private outputBoost: GainNode | null = null;
  private limiter: DynamicsCompressorNode | null = null;
  private readonly activeStems = new Map<string, ActiveStem>();
  private readonly unlockedStemIds = new Set<string>();
  private readonly initialStemIds = new Set<string>();
  private readonly appliedEffects = new Set<MusicEffect>();
  private readonly stemLevels = new Map<string, number>();
  private readonly bufferCache = new Map<string, AudioBuffer>();
  private unlocked = false;
  private started = false;
  private targetMasterVolume = -1;
  private transportStartTime = 0;
  private userVolume = 1;
  private requestedMasterVolume = 1;
  private regionId: RegionId = "music-shop";
  private regionGeneration = 0;

  constructor(private bpm: number) {}

  async unlock(): Promise<void> {
    this.ensureContext();
    if (!this.context) return;
    await this.context.resume();
    this.unlocked = true;
  }

  async preload(
    stems: readonly StemManifest[],
    regionId: RegionId,
    bpm: number,
    onProgress?: (progress: number) => void,
  ): Promise<void> {
    this.ensureContext();
    let loaded = 0;
    await Promise.all(stems.map(async (stem, index) => {
      await this.loadBuffer(stem, index, regionId, bpm);
      loaded += 1;
      onProgress?.(loaded / stems.length);
    }));
  }

  async resumeAndRestore(): Promise<void> {
    if (!this.context || !this.masterGain || document.visibilityState !== "visible") return;
    await this.context.resume();
    const restoredVolume = this.requestedMasterVolume * this.userVolume;
    const now = this.context.currentTime;
    this.masterGain.gain.cancelScheduledValues(now);
    this.masterGain.gain.setValueAtTime(restoredVolume, now);
    this.targetMasterVolume = restoredVolume;
  }

  async start(stems: readonly StemManifest[], regionId: RegionId = "music-shop"): Promise<void> {
    if (!this.unlocked || !this.context || !this.masterGain || this.started) return;
    const generation = ++this.regionGeneration;
    this.regionId = regionId;
    const buffers = await Promise.all(stems.map((stem, index) => this.loadBuffer(stem, index, regionId, this.bpm)));
    if (generation !== this.regionGeneration) return;
    this.activateStems(stems, buffers);
  }

  private activateStems(stems: readonly StemManifest[], buffers: readonly AudioBuffer[]): void {
    if (!this.context || !this.masterGain) return;
    const startTime = this.context.currentTime + 0.08;
    this.transportStartTime = startTime;
    this.initialStemIds.clear();
    stems.forEach((stem, index) => {
      if (!this.context || !this.masterGain) return;
      const source = this.context.createBufferSource();
      const gain = this.context.createGain();
      source.buffer = buffers[index];
      source.loop = true;
      const targetLevel = STEM_LEVEL * (stem.gain ?? 1);
      gain.gain.value = stem.initiallyUnlocked ? targetLevel : 0;
      source.connect(gain).connect(this.masterGain);
      source.start(startTime);
      this.activeStems.set(stem.id, { source, gain });
      this.stemLevels.set(stem.id, targetLevel);
      if (stem.initiallyUnlocked) {
        this.initialStemIds.add(stem.id);
        this.unlockedStemIds.add(stem.id);
      }
    });
    this.started = true;
  }

  async setRegion(stems: readonly StemManifest[], bpm: number, regionId: RegionId): Promise<void> {
    if (this.regionId === regionId && this.bpm === bpm && this.started) return;
    const generation = ++this.regionGeneration;
    for (const { source, gain } of this.activeStems.values()) {
      source.stop();
      source.disconnect();
      gain.disconnect();
    }
    this.activeStems.clear();
    this.unlockedStemIds.clear();
    this.appliedEffects.clear();
    this.stemLevels.clear();
    this.started = false;
    this.bpm = bpm;
    this.regionId = regionId;
    const buffers = await Promise.all(stems.map((stem, index) => this.loadBuffer(stem, index, regionId, bpm)));
    if (generation !== this.regionGeneration) return;
    this.activateStems(stems, buffers);
  }

  unlockStem(id: string, fadeSeconds = 2): void {
    if (this.unlockedStemIds.has(id)) return;
    const active = this.activeStems.get(id);
    if (!active || !this.context) return;
    this.unlockedStemIds.add(id);
    const now = this.context.currentTime;
    active.gain.gain.cancelScheduledValues(now);
    active.gain.gain.setValueAtTime(active.gain.gain.value, now);
    active.gain.gain.linearRampToValueAtTime(this.stemLevels.get(id) ?? STEM_LEVEL, now + fadeSeconds);
  }

  applyEffect(effect: MusicEffect, fadeSeconds = 1.2): void {
    if (this.appliedEffects.has(effect) || !this.context) return;
    this.appliedEffects.add(effect);
    const now = this.context.currentTime;
    if (effect === "rhythm-accent") {
      this.stemLevels.set("rhythm", RHYTHM_ACCENT_LEVEL);
      const rhythm = this.activeStems.get("rhythm");
      if (rhythm && this.unlockedStemIds.has("rhythm")) {
        rhythm.gain.gain.cancelScheduledValues(now);
        rhythm.gain.gain.setValueAtTime(rhythm.gain.gain.value, now);
        rhythm.gain.gain.linearRampToValueAtTime(RHYTHM_ACCENT_LEVEL, now + fadeSeconds);
      }
    }
    if (effect === "open-filter" && this.masterFilter) {
      this.masterFilter.frequency.cancelScheduledValues(now);
      this.masterFilter.frequency.setValueAtTime(this.masterFilter.frequency.value, now);
      this.masterFilter.frequency.exponentialRampToValueAtTime(9000, now + fadeSeconds * 1.5);
    }
    if (effect === "completion-boost" && this.masterFilter && this.outputBoost) {
      this.masterFilter.frequency.cancelScheduledValues(now);
      this.masterFilter.frequency.setValueAtTime(this.masterFilter.frequency.value, now);
      this.masterFilter.frequency.exponentialRampToValueAtTime(20000, now + fadeSeconds * 1.5);
      this.outputBoost.gain.cancelScheduledValues(now);
      this.outputBoost.gain.setValueAtTime(this.outputBoost.gain.value, now);
      this.outputBoost.gain.linearRampToValueAtTime(COMPLETION_BOOST_LEVEL, now + fadeSeconds);
    }
  }

  lockAll(fadeSeconds = 0.1): void {
    if (!this.context) return;
    const now = this.context.currentTime;
    for (const [id, { gain }] of this.activeStems) {
      gain.gain.cancelScheduledValues(now);
      gain.gain.setValueAtTime(gain.gain.value, now);
      gain.gain.linearRampToValueAtTime(
        this.initialStemIds.has(id) ? (this.stemLevels.get(id) ?? STEM_LEVEL) : 0,
        now + fadeSeconds,
      );
    }
    this.unlockedStemIds.clear();
    for (const id of this.initialStemIds) this.unlockedStemIds.add(id);
    this.appliedEffects.clear();
    this.stemLevels.set("rhythm", STEM_LEVEL);
    if (this.masterFilter) {
      this.masterFilter.frequency.cancelScheduledValues(now);
      this.masterFilter.frequency.linearRampToValueAtTime(2400, now + fadeSeconds);
    }
    if (this.outputBoost) {
      this.outputBoost.gain.cancelScheduledValues(now);
      this.outputBoost.gain.linearRampToValueAtTime(1, now + fadeSeconds);
    }
  }

  setMasterVolume(volume: number, fadeSeconds = 0.35): void {
    this.requestedMasterVolume = Math.max(0, volume);
    if (!this.context || !this.masterGain) return;
    const normalizedVolume = this.requestedMasterVolume * this.userVolume;
    if (Math.abs(normalizedVolume - this.targetMasterVolume) < 0.008) return;
    this.targetMasterVolume = normalizedVolume;
    const now = this.context.currentTime;
    this.masterGain.gain.cancelScheduledValues(now);
    this.masterGain.gain.setValueAtTime(this.masterGain.gain.value, now);
    this.masterGain.gain.linearRampToValueAtTime(normalizedVolume, now + fadeSeconds);
  }

  setUserVolume(volume: number): void {
    this.userVolume = Math.max(0, Math.min(1, volume));
    this.targetMasterVolume = -1;
  }

  setMuted(muted: boolean): void {
    this.setMasterVolume(muted ? 0 : 1, 0.12);
  }

  getBpm(): number {
    return this.bpm;
  }

  getTransportTime(): number {
    if (!this.context || !this.started) return 0;
    return Math.max(0, this.context.currentTime - this.transportStartTime);
  }

  dispose(): void {
    for (const { source, gain } of this.activeStems.values()) {
      source.stop();
      source.disconnect();
      gain.disconnect();
    }
    this.activeStems.clear();
    this.unlockedStemIds.clear();
    this.initialStemIds.clear();
    this.masterGain?.disconnect();
    this.masterFilter?.disconnect();
    this.outputBoost?.disconnect();
    this.limiter?.disconnect();
    void this.context?.close();
    this.context = null;
    this.masterGain = null;
    this.masterFilter = null;
    this.outputBoost = null;
    this.limiter = null;
    this.started = false;
    this.unlocked = false;
    this.targetMasterVolume = -1;
    this.transportStartTime = 0;
    this.appliedEffects.clear();
    this.stemLevels.clear();
    this.bufferCache.clear();
  }

  private async loadBuffer(
    stem: StemManifest,
    index: number,
    regionId: RegionId,
    bpm: number,
  ): Promise<AudioBuffer> {
    this.ensureContext();
    if (!this.context) throw new Error("AudioContext를 준비할 수 없습니다.");
    const cacheKey = `${regionId}:${bpm}:${stem.id}:${stem.path ?? "placeholder"}`;
    const cached = this.bufferCache.get(cacheKey);
    if (cached) return cached;
    if (stem.path) {
      for (const extension of AUDIO_FORMATS) {
        try {
          const response = await fetch(`${stem.path}.${extension}`);
          if (!response.ok) continue;
          const buffer = await this.context.decodeAudioData(await response.arrayBuffer());
          if (!this.validateStem(buffer, stem, bpm)) continue;
          this.bufferCache.set(cacheKey, buffer);
          return buffer;
        } catch {
          // 브라우저별 디코더 차이를 다음 포맷으로 흡수한다.
        }
      }
      console.warn(`[StemPlayer] ${stem.id}의 ogg/m4a/wav 로드 실패, 플레이스홀더 사용`);
    }
    const buffer = await this.renderPlaceholder(index, regionId, bpm);
    this.bufferCache.set(cacheKey, buffer);
    return buffer;
  }

  private async renderPlaceholder(trackIndex: number, regionId = this.regionId, bpm = this.bpm): Promise<AudioBuffer> {
    const sampleRate = PLACEHOLDER_SAMPLE_RATE;
    const beatDuration = 60 / bpm;
    const duration = beatDuration * BEATS_PER_LOOP;
    const offline = new OfflineAudioContext(2, Math.ceil(sampleRate * duration), sampleRate);
    const output = offline.createGain();
    output.gain.value = trackIndex === 0 ? 0.22 : 0.12;
    output.connect(offline.destination);

    if (regionId === "neon-forest") {
      if (trackIndex === 0) this.scheduleGreenhouseRain(offline, output, beatDuration);
      if (trackIndex === 1) this.scheduleGreenhouseRoots(offline, output, beatDuration);
      if (trackIndex === 2) this.scheduleGreenhouseGlass(offline, output, beatDuration);
      if (trackIndex === 3) this.scheduleGreenhouseBloom(offline, output, beatDuration);
    } else {
      if (trackIndex === 0) this.scheduleRhythm(offline, output, beatDuration);
      if (trackIndex === 1) this.scheduleBass(offline, output, beatDuration);
      if (trackIndex === 2) this.scheduleHarmony(offline, output, beatDuration);
      if (trackIndex === 3) this.scheduleMelody(offline, output, beatDuration);
    }
    return offline.startRendering();
  }

  private scheduleGreenhouseRain(context: OfflineAudioContext, output: GainNode, beat: number): void {
    for (let step = 0; step < 32; step += 1) {
      const frequency = [1650, 2100, 2750, 1900][step % 4];
      this.scheduleTone(context, output, frequency, step * beat * 0.5, 0.045, "sine", step % 4 === 0 ? 0.34 : 0.18);
    }
  }

  private scheduleGreenhouseRoots(context: OfflineAudioContext, output: GainNode, beat: number): void {
    const notes = [73.42, 82.41, 65.41, 55];
    for (let step = 0; step < 16; step += 1) {
      this.scheduleTone(context, output, notes[Math.floor(step / 4)], step * beat, beat * 0.82, "triangle", 0.5);
    }
  }

  private scheduleGreenhouseGlass(context: OfflineAudioContext, output: GainNode, beat: number): void {
    const chords = [[293.66, 440], [329.63, 493.88], [261.63, 392], [220, 329.63]];
    chords.forEach((chord, index) => chord.forEach((frequency) => {
      this.scheduleTone(context, output, frequency, index * beat * 4, beat * 3.5, "sine", 0.2);
      this.scheduleTone(context, output, frequency * 2, index * beat * 4 + 0.03, beat * 2.4, "sine", 0.06);
    }));
  }

  private scheduleGreenhouseBloom(context: OfflineAudioContext, output: GainNode, beat: number): void {
    const notes = [587.33, 659.25, 783.99, 739.99, 659.25, 523.25, 493.88, 587.33];
    for (let step = 0; step < 16; step += 1) {
      this.scheduleTone(context, output, notes[step % notes.length], step * beat, beat * 0.55, "sine", 0.38);
    }
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

  private validateStem(buffer: AudioBuffer, stem: StemManifest, bpm: number): boolean {
    const fourBarDuration = BEATS_PER_LOOP * 60 / bpm;
    const loopMultiple = Math.round(buffer.duration / fourBarDuration);
    const validMultiple = loopMultiple >= 1
      && loopMultiple <= 4
      && Math.abs(buffer.duration - fourBarDuration * loopMultiple) <= LOOP_DURATION_TOLERANCE_SECONDS;
    if (!validMultiple) {
      console.warn(
        `[StemPlayer] ${stem.id}: 길이가 4마디의 1~4배 범위와 맞지 않습니다. 버퍼는 그대로 사용합니다. `
        + `(4마디 ${fourBarDuration.toFixed(3)}초, 실제 ${buffer.duration.toFixed(3)}초)`,
      );
    }
    let peak = 0;
    for (let channel = 0; channel < buffer.numberOfChannels; channel += 1) {
      const samples = buffer.getChannelData(channel);
      for (let index = 0; index < samples.length; index += 1) {
        peak = Math.max(peak, Math.abs(samples[index]));
      }
    }
    if (peak > STEM_PEAK_LIMIT + 0.001) {
      const peakDb = 20 * Math.log10(peak);
      console.warn(`[StemPlayer] ${stem.id}: 피크가 -1 dBFS를 초과해 플레이스홀더를 사용합니다. (${peakDb.toFixed(1)} dBFS)`);
      return false;
    }
    return true;
  }

  private ensureContext(): void {
    if (this.context) return;
    this.context = new AudioContext();
    this.masterGain = this.context.createGain();
    this.masterFilter = this.context.createBiquadFilter();
    this.outputBoost = this.context.createGain();
    this.limiter = this.context.createDynamicsCompressor();
    this.masterGain.gain.value = 0.3;
    this.masterFilter.type = "lowpass";
    this.masterFilter.frequency.value = 2400;
    this.masterFilter.Q.value = 0.7;
    this.outputBoost.gain.value = 1;
    this.limiter.threshold.value = -3;
    this.limiter.knee.value = 0;
    this.limiter.ratio.value = 20;
    this.limiter.attack.value = 0.003;
    this.limiter.release.value = 0.15;
    this.masterGain
      .connect(this.masterFilter)
      .connect(this.outputBoost)
      .connect(this.limiter)
      .connect(this.context.destination);
  }
}
