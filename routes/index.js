const express = require('express');
const { protect } = require('../middleware/errorMiddleware');
const { uploadMiddleware } = require('../middleware/uploadMiddleware');
const docCtrl  = require('../controllers/documentController');
const aiCtrl   = require('../controllers/aiController');
const dataCtrl = require('../controllers/dataController');
const dashCtrl = require('../controllers/dashboardController');


// ─────────────────────────────────────────────
//  DOCUMENT ROUTES  —  /api/documents
// ─────────────────────────────────────────────
const documentRouter = express.Router();
documentRouter.use(protect);

documentRouter.get('/',              docCtrl.getDocuments);
documentRouter.post('/upload',       uploadMiddleware, docCtrl.uploadDocument);
documentRouter.get('/:id',           docCtrl.getDocument);
documentRouter.get('/:id/content',   docCtrl.getDocumentContent);
documentRouter.delete('/:id',        docCtrl.deleteDocument);


// ─────────────────────────────────────────────
//  AI ROUTES  —  /api/ai  (rate-limited at server.js)
// ─────────────────────────────────────────────
const aiRouter = express.Router();
aiRouter.use(protect);

aiRouter.post('/:docId/summary',       aiCtrl.generateSummary);
aiRouter.post('/:docId/explain',       aiCtrl.explainConcept);
aiRouter.post('/:docId/flashcards',    aiCtrl.generateFlashcards);
aiRouter.post('/:docId/quiz',          aiCtrl.generateQuiz);
aiRouter.post('/:docId/chat',          aiCtrl.chat);
aiRouter.get('/:docId/chat/history',   aiCtrl.getChatHistory);
aiRouter.delete('/:docId/chat/history', aiCtrl.clearChatHistory);


// ─────────────────────────────────────────────
//  FLASHCARD ROUTES  —  /api/flashcards
// ─────────────────────────────────────────────
const flashcardRouter = express.Router();
flashcardRouter.use(protect);

flashcardRouter.get('/',                  dataCtrl.getFlashcards);
flashcardRouter.patch('/:id/favorite',    dataCtrl.toggleFavorite);
flashcardRouter.patch('/:id/review',      dataCtrl.markReviewed);
flashcardRouter.delete('/:id',            dataCtrl.deleteFlashcard);


// ─────────────────────────────────────────────
//  QUIZ ROUTES  —  /api/quizzes
// ─────────────────────────────────────────────
const quizRouter = express.Router();
quizRouter.use(protect);

quizRouter.get('/',              dataCtrl.getQuizzes);
quizRouter.get('/:id',           dataCtrl.getQuiz);
quizRouter.post('/:id/submit',   dataCtrl.submitQuiz);
quizRouter.delete('/:id',        dataCtrl.deleteQuiz);


// ─────────────────────────────────────────────
//  DASHBOARD ROUTES  —  /api/dashboard
// ─────────────────────────────────────────────
const dashboardRouter = express.Router();
dashboardRouter.use(protect);

dashboardRouter.get('/overview',  dashCtrl.getOverview);
dashboardRouter.get('/activity',  dashCtrl.getActivity);


module.exports = {
  documentRoutes:  documentRouter,
  aiRoutes:        aiRouter,
  flashcardRoutes: flashcardRouter,
  quizRoutes:      quizRouter,
  dashboardRoutes: dashboardRouter,
};
