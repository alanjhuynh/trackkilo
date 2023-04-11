import mongoose from 'mongoose';
import moment from 'moment';

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
    default: moment().format('YYYY-MM-DD'),
  },
}, { timestamps: true });

LiftSchema.pre('save', function(next) {
  // save as UTC
  this.date = moment(this.date, 'YYYY-MM-DD').utc().format('YYYY-MM-DD HH:mm')
  next();
});

export default mongoose.models.Lift || mongoose.model('Lift', LiftSchema)