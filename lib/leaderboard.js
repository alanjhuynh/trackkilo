import { summarizeHistory } from './history';
import { toKg } from './sets';
import { CARDIO_KEYS, isCardio, toKm } from './activities';

const DAY_MS = 24 * 60 * 60 * 1000;
const WEEK_MS = 7 * DAY_MS;

// Rolling windows, so everyone is compared over the same stretch of time
export const PERIODS = [
  { key: '7d', label: '7 days', days: 7 },
  { key: '30d', label: '30 days', days: 30 },
  { key: '365d', label: 'Year', days: 365 },
  { key: 'all', label: 'All time', days: null },
];

// Lifts ranked by estimated one-rep max. Names match after removing case,
// spaces and punctuation.
export const BIG_LIFTS = [
  { key: 'bench', label: 'Bench', names: ['bench press', 'bench', 'barbell bench press', 'flat bench press', 'flat bench', 'bp'] },
  { key: 'squat', label: 'Squat', names: ['squat', 'back squat', 'barbell squat', 'barbell back squat'] },
  { key: 'deadlift', label: 'Deadlift', names: ['deadlift', 'conventional deadlift', 'barbell deadlift', 'dl'] },
  { key: 'ohp', label: 'OHP', names: ['overhead press', 'ohp', 'military press', 'standing press', 'barbell overhead press', 'shoulder press'] },
];

const compact = (name) => (name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
const BIG_LIFT_BY_NAME = new Map(
  BIG_LIFTS.flatMap((lift) => lift.names.map((name) => [compact(name), lift.key])),
);

const MAX_E1RM_REPS = 12; // estimates get unreliable past this

// Epley estimate, in kg
export function estimateOneRepMax(set) {
  if (!set.weight || !set.rep || set.rep > MAX_E1RM_REPS) return 0;
  const kg = toKg(set);
  return set.rep === 1 ? kg : kg * (1 + set.rep / 30);
}

// Start of the UTC week (Monday) containing `time`
function weekStart(time) {
  const date = new Date(time);
  const day = (date.getUTCDay() + 6) % 7;
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() - day);
}

// Consecutive weeks with a workout, ending this week (or last week, if this
// week hasn't had one yet)
function weekStreak(lifts, now) {
  const weeks = new Set(lifts.map((lift) => weekStart(new Date(lift.date).getTime())));
  let week = weekStart(now);
  if (!weeks.has(week)) week -= WEEK_MS;
  let streak = 0;
  while (weeks.has(week)) {
    streak += 1;
    week -= WEEK_MS;
  }
  return streak;
}

/**
 * One user's leaderboard numbers. `lifts` are that user's log entries (lifts,
 * runs, walks and rides) sorted oldest first: their full history, so PRs and
 * streaks are judged correctly. Workouts and streaks count every entry; the
 * lifting numbers only count lifts.
 */
export function computeStats(lifts, setsByLift, { days, now = Date.now() }) {
  const since = days ? now - days * DAY_MS : -Infinity;
  const inPeriod = lifts.filter((lift) => new Date(lift.date).getTime() >= since);

  const workoutDays = new Set();
  let sets = 0;
  let volumeKg = 0;
  const e1rm = Object.fromEntries(BIG_LIFTS.map((lift) => [lift.key, null]));
  const distanceKm = Object.fromEntries(CARDIO_KEYS.map((kind) => [kind, 0]));

  inPeriod.forEach((lift) => {
    workoutDays.add(new Date(lift.date).toISOString().slice(0, 10));
    if (isCardio(lift)) {
      distanceKm[lift.kind] += toKm(lift.distance, lift.distanceUnit);
      return;
    }
    const bigLift = BIG_LIFT_BY_NAME.get(compact(lift.name));
    (setsByLift[lift._id.toString()] || []).forEach((set) => {
      sets += 1;
      volumeKg += toKg(set) * (set.rep || 0);
      if (bigLift) {
        const estimate = estimateOneRepMax(set);
        if (estimate && estimate > (e1rm[bigLift] || 0)) e1rm[bigLift] = estimate;
      }
    });
  });

  const { prs } = summarizeHistory(lifts.filter((lift) => !isCardio(lift)), setsByLift);

  return {
    workouts: workoutDays.size,
    sets,
    volumeKg: Math.round(volumeKg),
    prs: prs.filter((pr) => new Date(pr.date).getTime() >= since).length,
    streak: weekStreak(lifts, now),
    e1rm,
    distanceKm: Object.fromEntries(Object.entries(distanceKm).map(([kind, km]) => [kind, Math.round(km * 100) / 100])),
  };
}

// Who's on the board: you and your friends, or everyone who opted in
export const SCOPES = ['friends', 'public'];

// Each rankable metric's score, from computeStats output (kg and km for weights and distances)
const METRIC_SCORES = {
  workouts: (stats) => stats.workouts,
  volume: (stats) => stats.volumeKg,
  sets: (stats) => stats.sets,
  prs: (stats) => stats.prs,
  streak: (stats) => stats.streak,
  ...Object.fromEntries(CARDIO_KEYS.map((kind) => [kind, (stats) => stats.distanceKm[kind]])),
  ...Object.fromEntries(BIG_LIFTS.map((lift) => [lift.key, (stats) => stats.e1rm[lift.key]])),
};
export const METRIC_KEYS = Object.keys(METRIC_SCORES);

/**
 * Sorts entries by a metric and numbers them with standard competition
 * ranking (ties share a rank: 1, 1, 3). Adds `score` and `rank`.
 */
export function rankEntries(entries, metric) {
  const score = METRIC_SCORES[metric] || METRIC_SCORES.workouts;
  const ranked = entries
    .map((entry) => ({ ...entry, score: score(entry) || 0 }))
    .sort((a, b) => b.score - a.score || b.isYou - a.isYou || a.displayName.localeCompare(b.displayName));
  ranked.forEach((entry, i) => {
    entry.rank = i > 0 && entry.score === ranked[i - 1].score ? ranked[i - 1].rank : i + 1;
  });
  return ranked;
}
