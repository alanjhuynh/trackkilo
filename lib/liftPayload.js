import { censorText } from './profanity';
import { MAX_SETS, METRICS } from './sets';
import { CARDIO_KEYS, DISTANCE_UNITS, cardioKind } from './activities';

const MAX_NAME_LENGTH = 100;
const MAX_NOTE_LENGTH = 1000;
const MAX_DISTANCE = 1000; // in either unit
const MAX_DURATION = 7 * 24 * 60 * 60; // a week, in seconds

// '' / null / undefined → null, numbers → number, anything else → NaN
const toNumber = (value) => {
  if (value === '' || value === null || value === undefined) return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : NaN;
};

const cleanNote = (note) => censorText(typeof note === 'string' ? note.trim().slice(0, MAX_NOTE_LENGTH) : '');

// A run, walk or ride: a title plus distance and/or duration
function parseCardio(entry, date) {
  const title = typeof entry.name === 'string' ? entry.name.trim() : '';
  if (title.length > MAX_NAME_LENGTH) return { error: 'Title is too long' };

  const distance = toNumber(entry.distance) ?? 0;
  const duration = toNumber(entry.duration) ?? 0;
  if (Number.isNaN(distance) || distance < 0 || distance > MAX_DISTANCE) return { error: 'Invalid distance' };
  if (!Number.isInteger(duration) || duration < 0 || duration > MAX_DURATION) return { error: 'Invalid duration' };
  if (!distance && !duration) return { error: 'Enter a distance or a time' };

  // Friends can see titles, so bad words are masked on every save
  const name = censorText(title || cardioKind(entry.kind).label);
  const note = cleanNote(entry.note);
  return {
    lift: {
      kind: entry.kind,
      name: name.text,
      date,
      distance,
      distanceUnit: DISTANCE_UNITS.includes(entry.distanceUnit) ? entry.distanceUnit : 'mi',
      duration,
      note: note.text,
    },
    sets: [],
    censored: name.censored || note.censored,
  };
}

/**
 * Validates a `{ lift, sets }` request body from the lift form. Runs, walks and
 * rides send `lift.kind` plus distance/duration fields and no sets.
 * Returns `{ lift, sets, censored }` ready to save (without userId/liftId), or `{ error }`.
 */
export function parseLiftPayload(body) {
  const { lift, sets } = body || {};
  if (!lift) return { error: 'Invalid request' };

  const date = new Date(lift.date);
  if (Number.isNaN(date.getTime())) return { error: 'Invalid date' };

  if (lift.kind !== undefined && lift.kind !== 'lift') {
    return CARDIO_KEYS.includes(lift.kind) ? parseCardio(lift, date) : { error: 'Unknown activity type' };
  }

  if (!Array.isArray(sets)) return { error: 'Invalid request' };

  const name = typeof lift.name === 'string' ? lift.name.trim() : '';
  if (!name) return { error: 'Lift name is required' };
  if (name.length > MAX_NAME_LENGTH) return { error: 'Lift name is too long' };

  if (sets.length < 1) return { error: 'Add at least one set' };
  if (sets.length > MAX_SETS) return { error: `A lift can have at most ${MAX_SETS} sets` };

  const cleanSets = [];
  for (let i = 0; i < sets.length; i++) {
    const set = sets[i] || {};
    const rep = toNumber(set.rep);
    const weight = toNumber(set.weight) ?? 0; // blank weight = bodyweight
    const rpe = toNumber(set.rpe);

    if (!Number.isInteger(rep) || rep < 0) return { error: `Set ${i + 1}: reps are required` };
    if (Number.isNaN(weight) || weight < 0) return { error: `Set ${i + 1}: invalid weight` };
    if (Number.isNaN(rpe) || (rpe !== null && (rpe < 0 || rpe > 10))) {
      return { error: `Set ${i + 1}: RPE must be between 0 and 10` };
    }

    cleanSets.push({
      index: i + 1,
      rep,
      weight,
      rpe,
      metric: METRICS.includes(set.metric) ? set.metric : 'lb',
    });
  }

  // Friends can see lift names, so bad words are masked on every save
  const cleanName = censorText(name);
  const note = cleanNote(lift.note);

  const rep = toNumber(lift.rep);
  return {
    lift: {
      name: cleanName.text,
      date,
      set: cleanSets.length,
      rep: Number.isInteger(rep) && rep >= 0 ? rep : cleanSets[0].rep,
      note: note.text,
    },
    sets: cleanSets,
    censored: cleanName.censored || note.censored,
  };
}

// Shape sent to the client: a lift with its sets as an array ordered by index,
// or a run/walk/ride with its distance and duration
export function serializeLift(lift, sets = []) {
  const base = {
    _id: lift._id.toString(),
    kind: lift.kind || 'lift',
    name: lift.name,
    note: lift.note || '',
    date: new Date(lift.date).toISOString(),
    createdAt: lift.createdAt ? new Date(lift.createdAt).toISOString() : null,
  };
  if (CARDIO_KEYS.includes(lift.kind)) {
    return {
      ...base,
      distance: lift.distance || 0,
      distanceUnit: lift.distanceUnit || 'mi',
      duration: lift.duration || 0,
      sets: [],
    };
  }
  return {
    ...base,
    set: lift.set,
    rep: lift.rep,
    sets: sets
      .map((set) => ({
        _id: set._id.toString(),
        index: set.index,
        weight: set.weight ?? 0,
        metric: set.metric || 'lb',
        rep: set.rep,
        rpe: set.rpe ?? null,
      }))
      .sort((a, b) => a.index - b.index),
  };
}
