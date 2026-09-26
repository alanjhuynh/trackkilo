import mongoose from 'mongoose';
import dbConnect from '../../../lib/dbConnect';
import Lift from '../../../models/Lift';
import Set from '../../../models/Set';
import { getUserId } from '../../../lib/auth';
import { parseLiftPayload, serializeLift } from '../../../lib/liftPayload';

export default async function handler(req, res) {
  const userId = await getUserId(req, res);
  if (!userId) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }

  const { id } = req.query;
  if (!mongoose.isValidObjectId(id)) {
    return res.status(404).json({ success: false, message: 'Lift not found' });
  }

  await dbConnect();

  switch (req.method) {
    case 'PUT': {
      const parsed = parseLiftPayload(req.body);
      if (parsed.error) {
        return res.status(400).json({ success: false, message: parsed.error });
      }

      try {
        const lift = await Lift.findOneAndUpdate({ _id: id, userId }, parsed.lift, {
          new: true,
          runValidators: true,
        });
        if (!lift) {
          return res.status(404).json({ success: false, message: 'Lift not found' });
        }

        // Upsert sets by position, then drop any beyond the new set count
        await Set.bulkWrite(parsed.sets.map((set) => ({
          updateOne: {
            filter: { liftId: id, userId, index: set.index },
            update: { $set: { ...set, liftId: id, userId } },
            upsert: true,
          },
        })));
        await Set.deleteMany({ liftId: id, userId, index: { $gt: parsed.sets.length } });

        const sets = await Set.find({ liftId: id, userId }).lean();
        res.status(200).json({ success: true, data: serializeLift(lift, sets) });
      } catch (error) {
        console.error('Failed to update lift', error);
        res.status(500).json({ success: false });
      }
      break;
    }

    case 'DELETE':
      try {
        const lift = await Lift.findOneAndDelete({ _id: id, userId });
        if (!lift) {
          return res.status(404).json({ success: false, message: 'Lift not found' });
        }
        await Set.deleteMany({ liftId: id, userId });
        res.status(200).json({ success: true, id });
      } catch (error) {
        console.error('Failed to delete lift', error);
        res.status(500).json({ success: false });
      }
      break;

    default:
      res.setHeader('Allow', ['PUT', 'DELETE']);
      res.status(405).json({ success: false });
      break;
  }
}
