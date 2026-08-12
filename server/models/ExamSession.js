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
      enum: ['marketing', 'hr', 'digital_marketing', 'general_reasoning'],
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

examSessionSchema.index({ subject: 1, status: 1, startedAt: -1 });
examSessionSchema.index({ subject: 1, status: 1, createdAt: -1 });

module.exports = mongoose.model('ExamSession', examSessionSchema);
