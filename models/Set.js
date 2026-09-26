import mongoose from 'mongoose'

const SetSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true
  },
  liftId: {
    type: String,
    required: true,
  },
  index: {
    type: Number,
    required: true,
  },
  rep: {
    type: Number,
    required: true
  },
  weight: {
    type: Number,
    required: true
  },
  metric: {
    type: String
  },
  rpe: {
    type: Number,
  },
}, { timestamps: true });

SetSchema.index({ liftId: 1, index: 1 });
SetSchema.index({ userId: 1 });

export default mongoose.models.Set || mongoose.model('Set', SetSchema)
