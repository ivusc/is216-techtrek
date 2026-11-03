const { GoogleGenAI } = require('@google/genai');

if (!process.env.GEMINI_API_KEY) {
  throw new Error("Missing GEMINI_API_KEY in your environment variables.");
}

// Initialize the new client using the explicit apiKey parameter
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

module.exports = ai;