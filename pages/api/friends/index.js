import dbConnect from '../../../lib/dbConnect';
import Profile from '../../../models/Profile';
import Friendship, { pairKey } from '../../../models/Friendship';
import { getSession } from '../../../lib/auth';
import { getOrCreateProfile, publicProfile } from '../../../lib/profiles';
import { MAX_FRIENDS, MAX_PENDING_REQUESTS, getFriendships, otherUserId } from '../../../lib/friends';

export default async function handler(req, res) {
  const session = await getSession(req, res);
  if (!session) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }
  const { userId } = session;

  await dbConnect();

  switch (req.method) {
    // Friends plus incoming and outgoing requests
    case 'GET':
      try {
        const friendships = await getFriendships(userId);
        const profiles = await Profile.find({
          userId: { $in: friendships.map((friendship) => otherUserId(friendship, userId)) },
        }).lean();
        const profileById = new Map(profiles.map((profile) => [profile.userId, profile]));

        const data = { friends: [], incoming: [], outgoing: [] };
        friendships.forEach((friendship) => {
          const profile = profileById.get(otherUserId(friendship, userId));
          if (!profile) return;
          const entry = {
            id: friendship._id.toString(),
            user: publicProfile(profile),
            since: friendship.acceptedAt || friendship.createdAt,
          };
          if (friendship.status === 'accepted') data.friends.push(entry);
          else if (friendship.requesterId === userId) data.outgoing.push(entry);
          else data.incoming.push(entry);
        });
        data.friends.sort((a, b) => a.user.displayName.localeCompare(b.user.displayName));

        res.status(200).json({ success: true, data });
      } catch (error) {
        console.error('Failed to load friends', error);
        res.status(500).json({ success: false });
      }
      break;

    // Send a friend request by username. If they already asked you, this accepts it.
    case 'POST': {
      const username = String(req.body?.username || '').trim().replace(/^@/, '').toLowerCase();
      if (!username) {
        return res.status(400).json({ success: false, message: 'Enter a username' });
      }

      try {
        // Make sure the requester is visible to the person they're adding
        await getOrCreateProfile(session);

        const target = await Profile.findOne({ username }).lean();
        if (!target) {
          return res.status(404).json({ success: false, message: `No one goes by @${username}` });
        }
        if (target.userId === userId) {
          return res.status(400).json({ success: false, message: 'That’s you!' });
        }

        const pair = pairKey(userId, target.userId);
        const existing = await Friendship.findOne({ pair });
        if (existing?.status === 'accepted') {
          return res.status(409).json({ success: false, message: `You and @${username} are already friends` });
        }
        if (existing?.requesterId === userId) {
          return res.status(409).json({ success: false, message: `You already sent @${username} a request` });
        }
        if (existing) {
          existing.status = 'accepted';
          existing.acceptedAt = new Date();
          await existing.save();
          return res.status(200).json({ success: true, data: { status: 'accepted', user: publicProfile(target) } });
        }

        const [friendCount, pendingCount] = await Promise.all([
          Friendship.countDocuments({ $or: [{ requesterId: userId }, { addresseeId: userId }], status: 'accepted' }),
          Friendship.countDocuments({ requesterId: userId, status: 'pending' }),
        ]);
        if (friendCount >= MAX_FRIENDS) {
          return res.status(400).json({ success: false, message: `You can have up to ${MAX_FRIENDS} friends` });
        }
        if (pendingCount >= MAX_PENDING_REQUESTS) {
          return res.status(400).json({ success: false, message: 'You have too many pending requests' });
        }

        await Friendship.create({ requesterId: userId, addresseeId: target.userId, pair });
        res.status(201).json({ success: true, data: { status: 'pending', user: publicProfile(target) } });
      } catch (error) {
        if (error?.code === 11000) {
          return res.status(409).json({ success: false, message: 'A request between you already exists' });
        }
        console.error('Failed to send friend request', error);
        res.status(500).json({ success: false });
      }
      break;
    }

    default:
      res.setHeader('Allow', ['GET', 'POST']);
      res.status(405).json({ success: false });
      break;
  }
}
