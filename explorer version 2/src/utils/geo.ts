export function formatLatLon(lat: number, lon: number) {
  const ns = lat >= 0 ? 'N' : 'S';
  const ew = lon >= 0 ? 'E' : 'W';
  return `${Math.abs(lat).toFixed(2)} deg ${ns}, ${Math.abs(lon).toFixed(2)} deg ${ew}`;
}
