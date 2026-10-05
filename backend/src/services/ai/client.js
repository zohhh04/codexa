/**
 * Codexa AI — provider-agnostic LLM client (Phase 7).
 *
 * Uses native fetch to call any OpenAI-compatible API endpoint.
 * Configure via env: AI_API_KEY, AI_MODEL, AI_BASE_URL.
 *
 * FREE option — Google Gemini: paste a free Gemini API key
 * (starts with "AIza", from Google AI Studio) as AI_API_KEY and it is
 * auto-detected: requests go to Gemini's OpenAI-compatible endpoint with
 * a free flash model. No other config needed. Explicit AI_BASE_URL /
 * AI_MODEL always win over auto-detection.
 * When no key is configured, returns a clear error — never fakes output.
 */
const config = require('../../config/env');

const DEFAULT_BASE_URL = 'https://api.openai.com/v1';
const GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/openai';
const GEMINI_MODEL = 'gemini-2.0-flash';
const TIMEOUT_MS = 30_000;

function getProvider() {
  // CODEXA_FORCE_OFFLINE=1 is a test hook so unit tests stay deterministic
  // (and free of network) even when a real key sits in backend/.env.
  if (process.env.CODEXA_FORCE_OFFLINE === '1') {
    return { apiKey: '', model: 'offline', baseUrl: DEFAULT_BASE_URL, provider: 'none' };
  }
  // Live process.env wins over the config snapshot so tests and shells can
  // override the file-based key without reloading modules.
  const apiKey = process.env.AI_API_KEY || config.aiApiKey || '';
  // NOTE: config fills defaults ('https://api.openai.com/v1', 'gpt-4o-mini'),
  // so "explicit" means the user actually set a non-default value.
  const envBase = process.env.AI_BASE_URL || '';
  const cfgBase = config.aiBaseUrl && config.aiBaseUrl !== DEFAULT_BASE_URL ? config.aiBaseUrl : '';
  const explicitBase = envBase || cfgBase;
  const envModel = process.env.AI_MODEL || '';
  const cfgModel = config.aiModel && config.aiModel !== 'gpt-4o-mini' ? config.aiModel : '';
  const explicitModel = envModel || cfgModel;
  const looksGemini = /^AIza/.test(apiKey);
  const baseUrl = explicitBase || (looksGemini ? GEMINI_BASE_URL : DEFAULT_BASE_URL);
  const provider = explicitBase
    ? 'custom'
    : looksGemini
      ? 'gemini'
      : apiKey
        ? 'openai'
        : 'none';
  const model = explicitModel || (provider === 'gemini' ? GEMINI_MODEL : 'gpt-4o-mini');
  return { apiKey, model, baseUrl, provider };
}

function isAvailable() {
  return !!getProvider().apiKey;
}

/**
 * Send a chat completion request.
 * @param {string} systemPrompt
 * @param {string} userMessage
 * @returns {Promise<{content: string, model: string, usage: object}>}
 */
async function chat(systemPrompt, userMessage) {
  const { apiKey, model, baseUrl } = getProvider();

  if (!apiKey) {
    throw new AIError(
      'AI_API_KEY is not configured. Set it in backend/.env to enable AI features.',
      'AI_NOT_CONFIGURED',
    );
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    // One automatic retry: free tiers (e.g. Gemini) often answer 429/503
    // on spikes — a short wait usually succeeds, and callers fall back to
    // offline builders only if both attempts fail.
    let res = null;
    let lastStatus = 0;
    let lastBody = '';
    for (let attempt = 1; attempt <= 2; attempt++) {
      res = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userMessage },
          ],
          temperature: 0.3,
          max_tokens: 2048,
        }),
        signal: controller.signal,
      });
      if (res.ok) break;
      lastStatus = res.status;
      lastBody = await res.text().catch(() => '');
      if ((res.status === 429 || res.status === 503) && attempt === 1) {
        await new Promise((r) => setTimeout(r, 2000));
        continue;
      }
      break;
    }

    if (!res.ok) {
      throw new AIError(
        `AI provider returned ${lastStatus}: ${lastBody.slice(0, 200)}`,
        'AI_PROVIDER_ERROR',
      );
    }

    const data = await res.json();
    const choice = data.choices?.[0];
    if (!choice?.message?.content) {
      throw new AIError('AI provider returned an empty response', 'AI_EMPTY_RESPONSE');
    }

    return {
      content: choice.message.content,
      model: data.model ?? model,
      usage: data.usage ?? {},
    };
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new AIError('AI request timed out', 'AI_TIMEOUT');
    }
    if (err instanceof AIError) throw err;
    throw new AIError(`AI request failed: ${err.message}`, 'AI_REQUEST_FAILED');
  } finally {
    clearTimeout(timer);
  }
}

class AIError extends Error {
  constructor(message, code) {
    super(message);
    this.name = 'AIError';
    this.code = code;
  }
}

module.exports = { chat, isAvailable, getProvider, AIError };
