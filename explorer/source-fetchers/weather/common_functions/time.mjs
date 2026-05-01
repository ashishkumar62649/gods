export function utcStamp(date = new Date()) {
  return {
    year: String(date.getUTCFullYear()),
    month: String(date.getUTCMonth() + 1).padStart(2, "0"),
    day: String(date.getUTCDate()).padStart(2, "0"),
    hour: String(date.getUTCHours()).padStart(2, "0"),
    file: date.toISOString().replace(/[:.]/g, "-"),
    iso: date.toISOString(),
  };
}

export function utcPartitionParts(date = new Date()) {
  const stamp = utcStamp(date);
  return [`year=${stamp.year}`, `month=${stamp.month}`, `day=${stamp.day}`, `hour=${stamp.hour}`];
}

export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}