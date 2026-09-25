/**
 * Shared offline-first AI helper.
 * Every AI feature works WITHOUT an API key using deterministic templates
 * and heuristics. When AI_API_KEY is configured, the real LLM is used and
 * the response is marked aiUsed:true. Nothing is ever faked silently —
 * callers always report `engine: 'ai' | 'offline'`.
 */
const { chat, isAvailable } = require('./client');

async function tryAI(system, userMessage, parse) {
  if (!isAvailable()) return null;
  try {
    const result = await chat(system, userMessage);
    const raw = result.content;
    let parsed = null;
    if (parse) {
      try {
        const m = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
        parsed = JSON.parse((m ? m[1] : raw).trim());
      } catch {
        parsed = null;
      }
    }
    return { raw, parsed, model: result.model };
  } catch {
    return null;
  }
}

function engineOf(aiResult) {
  return aiResult ? 'ai' : 'offline';
}

module.exports = { tryAI, engineOf };
