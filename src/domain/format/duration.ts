/**
 * formatDuration — turn a runtime in minutes into a human label.
 *
 * Examples:
 *  - `formatDuration(0)`   → `"—"`            (no data)
 *  - `formatDuration(45)`  → `"45m"`
 *  - `formatDuration(60)`  → `"1h"`
 *  - `formatDuration(90)`  → `"1h 30m"`
 *  - `formatDuration(148)` → `"2h 28m"`
 *
 * The `0` and negative cases return a dash so the UI can render a
 * placeholder without branching on the empty-string form. The
 * "no data" wording lives in the copy module; this domain function
 * only decides the shape.
 *
 * @see Cineteca.md — "La duración, en enteros".
 */

export function formatDuration(runtimeMinutes: number | null | undefined): string {
  if (runtimeMinutes === null || runtimeMinutes === undefined || runtimeMinutes <= 0) {
    return '—';
  }
  if (!Number.isFinite(runtimeMinutes) || runtimeMinutes < 0) {
    return '—';
  }
  const totalMinutes = Math.round(runtimeMinutes);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${String(minutes)}m`;
  if (minutes === 0) return `${String(hours)}h`;
  return `${String(hours)}h ${String(minutes)}m`;
}
