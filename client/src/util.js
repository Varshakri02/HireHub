// Small formatting helpers.

// "3m", "2h", "5d" or a date for older items. Input is a UTC datetime string.
export function timeAgo(iso) {
  if (!iso) return "";
  // SQLite datetime('now') is UTC without a zone marker — treat it as UTC.
  const then = new Date(iso.replace(" ", "T") + "Z").getTime();
  const secs = Math.max(0, (Date.now() - then) / 1000);
  if (secs < 60) return "just now";
  if (secs < 3600) return `${Math.floor(secs / 60)}m`;
  if (secs < 86400) return `${Math.floor(secs / 3600)}h`;
  if (secs < 604800) return `${Math.floor(secs / 86400)}d`;
  return new Date(then).toLocaleDateString();
}

export function clockTime(iso) {
  if (!iso) return "";
  const d = new Date(iso.replace(" ", "T") + "Z");
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

// "AUGUST 25, 2023" style day label for chat date dividers.
export function dayLabel(iso) {
  if (!iso) return "";
  const d = new Date(iso.replace(" ", "T") + "Z");
  return d.toLocaleDateString([], { month: "long", day: "numeric", year: "numeric" }).toUpperCase();
}

// Emoji icon for a document by mime type.
export function docIcon(type = "") {
  if (type.includes("pdf")) return "📕";
  if (type.includes("word")) return "📘";
  if (type.startsWith("image/")) return "🖼️";
  if (type.includes("text")) return "📄";
  return "📎";
}
