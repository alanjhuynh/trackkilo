import mongoose from 'mongoose';

const LiftSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  set: {
    type: Number,
    required: true
  },
  rep: {
    type: Number,
    required: true
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
