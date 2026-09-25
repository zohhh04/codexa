const KEY = 'codexa_editor_prefs';

export const DEFAULT_EDITOR_PREFS = {
  fontSize: 13,
  tabSize: 4,
  wordWrap: 'on',
};

export function loadEditorPrefs() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULT_EDITOR_PREFS };
    const parsed = JSON.parse(raw);
    return {
      fontSize: Math.min(20, Math.max(11, Number(parsed.fontSize) || DEFAULT_EDITOR_PREFS.fontSize)),
      tabSize: [2, 4, 8].includes(Number(parsed.tabSize)) ? Number(parsed.tabSize) : 4,
      wordWrap: parsed.wordWrap === 'off' ? 'off' : 'on',
    };
  } catch {
    return { ...DEFAULT_EDITOR_PREFS };
  }
}

export function saveEditorPrefs(prefs) {
  try {
    localStorage.setItem(KEY, JSON.stringify(prefs));
  } catch {
    /* ignore persistence failures */
  }
}
