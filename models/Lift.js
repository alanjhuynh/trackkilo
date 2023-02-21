import mongoose from 'mongoose'

const LiftSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true
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
  note: {
    type: String
  },
  date: {
    type: Date,
    default: Date.now
  },
});

export default mongoose.models.Lift || mongoose.model('Lift', LiftSchema)