import { CheckCircle, XCircle } from 'lucide-react';
import { useMemo } from 'react';
import { Badge, Button } from './ui';

/**
 * Parse a unified diff string into structured hunks.
 * Each hunk: { lines: [{ type: 'context'|'add'|'remove', content, oldLine?, newLine? }] }
 */
function parseUnifiedDiff(diffStr) {
  if (!diffStr) return [];
  const lines = diffStr.split('\n');
  const hunks = [];
  let current = null;

  for (const line of lines) {
    // Hunk header: @@ -a,b +c,d @@
    if (line.startsWith('@@')) {
      current = { lines: [] };
      hunks.push(current);
      continue;
    }
    if (!current) {
      current = { lines: [] };
      hunks.push(current);
    }

    if (line.startsWith('+')) {
      current.lines.push({ type: 'add', content: line.slice(1) });
    } else if (line.startsWith('-')) {
      current.lines.push({ type: 'remove', content: line.slice(1) });
    } else if (line.startsWith(' ')) {
      current.lines.push({ type: 'context', content: line.slice(1) });
    } else if (line.startsWith('diff') || line.startsWith('index') || line.startsWith('---') || line.startsWith('+++')) {
      // Skip file headers
      continue;
    } else if (line.trim() === '') {
      continue;
    } else {
      // Treat as context
      current.lines.push({ type: 'context', content: line });
    }
  }

  return hunks;
}

const LINE_STYLES = {
  add: 'bg-green-500/10 text-green-300 light:bg-green-500/10 light:text-green-700',
  remove: 'bg-red-500/10 text-red-300 light:bg-red-500/10 light:text-red-700',
  context: 'text-muted',
};

const LINE_PREFIX = {
  add: '+',
  remove: '-',
  context: ' ',
};

const CONFIDENCE_TONES = {
  high: 'green',
  medium: 'amber',
  low: 'red',
  none: 'neutral',
};

/**
 * Visual diff viewer with approve/reject controls.
 * Props: { diff, description, confidence, explanation, onApprove, onReject, loading }
 */
export default function DiffViewer({ diff, description, confidence, explanation, onApprove, onReject, loading }) {
  const hunks = useMemo(() => parseUnifiedDiff(diff), [diff]);

  const stats = useMemo(() => {
    let adds = 0;
    let removes = 0;
    for (const hunk of hunks) {
      for (const line of hunk.lines) {
        if (line.type === 'add') adds++;
        if (line.type === 'remove') removes++;
      }
    }
    return { adds, removes };
  }, [hunks]);

  if (!diff) {
    return (
      <div className="rounded-lg border border-edge bg-panel p-3 text-sm text-muted">
        No diff available.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {/* Header */}
      {description && (
        <p className="text-sm text-body">{description}</p>
      )}

      {/* Stats */}
      <div className="flex items-center gap-2">
        {confidence && (
          <Badge tone={CONFIDENCE_TONES[confidence] ?? 'neutral'}>
            {confidence} confidence
          </Badge>
        )}
        <Badge tone="green">+{stats.adds}</Badge>
        <Badge tone="red">-{stats.removes}</Badge>
      </div>

      {/* Diff lines */}
      <div className="overflow-auto rounded-xl border border-edge" style={{ maxHeight: 240 }}>
        {hunks.map((hunk, hi) => (
          <div key={hi}>
            {hunk.lines.map((line, li) => (
              <div
                key={li}
                className={`code-font flex text-[12px] leading-5 ${LINE_STYLES[line.type]}`}
              >
                <span className="inline-block w-5 shrink-0 select-none text-right pr-1 opacity-40">
                  {LINE_PREFIX[line.type]}
                </span>
                <span className="whitespace-pre">{line.content}</span>
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Explanation */}
      {explanation && (
        <p className="text-xs text-muted">{explanation}</p>
      )}

      {/* Approve / Reject */}
      <div className="flex gap-2">
        <Button size="sm" className="flex-1" onClick={onApprove} disabled={loading}>
          <CheckCircle size={14} /> Approve
        </Button>
        <Button size="sm" variant="secondary" className="flex-1" onClick={onReject} disabled={loading}>
          <XCircle size={14} /> Reject
        </Button>
      </div>
    </div>
  );
}
