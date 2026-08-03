export function normalizeWhatsAppTimestamp(value, fallback = Date.now()) {
  const raw = String(value ?? "").trim();
  let timestamp = raw;
  if (/^\d+$/.test(raw)) {
    const numeric = Number(raw);
    timestamp = numeric < 100000000000 ? numeric * 1000 : numeric;
  }
  const parsed = new Date(timestamp || fallback);
  return Number.isNaN(parsed.getTime())
    ? new Date(fallback).toISOString()
    : parsed.toISOString();
}

export function normalizeMediaMimeType(value, fallback = "application/octet-stream") {
  const normalized = String(value || fallback)
    .split(";")[0]
    .trim()
    .toLowerCase();
  return normalized || fallback;
}

export function countTemplateBodyParameters(template) {
  const body = (template?.components || []).find(
    (component) => String(component?.type || "").toUpperCase() === "BODY",
  );
  const indexes = String(body?.text || "")
    .match(/\{\{\s*(\d+)\s*\}\}/g)
    ?.map((token) => Number(token.replace(/\D/g, "")))
    .filter(Number.isFinite);
  return indexes?.length ? Math.max(...indexes) : 0;
}

export function isWithinCustomerServiceWindow(lastInboundAt, now = Date.now()) {
  const timestamp = Date.parse(lastInboundAt || "");
  return Number.isFinite(timestamp) && now - timestamp < 24 * 60 * 60 * 1000;
}
