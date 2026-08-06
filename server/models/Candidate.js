const mongoose = require('mongoose');

const candidateSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    phone: {
      type: String,
      required: true,
      trim: true,
    },
    subject: {
      type: String,
      required: true,
      enum: ['marketing', 'hr', 'digital_marketing', 'general_reasoning'],
    },
    hasSubmitted: {
      type: Boolean,
      default: false,
    },
    startedAt: {
      type: Date,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Candidate', candidateSchema);
