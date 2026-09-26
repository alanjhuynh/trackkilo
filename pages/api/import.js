import dbConnect from '../../lib/dbConnect';
import Lift from '../../models/Lift';
import SetModel from '../../models/Set';
import { getUserId } from '../../lib/auth';
import { groupSetsByLift } from '../../lib/history';
import { parseLiftPayload } from '../../lib/liftPayload';
import { IMPORT_BATCH_SIZE } from '../../lib/dataTransfer';
import { isCardio } from '../../lib/activities';

export const config = {
  api: { bodyParser: { sizeLimit: '2mb' } },
};

// Same day, name and sets (or distance and time) means it's the same entry
const signature = (lift, sets) => [
  new Date(lift.date).getTime(),
  lift.name.trim().toLowerCase(),
  ...(isCardio(lift)
    ? [lift.kind, `${lift.distance}${lift.distanceUnit}`, lift.duration]
    : sets.map((set) => `${set.weight}${set.metric || 'lb'}x${set.rep}`)),
].join('|');

/**
 * Saves a batch of lifts, runs, walks and rides (`{ lifts: [{ lift, sets }] }`,
 * the same shape as the lift form). Entries already in the log are skipped.
 *
 * Returns counts plus the index and reason for each lift that failed validation.
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ success: false });
  }

  const userId = await getUserId(req, res);
  if (!userId) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }

  const items = req.body?.lifts;
  if (!Array.isArray(items) || !items.length) {
    return res.status(400).json({ success: false, message: 'Nothing to import' });
  }
  if (items.length > IMPORT_BATCH_SIZE) {
    return res.status(400).json({ success: false, message: `Import at most ${IMPORT_BATCH_SIZE} lifts per request` });
  }

  const failed = [];
  const valid = [];
  let censored = false;
  items.forEach((item, index) => {
    const parsed = parseLiftPayload(item);
    if (parsed.error) {
      failed.push({ index, message: parsed.error });
      return;
    }
    censored ||= parsed.censored;
    valid.push(parsed);
  });

  await dbConnect();

  try {
    let duplicates = 0;
    let imported = 0;

    if (valid.length) {
      const dates = valid.map((item) => item.lift.date.getTime());
      const existing = await Lift.find({
        userId,
        date: { $gte: new Date(Math.min(...dates)), $lte: new Date(Math.max(...dates)) },
      }).select('kind name date distance distanceUnit duration').lean();
      const existingSets = groupSetsByLift(await SetModel.find({
        userId,
        liftId: { $in: existing.map((lift) => lift._id.toString()) },
      }).select('liftId index weight metric rep').lean());

      const seen = new Set(existing.map((lift) => signature(
        lift,
        (existingSets[lift._id.toString()] || []).sort((a, b) => a.index - b.index),
      )));

      const toInsert = valid.filter((item) => {
        const key = signature(item.lift, item.sets);
        if (seen.has(key)) {
          duplicates += 1;
          return false;
        }
        seen.add(key); // also skip repeats within this batch
        return true;
      });

      if (toInsert.length) {
        const lifts = await Lift.insertMany(toInsert.map((item) => ({ ...item.lift, userId })));
        const sets = lifts.flatMap((lift, i) => toInsert[i].sets.map((set) => ({
          ...set,
          userId,
          liftId: lift._id.toString(),
        })));
        if (sets.length) await SetModel.insertMany(sets);
        imported = lifts.length;
      }
    }

    res.status(200).json({ success: true, data: { imported, duplicates, failed, censored } });
  } catch (error) {
    console.error('Import failed', error);
    res.status(500).json({ success: false });
  }
}
