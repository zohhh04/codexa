/**
 * Codexa AI — propose fix service (Phase 7).
 * Takes a diagnostic + source code, returns a proposed diff (never auto-applies).
 */
const { isAvailable } = require('./client');
const { tryAI, engineOf } = require('./offline');

const FIX_SYSTEM = `You are Codexa AI, an expert C++ code fixer. Your job is to propose minimal, correct fixes for compiler errors.

RULES:
1. Propose the SMALLEST possible fix — change only what's necessary.
2. Never rewrite the entire file. Only show the changed lines.
3. Preserve the user's coding style (indentation, naming, etc.).
4. If the error is ambiguous, explain the ambiguity instead of guessing.
5. Never auto-apply changes. Always present as a proposal.
6. If no fix is possible (e.g., missing library), say so clearly.

RESPONSE FORMAT (strict JSON):
{
  "description": "brief description of the fix",
  "diff": "unified diff format (- for removed, + for added, context lines unchanged)",
  "confidence": "high" | "medium" | "low",
  "explanation": "why this fix works (1-2 sentences)"
}`;

/**
 * Propose a fix for a diagnostic.
 * @param {object} params
 * @param {object} params.diagnostic - The diagnostic object
 * @param {string} params.sourceCode - The full source code
 * @returns {Promise<object>}
 */
async function proposeFix({ diagnostic, sourceCode }) {
  if (!isAvailable()) {
    return {
      description: 'AI features require an AI_API_KEY to be configured in backend/.env.',
      diff: null,
      confidence: 'none',
      explanation: 'No AI provider is available.',
      aiAvailable: false,
    };
  }

  const userMessage = `## Diagnostic
- **Phase:** ${diagnostic.phase}
- **Severity:** ${diagnostic.severity}
- **Code:** ${diagnostic.code}
- **Message:** ${diagnostic.message}
- **Location:** Line ${diagnostic.line}, Column ${diagnostic.column}

## Source code
\`\`\`cpp
${sourceCode}
\`\`\`

Propose a minimal fix. Return a unified diff.`;

  const ai = await tryAI(FIX_SYSTEM, userMessage, true);
  if (ai && (ai.parsed?.description || ai.raw)) {
    return {
      description: ai.parsed?.description || 'Fix suggested',
      diff: ai.parsed?.diff || null,
      confidence: ai.parsed?.confidence || 'medium',
      explanation: ai.parsed?.explanation || ai.raw,
      model: ai.model,
      aiAvailable: true,
      engine: 'ai',
    };
  }

  // Offline fallback: point at the exact line — never a 500.
  const d = diagnostic || {};
  return {
    description: `Fix the ${d.phase ?? 'compiler'} issue on line ${d.line ?? '?'} (${d.code ?? ''}): ${d.message ?? ''}`,
    diff: null,
    confidence: 'low',
    explanation: 'AI is unreachable right now. Correct the highlighted line, then press Analyze to confirm.',
    aiAvailable: false,
    engine: engineOf(ai),
  };
}

module.exports = { proposeFix };
