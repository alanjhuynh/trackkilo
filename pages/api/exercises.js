import dbConnect from '../../lib/dbConnect';
import Lift from '../../models/Lift';
import SetModel from '../../models/Set';
import { getUserId } from '../../lib/auth';
import { toKg, topSet } from '../../lib/sets';

/**
 * Per-exercise summary of the user's history, used for name autocomplete,
 * prefilling the form from the last session, and PR badges.
 *
 * exercises: [{ name, count, last: { date, set, rep, sets }, best }], most recent first
 * prLiftIds: ids of lifts whose top set beat every earlier session of that exercise
 */
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ success: false });
  }

  const userId = await getUserId(req, res);
  if (!userId) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }

  await dbConnect();

  try {
    const [lifts, sets] = await Promise.all([
      Lift.find({ userId }).select('name set rep date').sort({ date: 1, _id: 1 }).lean(),
      SetModel.find({ userId }).select('liftId index weight metric rep').lean(),
    ]);

    const setsByLift = {};
    sets.forEach((set) => {
      (setsByLift[set.liftId] ||= []).push(set);
    });

    const exercises = new Map();
    const prLiftIds = [];

    // Oldest first, so `last` ends up as the latest session and PRs are
    // judged only against what came before them
    lifts.forEach((lift) => {
      const name = (lift.name || '').trim();
      if (!name) return;

      const key = name.toLowerCase();
      const liftId = lift._id.toString();
      const liftSets = (setsByLift[liftId] || [])
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
        if (exercise.best) prLiftIds.push(liftId);
        exercise.best = { kg, weight: top.weight, metric: top.metric, rep: top.rep, date: lift.date };
      }
    });

    const data = [...exercises.values()].sort(
      (a, b) => new Date(b.last.date) - new Date(a.last.date)
    );

    res.status(200).json({ success: true, data: { exercises: data, prLiftIds } });
  } catch (error) {
    console.error('Exercises API error:', error);
    res.status(500).json({ success: false });
  }
}
