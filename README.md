# 🧠 CogniLearn — AI-Powered Learning Platform

> A full-stack SaaS platform where students upload PDFs, chat with documents, generate quizzes, flashcards, and track learning progress — powered by Google Gemini AI.

---

## 📁 Project Structure

```
cognilearn-backend/
├── server.js                  # Express entry point
├── .env.example               # Environment variable template
├── package.json
│
├── config/
│   └── database.js            # MongoDB connection
│
├── models/
│   ├── User.js                # User schema + password hashing
│   ├── Document.js            # PDF document schema
│   └── index.js               # Flashcard, Quiz, ChatHistory schemas
│
├── controllers/
│   ├── authController.js      # Register, login, profile, password
│   ├── documentController.js  # Upload, list, delete documents
│   ├── aiController.js        # All Gemini AI endpoints
│   ├── dataController.js      # Flashcard + Quiz CRUD
│   └── dashboardController.js # Stats + activity feed
│
├── routes/
│   ├── authRoutes.js
│   ├── documentRoutes.js
│   ├── aiRoutes.js
│   ├── flashcardRoutes.js
│   ├── quizRoutes.js
│   └── dashboardRoutes.js
│
├── middleware/
│   ├── errorMiddleware.js     # JWT auth + global error handler
│   └── uploadMiddleware.js    # Multer PDF upload
│
├── services/
│   ├── geminiService.js       # Gemini AI integration (all prompts)
│   └── pdfService.js          # PDF text extraction
│
└── uploads/                   # Uploaded PDF files (gitignored)
```

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- MongoDB (local or Atlas)
- Google Gemini API key

### 1. Install Dependencies
```bash
cd cognilearn-backend
npm install
```

### 2. Configure Environment
```bash
cp .env.example .env
```

Edit `.env`:
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/cognilearn
JWT_SECRET=your_super_secret_key_here
GEMINI_API_KEY=your_gemini_api_key
FRONTEND_URL=http://localhost:5173
```

### 3. Start the Server
```bash
# Development (with auto-reload)
npm run dev

# Production
npm start
```

Server runs at: `http://localhost:5000`

---

## 🌐 API Reference

### Base URL
```
http://localhost:5000/api
```

### Authentication
All protected routes require:
```
Authorization: Bearer <jwt_token>
```

---

### 🔐 Auth Endpoints

| Method | Route | Description | Auth |
|--------|-------|-------------|------|
| POST | `/auth/register` | Create account | — |
| POST | `/auth/login` | Sign in | — |
| GET | `/auth/profile` | Get current user | ✅ |
| PUT | `/auth/profile` | Update name/preferences | ✅ |
| PUT | `/auth/password` | Change password | ✅ |

**Register:**
```json
POST /api/auth/register
{
  "name": "Alex Johnson",
  "email": "alex@example.com",
  "password": "securepass123"
}
```

**Login:**
```json
POST /api/auth/login
{
  "email": "alex@example.com",
  "password": "securepass123"
}
```

---

### 📄 Document Endpoints

| Method | Route | Description | Auth |
|--------|-------|-------------|------|
| POST | `/documents/upload` | Upload PDF (multipart/form-data) | ✅ |
| GET | `/documents` | List all documents | ✅ |
| GET | `/documents/:id` | Get single document | ✅ |
| GET | `/documents/:id/content` | Get extracted text | ✅ |
| DELETE | `/documents/:id` | Delete document | ✅ |

**Upload PDF:**
```bash
curl -X POST http://localhost:5000/api/documents/upload \
  -H "Authorization: Bearer TOKEN" \
  -F "pdf=@/path/to/document.pdf" \
  -F "name=My Study Guide"
```

---

### 🤖 AI Endpoints

| Method | Route | Description |
|--------|-------|-------------|
| POST | `/ai/:docId/summary` | Generate document summary |
| POST | `/ai/:docId/explain` | Explain a concept |
| POST | `/ai/:docId/flashcards` | Generate flashcards |
| POST | `/ai/:docId/quiz` | Generate MCQ quiz |
| POST | `/ai/:docId/chat` | Chat with document |
| GET | `/ai/:docId/chat/history` | Get chat history |
| DELETE | `/ai/:docId/chat/history` | Clear chat history |

**Generate Flashcards:**
```json
POST /api/ai/:docId/flashcards
{ "count": 10 }
```

**Generate Quiz:**
```json
POST /api/ai/:docId/quiz
{ "count": 8 }
```

**Explain Concept:**
```json
POST /api/ai/:docId/explain
{ "concept": "gradient descent" }
```

**Chat:**
```json
POST /api/ai/:docId/chat
{ "message": "What are the key takeaways?" }
```

---

### 🃏 Flashcard Endpoints

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/flashcards` | Get all flashcards |
| GET | `/flashcards?docId=ID` | Get flashcards for document |
| GET | `/flashcards?favorited=true` | Get favorited cards |
| PATCH | `/flashcards/:id/favorite` | Toggle favorite |
| PATCH | `/flashcards/:id/review` | Mark as reviewed |
| DELETE | `/flashcards/:id` | Delete flashcard |

---

### 🧠 Quiz Endpoints

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/quizzes` | Get all quizzes |
| GET | `/quizzes/:id` | Get single quiz |
| POST | `/quizzes/:id/submit` | Submit quiz answers |
| DELETE | `/quizzes/:id` | Delete quiz |

**Submit Quiz:**
```json
POST /api/quizzes/:id/submit
{
  "answers": [0, 2, 1, 3, 0],
  "timeTaken": 145
}
```

---

### 📊 Dashboard Endpoints

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/dashboard/overview` | Stats overview |
| GET | `/dashboard/activity` | Recent activity feed |

---

## 🗄️ Database Schemas

### User
```
name, email, password (hashed), preferences, stats.lastActive, timestamps
```

### Document
```
user (ref), name, filePath, fileSize, pages, extractedText,
summary, processingStatus, colorTag, timestamps
```

### Flashcard
```
user (ref), document (ref), front, back, favorited,
reviewed, reviewCount, difficulty, lastReviewedAt, timestamps
```

### Quiz
```
user (ref), document (ref), documentName, questions[],
attempts[], latestScore, bestScore, status, timestamps
```

### ChatHistory
```
user (ref), document (ref), messages[], messageCount, timestamps
```

---

## 🔗 Connecting Frontend to Backend

In your React app's `src/services/`, update the API base URL:

```typescript
// src/services/api.ts
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:5000/api',
});

api.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default api;
```

Then replace the mock calls in `aiService.ts` with real API calls:
```typescript
// Generate quiz via backend
export const generateQuiz = (docId: string, count: number) =>
  api.post(`/ai/${docId}/quiz`, { count }).then(r => r.data.quiz);
```

---

## ☁️ Deployment

### Backend (Railway / Render / Fly.io)
1. Set all environment variables in dashboard
2. Set `MONGODB_URI` to your Atlas connection string
3. Deploy from GitHub

### Frontend (Vercel / Netlify)
1. Set `VITE_API_URL=https://your-backend.railway.app/api`
2. Update CORS `FRONTEND_URL` in backend env

### MongoDB Atlas (Free tier)
1. Create cluster at mongodb.com/atlas
2. Whitelist `0.0.0.0/0` for all IPs
3. Get connection string → paste in `MONGODB_URI`

---

## 🔑 Get API Keys

- **Gemini:** https://aistudio.google.com/app/apikey (free tier available)
- **MongoDB Atlas:** https://www.mongodb.com/atlas (free M0 cluster)

---

## 📦 Tech Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js 18+ |
| Framework | Express.js 4 |
| Database | MongoDB + Mongoose 8 |
| Authentication | JWT + bcryptjs |
| File Upload | Multer |
| PDF Parsing | pdf-parse |
| AI | Google Gemini 1.5 Flash |
| Security | Helmet, express-rate-limit |
| Validation | express-validator |
