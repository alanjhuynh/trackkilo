import dbConnect from '../../lib/dbConnect';
import Lift from '../../models/Lift';
import SetModel from '../../models/Set';
import Profile from '../../models/Profile';
import { getSession } from '../../lib/auth';
import { getFriendIds } from '../../lib/friends';
import { groupSetsByLift } from '../../lib/history';
import {
  METRIC_KEYS, PERIODS, SCOPES, computeStats, rankEntries,
} from '../../lib/leaderboard';
import { getOrCreateProfile, publicProfile } from '../../lib/profiles';

const PUBLIC_LIMIT = 50;

/**
 * Ranked stats over a period, for you and your friends (scope=friends) or for
 * everyone who opted in to the public leaderboard (scope=public).
 *
 * GET ?scope=friends|public&period=7d|30d|365d|all&metric=workouts|volume|…
 * The public board lists the top 50 people with something to show for the
 * metric; `you` is your own row when you're on the board but not in the top 50.
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
  const scope = SCOPES.includes(req.query.scope) ? req.query.scope : 'friends';
  const metric = METRIC_KEYS.includes(req.query.metric) ? req.query.metric : 'workouts';

  await dbConnect();

  try {
    const me = await getOrCreateProfile(session);
    const profiles = scope === 'public'
      ? await Profile.find({ publicLeaderboard: true }).lean()
      : await Profile.find({ userId: { $in: [userId, ...(await getFriendIds(userId))] } }).lean();
    const userIds = profiles.map((profile) => profile.userId);

    const [lifts, sets] = await Promise.all([
      Lift.find({ userId: { $in: userIds } }).select('userId kind name set rep date distance distanceUnit').sort({ date: 1, _id: 1 }).lean(),
      SetModel.find({ userId: { $in: userIds } }).select('liftId index weight metric rep').lean(),
    ]);

    const setsByLift = groupSetsByLift(sets);
    const liftsByUser = {};
    lifts.forEach((lift) => {
      (liftsByUser[lift.userId] ||= []).push(lift);
    });

    let entries = rankEntries(profiles.map((profile) => ({
      ...publicProfile(profile),
      isYou: profile.userId === userId,
      ...computeStats(liftsByUser[profile.userId] || [], setsByLift, { days: period.days }),
    })), metric);

    let you = null;
    if (scope === 'public') {
      // People with nothing to show for this metric aren't listed (zero scores rank last anyway)
      entries = entries.filter((entry) => entry.score > 0 || entry.isYou);
      you = entries.slice(PUBLIC_LIMIT).find((entry) => entry.isYou) || null;
      entries = entries.slice(0, PUBLIC_LIMIT);
    }

    res.status(200).json({
      success: true,
      data: {
        scope,
        period: period.key,
        metric,
        entries,
        you,
        // Whether you appear on this board (always true for friends)
        joined: scope === 'friends' || Boolean(me.publicLeaderboard),
      },
    });
  } catch (error) {
    console.error('Leaderboard API error:', error);
    res.status(500).json({ success: false });
  }
}
