import moment from 'moment';
import { topSet } from './sets';

export const normalizeName = (name = '') => name.trim().toLowerCase();

export const plural = (count, word, many = `${word}s`) => `${count} ${count === 1 ? word : many}`;

// 0 means a bodyweight set
export function formatWeight(weight, metric = 'lb') {
  const value = Number(weight);
  if (!value) return 'BW';
  return `${Math.round(value * 100) / 100} ${metric}`;
}

// "3 × 8 · 185 lb", "4 sets · top 205 lb × 3", …
export function summarizeSets({ set, rep, sets = [] }) {
  if (!sets.length) return `${set} × ${rep}`;

  const first = sets[0];
  const sameReps = sets.every((s) => s.rep === first.rep);
  const sameWeight = sets.every((s) => s.weight === first.weight && s.metric === first.metric);
  const scheme = sameReps ? `${sets.length} × ${first.rep}` : `${sets.length} sets`;

  if (sameWeight) return `${scheme} · ${formatWeight(first.weight, first.metric)}`;

  const top = topSet(sets);
  return `${scheme} · top ${formatWeight(top.weight, top.metric)}${sameReps ? '' : ` × ${top.rep}`}`;
}

// Local calendar day, used to group lifts
export const dayKey = (date) => moment(date).format('YYYY-MM-DD');

/**
 * Heading for a day in the log: "Today", "Yesterday", a weekday within the
 * last week, otherwise the date. `detail` is the date shown beside relative labels.
 */
export function describeDay(key) {
  const day = moment(key, 'YYYY-MM-DD');
  const diff = moment().startOf('day').diff(day, 'days');
  const thisYear = day.isSame(moment(), 'year');
  const date = day.format(thisYear ? 'MMM D' : 'MMM D, YYYY');

  if (diff === 0) return { label: 'Today', detail: date };
  if (diff === 1) return { label: 'Yesterday', detail: date };
  if (diff === -1) return { label: 'Tomorrow', detail: date };
  if (diff > 1 && diff < 7) return { label: day.format('dddd'), detail: date };
  return { label: day.format(thisYear ? 'ddd, MMM D' : 'MMM D, YYYY'), detail: null };
}

export const dayLabel = (date) => describeDay(dayKey(date)).label;
