import { Background, Controls, ReactFlow } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useMemo, useState } from 'react';
import { useTheme } from '../context/ThemeContext';
import { EmptyState } from './ui';

const MAX_NODES = 400;
const X_GAP = 190;
const Y_GAP = 96;

function isNode(v) {
  return !!v && typeof v === 'object' && typeof v.kind === 'string';
}

function childNodes(node) {
  const kids = [];
  for (const v of Object.values(node)) {
    if (Array.isArray(v)) {
      for (const item of v) if (isNode(item)) kids.push(item);
    } else if (isNode(v)) {
      kids.push(v);
    }
  }
  return kids;
}

function shortLabel(node) {
  const cut = (s, n = 22) => (s.length > n ? `${s.slice(0, n)}…` : s);
  switch (node.kind) {
    case 'FunctionDef': return `fn ${node.name}() : ${node.returnType}`;
    case 'Param': return `${node.name} : ${node.paramType}`;
    case 'VarDecl': return `decl ${node.declType}`;
    case 'Declarator': return node.init ? `${node.name} = …` : node.name;
    case 'Identifier': return node.name;
    case 'Qualified': return `${node.ns}::${node.name}`;
    case 'IntLit': case 'FloatLit': case 'CharLit':
    case 'StringLit': case 'BoolLit': return cut(String(node.value));
    case 'Binary': case 'Assignment': case 'Unary': case 'Update': return node.op;
    case 'Call': return 'call()';
    default: return node.kind;
  }
}

function buildGraph(ast) {
  const nodes = [];
  const edges = [];
  let idCounter = 0;
  let leafX = 0;
  let truncated = 0;

  function walk(node, depth, parentId) {
    const id = `n${idCounter++}`;
    if (idCounter > MAX_NODES) {
      truncated += 1;
      return null;
    }
    const kids = childNodes(node).map((k) => walk(k, depth + 1, id)).filter(Boolean);
    let x;
    if (kids.length === 0) {
      x = leafX * X_GAP;
      leafX += 1;
    } else {
      x = kids.reduce((sum, k) => sum + k.x, 0) / kids.length;
    }
    const rfNode = {
      id,
      position: { x, y: depth * Y_GAP },
      data: { label: shortLabel(node), kind: node.kind, loc: node.loc },
      style: {
        background: 'var(--color-panel)',
        color: 'var(--color-body)',
        border: '1px solid var(--color-edge2)',
        borderRadius: 8,
        fontSize: 12,
        padding: '6px 10px',
        width: 'auto',
      },
    };
    nodes.push(rfNode);
    if (parentId) edges.push({ id: `e-${parentId}-${id}`, source: parentId, target: id });
    return { x };
  }

  if (ast) walk(ast, 0, null);
  return { nodes, edges, truncated };
}

/**
 * Interactive AST viewer. Clicking a node calls onSelect(range) so the
 * Compiler page can highlight the matching source range in Monaco.
 */
export default function AstViewer({ ast, onSelect }) {
  const { theme } = useTheme();
  const [selectedId, setSelectedId] = useState(null);
  const { nodes, edges, truncated } = useMemo(() => buildGraph(ast), [ast]);

  const styled = useMemo(
    () => nodes.map((n) => (n.id === selectedId
      ? { ...n, style: { ...n.style, border: '1px solid #2dd4bf', boxShadow: '0 0 0 1px #2dd4bf' } }
      : n)),
    [nodes, selectedId],
  );

  if (!ast) {
    return (
      <EmptyState
        title="No AST yet"
        hint="Press Analyze in the toolbar to parse the current code and build its Abstract Syntax Tree."
      />
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {truncated > 0 && (
        <p className="text-xs text-muted">
          Large AST — showing the first {MAX_NODES} nodes ({truncated} omitted for performance).
        </p>
      )}
      <p className="text-xs text-muted">
        {nodes.length} nodes · click a node to highlight its source range in the editor.
      </p>
      <div className="h-80 overflow-hidden rounded-xl border border-edge bg-sunken">
        <ReactFlow
          nodes={styled}
          edges={edges}
          onNodeClick={(_, node) => {
            setSelectedId(node.id);
            if (node.data?.loc?.line > 0) onSelect?.(node.data.loc);
          }}
          fitView
          fitViewOptions={{ padding: 0.2 }}
          minZoom={0.2}
          proOptions={{ hideAttribution: true }}
          defaultEdgeOptions={{ style: { stroke: '#64748b' } }}
        >
          <Background color={theme === 'light' ? '#cbd5e1' : '#1c2233'} gap={20} />
          <Controls showInteractive={false} />
        </ReactFlow>
      </div>
    </div>
  );
}
