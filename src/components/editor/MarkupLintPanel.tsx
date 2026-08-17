import { useMemo } from 'react';
import { lintMarkup } from '@/core/markup';

interface MarkupLintPanelProps {
  source: string;
}

export function MarkupLintPanel({ source }: MarkupLintPanelProps) {
  const lintResult = useMemo(() => lintMarkup(source), [source]);
  const totalIssues = lintResult.errors.length + lintResult.warnings.length;

  if (totalIssues === 0) return null;

  return (
    <div className="border-t border-[var(--border)] px-3 py-2 space-y-1">
      {lintResult.errors.map((error, i) => (
        <div key={`e-${i}`} className="flex items-start gap-2 text-xs">
          <span className="text-[var(--danger)] shrink-0">●</span>
          <span className="text-[var(--text-muted)]">
            Line {error.line + 1}: {error.message}
          </span>
        </div>
      ))}
      {lintResult.warnings.map((warning, i) => (
        <div key={`w-${i}`} className="flex items-start gap-2 text-xs">
          <span className="text-[var(--warning)] shrink-0">●</span>
          <span className="text-[var(--text-muted)]">
            Line {warning.line + 1}: {warning.message}
          </span>
        </div>
      ))}
    </div>
  );
}
