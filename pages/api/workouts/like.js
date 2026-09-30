import dbConnect from '../../../lib/dbConnect';
import WorkoutLike from '../../../models/WorkoutLike';
import { getUserId } from '../../../lib/auth';
import { findWorkout } from '../../../lib/workouts';

// Like or unlike a workout: POST { owner: username, date, liked: true|false }
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ success: false });
  }

  const userId = await getUserId(req, res);
  if (!userId) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }

  const { owner, date, liked } = req.body || {};
  if (typeof liked !== 'boolean') {
    return res.status(400).json({ success: false, message: 'Invalid request' });
  }

  await dbConnect();

  try {
    const workout = await findWorkout(userId, owner, date);
    if (workout.status) {
      return res.status(workout.status).json({ success: false, message: workout.message });
    }

    const key = { ownerId: workout.ownerId, date: workout.date, userId };
    if (liked) {
      try {
        await WorkoutLike.updateOne(key, { $setOnInsert: key }, { upsert: true });
      } catch (error) {
        // Two likes at once: the unique index keeps just one
        if (error?.code !== 11000) throw error;
      }
    } else {
      await WorkoutLike.deleteOne(key);
    }

    const count = await WorkoutLike.countDocuments({ ownerId: workout.ownerId, date: workout.date });
    res.status(200).json({ success: true, data: { liked, count } });
  } catch (error) {
    console.error('Like failed', error);
    res.status(500).json({ success: false });
  }
}
