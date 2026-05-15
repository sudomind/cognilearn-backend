import { GoogleGenerativeAI } from '@google/generative-ai'

const apiKey = process.env.GEMINI_API_KEY

if (!apiKey) {
  throw new Error(
    'Missing GEMINI_API_KEY in environment variables'
  )
}

const genAI = new GoogleGenerativeAI(apiKey)

export const geminiModel =
  genAI.getGenerativeModel({
    model: 'gemini-1.5-flash',
  })
