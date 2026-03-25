import dbConnect from '../../lib/dbConnect';
import Lift from '../../models/Lift';
import SetModel from '../../models/Set';
import { getServerSession } from "next-auth/next";
import { authOptions } from './auth/[...nextauth]';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false });
  }

  await dbConnect();

  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const userId = session.userId;

    // Fetch all lifts and sets for this user
    const lifts = await Lift.find({ userId }).sort({ date: -1 }).lean();
    const sets = await SetModel.find({ userId }).lean();

    // Build a map of sets by liftId
    const setsByLiftId = {};
    sets.forEach((set) => {
      if (!setsByLiftId[set.liftId]) {
        setsByLiftId[set.liftId] = [];
      }
      setsByLiftId[set.liftId].push(set);
    });

    // --- Summary stats ---
    const totalLifts = lifts.length;
    const totalSets = sets.length;

    // Total volume (weight × reps for each set)
    let totalVolume = 0;
    sets.forEach((set) => {
      totalVolume += (set.weight || 0) * (set.rep || 0);
    });

    // Unique workout days
    const uniqueDays = {};
    lifts.forEach((l) => {
      uniqueDays[new Date(l.date).toISOString().split('T')[0]] = true;
    });
    const totalWorkouts = Object.keys(uniqueDays).length;

    // --- Exercise frequency ---
    const exerciseFrequency = {};
    lifts.forEach((lift) => {
      const name = lift.name.trim();
      exerciseFrequency[name] = (exerciseFrequency[name] || 0) + 1;
    });

    // Sort by frequency descending, take top 10
    const topExercises = Object.entries(exerciseFrequency)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name, count]) => ({ name, count }));

    // --- Personal records (heaviest weight per exercise) ---
    const prMap = {};
    lifts.forEach((lift) => {
      const name = lift.name.trim();
      const liftSets = setsByLiftId[lift._id.toString()] || [];
      liftSets.forEach((set) => {
        if (!prMap[name] || set.weight > prMap[name].weight) {
          prMap[name] = {
            weight: set.weight,
            metric: set.metric || 'lb',
            reps: set.rep,
            date: lift.date,
          };
        }
      });
    });

    const personalRecords = Object.entries(prMap)
      .map(([name, record]) => ({ name, ...record }))
      .sort((a, b) => b.weight - a.weight);

    // --- Volume over time (weekly totals) ---
    const weeklyVolume = {};
    lifts.forEach((lift) => {
      const liftSets = setsByLiftId[lift._id.toString()] || [];
      const date = new Date(lift.date);
      // Get Monday of the week
      const day = date.getDay();
      const diff = date.getDate() - day + (day === 0 ? -6 : 1);
      const monday = new Date(date);
      monday.setDate(diff);
      const weekKey = monday.toISOString().split('T')[0];

      if (!weeklyVolume[weekKey]) {
        weeklyVolume[weekKey] = 0;
      }
      liftSets.forEach((set) => {
        weeklyVolume[weekKey] += (set.weight || 0) * (set.rep || 0);
      });
    });

    // Sort by date and take last 12 weeks
    const volumeOverTime = Object.entries(weeklyVolume)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-12)
      .map(([week, volume]) => ({ week, volume }));

    // --- Workouts per week ---
    const workoutsPerWeek = {};
    lifts.forEach((lift) => {
      const date = new Date(lift.date);
      const day = date.getDay();
      const diff = date.getDate() - day + (day === 0 ? -6 : 1);
      const monday = new Date(date);
      monday.setDate(diff);
      const weekKey = monday.toISOString().split('T')[0];
      const dateKey = date.toISOString().split('T')[0];

      if (!workoutsPerWeek[weekKey]) {
        workoutsPerWeek[weekKey] = {};
      }
      workoutsPerWeek[weekKey][dateKey] = true;
    });

    const workoutFrequency = Object.entries(workoutsPerWeek)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-12)
      .map(([week, days]) => ({ week, count: Object.keys(days).length }));

    res.status(200).json({
      success: true,
      data: {
        totalLifts,
        totalSets,
        totalVolume,
        totalWorkouts,
        topExercises,
        personalRecords,
        volumeOverTime,
        workoutFrequency,
      },
    });
  } catch (error) {
    console.error('Stats API error:', error);
    res.status(500).json({ success: false });
  }
}
