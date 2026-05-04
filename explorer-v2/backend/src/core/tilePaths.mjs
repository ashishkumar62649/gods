export function parseTilePath(pathname, suffix) {
  const escapedSuffix = suffix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = pathname.match(new RegExp(`^${escapedSuffix}/(\\d+)/(\\d+)/(\\d+)\\.mvt$`));
  if (!match) return null;
  const [, z, x, y] = match.map(Number);
  if (![z, x, y].every(Number.isInteger) || z < 0 || z > 22 || x < 0 || y < 0) return null;
  return { z, x, y };
}
