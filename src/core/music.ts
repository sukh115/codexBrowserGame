export function beatPhase(transportTime: number, bpm: number): number {
  if (bpm <= 0) return 0;
  const beats = transportTime / (60 / bpm);
  return ((beats % 1) + 1) % 1;
}
