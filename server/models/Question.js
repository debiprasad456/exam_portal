const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema(
  {
    subject: {
      type: String,
      required: true,
      enum: ['marketing', 'hr', 'digital_marketing', 'general_reasoning'],
    },
    questionText: {
      type: String,
      required: true,
      trim: true,
    },
    options: {
      type: [String],
      required: true,
      validate: {
        validator: (v) => v.length === 4,
        message: 'Exactly 4 options are required.',
      },
    },
    correctIndex: {
      type: Number,
      required: true,
      min: 0,
      max: 3,
    },
  },
  { timestamps: true }
);

questionSchema.index({ subject: 1, createdAt: 1 });

module.exports = mongoose.model('Question', questionSchema);
