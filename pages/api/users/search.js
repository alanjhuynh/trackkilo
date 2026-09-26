import dbConnect from '../../../lib/dbConnect';
import Profile from '../../../models/Profile';
import Friendship, { pairKey } from '../../../models/Friendship';
import { getUserId } from '../../../lib/auth';
import { publicProfile } from '../../../lib/profiles';
import { relationship } from '../../../lib/friends';

const MIN_QUERY = 2;
const MAX_RESULTS = 8;

// Find people by username prefix (not by real name or email)
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ success: false });
  }

  const userId = await getUserId(req, res);
  if (!userId) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }

  const query = String(req.query.q || '').trim().replace(/^@/, '').toLowerCase();
  if (query.length < MIN_QUERY || !/^[a-z0-9_]+$/.test(query)) {
    return res.status(200).json({ success: true, data: [] });
  }

  await dbConnect();

  try {
    const profiles = await Profile.find({ username: { $regex: `^${query}` }, userId: { $ne: userId } })
      .sort({ username: 1 })
      .limit(MAX_RESULTS)
      .lean();

    const friendships = await Friendship.find({
      pair: { $in: profiles.map((profile) => pairKey(userId, profile.userId)) },
    }).lean();
    const byPair = new Map(friendships.map((friendship) => [friendship.pair, friendship]));

    const data = profiles
      .map((profile) => {
        const friendship = byPair.get(pairKey(userId, profile.userId));
        return {
          ...publicProfile(profile),
          relationship: relationship(friendship, userId),
          friendshipId: friendship?._id.toString() || null,
        };
      })
      // An exact match (e.g. from an invite link) comes first
      .sort((a, b) => (b.username === query) - (a.username === query));

    res.status(200).json({ success: true, data });
  } catch (error) {
    console.error('User search failed', error);
    res.status(500).json({ success: false });
  }
}
