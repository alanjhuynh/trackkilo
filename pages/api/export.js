import dbConnect from '../../lib/dbConnect';
import Lift from '../../models/Lift';
import SetModel from '../../models/Set';
import { getUserId } from '../../lib/auth';
import { groupSetsByLift } from '../../lib/history';
import { serializeLift } from '../../lib/liftPayload';

// Every lift the user has, oldest first. The browser formats the file so
// dates come out in the user's timezone.
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ success: false });
  }

  const userId = await getUserId(req, res);
  if (!userId) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }

  await dbConnect();

  try {
    const [lifts, sets] = await Promise.all([
      Lift.find({ userId }).sort({ date: 1, createdAt: 1, _id: 1 }).lean(),
      SetModel.find({ userId }).lean(),
    ]);
    const setsByLift = groupSetsByLift(sets);
    res.status(200).json({
      success: true,
      data: lifts.map((lift) => serializeLift(lift, setsByLift[lift._id.toString()])),
    });
  } catch (error) {
    console.error('Export failed', error);
    res.status(500).json({ success: false });
  }
}
