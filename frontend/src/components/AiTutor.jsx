import { Bot, Mic, Send, Square, Volume2, VolumeX } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { getTutorHint } from '../services/api';
import { Button } from './ui';

const MODES = [
  { id: 'chat', label: 'Chat' },
  { id: 'voice', label: 'Voice' },
  { id: 'both', label: 'Both' },
];

function canSpeak() {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

function canListen() {
  return typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition);
}

export function speakText(text) {
  if (!canSpeak()) return false;
  try {
    window.speechSynthesis.cancel();
    const clean = String(text || '').replace(/[`*_#]/g, '').slice(0, 1200);
    if (!clean.trim()) return false;
    const u = new SpeechSynthesisUtterance(clean);
    u.rate = 1;
    u.pitch = 1;
    window.speechSynthesis.speak(u);
    return true;
  } catch {
    return false;
  }
}

export function stopSpeaking() {
  try {
    window.speechSynthesis?.cancel();
  } catch {
    /* noop */
  }
}

export default function AiTutor({ code, language, diagnostics = [] }) {
  const [messages, setMessages] = useState([
    { role: 'ai', text: 'Hi! Ask how your code works or what your errors are — I read your exact editor code. Try voice mode or tap the mic.' },
  ]);
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState('both');
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const recogRef = useRef(null);
  const scrollRef = useRef(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, loading]);

  useEffect(() => () => {
    stopSpeaking();
    try { recogRef.current?.stop(); } catch { /* noop */ }
  }, []);

  const say = (msg) => {
    if (mode === 'chat') return;
    const ok = speakText(msg.speakable || msg.text);
    setSpeaking(ok);
    if (ok && canSpeak()) {
      const timer = setInterval(() => {
        if (!window.speechSynthesis.speaking) {
          setSpeaking(false);
          clearInterval(timer);
        }
      }, 300);
      setTimeout(() => { setSpeaking(false); clearInterval(timer); }, 30000);
    }
  };

  const ask = async (preset) => {
    const q = (preset ?? question).trim();
    if (!q || loading) return;
    stopSpeaking();
    setMessages((m) => [...m, { role: 'user', text: q }]);
    setQuestion('');
    setLoading(true);
    try {
      const body = await getTutorHint({
        question: q,
        sourceCode: code,
        language,
        diagnostics: (diagnostics || []).slice(0, 12).map((d) => ({
          phase: d.phase,
          severity: d.severity,
          code: d.code,
          message: d.message,
          line: d.line,
          column: d.column,
        })),
      });
      const msg = {
        role: 'ai',
        text: body.data?.hint || 'No answer.',
        speakable: body.data?.speakable || body.data?.hint || '',
        concept: body.data?.concept,
        engine: body.data?.engine,
      };
      setMessages((m) => [...m, msg]);
      say(msg);
    } catch (e) {
      const msg = { role: 'ai', text: `Tutor unavailable: ${e?.response?.data?.error?.message || e.message}` };
      setMessages((m) => [...m, msg]);
    } finally {
      setLoading(false);
    }
  };

  const explainAloud = () => ask('Explain how my code works step by step, line by line, in short spoken sentences.');

  const toggleListen = () => {
    if (!canListen()) {
      setMessages((m) => [...m, { role: 'ai', text: 'Voice input is not supported in this browser — try Chrome or Edge, or type your question.' }]);
      return;
    }
    if (listening) {
      try { recogRef.current?.stop(); } catch { /* noop */ }
      setListening(false);
      return;
    }
    try {
      const Rec = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recog = new Rec();
      recogRef.current = recog;
      recog.lang = 'en-US';
      recog.interimResults = false;
      recog.maxAlternatives = 1;
      recog.onresult = (e) => {
        const text = e.results?.[0]?.[0]?.transcript || '';
        setListening(false);
        if (text.trim()) ask(text.trim());
      };
      recog.onerror = () => setListening(false);
      recog.onend = () => setListening(false);
      recog.start();
      setListening(true);
    } catch {
      setListening(false);
    }
  };

  return (
    <div className="panel flex min-h-[300px] flex-col p-4">
      <div className="flex items-center gap-2">
        <Bot size={16} className="text-teal-300" />
        <p className="text-xs font-semibold uppercase tracking-wider text-muted">AI Tutor</p>
        <div className="ml-auto flex rounded-lg border border-edge2 bg-sunken p-0.5" role="tablist" aria-label="Reply mode">
          {MODES.map((m) => (
            <button
              key={m.id}
              onClick={() => { setMode(m.id); if (m.id === 'chat') stopSpeaking(); }}
              className={`rounded-md px-2 py-1 text-[11px] font-medium transition-colors ${mode === m.id ? 'bg-teal-400/15 text-ink' : 'text-muted hover:text-ink'}`}
              title={m.id === 'chat' ? 'Text replies only' : m.id === 'voice' ? 'Spoken replies' : 'Text + spoken replies'}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      <div ref={scrollRef} className="mt-2 flex max-h-80 flex-col gap-2 overflow-y-auto">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`rounded-lg px-3 py-2 text-[13px] leading-relaxed ${
              msg.role === 'user' ? 'self-end bg-teal-400/10 text-ink' : 'bg-sunken text-body'
            }`}
          >
            <p className="whitespace-pre-wrap">{msg.text}</p>
            {msg.role === 'ai' && msg.concept && (
              <p className="mt-1 text-[11px] font-medium text-mint">Concept: {msg.concept}</p>
            )}
            {msg.role === 'ai' && (
              <button
                onClick={() => speakText(msg.speakable || msg.text)}
                className="mt-1 inline-flex items-center gap-1 text-[11px] text-muted hover:text-ink"
                title="Read this answer aloud"
              >
                <Volume2 size={12} /> Listen
              </button>
            )}
          </div>
        ))}
        {loading && <p className="text-xs text-muted">Thinking…</p>}
      </div>

      <div className="mt-2 flex gap-2">
        <input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && ask()}
          placeholder={listening ? 'Listening… speak now' : 'Ask about your code… or tap the mic'}
          className="w-full flex-1 rounded-lg border border-edge2 bg-sunken px-3 py-2 text-sm text-ink outline-none placeholder:text-faint focus:border-teal-400/60"
        />
        <button
          onClick={toggleListen}
          title={canListen() ? 'Ask with your voice' : 'Voice input unavailable'}
          className={`grid size-9 shrink-0 place-items-center rounded-lg border transition-colors ${listening ? 'border-red-400/60 bg-red-400/10 text-red-400' : 'border-edge2 bg-sunken text-body hover:border-teal-400/50 hover:text-ink'}`}
        >
          {listening ? <Square size={14} /> : <Mic size={14} />}
        </button>
        <Button size="sm" onClick={() => ask()} disabled={loading || !question.trim()}>
          <Send size={14} />
        </Button>
      </div>

      <div className="mt-2 flex flex-wrap gap-1.5">
        <button
          onClick={explainAloud}
          className="inline-flex items-center gap-1 rounded-full border border-teal-400/40 bg-teal-400/10 px-2.5 py-1 text-[11px] font-medium text-ink hover:bg-teal-400/20"
        >
          {speaking ? <VolumeX size={12} /> : <Volume2 size={12} />} Explain aloud
        </button>
        {['How does my code work?', 'What are my errors?', 'What does line 1 do?'].map((s) => (
          <button
            key={s}
            onClick={() => ask(s)}
            className="rounded-full border border-edge2 bg-ink/5 px-2.5 py-1 text-[11px] text-muted hover:border-teal-400/50 hover:text-ink"
          >
            {s}
          </button>
        ))}
      </div>
      {!canSpeak() && <p className="mt-1.5 text-[11px] text-faint">Voice output unavailable in this browser.</p>}
    </div>
  );
}
