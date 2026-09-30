import dbConnect from '../../lib/dbConnect';
import Lift from '../../models/Lift';
import SetModel from '../../models/Set';
import Profile from '../../models/Profile';
import WorkoutLike from '../../models/WorkoutLike';
import WorkoutComment from '../../models/WorkoutComment';
import { getSession } from '../../lib/auth';
import { getFriendIds } from '../../lib/friends';
import { groupSetsByLift } from '../../lib/history';
import { serializeLift } from '../../lib/liftPayload';
import { getOrCreateProfile, publicProfile } from '../../lib/profiles';
import { profilesById, serializeComment } from '../../lib/workouts';
import { isCardio } from '../../lib/activities';

const PAGE_SIZE = 10;
const LIKER_NAMES = 3;
const RECENT_COMMENTS = 2;

const groupKey = (userId, date) => `${userId}|${new Date(date).getTime()}`;

/**
 * Workouts from you and your friends, newest first. A workout is everything
 * one person logged on one day. Notes aren't included; they stay private.
 *
 * GET ?before=ISO&beforeOwner=username continues after the last workout of
 * the previous page (`nextCursor`).
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

  await dbConnect();

  try {
    await getOrCreateProfile(session);
    const ownerIds = [userId, ...(await getFriendIds(userId))];
    const match = { userId: { $in: ownerIds } };

    const before = new Date(req.query.before);
    if (req.query.before && !Number.isNaN(before.getTime())) {
      const cursorOwner = typeof req.query.beforeOwner === 'string'
        ? await Profile.findOne({ username: req.query.beforeOwner }).select('userId').lean()
        : null;
      match.$or = [{ date: { $lt: before } }, { date: before, userId: { $lt: cursorOwner?.userId || '' } }];
    }

    const groups = await Lift.aggregate([
      { $match: match },
      { $group: { _id: { userId: '$userId', date: '$date' } } },
      { $sort: { '_id.date': -1, '_id.userId': -1 } },
      { $limit: PAGE_SIZE + 1 },
    ]);
    const page = groups.slice(0, PAGE_SIZE).map((group) => group._id);
    if (!page.length) {
      return res.status(200).json({ success: true, data: { items: [], nextCursor: null } });
    }

    const workoutFilter = (field) => ({ $or: page.map((w) => ({ [field]: w.userId, date: w.date })) });
    const [entries, likes, comments, owners] = await Promise.all([
      Lift.find(workoutFilter('userId')).sort({ createdAt: 1, _id: 1 }).lean(),
      WorkoutLike.find(workoutFilter('ownerId')).sort({ createdAt: -1 }).lean(),
      WorkoutComment.find(workoutFilter('ownerId')).sort({ createdAt: 1, _id: 1 }).lean(),
      profilesById(page.map((w) => w.userId)),
    ]);
    const setsByLift = groupSetsByLift(await SetModel.find({
      userId: { $in: ownerIds },
      liftId: { $in: entries.filter((entry) => !isCardio(entry)).map((entry) => entry._id.toString()) },
    }).lean());
    const people = await profilesById([...likes, ...comments].map((item) => item.userId));

    const byWorkout = (items, ownerField) => {
      const grouped = new Map();
      items.forEach((item) => {
        const key = groupKey(item[ownerField], item.date);
        if (!grouped.has(key)) grouped.set(key, []);
        grouped.get(key).push(item);
      });
      return grouped;
    };
    const entriesByWorkout = byWorkout(entries, 'userId');
    const likesByWorkout = byWorkout(likes, 'ownerId');
    const commentsByWorkout = byWorkout(comments, 'ownerId');

    const items = page.map(({ userId: ownerId, date }) => {
      const key = groupKey(ownerId, date);
      const workoutLikes = likesByWorkout.get(key) || [];
      const workoutComments = commentsByWorkout.get(key) || [];
      return {
        owner: owners.has(ownerId) ? publicProfile(owners.get(ownerId)) : { username: '', displayName: 'Former user', image: null },
        isYours: ownerId === userId,
        date: new Date(date).toISOString(),
        entries: (entriesByWorkout.get(key) || []).map((entry) => {
          const { note, ...rest } = serializeLift(entry, setsByLift[entry._id.toString()]);
          return rest;
        }),
        likes: {
          count: workoutLikes.length,
          liked: workoutLikes.some((like) => like.userId === userId),
          // A few other people who liked it, most recent first
          names: workoutLikes
            .filter((like) => like.userId !== userId && people.has(like.userId))
            .slice(0, LIKER_NAMES)
            .map((like) => people.get(like.userId).displayName),
        },
        comments: {
          count: workoutComments.length,
          recent: workoutComments.slice(-RECENT_COMMENTS).map((comment) => serializeComment(comment, people, userId)),
        },
      };
    });

    const last = items[items.length - 1];
    res.status(200).json({
      success: true,
      data: {
        items,
        nextCursor: groups.length > PAGE_SIZE ? { before: last.date, beforeOwner: last.owner.username } : null,
      },
    });
  } catch (error) {
    console.error('Feed API error:', error);
    res.status(500).json({ success: false });
  }
}
