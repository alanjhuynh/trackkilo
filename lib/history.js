import { toKg, topSet } from './sets';

export function groupSetsByLift(sets) {
  const byLift = {};
  sets.forEach((set) => {
    (byLift[set.liftId] ||= []).push(set);
  });
  return byLift;
}

/**
 * Summarizes one user's lifts per exercise (names match case-insensitively).
 * `lifts` must be sorted oldest first, so `last` is the latest session and a PR
 * is only judged against the sessions before it.
 *
 * exercises: Map of name → { name, count, last: { date, set, rep, sets }, best }
 * prs: [{ liftId, date }] for lifts whose top set beat every earlier session
 */
export function summarizeHistory(lifts, setsByLift) {
  const exercises = new Map();
  const prs = [];

  lifts.forEach((lift) => {
    const name = (lift.name || '').trim();
    if (!name) return;

    const key = name.toLowerCase();
    const liftId = lift._id.toString();
    const liftSets = (setsByLift[liftId] || [])
      .slice()
      .sort((a, b) => a.index - b.index)
      .map(({ weight, metric, rep }) => ({ weight: weight ?? 0, metric: metric || 'lb', rep }));

    let exercise = exercises.get(key);
    if (!exercise) {
      exercise = { name, count: 0, best: null };
      exercises.set(key, exercise);
    }
    exercise.name = name; // latest spelling wins
    exercise.count += 1;
    exercise.last = { date: lift.date, set: lift.set, rep: lift.rep, sets: liftSets };

    const top = topSet(liftSets);
    if (!top || !top.weight) return;

    const kg = toKg(top);
    if (!exercise.best || kg > exercise.best.kg) {
      if (exercise.best) prs.push({ liftId, date: lift.date });
      exercise.best = { kg, weight: top.weight, metric: top.metric, rep: top.rep, date: lift.date };
    }
  });

  return { exercises, prs };
}
