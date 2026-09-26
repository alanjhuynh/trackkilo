import moment from 'moment';
import { parseCsv, toCsv } from './csv';
import { isCardio } from './activities';

/*
 * File import and export. Dates are the user's local calendar days
 * ("YYYY-MM-DD"), so this runs in the browser rather than on the server.
 *
 * Imports accept trackkilo's own CSV/JSON exports and CSVs from other apps
 * that have one row per set with recognizable column names. Runs, walks and
 * rides are read from rows whose type column says so.
 */

const CSV_HEADER = [
  'date', 'exercise', 'set', 'weight', 'unit', 'reps', 'rpe', 'notes',
  'type', 'distance', 'distance_unit', 'duration_seconds',
];

const COLUMN_ALIASES = {
  date: ['date', 'day', 'workout date', 'start_time', 'start time', 'datetime', 'timestamp'],
  name: ['exercise', 'exercise name', 'exercise_title', 'exercise title', 'lift', 'name', 'movement'],
  set: ['set', 'set order', 'set_index', 'set index', 'set #', 'set number'],
  weight: ['weight', 'load', 'weight_lbs', 'weight (lbs)', 'weight (lb)', 'weight_kg', 'weight (kg)'],
  unit: ['unit', 'units', 'weight unit', 'metric'],
  rep: ['reps', 'rep', 'repetitions'],
  rpe: ['rpe'],
  note: ['notes', 'note', 'exercise_notes', 'exercise notes', 'comment', 'comments'],
  kind: ['type', 'kind', 'activity', 'activity type'],
  distance: ['distance', 'distance_km', 'distance (km)', 'distance_mi', 'distance_miles', 'distance (mi)', 'distance (miles)'],
  distanceUnit: ['distance_unit', 'distance unit'],
  duration: ['duration_seconds', 'duration', 'time', 'moving time', 'elapsed time'],
};

const KIND_ALIASES = {
  run: ['run', 'running'],
  walk: ['walk', 'walking', 'hike', 'hiking'],
  ride: ['ride', 'cycling', 'cycle', 'bike', 'biking'],
};

const DATE_FORMATS = [
  'YYYY-MM-DD', 'YYYY-MM-DD HH:mm', 'YYYY-MM-DD HH:mm:ss', 'YYYY-MM-DDTHH:mm', 'YYYY-MM-DDTHH:mm:ss',
  'YYYY-MM-DDTHH:mm:ssZ', 'YYYY-MM-DDTHH:mm:ss.SSSZ', 'M/D/YYYY', 'M/D/YYYY H:mm', 'M/D/YYYY h:mm A',
  'M/D/YY', 'D MMM YYYY', 'D MMM YYYY, HH:mm', 'MMM D, YYYY', 'MMM D, YYYY h:mm A',
];

export const MAX_IMPORT_LIFTS = 5000;
export const IMPORT_BATCH_SIZE = 200; // lifts per request to /api/import

const DEFAULT_UNITS = { weight: 'lb', distance: 'mi' };

const localDay = (date) => moment(date).format('YYYY-MM-DD');

function parseDay(value) {
  const parsed = moment(String(value || '').trim(), DATE_FORMATS, true);
  return parsed.isValid() ? parsed.format('YYYY-MM-DD') : null;
}

function parseUnit(value) {
  const text = String(value || '').trim().toLowerCase();
  if (/^kgs?$|^kilo/.test(text)) return 'kg';
  if (/^lbs?$|^pound/.test(text)) return 'lb';
  return null;
}

function parseDistanceUnit(value) {
  const text = String(value || '').trim().toLowerCase();
  if (/^km|kilomet/.test(text)) return 'km';
  if (/^mi/.test(text)) return 'mi';
  return null;
}

const parseKind = (value) => {
  const text = String(value || '').trim().toLowerCase();
  return Object.keys(KIND_ALIASES).find((kind) => KIND_ALIASES[kind].includes(text)) || null;
};

// "225", "225.5", "102,5", "225 lb" → number; blank → 0 (bodyweight); junk → NaN
function parseNumber(value) {
  const text = String(value ?? '').trim().replace(',', '.').replace(/[^\d.]/g, '');
  if (!text) return 0;
  const number = Number(text);
  return Number.isFinite(number) ? number : NaN;
}

// Seconds ("1665") or clock time ("27:45", "1:02:03") → seconds; blank → 0
function parseDuration(value) {
  const text = String(value ?? '').trim();
  if (!text) return 0;
  if (/^\d+(\.\d+)?$/.test(text)) return Math.round(Number(text));
  if (/^(\d+:)?\d{1,2}:\d{2}$/.test(text)) return text.split(':').reduce((total, part) => total * 60 + Number(part), 0);
  return NaN;
}

function parseRpe(value) {
  const number = Number(String(value ?? '').trim());
  return String(value ?? '').trim() !== '' && number >= 0 && number <= 10 ? number : null;
}

// A run, walk or ride, or null if it has neither a distance nor a time
function cardioEntry({ kind, date, name, note, distance, distanceUnit, duration }) {
  if (!date || Number.isNaN(distance) || Number.isNaN(duration) || (!distance && !duration)) return null;
  return { kind, date, name: name || '', note: note || '', distance, distanceUnit, duration, sets: [] };
}

// ---------- Export ----------

export function liftsToCsv(lifts) {
  const rows = [CSV_HEADER];
  lifts.forEach((lift) => {
    if (isCardio(lift)) {
      rows.push([
        localDay(lift.date), lift.name, '', '', '', '', '', lift.note || '',
        lift.kind, lift.distance || '', lift.distanceUnit, lift.duration || '',
      ]);
      return;
    }
    // Older lifts may only have a set count, not individual sets
    const sets = lift.sets.length
      ? lift.sets
      : Array.from({ length: lift.set || 1 }, (_, i) => ({ index: i + 1, weight: 0, metric: 'lb', rep: lift.rep, rpe: null }));
    sets.forEach((set, i) => {
      rows.push([
        localDay(lift.date), lift.name, set.index ?? i + 1, set.weight ?? 0, set.metric || 'lb',
        set.rep, set.rpe ?? '', i === 0 ? lift.note || '' : '', 'lift', '', '', '',
      ]);
    });
  });
  return toCsv(rows);
}

export function liftsToJson(lifts) {
  return JSON.stringify({
    app: 'trackkilo',
    version: 2,
    exportedAt: new Date().toISOString(),
    lifts: lifts.map((lift) => (isCardio(lift)
      ? {
        type: lift.kind,
        date: localDay(lift.date),
        name: lift.name,
        note: lift.note || '',
        distance: lift.distance,
        distanceUnit: lift.distanceUnit,
        duration: lift.duration,
      }
      : {
        type: 'lift',
        date: localDay(lift.date),
        name: lift.name,
        note: lift.note || '',
        sets: lift.sets.map((set) => ({ weight: set.weight, unit: set.metric, reps: set.rep, rpe: set.rpe })),
      })),
  }, null, 2);
}

// ---------- Import ----------

function findColumns(header) {
  const normalized = header.map((cell) => cell.trim().toLowerCase());
  const columns = {};
  Object.entries(COLUMN_ALIASES).forEach(([field, aliases]) => {
    const index = normalized.findIndex((cell) => aliases.includes(cell));
    if (index >= 0) columns[field] = index;
  });
  // Columns like "weight_kg" or "distance (mi)" say which unit they're in
  if (columns.weight !== undefined) columns.weightUnit = parseUnit(normalized[columns.weight].match(/kg|lb/)?.[0]);
  if (columns.distance !== undefined) columns.distanceUnitFromHeader = parseDistanceUnit(normalized[columns.distance].match(/km|mi/)?.[0]);
  return columns;
}

function importCsv(text, units) {
  const [header, ...rows] = parseCsv(text);
  if (!header) return { error: 'The file is empty' };

  const columns = findColumns(header);
  if (columns.date === undefined || columns.name === undefined || (columns.rep === undefined && columns.kind === undefined)) {
    return { error: 'Couldn’t find date, exercise and reps columns in this CSV' };
  }

  const entries = new Map();
  let skipped = 0;
  rows.forEach((row, rowIndex) => {
    const cell = (field) => (columns[field] === undefined ? '' : (row[columns[field]] ?? '').trim());
    const date = parseDay(cell('date'));
    const name = cell('name');

    const kind = parseKind(cell('kind'));
    if (kind) {
      const entry = cardioEntry({
        kind,
        date,
        name,
        note: cell('note'),
        distance: parseNumber(cell('distance')),
        distanceUnit: parseDistanceUnit(cell('distanceUnit')) || columns.distanceUnitFromHeader || units.distance,
        duration: parseDuration(cell('duration')),
      });
      if (entry) entries.set(`cardio|${rowIndex}`, entry);
      else skipped += 1;
      return;
    }

    const repText = cell('rep');
    const rep = Number(repText);
    const weight = parseNumber(cell('weight'));
    // Rows without reps are usually cardio or timed sets from other apps
    if (!date || !name || repText === '' || !Number.isInteger(rep) || rep < 0 || Number.isNaN(weight)) {
      skipped += 1;
      return;
    }

    const key = `${date}|${name.toLowerCase()}`;
    if (!entries.has(key)) entries.set(key, { date, name, note: '', sets: [] });
    const lift = entries.get(key);
    const note = cell('note');
    if (note && !lift.note) lift.note = note;
    // Set numbers may start at 0 or 1; without them, keep row order
    const order = cell('set') === '' ? NaN : Number(cell('set'));
    lift.sets.push({
      order: Number.isFinite(order) ? order : lift.sets.length + 1,
      weight,
      metric: parseUnit(cell('unit')) || columns.weightUnit || units.weight,
      rep,
      rpe: parseRpe(cell('rpe')),
    });
  });

  return {
    lifts: [...entries.values()].map((entry) => (isCardio(entry) ? entry : {
      ...entry,
      sets: entry.sets.sort((a, b) => a.order - b.order).map(({ order, ...set }) => set),
    })),
    skipped,
  };
}

function importJson(text, units) {
  let data;
  try {
    data = JSON.parse(text);
  } catch (error) {
    return { error: 'This isn’t valid JSON' };
  }
  const items = Array.isArray(data) ? data : data?.lifts;
  if (!Array.isArray(items)) return { error: 'Couldn’t find a list of lifts in this file' };

  const lifts = [];
  let skipped = 0;
  items.forEach((item) => {
    const date = parseDay(item?.date);
    const name = String(item?.name || item?.exercise || '').trim();
    const note = String(item?.note || item?.notes || '').trim();

    const kind = parseKind(item?.type || item?.kind);
    if (kind) {
      const entry = cardioEntry({
        kind,
        date,
        name,
        note,
        distance: parseNumber(item.distance),
        distanceUnit: parseDistanceUnit(item.distanceUnit) || units.distance,
        duration: parseDuration(item.duration),
      });
      if (entry) lifts.push(entry);
      else skipped += 1;
      return;
    }

    const sets = (Array.isArray(item?.sets) ? item.sets : []).map((set) => ({
      weight: parseNumber(set?.weight),
      metric: parseUnit(set?.unit || set?.metric) || units.weight,
      rep: Number(set?.reps ?? set?.rep),
      rpe: parseRpe(set?.rpe),
    }));
    const valid = sets.length && sets.every((set) => Number.isInteger(set.rep) && set.rep >= 0 && !Number.isNaN(set.weight));
    if (!date || !name || !valid) {
      skipped += 1;
      return;
    }
    lifts.push({ date, name, note, sets });
  });
  return { lifts, skipped };
}

/**
 * Parses an import file into `{ lifts, skipped }` or `{ error }`. `units`
 * ({ weight, distance }) fill in when the file doesn't say. Each entry is a
 * lift `{ date: 'YYYY-MM-DD', name, note, sets: [{ weight, metric, rep, rpe }] }`
 * or a run/walk/ride `{ kind, date, name, note, distance, distanceUnit, duration, sets: [] }`.
 */
export function parseImportFile(fileName, text, units = DEFAULT_UNITS) {
  const isJson = /\.json$/i.test(fileName) || /^\s*[[{]/.test(text);
  const result = isJson ? importJson(text, units) : importCsv(text, units);
  if (result.error) return result;
  if (!result.lifts.length) return { error: 'No lifts found in this file' };
  if (result.lifts.length > MAX_IMPORT_LIFTS) {
    return { error: `That’s more than ${MAX_IMPORT_LIFTS.toLocaleString()} lifts. Split the file and try again.` };
  }
  return result;
}

function mostCommon(values) {
  const counts = new Map();
  values.forEach((value) => counts.set(value, (counts.get(value) || 0) + 1));
  return [...counts.entries()].reduce((best, entry) => (entry[1] > best[1] ? entry : best))[0];
}

// Request bodies for POST /api/import
export function toImportPayload(lifts) {
  return lifts.map((lift) => {
    const date = moment(lift.date, 'YYYY-MM-DD').toISOString();
    if (isCardio(lift)) {
      const { kind, name, note, distance, distanceUnit, duration } = lift;
      return { lift: { kind, name, date, distance, distanceUnit, duration, note: note || '' }, sets: [] };
    }
    return {
      lift: {
        name: lift.name,
        date,
        rep: mostCommon(lift.sets.map((set) => set.rep)),
        note: lift.note || '',
      },
      sets: lift.sets,
    };
  });
}

export function downloadFile(fileName, contents, type) {
  const url = URL.createObjectURL(new Blob([contents], { type }));
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
