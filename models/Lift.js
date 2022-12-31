import mongoose from 'mongoose'

const LiftSchema = new mongoose.Schema({
  userId: {
    type: Number,
  },
  name: {
    type: String,
    required: true
  },
  set: {
    type: Number,
    required: true
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
  note: {
    type: String
  },
  date: {
    type: Date,
    default: Date.now
  },
});

export default mongoose.models.Lift || mongoose.model('Lift', LiftSchema)