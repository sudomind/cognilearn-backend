const mongoose = require('mongoose');

// ─────────────────────────────────────────────
//  FLASHCARD MODEL
// ─────────────────────────────────────────────
const flashcardSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    document: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Document',
      required: true,
    },
    front: {
      type: String,
      required: [true, 'Front of flashcard is required'],
      trim: true,
    },
    back: {
      type: String,
      required: [true, 'Back of flashcard is required'],
      trim: true,
    },
    favorited: {
      type: Boolean,
      default: false,
    },
    reviewed: {
      type: Boolean,
      default: false,
    },
    reviewCount: {
      type: Number,
      default: 0,
    },
    lastReviewedAt: {
      type: Date,
      default: null,
    },
    // Spaced repetition difficulty (1-5)
    difficulty: {
      type: Number,
      min: 1,
      max: 5,
      default: 3,
    },
  },
  { timestamps: true }
);

flashcardSchema.index({ user: 1, document: 1 });
flashcardSchema.index({ user: 1, favorited: 1 });

const Flashcard = mongoose.model('Flashcard', flashcardSchema);


// ─────────────────────────────────────────────
//  QUIZ MODEL
// ─────────────────────────────────────────────
const questionSchema = new mongoose.Schema(
  {
    question:    { type: String, required: true },
    options:     [{ type: String, required: true }],
    correct:     { type: Number, required: true, min: 0, max: 3 },
    explanation: { type: String, default: '' },
  },
  { _id: false }
);

const attemptSchema = new mongoose.Schema(
  {
    answers:     [{ type: Number }], // user's selected option indices
    score:       { type: Number, required: true },
    total:       { type: Number, required: true },
    percentage:  { type: Number, required: true },
    timeTaken:   { type: Number, default: 0 }, // seconds
    completedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const quizSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    document: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Document',
      required: true,
    },
    documentName: {
      type: String,
      required: true,
    },
    questions: {
      type: [questionSchema],
      validate: {
        validator: (q) => q.length >= 1 && q.length <= 20,
        message: 'Quiz must have between 1 and 20 questions',
      },
    },
    // Latest attempt summary (for quick stats)
    latestScore:   { type: Number, default: null },
    latestTotal:   { type: Number, default: null },
    attempts:      [attemptSchema],
    attemptCount:  { type: Number, default: 0 },
    bestScore:     { type: Number, default: null },
    status: {
      type: String,
      enum: ['pending', 'completed'],
      default: 'pending',
    },
  },
  { timestamps: true }
);

quizSchema.index({ user: 1, createdAt: -1 });

const Quiz = mongoose.model('Quiz', quizSchema);


// ─────────────────────────────────────────────
//  CHAT HISTORY MODEL
// ─────────────────────────────────────────────
const messageSchema = new mongoose.Schema(
  {
    role: {
      type: String,
      enum: ['user', 'assistant'],
      required: true,
    },
    content: {
      type: String,
      required: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const chatHistorySchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    document: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Document',
      required: true,
    },
    messages: {
      type: [messageSchema],
      default: [],
    },
    messageCount: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

chatHistorySchema.index({ user: 1, document: 1 }, { unique: true });

const ChatHistory = mongoose.model('ChatHistory', chatHistorySchema);


module.exports = { Flashcard, Quiz, ChatHistory };
