/**
 * Shared offline-first AI helper.
 * Every AI feature works WITHOUT an API key using deterministic templates
 * and heuristics. When AI_API_KEY is configured, the real LLM is used and
 * the response is marked aiUsed:true. Nothing is ever faked silently —
 * callers always report `engine: 'ai' | 'offline'`.
 */
const { chat, isAvailable } = require('./client');

/**
 * Models often wrap JSON in chatter or fences. Try, in order:
 * fenced block → whole reply → largest balanced {...} span.
 * String-aware scan so braces inside "..." don't break matching.
 */
function extractJson(raw) {
  const text = String(raw || '');
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidates = [];
  if (fenced) candidates.push(fenced[1]);
  candidates.push(text);
  // balanced-brace spans, longest first
  const spans = [];
  let depth = 0;
  let start = -1;
  let inStr = false;
  let esc = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inStr) {
      if (esc) esc = false;
      else if (ch === '\\') esc = true;
      else if (ch === '"') inStr = false;
      continue;
    }
    if (ch === '"') inStr = true;
    else if (ch === '{') {
      if (depth === 0) start = i;
      depth++;
    } else if (ch === '}') {
      depth--;
      if (depth === 0 && start >= 0) {
        spans.push(text.slice(start, i + 1));
        start = -1;
      }
      if (depth < 0) depth = 0;
    }
  }
  spans.sort((a, b) => b.length - a.length);
  candidates.push(...spans);
  for (const c of candidates) {
    try {
      return JSON.parse(c.trim());
    } catch {
      /* try next candidate */
    }
  }
  return null;
}

async function tryAI(system, userMessage, parse) {
  if (!isAvailable()) return null;
  try {
    const result = await chat(system, userMessage);
    const raw = result.content;
    const parsed = parse ? extractJson(raw) : null;
    return { raw, parsed, model: result.model };
  } catch {
    return null;
  }
}

function engineOf(aiResult) {
  return aiResult ? 'ai' : 'offline';
}

module.exports = { tryAI, engineOf };
