/**
 * DSA Problem bank — categorized coding problems with judge test cases
 * and per-language starter templates.
 */
const CATS = ['Arrays', 'Strings', 'Linked Lists', 'Stacks & Queues', 'Trees', 'Graphs', 'DP', 'Sorting & Searching'];

function tmpl(fn, langs) {
  return langs;
}

const PROBLEMS = [
  {
    id: 'two-sum',
    title: 'Two Sum',
    category: 'Arrays',
    difficulty: 'easy',
    description: 'Given n followed by n integers and a target, print the indices of the two numbers that add up to the target. If none exist, print "-1 -1".',
    inputFormat: 'Line 1: n. Line 2: n integers. Line 3: target.',
    samples: [{ stdin: '4\n2 7 11 15\n9', expected: '0 1' }],
    testcases: [
      { name: 'Sample', kind: 'sample', stdin: '4\n2 7 11 15\n9', expected: '0 1' },
      { name: 'Pair at end', kind: 'sample', stdin: '3\n3 2 4\n6', expected: '1 2' },
      { name: 'No solution', kind: 'edge', stdin: '2\n1 2\n10', expected: '-1 -1' },
      { name: 'Negatives', kind: 'edge', stdin: '4\n-1 -2 -3 -4\n-6', expected: '1 3' },
      { name: 'Large', kind: 'large', stdin: `1000\n${Array.from({ length: 1000 }, (_, i) => i + 1).join(' ')}\n1999`, expected: '998 999' },
    ],
    hints: ['Hash map: for each x, look for target − x in O(1).', 'Single pass: check complement BEFORE inserting current element.', 'Store value → index; return the pair the moment it matches.'],
    templates: {
      python: 'import sys\n\ndef solve():\n    data = list(map(int, sys.stdin.read().strip().split()))\n    # TODO: two-sum here\n\nif __name__ == "__main__":\n    solve()\n',
      cpp: '#include <bits/stdc++.h>\nusing namespace std;\nint main() {\n    ios::sync_with_stdio(false);\n    cin.tie(nullptr);\n    // TODO: two-sum here\n    return 0;\n}\n',
      c: '#include <stdio.h>\nint main(void) {\n    // TODO: two-sum here\n    return 0;\n}\n',
      java: 'import java.util.*;\npublic class Main {\n    public static void main(String[] args) {\n        // TODO: two-sum here\n    }\n}\n',
      javascript: 'const fs = require("node:fs");\nconst d = fs.readFileSync(0, "utf8").trim().split(/\\s+/).map(Number);\n// TODO: two-sum here\n',
    },
  },
  {
    id: 'reverse-string',
    title: 'Reverse a String',
    category: 'Strings',
    difficulty: 'easy',
    description: 'Read one line and print it reversed. Empty input prints an empty line.',
    inputFormat: 'One line of text.',
    samples: [{ stdin: 'hello', expected: 'olleh' }],
    testcases: [
      { name: 'Sample', kind: 'sample', stdin: 'hello', expected: 'olleh' },
      { name: 'Empty', kind: 'edge', stdin: '', expected: '' },
      { name: 'Single', kind: 'edge', stdin: 'a', expected: 'a' },
      { name: 'Sentence', kind: 'edge', stdin: 'A man a plan', expected: 'nalp a nam A' },
    ],
    hints: ['Two pointers from both ends, swap inward.', 'Or build the answer backwards in one pass.', 'Watch trailing newlines — strip only line endings.'],
    templates: {
      python: 'import sys\ns = sys.stdin.read().rstrip("\\n")\n# TODO: reverse and print\n',
      cpp: '#include <bits/stdc++.h>\nusing namespace std;\nint main() {\n    string s, line;\n    while (getline(cin, line)) s += line;\n    // TODO\n    return 0;\n}\n',
      c: '#include <stdio.h>\n#include <string.h>\nint main(void) {\n    // TODO\n    return 0;\n}\n',
      java: 'import java.util.*;\npublic class Main {\n    public static void main(String[] args) {\n        // TODO\n    }\n}\n',
      javascript: 'const fs = require("node:fs");\nconst s = fs.readFileSync(0, "utf8").replace(/\\r?\\n$/, "");\n// TODO\n',
    },
  },
  {
    id: 'valid-parentheses',
    title: 'Valid Parentheses',
    category: 'Stacks & Queues',
    difficulty: 'easy',
    description: 'Read a string of brackets ()[]{} and print YES if every opener is closed in the correct order, else NO.',
    inputFormat: 'One line string.',
    samples: [{ stdin: '()[]{}', expected: 'YES' }, { stdin: '(]', expected: 'NO' }],
    testcases: [
      { name: 'Sample yes', kind: 'sample', stdin: '()[]{}', expected: 'YES' },
      { name: 'Sample no', kind: 'sample', stdin: '(]', expected: 'NO' },
      { name: 'Nested', kind: 'edge', stdin: '{[()]}', expected: 'YES' },
      { name: 'Unclosed', kind: 'edge', stdin: '(((', expected: 'NO' },
      { name: 'Empty', kind: 'edge', stdin: '', expected: 'YES' },
    ],
    hints: ['Push openers on a stack.', 'On a closer, the top must be the matching opener — else NO.', 'Non-empty stack at the end means NO.'],
    templates: {
      python: 'import sys\ns = sys.stdin.read().strip()\n# TODO: stack check, print YES/NO\n',
      cpp: '#include <bits/stdc++.h>\nusing namespace std;\nint main() {\n    string s; if(!(cin >> s)) s = "";\n    // TODO\n    return 0;\n}\n',
      c: '#include <stdio.h>\n#include <string.h>\nint main(void) {\n    // TODO\n    return 0;\n}\n',
      java: 'import java.util.*;\npublic class Main {\n    public static void main(String[] args) {\n        // TODO\n    }\n}\n',
      javascript: 'const fs = require("node:fs");\nconst s = fs.readFileSync(0, "utf8").trim();\n// TODO\n',
    },
  },
  {
    id: 'binary-search',
    title: 'Binary Search',
    category: 'Sorting & Searching',
    difficulty: 'easy',
    description: 'Read n, a SORTED array of n integers, and a query q. Print the 0-based index of q, or -1 if absent.',
    inputFormat: 'Line 1: n. Line 2: n sorted integers. Line 3: q.',
    samples: [{ stdin: '5\n1 3 5 7 9\n7', expected: '3' }],
    testcases: [
      { name: 'Sample', kind: 'sample', stdin: '5\n1 3 5 7 9\n7', expected: '3' },
      { name: 'Missing', kind: 'edge', stdin: '5\n1 3 5 7 9\n4', expected: '-1' },
      { name: 'First', kind: 'edge', stdin: '3\n2 4 6\n2', expected: '0' },
      { name: 'Single hit', kind: 'edge', stdin: '1\n42\n42', expected: '0' },
    ],
    hints: ['Halve the range: lo=0, hi=n-1.', 'Compare mid, discard the wrong half.', 'Loop while lo <= hi — O(log n).'],
    templates: {
      python: 'import sys\ndata = list(map(int, sys.stdin.read().strip().split()))\n# TODO: binary search\n',
      cpp: '#include <bits/stdc++.h>\nusing namespace std;\nint main() {\n    // TODO\n    return 0;\n}\n',
      c: '#include <stdio.h>\nint main(void) {\n    // TODO\n    return 0;\n}\n',
      java: 'import java.util.*;\npublic class Main {\n    public static void main(String[] args) {\n        // TODO\n    }\n}\n',
      javascript: 'const fs = require("node:fs");\n// TODO\n',
    },
  },
  {
    id: 'merge-sorted',
    title: 'Merge Two Sorted Arrays',
    category: 'Arrays',
    difficulty: 'easy',
    description: 'Read n, m, then two sorted arrays. Print their merged sorted sequence.',
    inputFormat: 'Line 1: n m. Line 2: n ints. Line 3: m ints.',
    samples: [{ stdin: '3 3\n1 3 5\n2 4 6', expected: '1 2 3 4 5 6' }],
    testcases: [
      { name: 'Sample', kind: 'sample', stdin: '3 3\n1 3 5\n2 4 6', expected: '1 2 3 4 5 6' },
      { name: 'One empty', kind: 'edge', stdin: '0 3\n\n1 2 3', expected: '1 2 3' },
      { name: 'Duplicates', kind: 'edge', stdin: '2 2\n1 1\n1 1', expected: '1 1 1 1' },
    ],
    hints: ['Two pointers i, j at both starts.', 'Always take the smaller head, advance it.', 'Append leftovers when one side ends.'],
    templates: {
      python: 'import sys\n# TODO\n',
      cpp: '#include <bits/stdc++.h>\nusing namespace std;\nint main() {\n    // TODO\n    return 0;\n}\n',
      c: '#include <stdio.h>\nint main(void) {\n    // TODO\n    return 0;\n}\n',
      java: 'import java.util.*;\npublic class Main {\n    public static void main(String[] args) {\n        // TODO\n    }\n}\n',
      javascript: 'const fs = require("node:fs");\n// TODO\n',
    },
  },
  {
    id: 'climb-stairs',
    title: 'Climbing Stairs',
    category: 'DP',
    difficulty: 'easy',
    description: 'Read n. You can climb 1 or 2 steps. Print the number of distinct ways to reach step n.',
    inputFormat: 'Single integer n.',
    samples: [{ stdin: '5', expected: '8' }],
    testcases: [
      { name: 'Sample', kind: 'sample', stdin: '5', expected: '8' },
      { name: 'n=1', kind: 'edge', stdin: '1', expected: '1' },
      { name: 'n=2', kind: 'edge', stdin: '2', expected: '2' },
      { name: 'n=10', kind: 'sample', stdin: '10', expected: '89' },
    ],
    hints: ['dp[i] = dp[i-1] + dp[i-2] — like Fibonacci.', 'Base: dp[0]=1, dp[1]=1.', 'Iterate bottom-up, O(n) time O(1) space.'],
    templates: {
      python: 'import sys\nn = int(sys.stdin.read().strip() or 0)\n# TODO\n',
      cpp: '#include <bits/stdc++.h>\nusing namespace std;\nint main() {\n    // TODO\n    return 0;\n}\n',
      c: '#include <stdio.h>\nint main(void) {\n    // TODO\n    return 0;\n}\n',
      java: 'import java.util.*;\npublic class Main {\n    public static void main(String[] args) {\n        // TODO\n    }\n}\n',
      javascript: 'const fs = require("node:fs");\n// TODO\n',
    },
  },
  {
    id: 'sort-array',
    title: 'Sort an Array',
    category: 'Sorting & Searching',
    difficulty: 'easy',
    description: 'Read n then n integers. Print them sorted ascending.',
    inputFormat: 'Line 1: n. Line 2: n integers.',
    samples: [{ stdin: '5\n5 3 1 4 2', expected: '1 2 3 4 5' }],
    testcases: [
      { name: 'Sample', kind: 'sample', stdin: '5\n5 3 1 4 2', expected: '1 2 3 4 5' },
      { name: 'Reverse', kind: 'edge', stdin: '4\n4 3 2 1', expected: '1 2 3 4' },
      { name: 'Duplicates', kind: 'edge', stdin: '6\n3 1 3 1 2 2', expected: '1 1 2 2 3 3' },
    ],
    hints: ['Use the standard sort — O(n log n).', 'Hand-rolled bubble sort is O(n²) and will TLE on large cases.', 'Read exactly n numbers; ignore extra whitespace.'],
    templates: {
      python: 'import sys\ndata = list(map(int, sys.stdin.read().strip().split()))\n# TODO\n',
      cpp: '#include <bits/stdc++.h>\nusing namespace std;\nint main() {\n    // TODO\n    return 0;\n}\n',
      c: '#include <stdio.h>\n#include <stdlib.h>\nint main(void) {\n    // TODO\n    return 0;\n}\n',
      java: 'import java.util.*;\npublic class Main {\n    public static void main(String[] args) {\n        // TODO\n    }\n}\n',
      javascript: 'const fs = require("node:fs");\n// TODO\n',
    },
  },
  {
    id: 'palindrome-check',
    title: 'Palindrome Check',
    category: 'Strings',
    difficulty: 'easy',
    description: 'Read one line; print YES if it is a palindrome ignoring case and non-alphanumerics, else NO.',
    inputFormat: 'One line of text.',
    samples: [{ stdin: 'racecar', expected: 'YES' }],
    testcases: [
      { name: 'Sample', kind: 'sample', stdin: 'racecar', expected: 'YES' },
      { name: 'No', kind: 'sample', stdin: 'hello', expected: 'NO' },
      { name: 'Sentence', kind: 'edge', stdin: 'A man a plan a canal Panama', expected: 'YES' },
    ],
    hints: ['Normalize: lowercase + keep alphanumerics.', 'Two pointers inward, or compare with reversed copy.', 'Empty/single-char strings are palindromes.'],
    templates: {
      python: 'import sys\n# TODO\n',
      cpp: '#include <bits/stdc++.h>\nusing namespace std;\nint main() {\n    // TODO\n    return 0;\n}\n',
      c: '#include <stdio.h>\nint main(void) {\n    // TODO\n    return 0;\n}\n',
      java: 'import java.util.*;\npublic class Main {\n    public static void main(String[] args) {\n        // TODO\n    }\n}\n',
      javascript: 'const fs = require("node:fs");\n// TODO\n',
    },
  },
  {
    id: 'longest-substring',
    title: 'Longest Substring Without Repeats',
    category: 'Strings',
    difficulty: 'medium',
    description: 'Read one line s. Print the length of the longest substring without repeating characters.',
    inputFormat: 'One line string.',
    samples: [{ stdin: 'abcabcbb', expected: '3' }],
    testcases: [
      { name: 'Sample', kind: 'sample', stdin: 'abcabcbb', expected: '3' },
      { name: 'All same', kind: 'edge', stdin: 'bbbbb', expected: '1' },
      { name: 'Empty', kind: 'edge', stdin: '', expected: '0' },
      { name: 'Mixed', kind: 'sample', stdin: 'pwwkew', expected: '3' },
    ],
    hints: ['Sliding window with a last-seen map.', 'When s[r] repeats, move left past its previous index.', 'Track max window length — O(n).'],
    templates: {
      python: 'import sys\ns = sys.stdin.read().rstrip("\\n")\n# TODO\n',
      cpp: '#include <bits/stdc++.h>\nusing namespace std;\nint main() {\n    // TODO\n    return 0;\n}\n',
      c: '#include <stdio.h>\nint main(void) {\n    // TODO\n    return 0;\n}\n',
      java: 'import java.util.*;\npublic class Main {\n    public static void main(String[] args) {\n        // TODO\n    }\n}\n',
      javascript: 'const fs = require("node:fs");\n// TODO\n',
    },
  },
  {
    id: 'coin-change',
    title: 'Coin Change (Min Coins)',
    category: 'DP',
    difficulty: 'medium',
    description: 'Read amount A, then k coin denominations. Print the minimum coins to make A, or -1 if impossible.',
    inputFormat: 'Line 1: A. Line 2: k followed by k denominations.',
    samples: [{ stdin: '11\n3 1 2 5', expected: '3' }],
    testcases: [
      { name: 'Sample', kind: 'sample', stdin: '11\n3 1 2 5', expected: '3' },
      { name: 'Impossible', kind: 'edge', stdin: '3\n1 2', expected: '-1' },
      { name: 'Zero', kind: 'edge', stdin: '0\n2 1 2', expected: '0' },
    ],
    hints: ['dp[x] = 1 + min(dp[x-c]) over coins.', 'Init dp[0]=0, rest = INF.', 'Answer dp[A] or -1 — O(A·k).'],
    templates: {
      python: 'import sys\n# TODO\n',
      cpp: '#include <bits/stdc++.h>\nusing namespace std;\nint main() {\n    // TODO\n    return 0;\n}\n',
      c: '#include <stdio.h>\nint main(void) {\n    // TODO\n    return 0;\n}\n',
      java: 'import java.util.*;\npublic class Main {\n    public static void main(String[] args) {\n        // TODO\n    }\n}\n',
      javascript: 'const fs = require("node:fs");\n// TODO\n',
    },
  },
  {
    id: 'bfs-shortest',
    title: 'BFS Shortest Path',
    category: 'Graphs',
    difficulty: 'medium',
    description: 'Read n m, then m undirected edges, then source s and target t. Print the shortest distance (edges) from s to t, or -1 if unreachable. Nodes are 0-based.',
    inputFormat: 'Line 1: n m. Next m lines: u v. Last line: s t.',
    samples: [{ stdin: '4 3\n0 1\n1 2\n2 3\n0 3', expected: '3' }],
    testcases: [
      { name: 'Sample', kind: 'sample', stdin: '4 3\n0 1\n1 2\n2 3\n0 3', expected: '3' },
      { name: 'Unreachable', kind: 'edge', stdin: '3 1\n0 1\n0 2', expected: '-1' },
      { name: 'Same node', kind: 'edge', stdin: '2 1\n0 1\n1 1', expected: '0' },
    ],
    hints: ['BFS from s gives shortest hops in unweighted graphs.', 'Queue + visited + distance array.', 'Return -1 when t never visited.'],
    templates: {
      python: 'import sys\nfrom collections import deque\n# TODO: BFS\n',
      cpp: '#include <bits/stdc++.h>\nusing namespace std;\nint main() {\n    // TODO: BFS\n    return 0;\n}\n',
      c: '#include <stdio.h>\nint main(void) {\n    // TODO: BFS\n    return 0;\n}\n',
      java: 'import java.util.*;\npublic class Main {\n    public static void main(String[] args) {\n        // TODO: BFS\n    }\n}\n',
      javascript: 'const fs = require("node:fs");\n// TODO: BFS\n',
    },
  },
  {
    id: 'bst-validate',
    title: 'Validate Input Sequence (BST idea)',
    category: 'Trees',
    difficulty: 'medium',
    description: 'Read n then n integers (a preorder traversal). Print YES if it can be the preorder of a BST (strictly increasing stack rule), else NO. (Tests the classic stack-based validation.)',
    inputFormat: 'Line 1: n. Line 2: n integers.',
    samples: [{ stdin: '5\n2 1 3 4 5', expected: 'YES' }],
    testcases: [
      { name: 'Sample', kind: 'sample', stdin: '5\n2 1 3 4 5', expected: 'YES' },
      { name: 'Invalid', kind: 'edge', stdin: '3\n2 3 1', expected: 'NO' },
      { name: 'Sorted', kind: 'edge', stdin: '4\n1 2 3 4', expected: 'YES' },
    ],
    hints: ['Track lower bound with a stack.', 'Values must stay above the last popped ancestor.', 'One pass — O(n).'],
    templates: {
      python: 'import sys\n# TODO\n',
      cpp: '#include <bits/stdc++.h>\nusing namespace std;\nint main() {\n    // TODO\n    return 0;\n}\n',
      c: '#include <stdio.h>\nint main(void) {\n    // TODO\n    return 0;\n}\n',
      java: 'import java.util.*;\npublic class Main {\n    public static void main(String[] args) {\n        // TODO\n    }\n}\n',
      javascript: 'const fs = require("node:fs");\n// TODO\n',
    },
  },
  {
    id: 'linked-list-cycle',
    title: 'Linked List Cycle (Floyd)',
    category: 'Linked Lists',
    difficulty: 'medium',
    description: 'Read n, n values, then pos (index the tail links to, -1 for none). Print YES if the implied list has a cycle, else NO.',
    inputFormat: 'Line 1: n. Line 2: n values. Line 3: pos.',
    samples: [{ stdin: '4\n1 2 3 4\n1', expected: 'YES' }],
    testcases: [
      { name: 'Sample', kind: 'sample', stdin: '4\n1 2 3 4\n1', expected: 'YES' },
      { name: 'No cycle', kind: 'sample', stdin: '3\n1 2 3\n-1', expected: 'NO' },
      { name: 'Self loop', kind: 'edge', stdin: '1\n9\n0', expected: 'YES' },
    ],
    hints: ['Model next[i] = i+1, last → pos.', 'Floyd: slow=+1, fast=+2; meet ⇒ cycle.', 'O(n) time, O(1) space.'],
    templates: {
      python: 'import sys\n# TODO: Floyd\n',
      cpp: '#include <bits/stdc++.h>\nusing namespace std;\nint main() {\n    // TODO\n    return 0;\n}\n',
      c: '#include <stdio.h>\nint main(void) {\n    // TODO\n    return 0;\n}\n',
      java: 'import java.util.*;\npublic class Main {\n    public static void main(String[] args) {\n        // TODO\n    }\n}\n',
      javascript: 'const fs = require("node:fs");\n// TODO\n',
    },
  },
  {
    id: 'trap-rain',
    title: 'Trapping Rain Water',
    category: 'Arrays',
    difficulty: 'hard',
    description: 'Read n then n bar heights. Print total trapped rain water.',
    inputFormat: 'Line 1: n. Line 2: n heights.',
    samples: [{ stdin: '12\n0 1 0 2 1 0 1 3 2 1 2 1', expected: '6' }],
    testcases: [
      { name: 'Sample', kind: 'sample', stdin: '12\n0 1 0 2 1 0 1 3 2 1 2 1', expected: '6' },
      { name: 'Flat', kind: 'edge', stdin: '4\n2 2 2 2', expected: '0' },
      { name: 'Valley', kind: 'edge', stdin: '3\n3 0 3', expected: '3' },
    ],
    hints: ['Water at i = min(maxL, maxR) − h[i].', 'Two pointers track both maxes in O(1) space.', 'Skip when height exceeds both maxes.'],
    templates: {
      python: 'import sys\n# TODO\n',
      cpp: '#include <bits/stdc++.h>\nusing namespace std;\nint main() {\n    // TODO\n    return 0;\n}\n',
      c: '#include <stdio.h>\nint main(void) {\n    // TODO\n    return 0;\n}\n',
      java: 'import java.util.*;\npublic class Main {\n    public static void main(String[] args) {\n        // TODO\n    }\n}\n',
      javascript: 'const fs = require("node:fs");\n// TODO\n',
    },
  },
  {
    id: 'word-ladder-len',
    title: 'Shortest Word Chain',
    category: 'Graphs',
    difficulty: 'hard',
    description: 'Read begin word, end word, then k dictionary words. Changing one letter at a time through dictionary words, print the shortest chain length (words count) or 0 if impossible.',
    inputFormat: 'Line 1: begin end. Line 2: k. Next k lines: words.',
    samples: [{ stdin: 'hit cog\n6\nhot\ndot\ndog\nlot\nlog\ncog', expected: '5' }],
    testcases: [
      { name: 'Sample', kind: 'sample', stdin: 'hit cog\n6\nhot\ndot\ndog\nlot\nlog\ncog', expected: '5' },
      { name: 'Impossible', kind: 'edge', stdin: 'hit cog\n2\nhot\ndot', expected: '0' },
    ],
    hints: ['BFS over word graph (edges = 1-letter diff).', 'Precompute wildcard buckets (*ot) for O(1) neighbors.', 'Count levels; return 0 when queue empties.'],
    templates: {
      python: 'import sys\nfrom collections import deque\n# TODO: word ladder BFS\n',
      cpp: '#include <bits/stdc++.h>\nusing namespace std;\nint main() {\n    // TODO\n    return 0;\n}\n',
      c: '#include <stdio.h>\nint main(void) {\n    // TODO\n    return 0;\n}\n',
      java: 'import java.util.*;\npublic class Main {\n    public static void main(String[] args) {\n        // TODO\n    }\n}\n',
      javascript: 'const fs = require("node:fs");\n// TODO\n',
    },
  },
];

function listProblems({ category, difficulty, search } = {}) {
  return PROBLEMS.filter((p) => {
    if (category && p.category !== category) return false;
    if (difficulty && p.difficulty !== difficulty) return false;
    if (search && !`${p.title} ${p.id}`.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  }).map((p) => ({
    id: p.id, title: p.title, category: p.category, difficulty: p.difficulty,
    description: p.description, samples: p.samples,
  }));
}

function getProblem(id) {
  return PROBLEMS.find((p) => p.id === id) || null;
}

module.exports = { PROBLEMS, CATS, listProblems, getProblem };
