import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function generateId(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

// Binary search for timeline events
export function binarySearchTime<T extends { tMs: number }>(
  events: T[],
  tMs: number
): number {
  let low = 0;
  let high = events.length;
  while (low < high) {
    const mid = (low + high) >>> 1;
    if (events[mid].tMs <= tMs) {
      low = mid + 1;
    } else {
      high = mid;
    }
  }
  return low;
}
