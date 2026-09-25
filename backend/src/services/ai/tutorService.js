/**
 * Codexa AI — tutor service (Phase 7/10).
 * Provides contextual hints and learning guidance about compiler concepts.
 */
const { chat, isAvailable } = require('./client');

const TUTOR_SYSTEM = `You are Codexa AI, a patient C++ programming tutor. Your job is to help students understand compiler concepts through their own code.

RULES:
1. Be encouraging and supportive.
2. Ask guiding questions before giving answers when appropriate.
3. Connect concepts to the student's actual code.
4. Use analogies and real-world examples.
5. Keep responses focused — one concept at a time.
6. Suggest next steps for learning.

RESPONSE FORMAT (strict JSON):
{
  "hint": "your hint or explanation",
  "concept": "the core concept being taught",
  "nextSteps": ["suggestion1", "suggestion2"]
}`;

/**
 * Get a tutor hint about a concept or code.
 * @param {object} params
 * @param {string} params.question - The student's question or topic
 * @param {string} params.sourceCode - Current source code for context
 * @param {string} params.context - Additional context (e.g., 'analyzing', 'fixing error')
 * @returns {Promise<object>}
 */
async function getTutorHint({ question, sourceCode, context = 'general' }) {
  if (!isAvailable()) {
    return {
      hint: 'AI tutor requires an AI_API_KEY to be configured in backend/.env.',
      concept: null,
      nextSteps: [],
      aiAvailable: false,
    };
  }

  const userMessage = `## Context
${context}

## Student's question
${question}

## Current code
\`\`\`cpp
${sourceCode}
\`\`\`

Provide a helpful hint or explanation.`;

  const result = await chat(TUTOR_SYSTEM, userMessage);

  let parsed;
  try {
    const jsonMatch = result.content.match(/```(?:json)?\s*([\s\S]*?)```/);
    const jsonStr = jsonMatch ? jsonMatch[1] : result.content;
    parsed = JSON.parse(jsonStr.trim());
  } catch {
    parsed = {
      hint: result.content,
      concept: null,
      nextSteps: [],
    };
  }

  return {
    hint: parsed.hint || result.content,
    concept: parsed.concept || null,
    nextSteps: parsed.nextSteps || [],
    model: result.model,
    aiAvailable: true,
  };
}

module.exports = { getTutorHint };
