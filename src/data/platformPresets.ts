import type { PlatformPreset } from '@/core/types';

export const platformPresets: PlatformPreset[] = [
  {
    id: 'youtube-shorts',
    label: 'YouTube Shorts',
    width: 1080,
    height: 1920,
    fps: 30,
    maxDurationMs: 60000,
  },
  {
    id: 'instagram-reel',
    label: 'Instagram Reel',
    width: 1080,
    height: 1920,
    fps: 30,
    maxDurationMs: 90000,
  },
  {
    id: 'tiktok',
    label: 'TikTok',
    width: 1080,
    height: 1920,
    fps: 30,
    maxDurationMs: 60000,
  },
  {
    id: 'x-twitter',
    label: 'X / Twitter',
    width: 1920,
    height: 1080,
    fps: 30,
    maxDurationMs: 140000,
  },
  {
    id: 'youtube-standard',
    label: 'YouTube (Standard)',
    width: 1920,
    height: 1080,
    fps: 30,
    maxDurationMs: Infinity,
  },
  {
    id: 'square-feed',
    label: 'Square Feed Post',
    width: 1080,
    height: 1080,
    fps: 30,
    maxDurationMs: 60000,
  },
];

export const aspectRatioPresets = [
  { id: '9:16' as const, label: '9:16 (Vertical)', width: 1080, height: 1920 },
  { id: '1:1' as const, label: '1:1 (Square)', width: 1080, height: 1080 },
  { id: '16:9' as const, label: '16:9 (Horizontal)', width: 1920, height: 1080 },
];
