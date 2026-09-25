/**
 * Phase 9 — history entry builder (pure, testable).
 * Normalizes a compiler run/analysis into a light Analysis document:
 * truncates heavy fields so history stays cheap, drops null projectId
 * (the Mongo validator requires objectId when the key is present).
 */

const MAX_SOURCE = 8000;
const MAX_DIAGS = 20;

function truncateText(value, max) {
  const s = String(value ?? '');
  return s.length > max ? `${s.slice(0, max)}\n… (truncated)` : s;
}

function buildHistoryEntry({ kind, language = 'cpp', sourceCode = '', diagnostics = [], stats = {}, projectId = null }) {
  const entry = {
    language,
    sourceCode: truncateText(sourceCode, MAX_SOURCE),
    diagnostics: Array.isArray(diagnostics) ? diagnostics.slice(0, MAX_DIAGS) : [],
    stats: {
      ...(stats && typeof stats === 'object' ? stats : {}),
      kind: kind === 'run' ? 'run' : 'analyze',
    },
  };
  if (projectId) entry.projectId = projectId;
  return entry;
}

module.exports = { buildHistoryEntry, MAX_SOURCE, MAX_DIAGS };
