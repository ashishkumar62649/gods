export function pct(value: number) {
  return `${Math.round(value)}%`;
}

export function compactNumber(value: number) {
  return new Intl.NumberFormat('en-US', { notation: 'compact' }).format(value);
}
