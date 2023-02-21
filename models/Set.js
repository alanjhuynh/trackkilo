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
});

export default mongoose.models.Set || mongoose.model('Set', SetSchema)