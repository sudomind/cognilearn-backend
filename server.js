require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path');

const connectDB = require('./config/database');
const { errorHandler, notFound } = require('./middleware/errorMiddleware');

// Route imports
const authRoutes = require('./routes/authRoutes');
const documentRoutes = require('./routes/documentRoutes');
const aiRoutes = require('./routes/aiRoutes');
const flashcardRoutes = require('./routes/flashcardRoutes');
const quizRoutes = require('./routes/quizRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// ─── Connect Database ──────────────────────
connectDB();

// ─── Security Middleware ───────────────────
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

// ─── CORS ─────────────────────────────────
app.use(cors({
  origin: "*",
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// ─── Global Rate Limiter ───────────────────
const globalLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  message: { success: false, message: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(globalLimiter);

// ─── AI-specific Rate Limiter ──────────────
const aiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: parseInt(process.env.AI_RATE_LIMIT_MAX) || 20,
  message: { success: false, message: 'AI request limit reached. Please wait before generating more content.' },
});

// ─── Body Parsing ──────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ─── Logging ──────────────────────────────
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// ─── Static Files (uploaded PDFs) ─────────
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ─── Health Check ─────────────────────────
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'CogniLearn API is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
  });
});
// ─── Root Route ───────────────────────────
app.get('/', (req, res) => {
  res.send('CogniLearn API Running');
});
// ─── API Routes ───────────────────────────
app.use('/api/auth',       authRoutes);
app.use('/api/documents',  documentRoutes);
app.use('/api/ai',         aiLimiter, aiRoutes);
app.use('/api/flashcards', flashcardRoutes);
app.use('/api/quizzes',    quizRoutes);
app.use('/api/dashboard',  dashboardRoutes);

// ─── Error Handling ───────────────────────
app.use(notFound);
app.use(errorHandler);

// ─── Start Server ─────────────────────────
app.listen(PORT, () => {
  console.log(`\n🚀 CogniLearn API running on http://localhost:${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV}`);
  console.log(`🗄️ MongoDB Connected\n`);
});

module.exports = app;
