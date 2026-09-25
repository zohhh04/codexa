/**
 * Codexa AI — provider-agnostic LLM client (Phase 7).
 *
 * Uses native fetch to call any OpenAI-compatible API endpoint.
 * Configure via env: AI_API_KEY, AI_MODEL, AI_BASE_URL.
 * When no key is configured, returns a clear error — never fakes output.
 */
const config = require('../../config/env');

const DEFAULT_BASE_URL = 'https://api.openai.com/v1';
const TIMEOUT_MS = 30_000;

function getProvider() {
  const apiKey = config.aiApiKey || process.env.AI_API_KEY || '';
  const model = config.aiModel || process.env.AI_MODEL || 'gpt-4o-mini';
  const baseUrl = config.aiBaseUrl || process.env.AI_BASE_URL || DEFAULT_BASE_URL;
  return { apiKey, model, baseUrl };
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
    const res = await fetch(`${baseUrl}/chat/completions`, {
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

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new AIError(
        `AI provider returned ${res.status}: ${body.slice(0, 200)}`,
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
