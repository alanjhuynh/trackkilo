import { MAX_SETS, METRICS } from './sets';

const MAX_NAME_LENGTH = 100;
const MAX_NOTE_LENGTH = 1000;

// '' / null / undefined → null, numbers → number, anything else → NaN
const toNumber = (value) => {
  if (value === '' || value === null || value === undefined) return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : NaN;
};

/**
 * Validates a `{ lift, sets }` request body from the lift form.
 * Returns `{ lift, sets }` ready to save (without userId/liftId), or `{ error }`.
 */
export function parseLiftPayload(body) {
  const { lift, sets } = body || {};
  if (!lift || !Array.isArray(sets)) return { error: 'Invalid request' };

  const name = typeof lift.name === 'string' ? lift.name.trim() : '';
  if (!name) return { error: 'Lift name is required' };
  if (name.length > MAX_NAME_LENGTH) return { error: 'Lift name is too long' };

  const date = new Date(lift.date);
  if (Number.isNaN(date.getTime())) return { error: 'Invalid date' };

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

  const rep = toNumber(lift.rep);
  return {
    lift: {
      name,
      date,
      set: cleanSets.length,
      rep: Number.isInteger(rep) && rep >= 0 ? rep : cleanSets[0].rep,
      note: typeof lift.note === 'string' ? lift.note.trim().slice(0, MAX_NOTE_LENGTH) : '',
    },
    sets: cleanSets,
  };
}

// Shape sent to the client: a lift with its sets as an array ordered by index
export function serializeLift(lift, sets = []) {
  return {
    _id: lift._id.toString(),
    name: lift.name,
    set: lift.set,
    rep: lift.rep,
    note: lift.note || '',
    date: new Date(lift.date).toISOString(),
    createdAt: lift.createdAt ? new Date(lift.createdAt).toISOString() : null,
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
