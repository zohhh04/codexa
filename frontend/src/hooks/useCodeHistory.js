/**
 * Codexa AI — code undo/redo history hook (Phase 8).
 * Tracks snapshots of code for undo/redo after approved AI fixes.
 */
import { useCallback, useRef, useState } from 'react';

export default function useCodeHistory(initialCode) {
  const [code, setCodeState] = useState(initialCode);
  const past = useRef([]);
  const future = useRef([]);

  const setCode = useCallback((newCode) => {
    const resolved = typeof newCode === 'function' ? newCode(code) : newCode;
    if (resolved === code) return;
    past.current.push(code);
    future.current = [];
    setCodeState(resolved);
  }, [code]);

  const pushCode = useCallback((newCode) => {
    // Push to history without changing current code (for external updates like loadSample)
    past.current.push(code);
    future.current = [];
    setCodeState(newCode);
  }, [code]);

  const undo = useCallback(() => {
    if (past.current.length === 0) return null;
    const prev = past.current.pop();
    future.current.push(code);
    setCodeState(prev);
    return prev;
  }, [code]);

  const redo = useCallback(() => {
    if (future.current.length === 0) return null;
    const next = future.current.pop();
    past.current.push(code);
    setCodeState(next);
    return next;
  }, [code]);

  const canUndo = past.current.length > 0;
  const canRedo = future.current.length > 0;

  return { code, setCode, pushCode, undo, redo, canUndo, canRedo };
}
