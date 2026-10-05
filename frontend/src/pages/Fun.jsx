import { Dices, Grid3X3, Hash, RotateCcw, Sparkles, Trophy } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Badge, Button, Card } from '../components/ui';

const TABS = [
  { id: 'tictactoe', label: 'Tic-Tac-Toe', icon: <Grid3X3 size={15} /> },
  { id: 'memory', label: 'Memory Match', icon: <Sparkles size={15} /> },
  { id: 'guess', label: 'Guess the Number', icon: <Hash size={15} /> },
];

const WINS = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6],
];

function winnerOf(b) {
  for (const [a, c, d] of WINS) {
    if (b[a] && b[a] === b[c] && b[a] === b[d]) return b[a];
  }
  return b.every(Boolean) ? 'draw' : null;
}

function TicTacToe() {
  const [board, setBoard] = useState(Array(9).fill(''));
  const [score, setScore] = useState({ you: 0, cpu: 0, draws: 0 });
  const [over, setOver] = useState(null);

  const play = (i) => {
    if (board[i] || over) return;
    const next = [...board];
    next[i] = 'X';
    let w = winnerOf(next);
    if (!w) {
      const free = next.map((v, idx) => (v ? null : idx)).filter((v) => v !== null);
      if (free.length > 0) {
        const pick = free[Math.floor(Math.random() * free.length)];
        // slight delay feel: place immediately (simple + snappy)
        next[pick] = 'O';
        w = winnerOf(next);
      }
    }
    setBoard(next);
    if (w) {
      setOver(w);
      setScore((s) => ({
        you: s.you + (w === 'X' ? 1 : 0),
        cpu: s.cpu + (w === 'O' ? 1 : 0),
        draws: s.draws + (w === 'draw' ? 1 : 0),
      }));
    }
  };

  const reset = () => {
    setBoard(Array(9).fill(''));
    setOver(null);
  };

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone="teal">You are X</Badge>
        <Badge>Wins: {score.you}</Badge>
        <Badge>CPU: {score.cpu}</Badge>
        <Badge>Draws: {score.draws}</Badge>
        <Button size="sm" variant="secondary" className="ml-auto" onClick={reset}>
          <RotateCcw size={14} /> New game
        </Button>
      </div>
      <div className="mx-auto mt-4 grid max-w-[300px] grid-cols-3 gap-2">
        {board.map((v, i) => (
          <button
            key={i}
            onClick={() => play(i)}
            disabled={Boolean(v) || Boolean(over)}
            aria-label={`Cell ${i + 1}`}
            className={`grid aspect-square place-items-center rounded-xl border text-3xl font-bold transition-colors ${
              v === 'X'
                ? 'border-teal-400/40 bg-teal-400/10 text-teal-600 dark:text-teal-300'
                : v === 'O'
                  ? 'border-violet-400/40 bg-violet-500/10 text-violet-600 dark:text-violet-300'
                  : 'border-edge2 bg-sunken hover:border-teal-400/50'
            }`}
          >
            {v}
          </button>
        ))}
      </div>
      <p className="mt-4 text-center text-sm text-muted" role="status">
        {over === 'X' && 'You win! Take a breath, you earned it.'}
        {over === 'O' && 'CPU takes this one — shake it off and go again.'}
        {over === 'draw' && "It's a draw — perfectly balanced."}
        {!over && 'Your move — tap any square.'}
      </p>
    </div>
  );
}

const EMOJI = ['🚀', '🌙', '🎧', '🌵', '🍩', '⚡'];

function shuffledDeck() {
  const deck = [...EMOJI, ...EMOJI].map((e, i) => ({ id: i, face: e }));
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

function Memory() {
  const [deck, setDeck] = useState(shuffledDeck);
  const [open, setOpen] = useState([]);
  const [found, setFound] = useState([]);
  const [moves, setMoves] = useState(0);
  const [best, setBest] = useState(() => {
    try {
      return Number(localStorage.getItem('codexa_memory_best')) || null;
    } catch {
      return null;
    }
  });
  const won = found.length === deck.length;

  useEffect(() => {
    if (won && moves > 0 && (best === null || moves < best)) {
      setBest(moves);
      try {
        localStorage.setItem('codexa_memory_best', String(moves));
      } catch {
        /* ignore */
      }
    }
  }, [won, moves, best]);

  const flip = (id) => {
    if (open.includes(id) || found.includes(id) || open.length === 2) return;
    const next = [...open, id];
    setOpen(next);
    if (next.length === 2) {
      setMoves((m) => m + 1);
      const [a, b] = next.map((cardId) => deck.find((c) => c.id === cardId));
      if (a.face === b.face) {
        setTimeout(() => {
          setFound((f) => [...f, a.id, b.id]);
          setOpen([]);
        }, 450);
      } else {
        setTimeout(() => setOpen([]), 750);
      }
    }
  };

  const restart = () => {
    setDeck(shuffledDeck());
    setOpen([]);
    setFound([]);
    setMoves(0);
  };

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone="teal">Moves: {moves}</Badge>
        <Badge>
          <Trophy size={12} className="mr-1" /> Best: {best ?? '—'}
        </Badge>
        <Button size="sm" variant="secondary" className="ml-auto" onClick={restart}>
          <RotateCcw size={14} /> Shuffle
        </Button>
      </div>
      <div className="mx-auto mt-4 grid max-w-[340px] grid-cols-4 gap-2">
        {deck.map((card) => {
          const up = open.includes(card.id) || found.includes(card.id);
          return (
            <button
              key={card.id}
              onClick={() => flip(card.id)}
              aria-label={up ? card.face : 'Hidden card'}
              className={`grid aspect-square place-items-center rounded-xl border text-2xl transition-all ${
                up
                  ? 'border-teal-400/40 bg-teal-400/10'
                  : 'border-edge2 bg-sunken hover:border-teal-400/50'
              } ${found.includes(card.id) ? 'opacity-60' : ''}`}
            >
              {up ? card.face : <span className="text-faint">?</span>}
            </button>
          );
        })}
      </div>
      <p className="mt-4 text-center text-sm text-muted" role="status">
        {won ? `Cleared in ${moves} moves. Fresh mind, clean code.` : 'Find all 6 pairs — tap two cards.'}
      </p>
    </div>
  );
}

function Guess() {
  const [target, setTarget] = useState(() => 1 + Math.floor(Math.random() * 100));
  const [value, setValue] = useState('');
  const [tries, setTries] = useState([]);
  const [done, setDone] = useState(false);

  const hint = useMemo(() => {
    if (tries.length === 0) return 'I picked a number from 1 to 100. Take a guess.';
    const last = tries[tries.length - 1];
    if (last === target) return `Got it in ${tries.length} ${tries.length === 1 ? 'try' : 'tries'}! Reset and beat it.`;
    return last < target ? `${last} is too low — aim higher.` : `${last} is too high — aim lower.`;
  }, [tries, target]);

  const submit = (e) => {
    e?.preventDefault();
    const n = Number(value);
    if (!Number.isInteger(n) || n < 1 || n > 100 || done) return;
    const next = [...tries, n];
    setTries(next);
    setValue('');
    if (n === target) setDone(true);
  };

  const again = () => {
    setTarget(1 + Math.floor(Math.random() * 100));
    setTries([]);
    setValue('');
    setDone(false);
  };

  return (
    <div className="mx-auto max-w-sm">
      <div className="flex items-center gap-2">
        <Badge tone="teal">Attempts: {tries.length}</Badge>
        <Button size="sm" variant="secondary" className="ml-auto" onClick={again}>
          <RotateCcw size={14} /> New number
        </Button>
      </div>
      <form onSubmit={submit} className="mt-4 flex gap-2">
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          type="number"
          min="1"
          max="100"
          placeholder="1 – 100"
          disabled={done}
          className="w-full flex-1 rounded-lg border border-edge2 bg-sunken px-3 py-2 text-sm text-ink outline-none placeholder:text-faint focus:border-teal-400/60"
        />
        <Button size="sm" type="submit" disabled={done || !value}>
          <Dices size={14} /> Guess
        </Button>
      </form>
      <p className="mt-3 text-center text-sm text-body" role="status">{hint}</p>
      {tries.length > 0 && (
        <p className="code-font mt-2 text-center text-xs text-muted">
          {tries.join(' · ')}
        </p>
      )}
    </div>
  );
}

export default function Fun() {
  const [tab, setTab] = useState('tictactoe');
  return (
    <div className="fade-in mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <div className="text-center">
        <Badge tone="violet" className="mb-3">
          <Sparkles size={12} /> Brain-break zone
        </Badge>
        <h1 className="text-3xl font-extrabold tracking-tight text-ink md:text-4xl">
          Fresh mind, <span className="bg-gradient-to-r from-teal-600 to-violet-600 bg-clip-text text-transparent dark:from-teal-300 dark:to-violet-400">clean code</span>
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-sm text-muted md:text-base">
          Stuck on a bug? Step away for two minutes — play a quick game,
          breathe, then come back sharper.
        </p>
      </div>

      <div className="mt-6 flex justify-center gap-1.5">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm transition-colors ${
              tab === t.id
                ? 'bg-teal-400/10 text-teal-600 dark:text-teal-300'
                : 'text-muted hover:bg-ink/5 hover:text-ink'
            }`}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      <Card className="mt-4">
        {tab === 'tictactoe' && <TicTacToe />}
        {tab === 'memory' && <Memory />}
        {tab === 'guess' && <Guess />}
      </Card>
    </div>
  );
}
