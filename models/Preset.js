import mongoose from 'mongoose'

const PresetSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true
  },
  liftIds:{
    type: [Number],
    default: [],
  },
  name: {
    type: String,
    required: true
  },
}, { timestamps: true });

export default mongoose.models.Preset || mongoose.model('Preset', PresetSchema)