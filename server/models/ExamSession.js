const mongoose = require('mongoose');

const examSessionSchema = new mongoose.Schema(
  {
    sessionId: {
      type: String,
      required: true,
      unique: true,
    },
    subject: {
      type: String,
      required: true,
      enum: ['marketing', 'hr', 'digital_marketing'],
    },
    duration: {
      type: Number, // total duration in seconds
      required: true,
    },
    status: {
      type: String,
      enum: ['waiting', 'active', 'ended'],
      default: 'waiting',
    },
    startedAt: Date,
    endsAt: Date,
    endedAt: Date,
  },
  { timestamps: true }
);

module.exports = mongoose.model('ExamSession', examSessionSchema);
