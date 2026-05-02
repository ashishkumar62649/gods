export function toUtcIso(value) {
  if (!value) return null;
  const text = String(value);
  const normalized = /[zZ]|[+-]\d{2}:?\d{2}$/.test(text) ? text : `${text}Z`;
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

export function chooseTimeIndex({ observed_time, valid_time, ingested_at }) {
  return observed_time || valid_time || ingested_at || new Date().toISOString();
}

