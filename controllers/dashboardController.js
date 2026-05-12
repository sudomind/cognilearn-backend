const Document = require('../models/Document');
const { Flashcard, Quiz, ChatHistory } = require('../models/index');


// ─────────────────────────────────────────────
//  GET /api/dashboard/overview
// ─────────────────────────────────────────────
const getOverview = async (req, res, next) => {
  try {
    const userId = req.user._id;

    const [
      totalDocuments,
      totalFlashcards,
      favoritedFlashcards,
      totalQuizzes,
      completedQuizzes,
      recentDocuments,
      recentQuizzes,
    ] = await Promise.all([
      Document.countDocuments({ user: userId }),
      Flashcard.countDocuments({ user: userId }),
      Flashcard.countDocuments({ user: userId, favorited: true }),
      Quiz.countDocuments({ user: userId }),
      Quiz.countDocuments({ user: userId, status: 'completed' }),
      Document.find({ user: userId }).sort({ createdAt: -1 }).limit(5).select('-extractedText'),
      Quiz.find({ user: userId }).sort({ createdAt: -1 }).limit(5),
    ]);

    // Calculate average quiz score
    const quizScores = await Quiz.find({ user: userId, status: 'completed' })
      .select('latestScore latestTotal');

    const avgScore = quizScores.length
      ? Math.round(
          quizScores.reduce((acc, q) => acc + ((q.latestScore / q.latestTotal) * 100), 0)
          / quizScores.length
        )
      : null;

    res.json({
      success: true,
      stats: {
        totalDocuments,
        totalFlashcards,
        favoritedFlashcards,
        totalQuizzes,
        completedQuizzes,
        avgQuizScore: avgScore,
      },
      recentDocuments: recentDocuments.map(d => ({
        id:        d._id,
        name:      d.name,
        fileSize:  d.fileSize,
        pages:     d.pages,
        colorTag:  d.colorTag,
        createdAt: d.createdAt,
      })),
      recentQuizzes: recentQuizzes.map(q => ({
        id:           q._id,
        documentName: q.documentName,
        questionCount: q.questions.length,
        status:       q.status,
        bestScore:    q.bestScore,
        createdAt:    q.createdAt,
      })),
    });
  } catch (err) {
    next(err);
  }
};


// ─────────────────────────────────────────────
//  GET /api/dashboard/activity
// ─────────────────────────────────────────────
const getActivity = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const limit  = parseInt(req.query.limit) || 10;

    // Gather recent activity from multiple collections
    const [recentDocs, recentQuizzes, recentCards] = await Promise.all([
      Document.find({ user: userId }).sort({ createdAt: -1 }).limit(limit).select('name createdAt colorTag'),
      Quiz.find({ user: userId }).sort({ updatedAt: -1 }).limit(limit).select('documentName status latestScore latestTotal updatedAt'),
      Flashcard.find({ user: userId, reviewed: true }).sort({ lastReviewedAt: -1 }).limit(limit).select('front lastReviewedAt'),
    ]);

    // Merge and sort by timestamp
    const activity = [
      ...recentDocs.map(d => ({
        type:      'document_upload',
        icon:      '📄',
        label:     `Uploaded "${d.name}"`,
        timestamp: d.createdAt,
        meta:      { colorTag: d.colorTag },
      })),
      ...recentQuizzes.filter(q => q.status === 'completed').map(q => ({
        type:      'quiz_completed',
        icon:      '🧠',
        label:     `Completed quiz: "${q.documentName}"`,
        score:     q.latestScore !== null ? Math.round((q.latestScore / q.latestTotal) * 100) : null,
        timestamp: q.updatedAt,
      })),
      ...recentCards.map(c => ({
        type:      'flashcard_reviewed',
        icon:      '🃏',
        label:     `Reviewed: "${c.front.slice(0, 40)}..."`,
        timestamp: c.lastReviewedAt,
      })),
    ]
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, limit);

    res.json({ success: true, activity });
  } catch (err) {
    next(err);
  }
};


module.exports = { getOverview, getActivity };
