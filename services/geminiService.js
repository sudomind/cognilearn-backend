const { GoogleGenerativeAI } = require('@google/generative-ai');

// ======================================
// GEMINI CONFIGURATION
// ======================================

const genAI = new GoogleGenerativeAI(
  process.env.GEMINI_API_KEY
);

const MODEL_NAME = 'gemini-2.5-flash';

// ======================================
// MODEL HELPER
// ======================================

function getModel(config = {}) {
  return genAI.getGenerativeModel({
    model: MODEL_NAME,

    generationConfig: {
      temperature:
        config.temperature || 0.7,

      maxOutputTokens:
        config.maxOutputTokens || 2048,
    },
  });
}

// ======================================
// CONTENT LIMITER
// ======================================

function truncateContent(
  content,
  maxLength = 25000
) {

  if (!content) return '';

  return content.length > maxLength
    ? content.substring(0, maxLength)
    : content;
}

// ======================================
// SUMMARY GENERATION
// ======================================

async function generateSummary(
  content,
  documentName
) {

  const model = getModel({
    temperature: 0.5,
    maxOutputTokens: 2500,
  });

  const prompt = `
You are an elite AI study assistant helping university students prepare smarter and faster.

Analyze the following study material and create a HIGH-QUALITY educational summary.

DOCUMENT TITLE:
"${documentName}"

DOCUMENT CONTENT:
${truncateContent(content)}

IMPORTANT RULES:
- Use markdown formatting
- Use headings and subheadings
- Use bullet points
- Highlight important concepts in **bold**
- Explain difficult concepts simply
- Focus on exam-relevant topics
- Avoid generic introductions
- Make notes visually clean
- Include revision-friendly points
- Include formulas/theories if present
- Keep output practical and educational

OUTPUT FORMAT:

# 📘 Overview

Briefly explain what this document is about.

# 🧠 Core Concepts

Explain major concepts clearly.

# 📌 Important Definitions

List important terms and meanings.

# ⚡ Key Exam Points

Mention formulas, principles, theories, or concepts likely to appear in exams.

# 📝 Quick Revision Notes

Provide short revision-friendly notes.

# 🎯 Final Takeaway

Summarize the most important learning outcome.
`;

  const result =
    await model.generateContent(prompt);

  return result.response.text();
}

// ======================================
// CONCEPT EXPLAINER
// ======================================

async function explainConcept(
  concept,
  content
) {

  const model = getModel({
    temperature: 0.8,
    maxOutputTokens: 1500,
  });

  const prompt = `
You are a smart, fun, modern AI tutor helping students understand concepts quickly.

TOPIC:
${concept}

DOCUMENT CONTENT:
${truncateContent(content, 12000)}

VERY IMPORTANT RULES:
- Keep explanation SHORT and EASY
- Explain in student-friendly language
- Avoid boring textbook tone
- Use fun analogies and real-life examples
- Use emojis naturally
- Add memory tricks if useful
- Focus on conceptual understanding
- Make it exam-friendly
- Use markdown formatting
- Keep things visually clean
- If suitable, generate mini diagrams or flowcharts

OUTPUT FORMAT:

# 🚀 What is it?

Explain in 3-5 simple lines.

# 😎 Real-Life Example

Give one relatable example.

# 🧠 Memory Trick

Help students remember it easily.

# 📌 Exam Tip

Mention what students should write in exams.

# 📊 Mini Diagram

Generate a tiny text-based diagram if possible.

Example:
Input -> Process -> Output
`;

  const result =
    await model.generateContent(prompt);

  return result.response.text();
}

// ======================================
// FLASHCARD GENERATION
// ======================================

async function generateFlashcards(
  content
) {

  const model = getModel({
    temperature: 0.5,
    maxOutputTokens: 3000,
  });

  const prompt = `
You are an AI flashcard generator for students.

Generate highly useful educational flashcards from this study material.

DOCUMENT CONTENT:
${truncateContent(content, 15000)}

IMPORTANT RULES:
- Return ONLY valid JSON
- Generate EXACTLY 10 flashcards
- Focus on important concepts
- Keep answers concise
- Make cards revision-friendly
- Prioritize exam-relevant topics
- Questions should be clear and direct

FORMAT:
[
  {
    "question": "Question here",
    "answer": "Answer here"
  }
]
`;

  const result =
    await model.generateContent(prompt);

  const text =
    result.response.text();

  try {

    return JSON.parse(
      text.replace(/```json|```/g, '')
    );

  } catch (err) {

    console.error(
      'Flashcard Parse Error:',
      err
    );

    return [];
  }
}

// ======================================
// QUIZ GENERATION
// ======================================

async function generateQuiz(
  content
) {

  const model = getModel({
    temperature: 0.6,
    maxOutputTokens: 3500,
  });

  const prompt = `
You are an intelligent AI quiz generator.

Create a student-friendly multiple-choice quiz from this study material.

DOCUMENT CONTENT:
${truncateContent(content, 15000)}

IMPORTANT RULES:
- Return ONLY valid JSON
- Generate EXACTLY 10 MCQs
- Include Easy, Medium, and Hard questions
- Each question must contain:
  - question
  - options
  - correctAnswer
  - explanation
  - difficulty
- Make questions educational and exam-focused

FORMAT:
[
  {
    "question": "Question here",
    "options": [
      "A",
      "B",
      "C",
      "D"
    ],
    "correctAnswer": "A",
    "difficulty": "Easy",
    "explanation": "Why this answer is correct"
  }
]
`;

  const result =
    await model.generateContent(prompt);

  const text =
    result.response.text();

  try {

    return JSON.parse(
      text.replace(/```json|```/g, '')
    );

  } catch (err) {

    console.error(
      'Quiz Parse Error:',
      err
    );

    return [];
  }
}

// ======================================
// DOCUMENT CHAT
// ======================================

async function chatWithDocument(
  question,
  content
) {

  const model = getModel({
    temperature: 0.7,
    maxOutputTokens: 1800,
  });

  const prompt = `
You are an intelligent AI tutor helping students learn from documents.

DOCUMENT CONTENT:
${truncateContent(content, 18000)}

STUDENT QUESTION:
${question}

VERY IMPORTANT RULES:
- Answer conversationally
- Be educational but natural
- Avoid robotic tone
- Use markdown formatting
- Use examples if useful
- Stay grounded in the document
- Explain difficult ideas simply
- Use diagrams/flowcharts if relevant
- Make responses student-friendly

OUTPUT FORMAT:

# 💬 Answer

# 📌 Key Insight

# 🎯 Exam Perspective

# 📊 Diagram (if useful)
`;

  const result =
    await model.generateContent(prompt);

  return result.response.text();
}

// ======================================
// EXPORTS
// ======================================

module.exports = {
  generateSummary,
  explainConcept,
  generateFlashcards,
  generateQuiz,
  chatWithDocument,
};
