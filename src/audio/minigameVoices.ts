export interface TuningVoice {
  setDetune(cents: number): void;
  stop(): void;
}

export interface TapeVoice {
  setActive(active: boolean): void;
  setPlaybackRate(rate: number): void;
  stop(): void;
}

export function createTuningVoice(
  context: AudioContext,
  output: AudioNode,
  frequency: number,
  detuneCents: number,
): TuningVoice {
  const reference = context.createOscillator();
  const adjustable = context.createOscillator();
  const gain = context.createGain();
  reference.type = "sine";
  adjustable.type = "sine";
  reference.frequency.value = frequency;
  adjustable.frequency.value = frequency;
  adjustable.detune.value = detuneCents;
  gain.gain.value = 0.055;
  reference.connect(gain);
  adjustable.connect(gain);
  gain.connect(output);
  reference.start();
  adjustable.start();
  let stopped = false;
  return {
    setDetune(cents: number): void {
      if (!stopped) adjustable.detune.setTargetAtTime(cents, context.currentTime, 0.025);
    },
    stop(): void {
      if (stopped) return;
      stopped = true;
      reference.stop();
      adjustable.stop();
      reference.disconnect();
      adjustable.disconnect();
      gain.disconnect();
    },
  };
}

export function createTapeVoice(
  context: AudioContext,
  output: AudioNode,
  scale: readonly number[],
): TapeVoice | null {
  if (scale.length === 0) return null;
  const stepSeconds = 0.24;
  const duration = stepSeconds * 8;
  const frameCount = Math.ceil(context.sampleRate * duration);
  const buffer = context.createBuffer(1, frameCount, context.sampleRate);
  const channel = buffer.getChannelData(0);
  for (let noteIndex = 0; noteIndex < 8; noteIndex += 1) {
    const frequency = scale[noteIndex % scale.length];
    const startFrame = Math.floor(noteIndex * stepSeconds * context.sampleRate);
    const endFrame = Math.min(frameCount, startFrame + Math.floor(stepSeconds * context.sampleRate));
    for (let frame = startFrame; frame < endFrame; frame += 1) {
      const noteTime = (frame - startFrame) / context.sampleRate;
      const envelope = Math.exp(-noteTime * 8.5);
      channel[frame] += Math.sin(Math.PI * 2 * frequency * noteTime) * envelope * 0.22;
      channel[frame] += Math.sin(Math.PI * 4 * frequency * noteTime) * envelope * 0.045;
    }
  }
  const source = context.createBufferSource();
  const gain = context.createGain();
  source.buffer = buffer;
  source.loop = true;
  source.playbackRate.value = 1;
  gain.gain.value = 0;
  source.connect(gain).connect(output);
  source.start();
  let stopped = false;
  return {
    setActive(active: boolean): void {
      if (stopped) return;
      gain.gain.setTargetAtTime(active ? 0.13 : 0, context.currentTime, 0.025);
    },
    setPlaybackRate(rate: number): void {
      if (!stopped) source.playbackRate.setTargetAtTime(Math.max(0.3, Math.min(2, rate)), context.currentTime, 0.02);
    },
    stop(): void {
      if (stopped) return;
      stopped = true;
      source.stop();
      source.disconnect();
      gain.disconnect();
    },
  };
}
