import type { SoundCueId } from '@/types/domain';

export interface SoundCueDefinition {
  id: SoundCueId;
  name: string;
  description: string;
  play: (context: BaseAudioContext, volume: number, startTime?: number) => void;
}

function tone(context: BaseAudioContext, frequency: number, duration: number, volume: number, type: OscillatorType = 'sine', startTime = context.currentTime): void {
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  const start = Math.max(context.currentTime, startTime);
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, start);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(Math.max(0.0001, volume), start + 0.008);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  oscillator.connect(gain).connect(context.destination);
  oscillator.start(start);
  oscillator.stop(start + duration + 0.02);
}

export const soundLibrary: SoundCueDefinition[] = [
  { id: 'none', name: 'Silent', description: 'No sound cue.', play: () => undefined },
  { id: 'key-tap', name: 'Key Tap', description: 'Short neutral typing tick.', play: (context, volume, startTime = context.currentTime) => tone(context, 880, 0.045, volume * 0.18, 'square', startTime) },
  { id: 'soft-pop', name: 'Soft Pop', description: 'Warm UI confirmation sound.', play: (context, volume, startTime = context.currentTime) => tone(context, 520, 0.12, volume * 0.22, 'sine', startTime) },
  { id: 'academy-chime', name: 'Academy Chime', description: 'Two-note navy-and-gold signature chime.', play: (context, volume, startTime = context.currentTime) => {
    tone(context, 523.25, 0.22, volume * 0.2, 'sine', startTime);
    tone(context, 783.99, 0.3, volume * 0.16, 'sine', startTime + 0.08);
  } },
  { id: 'terminal-beep', name: 'Terminal Beep', description: 'Crisp retro terminal signal.', play: (context, volume, startTime = context.currentTime) => tone(context, 1180, 0.07, volume * 0.2, 'square', startTime) },
];

export function getSoundCue(id: SoundCueId): SoundCueDefinition {
  return soundLibrary.find((cue) => cue.id === id) || soundLibrary[0];
}

let sharedAudioContext: AudioContext | null = null;

function getSharedAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (sharedAudioContext) return sharedAudioContext;
  const AudioContextClass = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextClass) return null;
  sharedAudioContext = new AudioContextClass();
  return sharedAudioContext;
}

export function playSoundCue(id: SoundCueId, volume: number): void {
  if (id === 'none') return;
  const context = getSharedAudioContext();
  if (!context) return;
  void context.resume().then(() => {
    getSoundCue(id).play(context, Math.max(0, Math.min(1, volume)));
  }).catch(() => undefined);
}

export function scheduleSoundCue(id: SoundCueId, volume: number, delaySeconds = 0): void {
  if (id === 'none') return;
  const context = getSharedAudioContext();
  if (!context) return;
  void context.resume().then(() => {
    const start = Math.max(0, context.currentTime + delaySeconds);
    const cue = getSoundCue(id);
    if (delaySeconds <= 0) {
      cue.play(context, Math.max(0, Math.min(1, volume)));
      return;
    }
    window.setTimeout(() => {
      cue.play(context, Math.max(0, Math.min(1, volume)));
    }, delaySeconds * 1000);
    void start;
  }).catch(() => undefined);
}
