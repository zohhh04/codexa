import Editor, { loader } from '@monaco-editor/react';
import * as monaco from 'monaco-editor';
import { useEffect, useRef } from 'react';
import { useTheme } from '../context/ThemeContext';

// Bundle Monaco locally instead of the default CDN loader so the workspace
// works offline and with pinned, reproducible versions.
// NOTE: no web-worker bundle is configured on purpose. Monaco only ships
// language-service workers for TS/CSS/HTML/JSON — there is none for C++.
// Tokenization, bracket colorization and diagnostic markers (Phases 4/6) all
// run on the main thread, so the editor is fully functional without one.
loader.config({ monaco });

function defineCodexaThemes() {
  monaco.editor.defineTheme('codexa-dark', {
    base: 'vs-dark',
    inherit: true,
    rules: [],
    colors: {
      'editor.background': '#05070c',
      'editor.lineHighlightBackground': '#ffffff08',
      'editorLineNumber.foreground': '#475569',
      'editorLineNumber.activeForeground': '#5eead4',
      'editorCursor.foreground': '#2dd4bf',
      'editor.selectionBackground': '#2dd4bf33',
      'editorWidget.background': '#10131a',
      'editorWidget.border': '#1c2233',
    },
  });
  monaco.editor.defineTheme('codexa-light', {
    base: 'vs',
    inherit: true,
    rules: [],
    colors: {
      'editor.background': '#ffffff',
      'editor.lineHighlightBackground': '#0f172a08',
      'editorLineNumber.foreground': '#94a3b8',
      'editorLineNumber.activeForeground': '#0f766e',
      'editorCursor.foreground': '#0f766e',
      'editor.selectionBackground': '#2dd4bf44',
      'editorWidget.background': '#ffffff',
      'editorWidget.border': '#e2e8f0',
    },
  });
}

/**
 * Monaco-based C++ editor.
 *
 * Props:
 * - value / onChange: controlled source text (owned by the Compiler page).
 * - language: Monaco language id ('cpp' today; 'c'/'java' unlock later).
 * - markers: [{ line, column, endLine, endColumn, severity: 'error'|'warning'|'info', message }]
 *   Squiggle integration point — Phases 4/6 feed real diagnostics here.
 * - onCursorChange({ line, column }): status-bar position readout.
 * - onReady(): fired with the editor instance after mount.
 */
export default function CodeEditor({
  value,
  onChange,
  language = 'cpp',
  markers = [],
  onCursorChange,
  onReady,
  highlight = null, // { line, column, endLine, endColumn } — reveal + flash on change
  height = '420px',
}) {
  const { theme } = useTheme();
  const editorRef = useRef(null);
  const monacoRef = useRef(null);
  const cursorCb = useRef(onCursorChange);
  cursorCb.current = onCursorChange;

  const monacoTheme = theme === 'light' ? 'codexa-light' : 'codexa-dark';

  const handleMount = (editor, mon) => {
    editorRef.current = editor;
    monacoRef.current = mon;
    editor.onDidChangeCursorPosition((e) => {
      cursorCb.current?.({ line: e.position.lineNumber, column: e.position.column });
    });
    const pos = editor.getPosition();
    if (pos) cursorCb.current?.({ line: pos.lineNumber, column: pos.column });
    onReady?.(editor);
  };

  // Push diagnostics as editor squiggles whenever they change.
  useEffect(() => {
    const mon = monacoRef.current;
    const editor = editorRef.current;
    if (!mon || !editor) return;
    const model = editor.getModel();
    if (!model) return;
    const severityOf = {
      error: mon.MarkerSeverity.Error,
      warning: mon.MarkerSeverity.Warning,
      info: mon.MarkerSeverity.Info,
      hint: mon.MarkerSeverity.Hint,
    };
    mon.editor.setModelMarkers(
      model,
      'codexa',
      markers.map((m, i) => ({
        message: m.message,
        severity: severityOf[m.severity] ?? mon.MarkerSeverity.Error,
        startLineNumber: m.line,
        startColumn: m.column ?? 1,
        endLineNumber: m.endLine ?? m.line,
        endColumn: m.endColumn ?? 80,
        source: m.source ?? 'codexa',
        code: `codexa-${i}`,
      })),
    );
  }, [markers, value]);

  // Reveal + temporarily highlight a source range (AST node selection).
  useEffect(() => {
    const mon = monacoRef.current;
    const editor = editorRef.current;
    if (!mon || !editor || !highlight || highlight.line < 1) return;
    const range = new mon.Range(
      highlight.line,
      highlight.column ?? 1,
      highlight.endLine ?? highlight.line,
      highlight.endColumn ?? 80,
    );
    editor.revealRangeInCenter(range);
    editor.setSelection(range);
    let ids = [];
    try {
      ids = editor.deltaDecorations([], [
        { range, options: { inlineClassName: 'codexa-highlight' } },
      ]);
    } catch {
      ids = [];
    }
    const clear = () => {
      try {
        editor.deltaDecorations(ids, []);
      } catch {
        /* editor already disposed */
      }
    };
    const t = setTimeout(clear, 2500);
    return () => {
      clearTimeout(t);
      clear();
    };
  }, [highlight]);

  return (
    <Editor
      height={height}
      language={language}
      value={value}
      theme={monacoTheme}
      beforeMount={defineCodexaThemes}
      onMount={handleMount}
      onChange={(v) => onChange?.(v ?? '')}
      loading={
        <div className="grid h-full min-h-[200px] place-items-center bg-sunken text-sm text-muted">
          Loading Monaco editor…
        </div>
      }
      options={{
        fontSize: 13,
        fontFamily: "'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace",
        fontLigatures: true,
        minimap: { enabled: false },
        scrollBeyondLastLine: false,
        padding: { top: 12 },
        renderLineHighlight: 'all',
        smoothScrolling: true,
        cursorBlinking: 'smooth',
        automaticLayout: true,
        tabSize: 4,
        insertSpaces: true,
        wordWrap: 'on',
        bracketPairColorization: { enabled: true },
        guides: { bracketPairs: true },
        scrollbar: { verticalScrollbarSize: 10, horizontalScrollbarSize: 10 },
        ariaLabel: 'C++ code editor',
        fixedOverflowWidgets: true,
      }}
    />
  );
}
