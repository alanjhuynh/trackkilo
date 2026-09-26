import mongoose from 'mongoose';
import { CARDIO_KEYS, DISTANCE_UNITS } from '../lib/activities';

// A log entry: a lift (with Set documents) or a run, walk or ride
const isLift = function isLift() {
  return !CARDIO_KEYS.includes(this.kind);
};

const LiftSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true
  },
  // "run", "walk" or "ride"; missing on lifts
  kind: {
    type: String,
    enum: CARDIO_KEYS
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  set: {
    type: Number,
    required: isLift
  },
  rep: {
    type: Number,
    required: isLift
  },
  // Runs, walks and rides
  distance: {
    type: Number
  },
  distanceUnit: {
    type: String,
    enum: DISTANCE_UNITS
  },
  duration: {
    type: Number // seconds
  },
  note: {
    type: String
  },
  date: {
    type: Date,
    default: Date.now,
  },
}, { timestamps: true });

// Matches the log's sort order and cursor pagination
LiftSchema.index({ userId: 1, date: -1, _id: -1 });

export default mongoose.models.Lift || mongoose.model('Lift', LiftSchema)
