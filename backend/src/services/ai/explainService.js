/**
 * Codexa AI — explain diagnostic service (Phase 7).
 * Takes a diagnostic + source code + difficulty level, returns a grounded explanation.
 */
const { isAvailable } = require('./client');
const { tryAI, engineOf } = require('./offline');

const EXPLAIN_SYSTEM = `You are Codexa AI, an expert C++ compiler error detective. Your job is to explain compiler diagnostics to students.

RULES:
1. Be concise — max 3-4 sentences for beginner, 2-3 for intermediate, 1-2 for advanced.
2. Be grounded — reference the specific error code, line, and message from the diagnostic.
3. Be educational — explain WHY the error occurs, not just what it says.
4. Suggest a concrete fix when possible.
5. Never fabricate information. If you don't know, say so.
6. Use markdown formatting: **bold** for emphasis, \`code\` for identifiers.

RESPONSE FORMAT (strict JSON):
{
  "explanation": "your explanation here",
  "fix": "concrete fix suggestion (or null if not applicable)",
  "relatedConcepts": ["concept1", "concept2"]
}`;

const LEVEL_INSTRUCTIONS = {
  beginner: 'Explain as if teaching a first-year student. Use simple analogies. Avoid jargon.',
  intermediate: 'Explain for someone who knows basic C++ but is learning compiler concepts.',
  advanced: 'Give a concise technical explanation. Reference compiler internals if relevant.',
};

/**
 * Explain a diagnostic.
 * @param {object} params
 * @param {object} params.diagnostic - The diagnostic object
 * @param {string} params.sourceCode - The full source code
 * @param {string} params.level - 'beginner' | 'intermediate' | 'advanced'
 * @returns {Promise<object>}
 */
async function explainDiagnostic({ diagnostic, sourceCode, level = 'beginner' }) {
  if (!isAvailable()) {
    return {
      explanation: 'AI features require an AI_API_KEY to be configured in backend/.env. See .env.example for details.',
      fix: null,
      relatedConcepts: [],
      aiAvailable: false,
    };
  }

  const levelInstr = LEVEL_INSTRUCTIONS[level] || LEVEL_INSTRUCTIONS.beginner;

  const userMessage = `## Diagnostic
- **Phase:** ${diagnostic.phase}
- **Severity:** ${diagnostic.severity}
- **Code:** ${diagnostic.code}
- **Message:** ${diagnostic.message}
- **Location:** Line ${diagnostic.line}, Column ${diagnostic.column}

## Source code (around the error)
\`\`\`cpp
${sourceCode}
\`\`\`

## Level
${levelInstr}`;

  const ai = await tryAI(EXPLAIN_SYSTEM, userMessage, true);
  if (ai && (ai.parsed?.explanation || ai.raw)) {
    return {
      explanation: ai.parsed?.explanation || ai.raw,
      fix: ai.parsed?.fix || null,
      relatedConcepts: ai.parsed?.relatedConcepts || [],
      model: ai.model,
      aiAvailable: true,
      engine: 'ai',
    };
  }

  // Offline fallback: grounded in the diagnostic itself — never a 500.
  const d = diagnostic || {};
  return {
    explanation: `Line ${d.line ?? '?'} [${d.severity ?? 'error'} ${d.code ?? ''}]: ${d.message ?? 'unknown problem'}. This is a ${d.phase ?? 'compiler'}-phase issue — open the matching Studio tab (Lexical/Syntax/Semantic) to see it highlighted, fix the exact line, then press Analyze again.`,
    fix: null,
    relatedConcepts: [],
    aiAvailable: false,
    engine: engineOf(ai),
  };
}

module.exports = { explainDiagnostic };
