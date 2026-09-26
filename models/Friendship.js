import mongoose from 'mongoose';

// A friend request, which becomes a friendship once the addressee accepts
const FriendshipSchema = new mongoose.Schema({
  requesterId: {
    type: String,
    required: true
  },
  addresseeId: {
    type: String,
    required: true
  },
  // Both user ids, sorted, so a pair can only have one friendship either way round
  pair: {
    type: String,
    required: true,
    unique: true
  },
  status: {
    type: String,
    enum: ['pending', 'accepted'],
    default: 'pending'
  },
  acceptedAt: {
    type: Date
  },
}, { timestamps: true });

FriendshipSchema.index({ requesterId: 1, status: 1 });
FriendshipSchema.index({ addresseeId: 1, status: 1 });

export const pairKey = (a, b) => [a, b].sort().join('|');

export default mongoose.models.Friendship || mongoose.model('Friendship', FriendshipSchema)
