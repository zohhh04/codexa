/**
 * AI Learning Assistant + progressive Hint System.
 * askConcept: explanation + example + practice question.
 * getHint: stage 1 concept -> 2 approach -> 3 pseudocode -> 4 solution outline.
 * Offline knowledge base covers common topics; LLM handles the rest.
 */
const { tryAI } = require('./offline');

const SYSTEM_LEARN = `You are Codexa AI, a friendly CS tutor. The user asks a concept question. Respond with STRICT JSON: {"explanation": "<simple explanation with analogy, 3-5 sentences>", "example": "<short code example with one-line comments>", "practice": "<one practice question>", "followUp": "<one follow-up topic>"}. Match the user's level if stated.`;

const KB = [
  {
    match: /recursion/i,
    explanation: 'Recursion is when a function solves a problem by calling itself on a smaller piece of the same problem — like Russian dolls, each one smaller, until you reach the tiniest doll (the base case) that needs no further splitting. Every recursive solution needs two parts: a base case that stops, and a recursive step that shrinks the input.',
    example: `def factorial(n):\n    if n <= 1:      # base case: smallest doll\n        return 1\n    return n * factorial(n - 1)  # recursive step: smaller problem`,
    practice: 'Write a recursive function sumTo(n) that returns 1 + 2 + ... + n. What is your base case?',
    followUp: 'Next: memoization — caching results so recursion does not repeat work.',
  },
  {
    match: /big.?o|complexity|time.*space/i,
    explanation: 'Big-O describes how work grows as input grows. O(1) is constant (one lookup), O(n) grows with the input (one loop), O(n²) explodes (nested loops), O(log n) barely grows (halving search space like binary search). We care about the dominant term for large n.',
    example: `# O(n): single pass\nfor x in arr:\n    print(x)\n# O(n²): nested pass — avoid when possible\nfor x in arr:\n    for y in arr:\n        print(x, y)`,
    practice: 'What is the complexity of a loop that halves n each step (n=16 → 8 → 4 → 2 → 1)? Why?',
    followUp: 'Next: space complexity — counting extra memory, not just time.',
  },
  {
    match: /array/i,
    explanation: 'An array stores items of the same type side by side in memory, so you can jump to any index in O(1). The price: inserting or deleting in the middle shifts everything after it, costing O(n).',
    example: `a = [3, 1, 2]\na.append(4)   # O(1) at the end\nprint(a[0])   # O(1) random access\na.sort()      # O(n log n)`,
    practice: 'Given an array, how would you find the largest element in one pass?',
    followUp: 'Next: two pointers — solving many array problems in O(n).',
  },
  {
    match: /link.*list|stack|queue/i,
    explanation: 'Linked lists, stacks and queues are pointer-based structures: each element points to the next. A stack is LIFO (push/pop from the top, like plates), a queue is FIFO (enqueue at back, dequeue at front, like a line). Insert/delete at the ends is O(1) without shifting.',
    example: `stack = []\nstack.append(1)   # push\nstack.pop()       # pop -> 1\nfrom collections import deque\nq = deque([1, 2])\nq.popleft()       # dequeue -> 1`,
    practice: 'How would you check balanced parentheses using a stack?',
    followUp: 'Next: implement a queue with two stacks.',
  },
  {
    match: /tree|bst|binary/i,
    explanation: 'A tree is a hierarchy: each node has children, with one root and no cycles. A binary search tree keeps left < node < right, so search, insert and delete average O(log n) — like a phone book that halves each step.',
    example: `class Node:\n    def __init__(self, v):\n        self.v = v; self.left = None; self.right = None\n\ndef search(root, x):\n    while root and root.v != x:\n        root = root.left if x < root.v else root.right\n    return root`,
    practice: 'Write inorder traversal (left, node, right) recursively. What order does it print for a BST?',
    followUp: 'Next: tree height vs balance — why AVL/Red-Black trees exist.',
  },
  {
    match: /graph|bfs|dfs|dijkstra/i,
    explanation: 'A graph is nodes plus edges. DFS dives deep first (good for paths, cycles, components) and BFS spreads level by level (good for shortest path in unweighted graphs). Both visit each node and edge once: O(V + E). Weighted shortest paths need Dijkstra.',
    example: `from collections import deque\ndef bfs(g, s):\n    seen = {s}; q = deque([s])\n    while q:\n        u = q.popleft()\n        for v in g[u]:\n            if v not in seen:\n                seen.add(v); q.append(v)\n    return seen`,
    practice: 'How would you detect a cycle in an undirected graph with DFS?',
    followUp: 'Next: Dijkstra vs Bellman-Ford for weighted graphs.',
  },
  {
    match: /dp|dynamic programming|memo/i,
    explanation: 'Dynamic programming solves problems by combining solutions of overlapping subproblems — compute once, reuse many times. Either memoize recursion (top-down) or build a table iteratively (bottom-up). Classic signs: "count ways", "min/max cost", optimal substructure.',
    example: `def fib(n, memo={}):\n    if n < 2: return n\n    if n not in memo:\n        memo[n] = fib(n-1, memo) + fib(n-2, memo)\n    return memo[n]  # O(n) instead of O(2^n)`,
    practice: 'Climbing stairs: 1 or 2 steps at a time — how many ways for n=5? Define dp[i].',
    followUp: 'Next: 0/1 knapsack — the template for many DP problems.',
  },
  {
    match: /sort|search|binary search/i,
    explanation: 'Sorting arranges data so searching is fast: library sort is O(n log n). Binary search then finds any element in O(log n) by halving a sorted array — but the array MUST be sorted first.',
    example: `a = sorted([5, 3, 1])  # [1, 3, 5]\nimport bisect\nprint(bisect.bisect_left(a, 3))  # index 1 in O(log n)`,
    practice: 'Search for 7 in [1, 3, 5, 7, 9] with binary search — which indices do you check?',
    followUp: 'Next: two-pointer and sliding-window patterns on sorted arrays.',
  },
];

const SYSTEM_HINT = `You are Codexa AI giving ONE progressive hint for a coding problem. Stage 1 = concept only (no code). Stage 2 = approach/steps (no code). Stage 3 = pseudocode. Stage 4 = full solution with brief explanation. Respond with STRICT JSON: {"hint": "<the hint>", "stage": <1-4>, "next": "<what to try next>"}.`;

function offlineHint(problem, stage) {
  const p = String(problem || '').slice(0, 200);
  if (stage <= 1) {
    return {
      hint: `Hint 1 — Concept: think about which data structure fits "${p}…". Ask: do I need fast lookup (hash map/set), order (sorting / two pointers), or exhaustive search? Name the concept before writing code.`,
      stage: 1,
      next: 'Ask for Hint 2 when you have picked a concept.',
    };
  }
  if (stage === 2) {
    return {
      hint: 'Hint 2 — Approach: 1) restate input/output with a tiny example, 2) try the brute force and its complexity, 3) look for repeated work to remove (lookup table, sorting, or two pointers), 4) handle edge cases (empty, single, duplicates) explicitly.',
      stage: 2,
      next: 'Ask for Hint 3 to see this as pseudocode.',
    };
  }
  if (stage === 3) {
    return {
      hint: 'Hint 3 — Pseudocode:\nread input\nstructure = build helper (map/set/sorted copy)\nfor each element:\n  if complement/condition found: output answer, stop\n  else: store current\noutput fallback (e.g. -1 -1)',
      stage: 3,
      next: 'Ask for Hint 4 only after attempting the code yourself.',
    };
  }
  return {
    hint: 'Hint 4 — Solution: implement the approach above directly (hash-map single pass is O(n)). If you are stuck, open AI Studio → Code Generator with your exact statement — but first compare its output against your pseudocode line by line.',
    stage: 4,
    next: 'Now run it against sample + edge cases in the Judge.',
  };
}

async function askConcept({ question }) {
  const ai = await tryAI(SYSTEM_LEARN, `Question: ${question}`, true);
  if (ai && ai.parsed && ai.parsed.explanation) {
    return { ...ai.parsed, engine: 'ai', model: ai.model };
  }
  const hit = KB.find((k) => k.match.test(question));
  if (hit) {
    return { explanation: hit.explanation, example: hit.example, practice: hit.practice, followUp: hit.followUp, engine: 'offline' };
  }
  return {
    explanation: `Good question: "${question.slice(0, 200)}". Break it into three parts — (1) what goes in, (2) what must come out, (3) one tiny example worked by hand. Most coding ideas click once the example is concrete.`,
    example: `# Work an example by hand first:\n# input  -> steps -> output\n# Then turn each step into 1-2 lines of code.`,
    practice: 'Pick the smallest possible input for your question and solve it on paper. What pattern do you see?',
    followUp: 'Next: ask about the specific data structure involved (array, map, tree, graph).',
    engine: 'offline',
  };
}

async function getHint({ problem, stage = 1 }) {
  const s = Math.max(1, Math.min(4, Number(stage) || 1));
  const ai = await tryAI(SYSTEM_HINT, `Problem: ${problem}\nStage: ${s}`, true);
  if (ai && ai.parsed && ai.parsed.hint) {
    return { ...ai.parsed, engine: 'ai', model: ai.model };
  }
  return { ...offlineHint(problem, s), engine: 'offline' };
}

module.exports = { askConcept, getHint };
