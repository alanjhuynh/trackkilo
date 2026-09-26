import mongoose from 'mongoose';
import dbConnect from '../../../lib/dbConnect';
import Friendship from '../../../models/Friendship';
import { getUserId } from '../../../lib/auth';

export default async function handler(req, res) {
  const userId = await getUserId(req, res);
  if (!userId) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }

  const { id } = req.query;
  if (!mongoose.isValidObjectId(id)) {
    return res.status(404).json({ success: false, message: 'Request not found' });
  }

  await dbConnect();

  try {
    switch (req.method) {
      // Accept a request sent to you
      case 'PATCH': {
        const friendship = await Friendship.findOneAndUpdate(
          { _id: id, addresseeId: userId, status: 'pending' },
          { status: 'accepted', acceptedAt: new Date() },
          { new: true },
        );
        if (!friendship) {
          return res.status(404).json({ success: false, message: 'Request not found' });
        }
        return res.status(200).json({ success: true });
      }

      // Decline or cancel a request, or remove a friend
      case 'DELETE': {
        const result = await Friendship.deleteOne({
          _id: id,
          $or: [{ requesterId: userId }, { addresseeId: userId }],
        });
        if (!result.deletedCount) {
          return res.status(404).json({ success: false, message: 'Not found' });
        }
        return res.status(200).json({ success: true });
      }

      default:
        res.setHeader('Allow', ['PATCH', 'DELETE']);
        return res.status(405).json({ success: false });
    }
  } catch (error) {
    console.error('Friend request update failed', error);
    return res.status(500).json({ success: false });
  }
}
