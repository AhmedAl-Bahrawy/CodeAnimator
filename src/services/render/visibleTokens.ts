import type { CodeToken } from '@/types/domain';

/**
 * Clips full-source syntax tokens to the exact visible source prefix for each
 * rendered line. This keeps color information while enforcing the animation
 * invariant that token text and visible text have identical lengths.
 */
export function clipTokenLinesToVisibleLines(
  tokenLines: CodeToken[][] | null,
  visibleLines: string[],
): CodeToken[][] | null {
  if (!tokenLines) return null;

  return visibleLines.map((visibleLine, lineIndex) => {
    const fullTokens = tokenLines[lineIndex] || [];
    if (visibleLine.length === 0) return [];

    let remaining = visibleLine.length;
    let consumed = 0;
    const clipped: CodeToken[] = [];

    for (const token of fullTokens) {
      if (remaining <= 0) break;
      const content = token.content.slice(0, remaining);
      if (content.length > 0) {
        clipped.push({ ...token, content, offset: token.offset ?? consumed });
        consumed += content.length;
        remaining -= content.length;
      }
    }

    // Highlighting can lag behind a freshly edited source. Preserve the
    // visible text rather than dropping it while the async result catches up.
    if (remaining > 0) {
      clipped.push({
        content: visibleLine.slice(consumed),
        color: '#ffffff',
        offset: consumed,
      });
    }

    return clipped;
  });
}
