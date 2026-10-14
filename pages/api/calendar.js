import dbConnect from '../../lib/dbConnect';
import Lift from '../../models/Lift';
import { getUserId } from '../../lib/auth';

const MAX_RANGE_MS = 62 * 24 * 60 * 60 * 1000;

/**
 * Which kinds of entries you logged on each date in a range, for the calendar.
 * GET ?from=ISO&to=ISO (up to about two months). The browser maps the dates to
 * its own calendar days.
 *
 * Returns [{ date, kinds: ['lift', 'run', …], count }]
 */
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ success: false });
  }

  const userId = await getUserId(req, res);
  if (!userId) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }

  const from = new Date(req.query.from);
  const to = new Date(req.query.to);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || to <= from || to - from > MAX_RANGE_MS) {
    return res.status(400).json({ success: false, message: 'Invalid date range' });
  }

  await dbConnect();

  try {
    const days = await Lift.aggregate([
      { $match: { userId, date: { $gte: from, $lt: to } } },
      {
        $group: {
          _id: '$date',
          kinds: { $addToSet: { $ifNull: ['$kind', 'lift'] } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);
    res.status(200).json({
      success: true,
      data: days.map((d) => ({ date: d._id.toISOString(), kinds: d.kinds, count: d.count })),
    });
  } catch (error) {
    console.error('Calendar API error:', error);
    res.status(500).json({ success: false });
  }
}
