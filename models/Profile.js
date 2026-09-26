import mongoose from 'mongoose';

// Public identity used by friends and the leaderboard
const ProfileSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    unique: true
  },
  // Lowercase handle friends search for, e.g. "alan_lifts"
  username: {
    type: String,
    required: true,
    unique: true
  },
  displayName: {
    type: String,
    required: true
  },
  image: {
    type: String
  },
}, { timestamps: true });

export default mongoose.models.Profile || mongoose.model('Profile', ProfileSchema)
