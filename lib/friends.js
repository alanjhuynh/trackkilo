import Friendship from '../models/Friendship';

export const MAX_FRIENDS = 200;
export const MAX_PENDING_REQUESTS = 50;

const involving = (userId) => ({ $or: [{ requesterId: userId }, { addresseeId: userId }] });

export const otherUserId = (friendship, userId) =>
  friendship.requesterId === userId ? friendship.addresseeId : friendship.requesterId;

export function getFriendships(userId) {
  return Friendship.find(involving(userId)).sort({ updatedAt: -1 }).lean();
}

export async function getFriendIds(userId) {
  const friendships = await Friendship.find({ ...involving(userId), status: 'accepted' })
    .select('requesterId addresseeId')
    .lean();
  return friendships.map((friendship) => otherUserId(friendship, userId));
}

// How `userId` relates to `otherId`: none | friend | incoming | outgoing
export function relationship(friendship, userId) {
  if (!friendship) return 'none';
  if (friendship.status === 'accepted') return 'friend';
  return friendship.requesterId === userId ? 'outgoing' : 'incoming';
}
