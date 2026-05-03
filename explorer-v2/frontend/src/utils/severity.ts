import type { Severity } from '../app/appTypes';

export function severityClass(value: Severity | string | undefined) {
  return `tone-${value ?? 'muted'}`;
}

export function severityColor(value: Severity | string | undefined) {
  switch (value) {
    case 'critical':
    case 'high':
      return 'var(--god-red)';
    case 'elevated':
      return 'var(--god-yellow)';
    case 'moderate':
      return 'var(--god-orange)';
    case 'low':
    case 'healthy':
      return 'var(--god-green)';
    default:
      return 'var(--god-blue)';
  }
}
