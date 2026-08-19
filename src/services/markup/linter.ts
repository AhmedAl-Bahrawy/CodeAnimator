import { parseMarkup, type MarkupError } from './parser';

export interface LintResult {
  errors: MarkupError[];
  warnings: MarkupError[];
}

export function lintMarkup(source: string): LintResult {
  const { errors } = parseMarkup(source);

  const lintErrors: MarkupError[] = [];
  const warnings: MarkupError[] = [];

  for (const error of errors) {
    // Determine if it's an error or warning based on severity
    if (error.message.includes('Unknown markup token')) {
      warnings.push(error); // Unknown tokens are warnings
    } else {
      lintErrors.push(error); // Invalid values are errors
    }
  }

  return {
    errors: lintErrors,
    warnings,
  };
}
