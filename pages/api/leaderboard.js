import dbConnect from '../../lib/dbConnect';
import Lift from '../../models/Lift';
import SetModel from '../../models/Set';
import Profile from '../../models/Profile';
import { getSession } from '../../lib/auth';
import { getFriendIds } from '../../lib/friends';
import { groupSetsByLift } from '../../lib/history';
import { PERIODS, computeStats } from '../../lib/leaderboard';
import { getOrCreateProfile, publicProfile } from '../../lib/profiles';

/**
 * Stats for you and your friends over a period. Only friends are included;
 * the client ranks entries by whichever metric is selected.
 */
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ success: false });
  }

  const session = await getSession(req, res);
  if (!session) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }
  const { userId } = session;

  const period = PERIODS.find((p) => p.key === req.query.period) || PERIODS[0];

  await dbConnect();

  try {
    await getOrCreateProfile(session);
    const userIds = [userId, ...(await getFriendIds(userId))];

    const [profiles, lifts, sets] = await Promise.all([
      Profile.find({ userId: { $in: userIds } }).lean(),
      Lift.find({ userId: { $in: userIds } }).select('userId kind name set rep date distance distanceUnit').sort({ date: 1, _id: 1 }).lean(),
      SetModel.find({ userId: { $in: userIds } }).select('liftId index weight metric rep').lean(),
    ]);

    const setsByLift = groupSetsByLift(sets);
    const liftsByUser = {};
    lifts.forEach((lift) => {
      (liftsByUser[lift.userId] ||= []).push(lift);
    });

    const entries = profiles.map((profile) => ({
      ...publicProfile(profile),
      isYou: profile.userId === userId,
      ...computeStats(liftsByUser[profile.userId] || [], setsByLift, { days: period.days }),
    }));

    res.status(200).json({ success: true, data: { period: period.key, entries } });
  } catch (error) {
    console.error('Leaderboard API error:', error);
    res.status(500).json({ success: false });
  }
}
