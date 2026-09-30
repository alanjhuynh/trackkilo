import Lift from '../models/Lift';
import Profile from '../models/Profile';
import Friendship, { pairKey } from '../models/Friendship';
import WorkoutLike from '../models/WorkoutLike';
import WorkoutComment from '../models/WorkoutComment';
import { publicProfile } from './profiles';

/*
 * A workout is everything one person logged on one day. Entries saved from
 * the same day share the exact same `date` (local midnight), so a workout is
 * identified by its owner and that date. Only the owner and their friends can
 * see it, like it or comment on it.
 */

export const MAX_COMMENT_LENGTH = 500;

export async function canSee(viewerId, ownerId) {
  if (viewerId === ownerId) return true;
  return Boolean(await Friendship.exists({ pair: pairKey(viewerId, ownerId), status: 'accepted' }));
}

/**
 * The workout `username` logged on `date`, if the viewer is allowed to see it.
 * Returns `{ ownerId, date }`, or `{ status, message }` to send back. Workouts
 * you can't see are reported as not found, so their existence isn't revealed.
 */
export async function findWorkout(viewerId, username, dateValue) {
  const date = new Date(dateValue);
  if (typeof username !== 'string' || !username || Number.isNaN(date.getTime())) {
    return { status: 400, message: 'Invalid workout' };
  }
  const owner = await Profile.findOne({ username: username.toLowerCase() }).select('userId').lean();
  if (!owner || !(await canSee(viewerId, owner.userId)) || !(await Lift.exists({ userId: owner.userId, date }))) {
    return { status: 404, message: 'Workout not found' };
  }
  return { ownerId: owner.userId, date };
}

// Removes likes and comments from a day that no longer has any entries
export async function removeReactionsIfEmpty(ownerId, date) {
  if (await Lift.exists({ userId: ownerId, date })) return;
  await Promise.all([
    WorkoutLike.deleteMany({ ownerId, date }),
    WorkoutComment.deleteMany({ ownerId, date }),
  ]);
}

// Profiles by user id, for showing who liked or commented
export async function profilesById(userIds) {
  const profiles = await Profile.find({ userId: { $in: [...new Set(userIds)] } }).lean();
  return new Map(profiles.map((profile) => [profile.userId, profile]));
}

const FORMER_USER = { username: null, displayName: 'Former user', image: null };

export function serializeComment(comment, authors, viewerId) {
  const author = authors.get(comment.userId);
  return {
    id: comment._id.toString(),
    author: author ? publicProfile(author) : FORMER_USER,
    text: comment.text,
    createdAt: new Date(comment.createdAt).toISOString(),
    isYours: comment.userId === viewerId,
    // Authors can delete their comments; owners can delete any comment on their workout
    canDelete: comment.userId === viewerId || comment.ownerId === viewerId,
  };
}
