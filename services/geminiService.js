const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const MODEL_NAME = 'gemini-1.5-flash-latest';

// ─── Get model instance ────────────────────────
function getModel(config = {}) {
  return genAI.getGenerativeModel({
    model: MODEL_NAME,
    generationConfig: {
      temperature:     config.temperature     ?? 0.7,
      topP:            config.topP            ?? 0.9,
      maxOutputTokens: config.maxOutputTokens ?? 2048,
      ...config,
    },
  });
}

// ─── Safe JSON extractor ───────────────────────
function extractJSON(text) {
  // Strip markdown code fences
  const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    // Try to find first JSON array or object
    const arrMatch = cleaned.match(/\[[\s\S]*\]/);
    if (arrMatch) return JSON.parse(arrMatch[0]);
    const objMatch = cleaned.match(/\{[\s\S]*\}/);
    if (objMatch) return JSON.parse(objMatch[0]);
    throw new Error('Could not extract valid JSON from AI response');
  }
}

// ─── Truncate content to safe token limit ─────
function truncateContent(content, maxChars = 12000) {
  if (content.length <= maxChars) return content;
  return content.slice(0, maxChars) + '\n\n[Content truncated due to length...]';
}


// ─────────────────────────────────────────────
//  1. GENERATE DOCUMENT SUMMARY
// ─────────────────────────────────────────────
async function generateSummary(content, documentName) {
  const model = getModel({ temperature: 0.5, maxOutputTokens: 1024 });

  const prompt = `You are an expert educational AI tutor specializing in creating clear, comprehensive summaries for students.

Document Title: "${documentName}"

Document Content:
${truncateContent(content)}

Create a well-structured educational summary that covers:
1. Main topic and purpose of the document
2. Key concepts and definitions (highlight important terms with **bold**)
3. Core arguments, findings, or principles
4. Practical applications or takeaways

Requirements:
- Write in 4-5 clear paragraphs
- Use **bold** for all important terms and concepts
- Be concise yet comprehensive
- Focus on what a student needs to understand and remember
- Write at an educational level appropriate for the content`;

  const result = await model.generateContent(prompt);
  return result.response.text();
}


// ─────────────────────────────────────────────
//  2. EXPLAIN CONCEPT
// ─────────────────────────────────────────────
async function explainConcept(concept, content) {
  const model = getModel({ temperature: 0.6, maxOutputTokens: 1500 });

  const prompt = `You are an expert educator who explains complex concepts in a clear, engaging way using analogies, examples, and structured explanations.

Document Context:
${truncateContent(content, 6000)}

The student wants a detailed explanation of: "${concept}"

Provide a thorough explanation structured as:

**Definition**
[Clear, precise definition of the concept]

**Core Components**
[Break down the key parts or aspects]

**How It Works**
[Step-by-step explanation or process]

**Real-World Examples**
[2-3 concrete, relatable examples]

**Why It Matters**
[Significance and applications]

Requirements:
- Ground your explanation in the document content where possible
- Use analogies to make abstract concepts concrete
- Highlight key terms in **bold**
- If the concept isn't directly in the document, explain it in a relevant context`;

  const result = await model.generateContent(prompt);
  return result.response.text();
}


// ─────────────────────────────────────────────
//  3. GENERATE FLASHCARDS
// ─────────────────────────────────────────────
async function generateFlashcards(content, count = 8) {
  const model = getModel({ temperature: 0.6, maxOutputTokens: 2048 });

  const prompt = `You are an expert at creating effective educational flashcards that help students learn and retain information.

Document Content:
${truncateContent(content)}

Create exactly ${count} high-quality flashcards from this document.

Rules:
- Front: Clear question, term, or concept prompt
- Back: Concise, accurate answer or definition (1-3 sentences max)
- Cover a variety of topics from the document
- Mix definition-based, concept-based, and application-based questions
- Make questions specific enough to have a clear answer

IMPORTANT: Respond with ONLY valid JSON. No markdown, no preamble, no explanation.

[
  {"front": "What is [concept]?", "back": "Clear answer here"},
  ...
]

Generate exactly ${count} flashcards.`;

  const result = await model.generateContent(prompt);
  const parsed = extractJSON(result.response.text());

  if (!Array.isArray(parsed)) throw new Error('Invalid flashcard format');

  return parsed.slice(0, count).map(card => ({
    front: String(card.front || '').trim(),
    back:  String(card.back  || '').trim(),
  })).filter(c => c.front && c.back);
}


// ─────────────────────────────────────────────
//  4. GENERATE QUIZ
// ─────────────────────────────────────────────
async function generateQuiz(content, count = 5) {
  const model = getModel({ temperature: 0.5, maxOutputTokens: 3000 });

  const prompt = `You are an expert at creating rigorous, educational multiple-choice quiz questions that test deep understanding.

Document Content:
${truncateContent(content)}

Create exactly ${count} multiple-choice questions.

Rules:
- Each question tests understanding, not just memorization
- Provide exactly 4 options (A, B, C, D style)
- Only one option must be clearly correct
- Wrong options should be plausible but clearly distinguishable
- Explanations must be educational and reference the document content
- Vary the difficulty and topic coverage

IMPORTANT: Respond with ONLY valid JSON. No markdown, no preamble.

[
  {
    "question": "Clear question text?",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correct": 0,
    "explanation": "Detailed explanation of why the correct answer is right and why others are wrong."
  }
]

The "correct" field is the 0-based index of the correct option.
Generate exactly ${count} questions.`;

  const result = await model.generateContent(prompt);
  const parsed = extractJSON(result.response.text());

  if (!Array.isArray(parsed)) throw new Error('Invalid quiz format');

  return parsed.slice(0, count).map(q => ({
    question:    String(q.question    || '').trim(),
    options:     (q.options || []).map(String).slice(0, 4),
    correct:     parseInt(q.correct) || 0,
    explanation: String(q.explanation || '').trim(),
  })).filter(q => q.question && q.options.length === 4);
}


// ─────────────────────────────────────────────
//  5. CHAT WITH DOCUMENT
// ─────────────────────────────────────────────
async function chatWithDocument(question, content, documentName, history = []) {
  const model = getModel({ temperature: 0.7, maxOutputTokens: 1024 });

  const systemContext = `You are an intelligent AI tutor helping a student understand "${documentName}". 

DOCUMENT CONTENT:
${truncateContent(content, 8000)}

INSTRUCTIONS:
- Answer questions based primarily on the document content above
- Be educational, clear, and helpful
- Use markdown formatting: **bold** for emphasis, bullet points for lists, numbered lists for steps
- If the question isn't covered in the document, say so politely and offer what relevant information you can
- Keep answers focused and appropriately detailed
- Encourage deeper understanding, not just memorization`;

  // Build conversation history for context
  const formattedHistory = history.slice(-8).map(msg => ({
    role:  msg.role === 'user' ? 'user' : 'model',
    parts: [{ text: msg.content }],
  }));

  const chat = model.startChat({
    history: [
      { role: 'user',  parts: [{ text: systemContext }] },
      { role: 'model', parts: [{ text: 'Understood! I have read the document and I\'m ready to help you learn. What would you like to know?' }] },
      ...formattedHistory,
    ],
  });

  const result = await chat.sendMessage(question);
  return result.response.text();
}


module.exports = {
  generateSummary,
  explainConcept,
  generateFlashcards,
  generateQuiz,
  chatWithDocument,
};
