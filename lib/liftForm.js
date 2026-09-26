import moment from 'moment';
import { normalizeName } from './format';
import { MAX_SETS } from './sets';
import { cardioKind, isCardio } from './activities';

/*
 * State for the add/edit lift form. `kind` switches it between a lift (sets
 * of weight × reps) and a run, walk or ride (title, distance and time).
 *
 * Each set row tracks which fields the user has typed into (`touched`).
 * Untouched fields are prefills: they follow the "Reps" stepper and copy edits
 * made to earlier sets, so entering the weight on set 1 fills the sets below
 * it. A field stops following as soon as the user edits it directly.
 *
 * A new form stays `pristine` until the user changes anything besides the
 * name. While it's pristine, picking a lift the user has logged before fills
 * the sets from that lift's last session.
 */

export const DEFAULT_SETS = 3;
export const DEFAULT_REPS = 10;

const ALL_TOUCHED = { weight: true, rep: true, rpe: true };

let nextRowId = 0;
function makeRow({ weight = '', rep = '', rpe = '' } = {}, touched = {}) {
  nextRowId += 1;
  return { id: nextRowId, weight, rep, rpe, touched };
}

const weightField = (weight) => (weight ? String(weight) : ''); // 0 (bodyweight) shows as blank
const repField = (rep) => (rep === null || rep === undefined ? '' : String(rep));
const rpeField = (rpe) => (rpe === null || rpe === undefined ? '' : String(rpe));

const defaultRows = (rep = DEFAULT_REPS, count = DEFAULT_SETS) =>
  Array.from({ length: Math.min(Math.max(count, 1), MAX_SETS) }, () => makeRow({ rep: repField(rep) }));

// Copies of earlier sets, left untouched so they keep following edits. RPE isn't copied.
const copyRows = (sets) => sets.map((set) => makeRow({ weight: weightField(set.weight), rep: repField(set.rep) }));

function resizeRows(rows, count, targetRep) {
  if (count <= rows.length) return rows.slice(0, Math.max(count, 1));
  const last = rows[rows.length - 1];
  const added = Array.from({ length: count - rows.length }, () =>
    makeRow({ weight: last?.weight ?? '', rep: last?.rep || repField(targetRep) }));
  return [...rows, ...added];
}

// Seconds → the hours/minutes/seconds inputs ("" rather than 0 for empty parts)
function durationFields(total) {
  const seconds = Math.round(total || 0);
  if (!seconds) return { hours: '', minutes: '', seconds: '' };
  const hours = Math.floor(seconds / 3600);
  return {
    hours: hours ? String(hours) : '',
    minutes: String(Math.floor((seconds % 3600) / 60)),
    seconds: String(seconds % 60),
  };
}

// Distance and time copied from a run, walk or ride
const cardioFields = (entry) => ({
  distance: entry.distance ? String(entry.distance) : '',
  distanceUnit: entry.distanceUnit,
  ...durationFields(entry.duration),
});

// Form options for "Log again": a new entry dated today with the same sets (or distance and time)
export function repeatPrefill(lift) {
  if (isCardio(lift)) {
    return { kind: lift.kind, title: lift.name, cardio: cardioFields(lift) };
  }
  return {
    name: lift.name,
    rep: lift.rep,
    unit: lift.sets[0]?.metric,
    sets: lift.sets.length
      ? lift.sets
      : Array.from({ length: lift.set }, () => ({ weight: 0, rep: lift.rep })),
  };
}

// `units` is { weight: 'lb' | 'kg', distance: 'mi' | 'km' }
export function initFormState({ mode, lift, prefill }, units) {
  const blankCardio = { title: '', distance: '', distanceUnit: units.distance, ...durationFields(0) };

  if (mode === 'edit' && isCardio(lift)) {
    return {
      kind: lift.kind,
      ...blankCardio,
      title: lift.name,
      ...cardioFields(lift),
      name: '',
      committedName: '',
      date: moment(lift.date).format('YYYY-MM-DD'),
      unit: units.weight,
      rep: DEFAULT_REPS,
      note: lift.note || '',
      rows: defaultRows(),
      pristine: false,
      appliedKey: null,
    };
  }

  if (mode === 'edit') {
    const rows = lift.sets.map((set) =>
      makeRow({ weight: weightField(set.weight), rep: repField(set.rep), rpe: rpeField(set.rpe) }, ALL_TOUCHED));
    // Older lifts could declare more sets than were recorded
    while (rows.length < Math.min(lift.set || 0, MAX_SETS)) rows.push(makeRow({ rep: repField(lift.rep) }));
    if (!rows.length) rows.push(makeRow({ rep: repField(lift.rep || DEFAULT_REPS) }));

    return {
      kind: 'lift',
      ...blankCardio,
      name: lift.name,
      committedName: lift.name,
      date: moment(lift.date).format('YYYY-MM-DD'),
      unit: lift.sets[0]?.metric || units.weight,
      rep: lift.rep || DEFAULT_REPS,
      note: lift.note || '',
      rows,
      pristine: false,
      appliedKey: null,
    };
  }

  const state = {
    kind: prefill?.kind || 'lift',
    ...blankCardio,
    ...(prefill?.title ? { title: prefill.title } : {}),
    ...(prefill?.cardio || {}),
    name: prefill?.name || '',
    committedName: prefill?.name || '',
    date: moment().format('YYYY-MM-DD'),
    unit: units.weight,
    rep: DEFAULT_REPS,
    note: '',
    rows: defaultRows(),
    pristine: true,
    appliedKey: null,
  };

  if (prefill?.sets?.length) {
    return {
      ...state,
      rep: prefill.rep || DEFAULT_REPS,
      unit: prefill.unit || units.weight,
      rows: copyRows(prefill.sets),
      pristine: false,
    };
  }
  return state;
}

export function liftFormReducer(state, action) {
  switch (action.type) {
    case 'field':
      return { ...state, [action.field]: action.value };

    case 'commitName':
      return { ...state, committedName: action.value };

    case 'unit':
      return { ...state, unit: action.value, pristine: false };

    case 'setCount':
      return { ...state, rows: resizeRows(state.rows, action.value, state.rep), pristine: false };

    case 'removeSet':
      if (state.rows.length <= 1) return state;
      return { ...state, rows: state.rows.filter((_, i) => i !== action.index), pristine: false };

    case 'targetRep': {
      const rep = repField(action.value);
      return {
        ...state,
        rep: action.value,
        rows: state.rows.map((row) => (row.touched.rep ? row : { ...row, rep })),
        pristine: false,
      };
    }

    case 'rowField': {
      const { index, field, value } = action;
      const rows = state.rows.map((row, i) => {
        if (i === index) return { ...row, [field]: value, touched: { ...row.touched, [field]: true } };
        if (i > index && !row.touched[field]) return { ...row, [field]: value };
        return row;
      });
      return { ...state, rows, pristine: false };
    }

    case 'applyHistory': {
      const { entry, auto } = action;
      const { last } = entry;
      return {
        ...state,
        rows: last.sets.length ? copyRows(last.sets) : defaultRows(last.rep, last.set),
        rep: last.rep || DEFAULT_REPS,
        unit: last.sets[0]?.metric || state.unit,
        appliedKey: normalizeName(entry.name),
        // An automatic prefill keeps the form pristine so choosing a different lift replaces it
        pristine: auto ? state.pristine : false,
      };
    }

    case 'resetDefaults':
      return { ...state, rows: defaultRows(), rep: DEFAULT_REPS, appliedKey: null };

    // Lift, run, walk or ride
    case 'kind':
      return { ...state, kind: action.value };

    // Fill distance and time from the last run, walk or ride of this kind
    case 'applyCardio': {
      const { entry } = action;
      const customTitle = entry.name !== cardioKind(entry.kind)?.label ? entry.name : '';
      return { ...state, ...cardioFields(entry), title: state.title || customTitle };
    }

    default:
      return state;
  }
}

const wholeNumber = (value, max = Infinity) => value === '' || (/^\d+$/.test(value) && Number(value) < max);

export const durationSeconds = ({ hours, minutes, seconds }) =>
  (Number(hours) || 0) * 3600 + (Number(minutes) || 0) * 60 + (Number(seconds) || 0);

function validateCardio(state) {
  const errors = {};
  if (!moment(state.date, 'YYYY-MM-DD', true).isValid()) errors.date = 'Pick a date';
  const fields = {};
  if (state.distance !== '' && !(Number(state.distance) >= 0)) fields.distance = true;
  if (!wholeNumber(state.hours)) fields.hours = true;
  if (!wholeNumber(state.minutes, 60)) fields.minutes = true;
  if (!wholeNumber(state.seconds, 60)) fields.seconds = true;
  if (Object.keys(fields).length) errors.cardio = fields;
  else if (!Number(state.distance) && !durationSeconds(state)) errors.cardio = { empty: true };
  return errors;
}

// Errors keyed by field; row errors are keyed by row id
export function validateForm(state) {
  if (isCardio(state)) return validateCardio(state);

  const errors = {};
  if (!state.name.trim()) errors.name = 'Choose a lift or type a name';
  if (!moment(state.date, 'YYYY-MM-DD', true).isValid()) errors.date = 'Pick a date';

  const rows = {};
  state.rows.forEach((row) => {
    const rowErrors = {};
    if (row.rep === '') rowErrors.rep = true;
    if (row.weight !== '' && !(Number(row.weight) >= 0)) rowErrors.weight = true;
    if (row.rpe !== '' && !(Number(row.rpe) >= 0 && Number(row.rpe) <= 10)) rowErrors.rpe = true;
    if (Object.keys(rowErrors).length) rows[row.id] = rowErrors;
  });
  if (Object.keys(rows).length) errors.rows = rows;

  return errors;
}

function mostCommon(values) {
  const counts = new Map();
  values.forEach((value) => counts.set(value, (counts.get(value) || 0) + 1));
  return [...counts.entries()].reduce((best, entry) => (entry[1] > best[1] ? entry : best))[0];
}

// Request body for POST /api/lifts and PUT /api/lifts/:id
export function toPayload(state) {
  // Local midnight of the chosen day, as a UTC timestamp
  const date = moment(state.date, 'YYYY-MM-DD').toISOString();

  if (isCardio(state)) {
    return {
      lift: {
        kind: state.kind,
        name: state.title.trim(),
        date,
        distance: Number(state.distance) || 0,
        distanceUnit: state.distanceUnit,
        duration: durationSeconds(state),
        note: state.note.trim(),
      },
      sets: [],
    };
  }

  const sets = state.rows.map((row) => ({
    weight: row.weight === '' ? 0 : Number(row.weight),
    rep: Number(row.rep),
    rpe: row.rpe === '' ? null : Number(row.rpe),
    metric: state.unit,
  }));

  return {
    lift: {
      name: state.name.trim(),
      date,
      rep: mostCommon(sets.map((set) => set.rep)),
      note: state.note.trim(),
    },
    sets,
  };
}
