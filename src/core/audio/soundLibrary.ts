import type { SoundCueId } from '@/core/types';

export interface SoundCueDefinition {
  id: SoundCueId;
  name: string;
  description: string;
  play: (context: AudioContext, volume: number) => void;
}

function tone(context: AudioContext, frequency: number, duration: number, volume: number, type: OscillatorType = 'sine', delay = 0): void {
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  const start = context.currentTime + delay;
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
  { id: 'key-tap', name: 'Key Tap', description: 'Short neutral typing tick.', play: (context, volume) => tone(context, 880, 0.045, volume * 0.18, 'square') },
  { id: 'soft-pop', name: 'Soft Pop', description: 'Warm UI confirmation sound.', play: (context, volume) => tone(context, 520, 0.12, volume * 0.22, 'sine') },
  { id: 'academy-chime', name: 'Academy Chime', description: 'Two-note navy-and-gold signature chime.', play: (context, volume) => {
    tone(context, 523.25, 0.22, volume * 0.2, 'sine');
    tone(context, 783.99, 0.3, volume * 0.16, 'sine', 0.08);
  } },
  { id: 'terminal-beep', name: 'Terminal Beep', description: 'Crisp retro terminal signal.', play: (context, volume) => tone(context, 1180, 0.07, volume * 0.2, 'square') },
];

export function getSoundCue(id: SoundCueId): SoundCueDefinition {
  return soundLibrary.find((cue) => cue.id === id) || soundLibrary[0];
}

export function playSoundCue(id: SoundCueId, volume: number): void {
  if (id === 'none' || typeof window === 'undefined') return;
  const AudioContextClass = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextClass) return;
  const context = new AudioContextClass();
  void context.resume().then(() => {
    getSoundCue(id).play(context, Math.max(0, Math.min(1, volume)));
    window.setTimeout(() => void context.close(), 600);
  }).catch(() => undefined);
}
