const mongoose = require('mongoose');

const answerSchema = new mongoose.Schema(
  {
    questionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Question' },
    questionText: String,
    options: [String],
    selectedIndex: { type: Number, default: -1 }, // -1 = not answered
    correctIndex: Number,
    isCorrect: Boolean,
  },
  { _id: false }
);

const resultSchema = new mongoose.Schema(
  {
    candidate: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Candidate',
      required: true,
    },
    subject: {
      type: String,
      required: true,
      enum: ['marketing', 'hr', 'digital_marketing', 'general_reasoning'],
    },
    sessionId: {
      type: String,
      required: true,
    },
    answers: [answerSchema],
    score: { type: Number, default: 0 },
    totalQuestions: { type: Number, default: 0 },
    percentage: { type: Number, default: 0 },
  },
  { timestamps: true }
);

resultSchema.index({ candidate: 1 }, { unique: true });
resultSchema.index({ subject: 1, percentage: -1 });

module.exports = mongoose.model('Result', resultSchema);
