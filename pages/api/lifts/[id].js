import mongoose from 'mongoose';
import dbConnect from '../../../lib/dbConnect';
import Lift from '../../../models/Lift';
import Set from '../../../models/Set';
import { getUserId } from '../../../lib/auth';
import { parseLiftPayload, serializeLift } from '../../../lib/liftPayload';
import { CARDIO_KEYS, STRENGTH_FILTER, isCardio } from '../../../lib/activities';
import { removeReactionsIfEmpty } from '../../../lib/workouts';

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
        // A lift can't become a run (or the other way round); runs, walks and rides can switch
        const sameKind = isCardio(parsed.lift) ? { kind: { $in: CARDIO_KEYS } } : STRENGTH_FILTER;
        const previous = await Lift.findOne({ _id: id, userId }).select('date').lean();
        const lift = await Lift.findOneAndUpdate({ _id: id, userId, ...sameKind }, parsed.lift, {
          new: true,
          runValidators: true,
        });
        if (!lift) {
          const exists = await Lift.exists({ _id: id, userId });
          return exists
            ? res.status(400).json({ success: false, message: 'A lift can’t be changed into a run, walk or ride' })
            : res.status(404).json({ success: false, message: 'Lift not found' });
        }

        // Upsert sets by position, then drop any beyond the new set count
        if (parsed.sets.length) {
          await Set.bulkWrite(parsed.sets.map((set) => ({
            updateOne: {
              filter: { liftId: id, userId, index: set.index },
              update: { $set: { ...set, liftId: id, userId } },
              upsert: true,
            },
          })));
        }
        await Set.deleteMany({ liftId: id, userId, index: { $gt: parsed.sets.length } });
        // Moved to another day: the old day's likes and comments go if nothing's left there
        if (previous.date.getTime() !== lift.date.getTime()) await removeReactionsIfEmpty(userId, previous.date);

        const sets = await Set.find({ liftId: id, userId }).lean();
        res.status(200).json({ success: true, data: serializeLift(lift, sets), censored: parsed.censored });
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
        await removeReactionsIfEmpty(userId, lift.date);
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
