import mongoose from 'mongoose';
import dbConnect from '../../../../lib/dbConnect';
import WorkoutComment from '../../../../models/WorkoutComment';
import { getUserId } from '../../../../lib/auth';

// DELETE a comment: its author, or the owner of the workout it's on
export default async function handler(req, res) {
  if (req.method !== 'DELETE') {
    res.setHeader('Allow', ['DELETE']);
    return res.status(405).json({ success: false });
  }

  const userId = await getUserId(req, res);
  if (!userId) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }

  const { id } = req.query;
  if (!mongoose.isValidObjectId(id)) {
    return res.status(404).json({ success: false, message: 'Comment not found' });
  }

  await dbConnect();

  try {
    const result = await WorkoutComment.deleteOne({
      _id: id,
      $or: [{ userId }, { ownerId: userId }],
    });
    if (!result.deletedCount) {
      return res.status(404).json({ success: false, message: 'Comment not found' });
    }
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Deleting comment failed', error);
    res.status(500).json({ success: false });
  }
}
