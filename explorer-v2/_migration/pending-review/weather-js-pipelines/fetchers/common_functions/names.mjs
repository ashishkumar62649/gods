export function safeName(value, fallback = "unknown") {
  const cleaned = String(value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return cleaned || fallback;
}

export function normalizeExtension(extension, fallback = "raw") {
  const cleaned = String(extension || fallback).replace(/^\.+/, "").trim().toLowerCase();
  return cleaned || fallback;
}