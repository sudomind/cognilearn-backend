const Document = require('../models/Document');
const { Flashcard, Quiz, ChatHistory } = require('../models/index');
const gemini = require('../services/geminiService');


// ─── Helper: get document + extracted text ─────
async function getDocWithContent(docId, userId) {
  const doc = await Document.findOne({ _id: docId, user: userId }).select('+extractedText');
  if (!doc) throw Object.assign(new Error('Document not found.'), { statusCode: 404 });
  if (doc.processingStatus !== 'completed' || !doc.extractedText) {
    throw Object.assign(new Error('Document processing is not complete or text could not be extracted.'), { statusCode: 422 });
  }
  return doc;
}


// ─────────────────────────────────────────────
//  POST /api/ai/:docId/summary
// ─────────────────────────────────────────────
const generateSummary = async (req, res, next) => {
  try {
    const doc = await getDocWithContent(req.params.docId, req.user._id);

    const summary = await gemini.generateSummary(doc.extractedText, doc.name);

    // Persist summary on document
    await Document.findByIdAndUpdate(doc._id, { summary });

    res.json({ success: true, summary });
  } catch (err) {
    next(err);
  }
};


// ─────────────────────────────────────────────
//  POST /api/ai/:docId/explain
// ─────────────────────────────────────────────
const explainConcept = async (req, res, next) => {
  try {
    const { concept } = req.body;
    if (!concept?.trim()) {
      return res.status(400).json({ success: false, message: 'Concept is required.' });
    }

    const doc = await getDocWithContent(req.params.docId, req.user._id);
    const explanation = await gemini.explainConcept(concept.trim(), doc.extractedText);

    res.json({ success: true, concept: concept.trim(), explanation });
  } catch (err) {
    next(err);
  }
};


// ─────────────────────────────────────────────
//  POST /api/ai/:docId/flashcards
// ─────────────────────────────────────────────
const generateFlashcards = async (req, res, next) => {
  try {
    const count = Math.min(Math.max(parseInt(req.body.count) || 8, 4), 20);

    const doc = await getDocWithContent(req.params.docId, req.user._id);
    const cards = await gemini.generateFlashcards(doc.extractedText, count);

    if (!cards.length) {
      return res.status(500).json({ success: false, message: 'Failed to generate flashcards. Please try again.' });
    }

    // Delete existing flashcards for this doc, insert fresh set
    await Flashcard.deleteMany({ document: doc._id, user: req.user._id });

    const flashcards = await Flashcard.insertMany(
      cards.map(c => ({
        user:     req.user._id,
        document: doc._id,
        front:    c.front,
        back:     c.back,
      }))
    );

    res.json({
      success: true,
      count:   flashcards.length,
      flashcards: flashcards.map(formatFlashcard),
    });
  } catch (err) {
    next(err);
  }
};


// ─────────────────────────────────────────────
//  POST /api/ai/:docId/quiz
// ─────────────────────────────────────────────
const generateQuiz = async (req, res, next) => {
  try {
    const count = Math.min(Math.max(parseInt(req.body.count) || 5, 3), 15);

    const doc = await getDocWithContent(req.params.docId, req.user._id);
    const questions = await gemini.generateQuiz(doc.extractedText, count);

    if (!questions.length) {
      return res.status(500).json({ success: false, message: 'Failed to generate quiz. Please try again.' });
    }

    const quiz = await Quiz.create({
      user:         req.user._id,
      document:     doc._id,
      documentName: doc.name,
      questions,
    });

    res.status(201).json({
      success: true,
      quiz:    formatQuiz(quiz),
    });
  } catch (err) {
    next(err);
  }
};


// ─────────────────────────────────────────────
//  POST /api/ai/:docId/chat
// ─────────────────────────────────────────────
const chat = async (req, res, next) => {
  try {
    const { message } = req.body;
    if (!message?.trim()) {
      return res.status(400).json({ success: false, message: 'Message is required.' });
    }

    const doc = await getDocWithContent(req.params.docId, req.user._id);

    // Get or create chat history
    let chatHistory = await ChatHistory.findOne({
      user:     req.user._id,
      document: doc._id,
    });

    if (!chatHistory) {
      chatHistory = await ChatHistory.create({
        user:     req.user._id,
        document: doc._id,
      });
    }

    // Generate AI response
    const reply = await gemini.chatWithDocument(
      message.trim(),
      doc.extractedText,
      doc.name,
      chatHistory.messages.slice(-10) // Last 10 messages for context
    );

    // Append messages to history
    const timestamp = new Date();
    chatHistory.messages.push(
      { role: 'user',      content: message.trim(), timestamp },
      { role: 'assistant', content: reply,           timestamp: new Date() }
    );
    chatHistory.messageCount = chatHistory.messages.length;

    // Keep last 100 messages only
    if (chatHistory.messages.length > 100) {
      chatHistory.messages = chatHistory.messages.slice(-100);
    }

    await chatHistory.save();

    res.json({
      success: true,
      message: reply,
      history: chatHistory.messages.slice(-2),
    });
  } catch (err) {
    next(err);
  }
};


// ─────────────────────────────────────────────
//  GET /api/ai/:docId/chat/history
// ─────────────────────────────────────────────
const getChatHistory = async (req, res, next) => {
  try {
    const chatHistory = await ChatHistory.findOne({
      user:     req.user._id,
      document: req.params.docId,
    });

    res.json({
      success:  true,
      messages: chatHistory?.messages || [],
      count:    chatHistory?.messageCount || 0,
    });
  } catch (err) {
    next(err);
  }
};


// ─────────────────────────────────────────────
//  DELETE /api/ai/:docId/chat/history
// ─────────────────────────────────────────────
const clearChatHistory = async (req, res, next) => {
  try {
    await ChatHistory.findOneAndUpdate(
      { user: req.user._id, document: req.params.docId },
      { messages: [], messageCount: 0 }
    );
    res.json({ success: true, message: 'Chat history cleared.' });
  } catch (err) {
    next(err);
  }
};


// ─── Formatters ────────────────────────────────
function formatFlashcard(f) {
  return {
    id:             f._id,
    front:          f.front,
    back:           f.back,
    favorited:      f.favorited,
    reviewed:       f.reviewed,
    reviewCount:    f.reviewCount,
    lastReviewedAt: f.lastReviewedAt,
    createdAt:      f.createdAt,
  };
}

function formatQuiz(q) {
  return {
    id:           q._id,
    documentId:   q.document,
    documentName: q.documentName,
    questions:    q.questions,
    status:       q.status,
    attemptCount: q.attemptCount,
    bestScore:    q.bestScore,
    latestScore:  q.latestScore,
    latestTotal:  q.latestTotal,
    createdAt:    q.createdAt,
  };
}


module.exports = {
  generateSummary,
  explainConcept,
  generateFlashcards,
  generateQuiz,
  chat,
  getChatHistory,
  clearChatHistory,
};
