import mongoose from 'mongoose';
import dbConnect from '../../../lib/dbConnect';
import Lift from '../../../models/Lift';
import Set from '../../../models/Set';
import { getUserId } from '../../../lib/auth';
import { parseLiftPayload, serializeLift } from '../../../lib/liftPayload';

const PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 50;

export default async function handler(req, res) {
  const userId = await getUserId(req, res);
  if (!userId) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }

  await dbConnect();

  switch (req.method) {
    case 'GET':
      try {
        const { before, beforeId } = req.query;
        const limit = Math.min(Number(req.query.limit) || PAGE_SIZE, MAX_PAGE_SIZE);
        const query = { userId };

        // Cursor pagination: continue after the last lift of the previous page.
        // Unlike page offsets, this doesn't skip or repeat lifts after adds/deletes.
        if (before && beforeId && mongoose.isValidObjectId(beforeId)) {
          const date = new Date(before);
          if (!Number.isNaN(date.getTime())) {
            query.$or = [
              { date: { $lt: date } },
              { date, _id: { $lt: new mongoose.Types.ObjectId(beforeId) } },
            ];
          }
        }

        const lifts = await Lift.find(query)
          .sort({ date: -1, _id: -1 })
          .limit(limit + 1)
          .lean();
        const hasMore = lifts.length > limit;
        const page = lifts.slice(0, limit);

        const sets = await Set.find({
          userId,
          liftId: { $in: page.map((lift) => lift._id.toString()) },
        }).lean();
        const setsByLift = {};
        sets.forEach((set) => {
          (setsByLift[set.liftId] ||= []).push(set);
        });

        res.status(200).json({
          success: true,
          data: page.map((lift) => serializeLift(lift, setsByLift[lift._id.toString()])),
          hasMore,
        });
      } catch (error) {
        console.error('Failed to get lifts', error);
        res.status(500).json({ success: false });
      }
      break;

    case 'POST': {
      const parsed = parseLiftPayload(req.body);
      if (parsed.error) {
        return res.status(400).json({ success: false, message: parsed.error });
      }

      try {
        const lift = await Lift.create({ ...parsed.lift, userId });
        // Runs, walks and rides have no sets
        const sets = parsed.sets.length
          ? await Set.insertMany(parsed.sets.map((set) => ({ ...set, userId, liftId: lift._id.toString() })))
          : [];
        res.status(201).json({ success: true, data: serializeLift(lift, sets), censored: parsed.censored });
      } catch (error) {
        console.error('Failed to create lift', error);
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
