import mongoose from 'mongoose';

// A comment on a workout: everything one person logged on one day (their entries share `date`)
const WorkoutCommentSchema = new mongoose.Schema({
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
  text: {
    type: String,
    required: true
  },
}, { timestamps: true });

WorkoutCommentSchema.index({ ownerId: 1, date: 1, createdAt: 1 });

export default mongoose.models.WorkoutComment || mongoose.model('WorkoutComment', WorkoutCommentSchema)
