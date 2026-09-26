/*
 * Runs, walks and rides. They're stored in the same log as lifts, with a
 * `kind` field; entries without one are lifts.
 */

export const CARDIO_KINDS = [
  { key: 'run', label: 'Run', plural: 'runs', activity: 'Running' },
  { key: 'walk', label: 'Walk', plural: 'walks', activity: 'Walking' },
  { key: 'ride', label: 'Ride', plural: 'rides', activity: 'Cycling' },
];
export const CARDIO_KEYS = CARDIO_KINDS.map((kind) => kind.key);
export const DISTANCE_UNITS = ['mi', 'km'];

const KM_PER_MI = 1.609344;

export const isCardio = (entry) => CARDIO_KEYS.includes(entry?.kind);
export const cardioKind = (key) => CARDIO_KINDS.find((kind) => kind.key === key);

// Mongo filter for lifts only (older entries have no `kind`)
export const STRENGTH_FILTER = { kind: { $nin: CARDIO_KEYS } };

export const toKm = (distance, unit) => (unit === 'mi' ? distance * KM_PER_MI : distance) || 0;
export const fromKm = (km, unit) => (unit === 'mi' ? km / KM_PER_MI : km);

// 125 → "2:05", 3725 → "1:02:05"
export function formatDuration(seconds) {
  const total = Math.round(seconds || 0);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const secs = String(total % 60).padStart(2, '0');
  return hours ? `${hours}:${String(minutes).padStart(2, '0')}:${secs}` : `${minutes}:${secs}`;
}

// Longer form for totals: "3h 20m", "45m"
export function formatHours(seconds) {
  const minutes = Math.round((seconds || 0) / 60);
  const hours = Math.floor(minutes / 60);
  return hours ? `${hours}h ${minutes % 60}m` : `${minutes}m`;
}

export function formatDistance(distance, unit) {
  const rounded = Math.round((distance || 0) * 100) / 100;
  return `${rounded} ${unit}`;
}

// Pace for runs and walks ("8:30 /mi"), speed for rides ("15.2 mph")
export function formatPace({ kind, distance, distanceUnit, duration }) {
  if (!distance || !duration) return null;
  if (kind === 'ride') {
    const speed = distance / (duration / 3600);
    return `${speed.toFixed(1)} ${distanceUnit === 'mi' ? 'mph' : 'km/h'}`;
  }
  return `${formatDuration(duration / distance)} /${distanceUnit}`;
}

// "3.1 mi · 27:40", for summaries of a whole entry
export function summarizeCardio(entry) {
  return [
    entry.distance ? formatDistance(entry.distance, entry.distanceUnit) : null,
    entry.duration ? formatDuration(entry.duration) : null,
  ].filter(Boolean).join(' · ');
}
