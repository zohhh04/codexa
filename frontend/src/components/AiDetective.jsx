import { AlertTriangle, Brain, Lightbulb, Sparkles, Wrench } from 'lucide-react';
import { useState } from 'react';
import { Badge, Button, EmptyState } from './ui';
import DiffViewer from './DiffViewer';
import { explainDiagnostic, getAiStatus, proposeFix } from '../services/api';

const LEVELS = [
  { id: 'beginner', label: 'Beginner', desc: 'Simple analogies, no jargon' },
  { id: 'intermediate', label: 'Intermediate', desc: 'Compiler concepts explained' },
  { id: 'advanced', label: 'Advanced', desc: 'Technical, concise' },
];

/**
 * AI Error Detective panel — explains compiler diagnostics using AI.
 * Sits in the right sidebar of the IDE.
 *
 * Props:
 *   diagnostic   — the selected diagnostic object
 *   sourceCode   — current editor source code
 *   onApplyFix   — callback(verifiedCode) called when user approves a fix
 */
export default function AiDetective({ diagnostic, sourceCode, onApplyFix }) {
  const [level, setLevel] = useState('beginner');
  const [result, setResult] = useState(null);
  const [fixResult, setFixResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [fixLoading, setFixLoading] = useState(false);
  const [error, setError] = useState(null);
  const [aiAvailable, setAiAvailable] = useState(null);

  const handleExplain = async () => {
    if (!diagnostic) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const body = await explainDiagnostic({ diagnostic, sourceCode, level });
      setResult(body.data);
      setAiAvailable(body.data.aiAvailable);
    } catch (err) {
      const msg = err?.response?.data?.error?.message || err.message || 'unknown error';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleProposeFix = async () => {
    if (!diagnostic) return;
    setFixLoading(true);
    setError(null);
    setFixResult(null);
    try {
      const body = await proposeFix({ diagnostic, sourceCode });
      setFixResult(body.data);
    } catch (err) {
      const msg = err?.response?.data?.error?.message || err.message || 'unknown error';
      setError(msg);
    } finally {
      setFixLoading(false);
    }
  };

  const handleApproveFix = () => {
    if (fixResult?.verifiedCode && onApplyFix) {
      onApplyFix(fixResult.verifiedCode);
      setFixResult(null);
    }
  };

  const handleRejectFix = () => {
    setFixResult(null);
  };

  const checkAi = async () => {
    try {
      const body = await getAiStatus();
      setAiAvailable(body.data.available);
    } catch {
      setAiAvailable(false);
    }
  };

  if (aiAvailable === null) {
    checkAi();
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <Brain size={16} className="text-violet-400" />
        <p className="text-xs font-semibold uppercase tracking-wider text-muted">AI Error Detective</p>
      </div>

      {/* Diagnostic info */}
      {diagnostic ? (
        <div className="rounded-lg border border-edge bg-panel p-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={diagnostic.severity === 'error' ? 'red' : 'amber'}>
              {diagnostic.severity}
            </Badge>
            <span className="code-font text-xs text-muted">{diagnostic.code}</span>
            <span className="code-font text-xs text-faint">
              L{diagnostic.line}:{diagnostic.column}
            </span>
          </div>
          <p className="mt-2 text-sm text-body">{diagnostic.message}</p>
        </div>
      ) : (
        <EmptyState
          title="Select a diagnostic to begin"
          hint="Click an error or warning in the Diagnostics tab, then come back here for an AI explanation."
        />
      )}

      {/* Level selector */}
      {diagnostic && (
        <div className="flex gap-1">
          {LEVELS.map((l) => (
            <button
              key={l.id}
              onClick={() => setLevel(l.id)}
              className={`flex-1 rounded-lg px-2 py-1.5 text-[11px] font-medium transition-colors ${
                level === l.id
                  ? 'bg-violet-500/20 text-violet-300 light:text-violet-700'
                  : 'text-muted hover:bg-ink/5 hover:text-body'
              }`}
              title={l.desc}
            >
              {l.label}
            </button>
          ))}
        </div>
      )}

      {/* Action buttons */}
      {diagnostic && (
        <div className="flex gap-2">
          <Button
            size="sm"
            className="flex-1"
            onClick={handleExplain}
            disabled={loading || fixLoading || aiAvailable === false}
          >
            {loading ? 'Thinking…' : <><Sparkles size={14} /> Explain</>}
          </Button>
          <Button
            size="sm"
            variant="secondary"
            className="flex-1"
            onClick={handleProposeFix}
            disabled={loading || fixLoading || aiAvailable === false}
          >
            {fixLoading ? 'Thinking…' : <><Wrench size={14} /> Fix</>}
          </Button>
        </div>
      )}

      {/* AI unavailable notice */}
      {aiAvailable === false && (
        <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 text-xs text-amber-300 light:text-amber-700">
          <p className="font-semibold">AI not configured</p>
          <p className="mt-1">
            Set <code className="code-font">AI_API_KEY</code> in <code className="code-font">backend/.env</code> to enable AI explanations and fixes.
          </p>
        </div>
      )}

      {/* Error */}
      {error && (
        <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300 light:text-red-700" role="alert">
          {error}
        </p>
      )}

      {/* Explanation result */}
      {result && (
        <div className="space-y-2">
          <div className="rounded-lg border border-edge bg-panel p-3">
            <p className="text-xs font-semibold text-muted">Explanation</p>
            <p className="mt-1 text-sm leading-relaxed text-body whitespace-pre-wrap">{result.explanation}</p>
          </div>

          {result.fix && (
            <div className="rounded-lg border border-teal-400/20 bg-teal-400/5 p-3">
              <p className="text-xs font-semibold text-teal-300 light:text-teal-700">
                <Lightbulb size={12} className="mr-1 inline" />
                Suggested fix
              </p>
              <pre className="mt-1 overflow-auto font-mono text-xs text-body">{result.fix}</pre>
            </div>
          )}

          {result.relatedConcepts?.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {result.relatedConcepts.map((c, i) => (
                <Badge key={i} tone="violet">{c}</Badge>
              ))}
            </div>
          )}

          {result.model && (
            <p className="text-[10px] text-faint">Model: {result.model}</p>
          )}
        </div>
      )}

      {/* Fix diff result */}
      {fixResult && (
        <DiffViewer
          diff={fixResult.diff}
          description={fixResult.description}
          confidence={fixResult.confidence}
          explanation={fixResult.explanation}
          onApprove={handleApproveFix}
          onReject={handleRejectFix}
          loading={fixLoading}
        />
      )}

      {/* Pipeline info */}
      <div className="mt-auto border-t border-edge pt-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted">Pipeline · Diff · Undo/Redo</p>
        <p className="mt-1 text-xs leading-relaxed text-faint">
          See the Pipeline tab for a full compiler pipeline view. Approved fixes can be undone from the toolbar.
        </p>
      </div>
    </div>
  );
}
