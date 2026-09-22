const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema(
  {
    candidate: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Candidate',
      required: true,
      unique: true,
    },
    subject: {
      type: String,
      required: true,
      enum: ['marketing', 'hr', 'digital_marketing', 'general_reasoning'],
    },
    amount: {
      type: Number,
      required: true,
      default: 500,
    },
    screenshot: {
      type: String, // base64 data URL
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },
    rejectionReason: {
      type: String,
      default: '',
    },
    reviewedAt: {
      type: Date,
    },
  },
  { timestamps: true }
);

paymentSchema.index({ candidate: 1 }, { unique: true });
paymentSchema.index({ status: 1, createdAt: -1 });
paymentSchema.index({ subject: 1, status: 1 });

module.exports = mongoose.model('Payment', paymentSchema);
