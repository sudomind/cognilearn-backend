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
      temperature: config.temperature || 0.5,
      maxOutputTokens:
        config.maxOutputTokens || 2048,
    },
  });
}

function truncateContent(
  content,
  maxLength = 25000
) {
  if (!content) return '';

  return content.length > maxLength
    ? content.substring(0, maxLength)
    : content;
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
    maxOutputTokens: 2048,
  });

  const prompt = `
You are an advanced AI study assistant helping university students prepare for exams.

Analyze the following study material carefully and create a HIGH-QUALITY educational summary.

DOCUMENT TITLE:
"${documentName}"

DOCUMENT CONTENT:
${truncateContent(content)}

IMPORTANT INSTRUCTIONS:
- Use markdown formatting
- Use proper headings and subheadings
- Use bullet points
- Highlight key concepts in **bold**
- Explain technical concepts in simple language
- Focus on exam-important concepts
- Avoid generic introductions
- Make the output visually clean and easy to study
- Include concise explanations
- Keep the summary detailed but readable

OUTPUT FORMAT:

# 📘 Overview

Provide a short overview of the document.

# 🧠 Important Concepts

Explain the major concepts clearly.

# 📌 Key Definitions

List important definitions and terminology.

# ⚡ Important Points for Exams

Mention formulas, principles, key theories, or frequently asked concepts.

# 📝 Quick Revision Notes

Provide short revision-friendly notes students can quickly review before exams.
`;

  const result =
    await model.generateContent(prompt);

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
    maxOutputTokens: 1500,
  });

  const prompt = `
You are an expert educational AI tutor.

Explain the following concept clearly and deeply for a university student.

CONCEPT:
"${concept}"

DOCUMENT CONTENT:
${truncateContent(content, 15000)}

INSTRUCTIONS:
- Use simple language
- Explain step-by-step
- Use examples where possible
- Use markdown formatting
- Highlight important terms in **bold**
- Make it beginner-friendly but educational

FORMAT:

# Concept Explanation

# Key Points

# Simple Example

# Important Notes
`;

  const result =
    await model.generateContent(prompt);

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
    maxOutputTokens: 2000,
  });

  const prompt = `
Generate educational flashcards from the study material below.

DOCUMENT CONTENT:
${truncateContent(content, 15000)}

RULES:
- Return ONLY valid JSON
- Generate 10 flashcards
- Keep answers concise
- Focus on important concepts

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
  } catch {
    return [];
  }
}

// ===============================
// QUIZ GENERATION
// ===============================

async function generateQuiz(content) {
  const model = getModel({
    temperature: 0.4,
    maxOutputTokens: 2500,
  });

  const prompt = `
Generate a multiple-choice quiz from this study material.

DOCUMENT CONTENT:
${truncateContent(content, 15000)}

RULES:
- Return ONLY valid JSON
- Generate 10 MCQs
- Each must have 4 options
- Include correctAnswer

FORMAT:
[
  {
    "question": "Question",
    "options": [
      "A",
      "B",
      "C",
      "D"
    ],
    "correctAnswer": "A"
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
  } catch {
    return [];
  }
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
    maxOutputTokens: 1500,
  });

  const prompt = `
You are an AI tutor helping students understand a document.

DOCUMENT CONTENT:
${truncateContent(content, 18000)}

STUDENT QUESTION:
${question}

INSTRUCTIONS:
- Answer clearly
- Be educational
- Use markdown
- Give examples if useful
- Stay based on document context
`;

  const result =
    await model.generateContent(prompt);

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
