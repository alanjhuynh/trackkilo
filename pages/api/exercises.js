import dbConnect from '../../lib/dbConnect';
import Lift from '../../models/Lift';
import SetModel from '../../models/Set';
import { getUserId } from '../../lib/auth';
import { groupSetsByLift, summarizeHistory } from '../../lib/history';
import { CARDIO_KEYS, STRENGTH_FILTER } from '../../lib/activities';
import { serializeLift } from '../../lib/liftPayload';

/**
 * Per-exercise summary of the user's history, used for name autocomplete,
 * prefilling the form from the last session, and PR badges.
 *
 * exercises: [{ name, count, last: { date, set, rep, sets }, best }], most recent first
 * prLiftIds: ids of lifts whose top set beat every earlier session of that exercise
 * cardio: the latest run, walk and ride (whichever exist)
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
    const [lifts, sets, lastCardio] = await Promise.all([
      Lift.find({ userId, ...STRENGTH_FILTER }).select('name set rep date').sort({ date: 1, _id: 1 }).lean(),
      SetModel.find({ userId }).select('liftId index weight metric rep').lean(),
      Promise.all(CARDIO_KEYS.map((kind) => Lift.findOne({ userId, kind })
        .sort({ date: -1, _id: -1 })
        .select('kind name date distance distanceUnit duration')
        .lean())),
    ]);

    const { exercises, prs } = summarizeHistory(lifts, groupSetsByLift(sets));
    const data = [...exercises.values()].sort(
      (a, b) => new Date(b.last.date) - new Date(a.last.date)
    );

    res.status(200).json({
      success: true,
      data: {
        exercises: data,
        prLiftIds: prs.map((pr) => pr.liftId),
        // Latest run, walk and ride, for "last time" hints
        cardio: lastCardio.filter(Boolean).map((entry) => serializeLift(entry)),
      },
    });
  } catch (error) {
    console.error('Exercises API error:', error);
    res.status(500).json({ success: false });
  }
}
