const mongoose = require('mongoose');

const documentSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Document name is required'],
      trim: true,
    },
    originalName: {
      type: String,
      required: true,
    },
    filePath: {
      type: String,
      required: true,
    },
    fileSize: {
      type: Number, // bytes
      required: true,
    },
    mimeType: {
      type: String,
      default: 'application/pdf',
    },
    pages: {
      type: Number,
      default: 0,
    },
    // Extracted text content (used as AI context)
    extractedText: {
      type: String,
      default: '',
      select: false, // Only fetch when explicitly needed
    },
    textLength: {
      type: Number,
      default: 0,
    },
    // AI-generated content
    summary: {
      type: String,
      default: null,
    },
    // Processing state
    processingStatus: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'failed'],
      default: 'pending',
    },
    processingError: {
      type: String,
      default: null,
    },
    // UI color tag
    colorTag: {
      type: String,
      enum: ['indigo', 'emerald', 'violet', 'amber', 'rose'],
      default: 'indigo',
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
  }
);

// ─── Virtual: file URL ─────────────────────
documentSchema.virtual('fileUrl').get(function () {
  return `/uploads/${this.filePath.split('/').pop()}`;
});

// ─── Index for user's documents ────────────
documentSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model('Document', documentSchema);
