/**
 * AI Code Generator — prompt in, code out (C++ / C / Java / Python / JavaScript).
 * Offline templates cover classic tasks; the LLM handles the long tail.
 */
const { tryAI, engineOf } = require('./offline');

const LANGS = ['cpp', 'c', 'java', 'python', 'javascript'];

function starter(lang, prompt) {
  const p = prompt.trim();
  if (lang === 'python') {
    return `"""${p}"""\n\ndef solve():\n    # TODO: implement\n    data = input().strip()\n    print(data)\n\n\nif __name__ == "__main__":\n    solve()\n`;
  }
  if (lang === 'javascript') {
    return `// ${p}\nconst fs = require('node:fs');\nconst input = fs.readFileSync(0, 'utf8').trim().split(/\\s+/);\n// TODO: implement\nconsole.log(input.join(' '));\n`;
  }
  if (lang === 'java') {
    return `import java.util.*;\n\npublic class Main {\n    // ${p}\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        // TODO: implement\n        if (sc.hasNextLine()) System.out.println(sc.nextLine());\n    }\n}\n`;
  }
  if (lang === 'c') {
    return `#include <stdio.h>\n#include <string.h>\n\n// ${p}\nint main(void) {\n    // TODO: implement\n    char buf[1024];\n    if (fgets(buf, sizeof buf, stdin)) printf("%s", buf);\n    return 0;\n}\n`;
  }
  return `#include <bits/stdc++.h>\nusing namespace std;\n\n// ${p}\nint main() {\n    ios::sync_with_stdio(false);\n    cin.tie(nullptr);\n    // TODO: implement\n    string line, all;\n    while (getline(cin, line)) { all += line + "\\n"; }\n    cout << all;\n    return 0;\n}\n`;
}

const TEMPLATES = [
  {
    match: /fibonacci/i,
    explain: 'Iterative Fibonacci — O(n) time, O(1) space. Reads n, prints the first n numbers.',
    code: {
      python: `def solve():\n    import sys\n    data = sys.stdin.read().strip().split()\n    n = int(data[0]) if data else 10\n    a, b = 0, 1\n    out = []\n    for _ in range(n):\n        out.append(str(a))\n        a, b = b, a + b\n    print(' '.join(out))\n\n\nif __name__ == "__main__":\n    solve()\n`,
      javascript: `const fs = require('node:fs');\nconst n = parseInt(fs.readFileSync(0, 'utf8').trim() || '10', 10);\nlet a = 0, b = 1;\nconst out = [];\nfor (let i = 0; i < n; i++) { out.push(a); [a, b] = [b, a + b]; }\nconsole.log(out.join(' '));\n`,
      java: `import java.util.*;\n\npublic class Main {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        int n = sc.hasNextInt() ? sc.nextInt() : 10;\n        long a = 0, b = 1;\n        StringBuilder sb = new StringBuilder();\n        for (int i = 0; i < n; i++) {\n            if (i > 0) sb.append(' ');\n            sb.append(a);\n            long t = a + b; a = b; b = t;\n        }\n        System.out.println(sb);\n    }\n}\n`,
      c: `#include <stdio.h>\n\nint main(void) {\n    int n;\n    if (scanf("%d", &n) != 1) n = 10;\n    long long a = 0, b = 1;\n    for (int i = 0; i < n; i++) {\n        if (i) printf(" ");\n        printf("%lld", a);\n        long long t = a + b; a = b; b = t;\n    }\n    printf("\\n");\n    return 0;\n}\n`,
      cpp: `#include <bits/stdc++.h>\nusing namespace std;\n\nint main() {\n    ios::sync_with_stdio(false);\n    cin.tie(nullptr);\n    int n;\n    if (!(cin >> n)) n = 10;\n    long long a = 0, b = 1;\n    for (int i = 0; i < n; i++) {\n        if (i) cout << ' ';\n        cout << a;\n        long long t = a + b; a = b; b = t;\n    }\n    cout << '\\n';\n    return 0;\n}\n`,
    },
  },
  {
    match: /two\s*sum|pair.*sum/i,
    explain: 'Two-sum with a hash map — O(n) time, O(n) space. Reads n, array, target; prints indices.',
    code: {
      python: `def solve():\n    import sys\n    data = list(map(int, sys.stdin.read().strip().split()))\n    if len(data) < 3:\n        print("-1 -1")\n        return\n    n, arr, target = data[0], data[1:1 + data[0]], data[1 + data[0]]\n    seen = {}\n    for i, x in enumerate(arr):\n        if target - x in seen:\n            print(f"{seen[target - x]} {i}")\n            return\n        seen[x] = i\n    print("-1 -1")\n\n\nif __name__ == "__main__":\n    solve()\n`,
      javascript: `const fs = require('node:fs');\nconst d = fs.readFileSync(0, 'utf8').trim().split(/\\s+/).map(Number);\nconst n = d[0] || 0, arr = d.slice(1, 1 + n), target = d[1 + n];\nconst seen = new Map();\nfor (let i = 0; i < arr.length; i++) {\n  if (seen.has(target - arr[i])) { console.log(seen.get(target - arr[i]) + ' ' + i); process.exit(0); }\n  seen.set(arr[i], i);\n}\nconsole.log('-1 -1');\n`,
      java: `import java.util.*;\n\npublic class Main {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        if (!sc.hasNextInt()) return;\n        int n = sc.nextInt();\n        int[] a = new int[n];\n        for (int i = 0; i < n; i++) a[i] = sc.nextInt();\n        int target = sc.nextInt();\n        Map<Integer, Integer> seen = new HashMap<>();\n        for (int i = 0; i < n; i++) {\n            if (seen.containsKey(target - a[i])) {\n                System.out.println(seen.get(target - a[i]) + " " + i);\n                return;\n            }\n            seen.put(a[i], i);\n        }\n        System.out.println("-1 -1");\n    }\n}\n`,
      c: `#include <stdio.h>\n\nint main(void) {\n    int n;\n    if (scanf("%d", &n) != 1) return 0;\n    int a[100000];\n    for (int i = 0; i < n; i++) scanf("%d", &a[i]);\n    int t; scanf("%d", &t);\n    for (int i = 0; i < n; i++)\n        for (int j = i + 1; j < n; j++)\n            if (a[i] + a[j] == t) { printf("%d %d\\n", i, j); return 0; }\n    printf("-1 -1\\n");\n    return 0;\n}\n`,
      cpp: `#include <bits/stdc++.h>\nusing namespace std;\n\nint main() {\n    ios::sync_with_stdio(false);\n    cin.tie(nullptr);\n    int n;\n    if (!(cin >> n)) return 0;\n    vector<int> a(n);\n    for (auto &x : a) cin >> x;\n    int t; cin >> t;\n    unordered_map<int,int> seen;\n    for (int i = 0; i < n; i++) {\n        if (seen.count(t - a[i])) { cout << seen[t - a[i]] << ' ' << i << '\\n'; return 0; }\n        seen[a[i]] = i;\n    }\n    cout << "-1 -1\\n";\n    return 0;\n}\n`,
    },
  },
  {
    match: /palindrome/i,
    explain: 'Palindrome check by two pointers — O(n) time, O(1) space.',
    code: {
      python: `def solve():\n    import sys\n    s = sys.stdin.read().strip()\n    t = ''.join(ch.lower() for ch in s if ch.isalnum())\n    print("YES" if t == t[::-1] else "NO")\n\n\nif __name__ == "__main__":\n    solve()\n`,
      javascript: `const fs = require('node:fs');\nconst s = fs.readFileSync(0, 'utf8').trim().toLowerCase().replace(/[^a-z0-9]/g, '');\nconsole.log(s === [...s].reverse().join('') ? 'YES' : 'NO');\n`,
      java: `import java.util.*;\n\npublic class Main {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        StringBuilder sb = new StringBuilder();\n        while (sc.hasNextLine()) sb.append(sc.nextLine());\n        String t = sb.toString().toLowerCase().replaceAll("[^a-z0-9]", "");\n        String r = new StringBuilder(t).reverse().toString();\n        System.out.println(t.equals(r) ? "YES" : "NO");\n    }\n}\n`,
      c: `#include <stdio.h>\n#include <string.h>\n#include <ctype.h>\n\nint main(void) {\n    char s[100000];\n    if (!fgets(s, sizeof s, stdin)) return 0;\n    int i = 0, j = strlen(s) - 1;\n    while (j >= 0 && (s[j] == '\\n' || s[j] == '\\r')) j--;\n    while (i < j) {\n        while (i < j && !isalnum((unsigned char)s[i])) i++;\n        while (i < j && !isalnum((unsigned char)s[j])) j--;\n        if (tolower((unsigned char)s[i]) != tolower((unsigned char)s[j])) { printf("NO\\n"); return 0; }\n        i++; j--;\n    }\n    printf("YES\\n");\n    return 0;\n}\n`,
      cpp: `#include <bits/stdc++.h>\nusing namespace std;\n\nint main() {\n    ios::sync_with_stdio(false);\n    cin.tie(nullptr);\n    string s, line;\n    while (getline(cin, line)) s += line;\n    string t;\n    for (char c : s) if (isalnum((unsigned char)c)) t += tolower((unsigned char)c);\n    string r = t;\n    reverse(r.begin(), r.end());\n    cout << (t == r ? "YES" : "NO") << '\\n';\n    return 0;\n}\n`,
    },
  },
  {
    match: /sort|bubble|merge|quick/i,
    explain: 'Fast sorting with the standard library — O(n log n) time. Reads n then n integers.',
    code: {
      python: `def solve():\n    import sys\n    data = list(map(int, sys.stdin.read().strip().split()))\n    a = data[1:1 + data[0]] if data else []\n    a.sort()\n    print(' '.join(map(str, a)))\n\n\nif __name__ == "__main__":\n    solve()\n`,
      javascript: `const fs = require('node:fs');\nconst d = fs.readFileSync(0, 'utf8').trim().split(/\\s+/).map(Number);\nconst a = d.slice(1, 1 + d[0]);\na.sort((x, y) => x - y);\nconsole.log(a.join(' '));\n`,
      java: `import java.util.*;\n\npublic class Main {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        if (!sc.hasNextInt()) return;\n        int n = sc.nextInt();\n        int[] a = new int[n];\n        for (int i = 0; i < n; i++) a[i] = sc.nextInt();\n        Arrays.sort(a);\n        for (int i = 0; i < n; i++) System.out.print((i ? " " : "") + a[i]);\n        System.out.println();\n    }\n}\n`,
      c: `#include <stdio.h>\n#include <stdlib.h>\nint cmp(const void *a, const void *b) { return *(int*)a - *(int*)b; }\nint main(void) {\n    int n;\n    if (scanf("%d", &n) != 1) return 0;\n    int a[100000];\n    for (int i = 0; i < n; i++) scanf("%d", &a[i]);\n    qsort(a, n, sizeof(int), cmp);\n    for (int i = 0; i < n; i++) printf("%d%c", a[i], i + 1 == n ? '\\n' : ' ');\n    return 0;\n}\n`,
      cpp: `#include <bits/stdc++.h>\nusing namespace std;\n\nint main() {\n    ios::sync_with_stdio(false);\n    cin.tie(nullptr);\n    int n;\n    if (!(cin >> n)) return 0;\n    vector<int> a(n);\n    for (auto &x : a) cin >> x;\n    sort(a.begin(), a.end());\n    for (int i = 0; i < n; i++) cout << a[i] << (i + 1 == n ? '\\n' : ' ');\n    return 0;\n}\n`,
    },
  },
];

const SYSTEM = `You are Codexa AI, a senior competitive-programming tutor. Given a task and target language, respond with STRICT JSON: {"code": "<complete runnable program reading from stdin, printing to stdout>", "explanation": "<2-4 sentence approach + complexity>", "timeComplexity": "e.g. O(n)", "spaceComplexity": "e.g. O(n)"}. No markdown fences inside values.`;

async function generateCode({ prompt, language = 'cpp' }) {
  const lang = String(language).toLowerCase() === 'js' ? 'javascript' : String(language).toLowerCase();
  const ai = await tryAI(SYSTEM, `Language: ${lang}\nTask: ${prompt}`, true);
  if (ai && ai.parsed && ai.parsed.code) {
    return {
      code: ai.parsed.code,
      explanation: ai.parsed.explanation || '',
      timeComplexity: ai.parsed.timeComplexity || null,
      spaceComplexity: ai.parsed.spaceComplexity || null,
      engine: 'ai',
      model: ai.model,
    };
  }
  const hit = TEMPLATES.find((t) => t.match.test(prompt));
  if (hit && hit.code[lang]) {
    return { code: hit.code[lang], explanation: hit.explain, timeComplexity: null, spaceComplexity: null, engine: 'offline' };
  }
  return {
    code: starter(lang, prompt),
    explanation: `Starter template for "${prompt.trim().slice(0, 120)}". It echoes stdin so it runs immediately — replace the TODO with your logic. (Offline template; configure AI_API_KEY for full generation.)`,
    timeComplexity: null,
    spaceComplexity: null,
    engine: 'offline',
  };
}

module.exports = { generateCode, LANGS };
