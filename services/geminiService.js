const { GoogleGenerativeAI } = require('@google/generative-ai');

// ===============================
// Gemini Configuration
// ===============================

const genAI = new GoogleGenerativeAI(
  process.env.GEMINI_API_KEY
);

const MODEL_NAME = 'gemini-2.5-flash';

// ===============================
// Helpers
// ===============================

function getModel(config = {}) {
  return genAI.getGenerativeModel({
    model: MODEL_NAME,

    generationConfig: {
      temperature:
        config.temperature || 0.5,

      maxOutputTokens:
        config.maxOutputTokens ||
        2048,
    },
  });
}

function truncateContent(
  content,
  maxLength = 25000
) {
  if (!content) return '';

  return content.length >
    maxLength
    ? content.substring(
        0,
        maxLength
      )
    : content;
}

// ===============================
// SAFE JSON PARSER
// ===============================

function safeJsonParse(text) {

  try {

    const cleaned = text

      .replace(/```json/g, '')
      .replace(/```/g, '')
      .trim();

    const arrayStart =
      cleaned.indexOf('[');

    const arrayEnd =
      cleaned.lastIndexOf(']') + 1;

    const objectStart =
      cleaned.indexOf('{');

    const objectEnd =
      cleaned.lastIndexOf('}') + 1;

    let pureJson = cleaned;

    if (
      arrayStart !== -1 &&
      arrayEnd !== -1
    ) {

      pureJson = cleaned.slice(
        arrayStart,
        arrayEnd
      );

    } else if (
      objectStart !== -1 &&
      objectEnd !== -1
    ) {

      pureJson = cleaned.slice(
        objectStart,
        objectEnd
      );
    }

    return JSON.parse(
      pureJson
    );

  } catch (err) {

    console.error(
      'JSON Parse Error:',
      err
    );

    console.log(
      'RAW GEMINI RESPONSE:',
      text
    );

    return null;
  }
}

// ===============================
// SUMMARY GENERATION
// ===============================

async function generateSummary(
  content,
  documentName
) {

  const model = getModel({
    temperature: 0.5,
    maxOutputTokens: 2500,
  });

  const prompt = `
You are an elite AI study assistant helping university students revise for exams.

Analyze the study material carefully and create a PROFESSIONAL educational summary.

DOCUMENT TITLE:
"${documentName}"

DOCUMENT CONTENT:
${truncateContent(content)}

INSTRUCTIONS:
- Use markdown formatting
- Use headings and subheadings
- Use bullet points
- Highlight important concepts in **bold**
- Explain concepts in simple language
- Focus on exam-important concepts
- Avoid unnecessary introductions
- Keep output visually clean
- Make revision easier for students

FORMAT:

# 📘 Overview

# 🧠 Important Concepts

# 📌 Key Definitions

# ⚡ Important Exam Points

# 📝 Quick Revision Notes
`;

  const result =
    await model.generateContent(
      prompt
    );

  return result.response.text();
}

// ===============================
// CONCEPT EXPLAINER
// ===============================

async function explainConcept(
  concept,
  content
) {

  const model = getModel({
    temperature: 0.4,
    maxOutputTokens: 1800,
  });

  const prompt = `
You are a fun and intelligent AI tutor helping university students.

Explain the following concept in a SHORT, FUN, and EASY-TO-UNDERSTAND way.

CONCEPT:
"${concept}"

DOCUMENT CONTENT:
${truncateContent(content, 15000)}

INSTRUCTIONS:
- Keep explanation concise
- Use simple language
- Use markdown formatting
- Use emojis where useful
- Add a real-world analogy
- Add a tiny diagram using text if possible
- Highlight important terms in **bold**
- Avoid long paragraphs
- Focus on understanding quickly

FORMAT:

# 🚀 Concept

# 🧠 Simple Explanation

# 🎯 Real-Life Analogy

# 📌 Important Points

# 🔥 Tiny Diagram
`;

  const result =
    await model.generateContent(
      prompt
    );

  return result.response.text();
}

// ===============================
// FLASHCARD GENERATION
// ===============================

async function generateFlashcards(
  content
) {

  const model = getModel({
    temperature: 0.4,
    maxOutputTokens: 2500,
  });

  const prompt = `
You are an educational AI.

Generate 10 high-quality flashcards from the study material.

DOCUMENT CONTENT:
${truncateContent(content, 15000)}

STRICT RULES:
- Return ONLY valid JSON
- No markdown
- No explanations outside JSON
- Keep answers concise
- Focus on important concepts
- Use beginner-friendly language

FORMAT:
[
  {
    "front": "Question here",
    "back": "Answer here"
  }
]
`;

  const result =
    await model.generateContent(
      prompt
    );

  const text =
    result.response.text();

  const parsed =
    safeJsonParse(text);

  return Array.isArray(parsed)
    ? parsed
    : [];
}

// ===============================
// QUIZ GENERATION
// ===============================

async function generateQuiz(
  content
) {

  const model = getModel({
    temperature: 0.4,
    maxOutputTokens: 3000,
  });

  const prompt = `
You are an expert educational AI.

Generate 10 HIGH-QUALITY MCQ quiz questions from the study material.

DOCUMENT CONTENT:
${truncateContent(content, 15000)}

STRICT RULES:
- Return ONLY valid JSON
- No markdown
- No explanations outside JSON
- Every question must have EXACTLY 4 options
- correctAnswer must be NUMBER index (0-3)
- Include difficulty
- Include short explanation
- Avoid duplicate questions
- Mix easy, medium, hard

FORMAT:
[
  {
    "question": "What is an Abstract Data Type?",
    "options": [
      "Option A",
      "Option B",
      "Option C",
      "Option D"
    ],
    "correctAnswer": 1,
    "difficulty": "Easy",
    "explanation": "Short explanation"
  }
]
`;

  const result =
    await model.generateContent(
      prompt
    );

  const text =
    result.response.text();

  const parsed =
    safeJsonParse(text);

  return Array.isArray(parsed)
    ? parsed
    : [];
}

// ===============================
// DOCUMENT CHAT
// ===============================

async function chatWithDocument(
  question,
  content
) {

  const model = getModel({
    temperature: 0.5,
    maxOutputTokens: 1800,
  });

  const prompt = `
You are an AI tutor helping students understand their study material.

DOCUMENT CONTENT:
${truncateContent(content, 18000)}

STUDENT QUESTION:
${question}

INSTRUCTIONS:
- Answer clearly
- Be educational
- Use markdown formatting
- Use bullet points where useful
- Explain concepts simply
- Stay relevant to document
- Add examples if useful
`;

  const result =
    await model.generateContent(
      prompt
    );

  return result.response.text();
}

// ===============================
// EXPORTS
// ===============================

module.exports = {
  generateSummary,
  explainConcept,
  generateFlashcards,
  generateQuiz,
  chatWithDocument,
};
