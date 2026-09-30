import mongoose from 'mongoose';

// A like on a workout: everything one person logged on one day (their entries share `date`)
const WorkoutLikeSchema = new mongoose.Schema({
  ownerId: {
    type: String,
    required: true
  },
  date: {
    type: Date,
    required: true
  },
  userId: {
    type: String,
    required: true
  },
}, { timestamps: true });

WorkoutLikeSchema.index({ ownerId: 1, date: 1, userId: 1 }, { unique: true });

export default mongoose.models.WorkoutLike || mongoose.model('WorkoutLike', WorkoutLikeSchema)
