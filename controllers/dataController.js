const {
  Flashcard,
  Quiz,
} = require("../models/index");


// ======================================
// FLASHCARD CONTROLLER
// ======================================

// GET /api/flashcards
const getFlashcards =
  async (
    req,
    res,
    next
  ) => {

    try {

      const query = {
        user:
          req.user._id,
      };

      if (
        req.query.docId
      ) {
        query.document =
          req.query.docId;
      }

      if (
        req.query
          .favorited ===
        "true"
      ) {
        query.favorited =
          true;
      }

      const flashcards =
        await Flashcard.find(
          query
        )
          .sort({
            createdAt: -1,
          })
          .populate(
            "document",
            "name colorTag"
          );

      res.json({

        success: true,

        count:
          flashcards.length,

        flashcards:
          flashcards.map(
            formatFlashcard
          ),
      });

    } catch (err) {

      next(err);
    }
  };


// PATCH /api/flashcards/:id/favorite
const toggleFavorite =
  async (
    req,
    res,
    next
  ) => {

    try {

      const card =
        await Flashcard.findOne({

          _id:
            req.params.id,

          user:
            req.user._id,
        });

      if (!card) {

        return res.status(404)
          .json({

            success:
              false,

            message:
              "Flashcard not found.",
          });
      }

      card.favorited =
        !card.favorited;

      await card.save();

      res.json({

        success: true,

        favorited:
          card.favorited,
      });

    } catch (err) {

      next(err);
    }
  };


// PATCH /api/flashcards/:id/review
const markReviewed =
  async (
    req,
    res,
    next
  ) => {

    try {

      const {
        difficulty,
      } = req.body;

      const card =
        await Flashcard.findOneAndUpdate(

          {
            _id:
              req.params.id,

            user:
              req.user._id,
          },

          {
            $set: {

              reviewed:
                true,

              lastReviewedAt:
                new Date(),

              difficulty:
                difficulty ||
                3,
            },

            $inc: {
              reviewCount: 1,
            },
          },

          {
            new: true,
          }
        );

      if (!card) {

        return res.status(404)
          .json({

            success:
              false,

            message:
              "Flashcard not found.",
          });
      }

      res.json({

        success: true,

        flashcard:
          formatFlashcard(
            card
          ),
      });

    } catch (err) {

      next(err);
    }
  };


// DELETE /api/flashcards/:id
const deleteFlashcard =
  async (
    req,
    res,
    next
  ) => {

    try {

      const card =
        await Flashcard.findOneAndDelete({

          _id:
            req.params.id,

          user:
            req.user._id,
        });

      if (!card) {

        return res.status(404)
          .json({

            success:
              false,

            message:
              "Flashcard not found.",
          });
      }

      res.json({

        success: true,

        message:
          "Flashcard deleted.",
      });

    } catch (err) {

      next(err);
    }
  };


// ======================================
// FORMAT FLASHCARD
// ======================================

function formatFlashcard(
  f
) {

  return {

    id: f._id,

    documentId:
      f.document?._id ||
      f.document,

    documentName:
      f.document?.name,

    front:
      f.front,

    back:
      f.back,

    favorited:
      f.favorited,

    reviewed:
      f.reviewed,

    reviewCount:
      f.reviewCount,

    difficulty:
      f.difficulty,

    lastReviewedAt:
      f.lastReviewedAt,

    createdAt:
      f.createdAt,
  };
}


// ======================================
// QUIZ CONTROLLER
// ======================================

// GET /api/quizzes
const getQuizzes =
  async (
    req,
    res,
    next
  ) => {

    try {

      const query = {
        user:
          req.user._id,
      };

      if (
        req.query.docId
      ) {

        query.document =
          req.query.docId;
      }

      const quizzes =
        await Quiz.find(
          query
        ).sort({
          createdAt: -1,
        });

      res.json({

        success: true,

        count:
          quizzes.length,

        quizzes:
          quizzes.map(
            formatQuiz
          ),
      });

    } catch (err) {

      next(err);
    }
  };


// GET /api/quizzes/:id
const getQuiz =
  async (
    req,
    res,
    next
  ) => {

    try {

      const quiz =
        await Quiz.findOne({

          _id:
            req.params.id,

          user:
            req.user._id,
        });

      if (!quiz) {

        return res.status(404)
          .json({

            success:
              false,

            message:
              "Quiz not found.",
          });
      }

      res.json({

        success: true,

        quiz:
          formatQuiz(
            quiz
          ),
      });

    } catch (err) {

      next(err);
    }
  };


// ======================================
// SUBMIT QUIZ
// ======================================

// POST /api/quizzes/:id/submit
const submitQuiz =
  async (
    req,
    res,
    next
  ) => {

    try {

      const {
        answers,
        timeTaken = 0,
      } = req.body;

      if (
        !Array.isArray(
          answers
        )
      ) {

        return res.status(400)
          .json({

            success:
              false,

            message:
              "Answers array is required.",
          });
      }

      const quiz =
        await Quiz.findOne({

          _id:
            req.params.id,

          user:
            req.user._id,
        });

      if (!quiz) {

        return res.status(404)
          .json({

            success:
              false,

            message:
              "Quiz not found.",
          });
      }


      // ======================================
      // CALCULATE SCORE
      // ======================================

      let score = 0;

      answers.forEach(
        (
          answer,
          i
        ) => {

          const q =
            quiz.questions[
              i
            ];

          const correct =
            q.correctAnswer ??
            q.correct;

          if (
            answer ===
            correct
          ) {
            score++;
          }
        }
      );

      const total =
        quiz.questions
          .length;

      const percentage =
        Math.round(
          (
            score /
            total
          ) * 100
        );


      // ======================================
      // SAVE ATTEMPT
      // ======================================

      const attempt = {

        answers,

        score,

        total,

        percentage,

        timeTaken,

        completedAt:
          new Date(),
      };

      quiz.attempts.push(
        attempt
      );


      // ======================================
      // UPDATE STATS
      // ======================================

      quiz.attemptCount =
        quiz.attempts
          .length;

      quiz.latestScore =
        score;

      quiz.latestTotal =
        total;

      quiz.bestScore =
        Math.max(
          quiz.bestScore ||
            0,

          percentage
        );

      quiz.status =
        "completed";


      // FORCE UPDATE
      quiz.markModified(
        "attempts"
      );

      await quiz.save();


      res.json({

        success: true,

        result: {

          score,

          total,

          percentage,

          bestScore:
            quiz.bestScore,

          questions:
            quiz.questions,

          userAnswers:
            answers,
        },
      });

    } catch (err) {

      console.error(
        "SUBMIT QUIZ ERROR:",
        err
      );

      next(err);
    }
  };


// DELETE /api/quizzes/:id
const deleteQuiz =
  async (
    req,
    res,
    next
  ) => {

    try {

      const quiz =
        await Quiz.findOneAndDelete({

          _id:
            req.params.id,

          user:
            req.user._id,
        });

      if (!quiz) {

        return res.status(404)
          .json({

            success:
              false,

            message:
              "Quiz not found.",
          });
      }

      res.json({

        success: true,

        message:
          "Quiz deleted.",
      });

    } catch (err) {

      next(err);
    }
  };


// ======================================
// FORMAT QUIZ
// ======================================

function formatQuiz(q) {

  return {

    id:
      q._id,

    documentId:
      q.document,

    documentName:
      q.documentName,

    questions:
      q.questions,

    status:
      q.status,

    attemptCount:
      q.attemptCount,

    bestScore:
      q.bestScore,

    latestScore:
      q.latestScore,

    latestTotal:
      q.latestTotal,

    createdAt:
      q.createdAt,

    updatedAt:
      q.updatedAt,
  };
}


module.exports = {

  // Flashcards
  getFlashcards,

  toggleFavorite,

  markReviewed,

  deleteFlashcard,

  // Quizzes
  getQuizzes,

  getQuiz,

  submitQuiz,

  deleteQuiz,
};
