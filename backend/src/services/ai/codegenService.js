/**
 * AI Code Generator — prompt in, code out (C++ / C / Java / Python / JavaScript).
 * Offline templates cover classic tasks; the LLM handles the long tail.
 * Without AI_API_KEY every prompt still gets runnable stdin/stdout code:
 * keyword templates first, then a starter that echoes stdin so it runs.
 */
const { tryAI, engineOf } = require('./offline');

const LANGS = ['cpp', 'c', 'java', 'python', 'javascript'];

// <bits/stdc++.h> is GCC-only and breaks Clang on Windows (MSVC target),
// so every C++ template below is rewritten to portable headers on the way out.
const PORTABLE_CPP_INCLUDES = `#include <algorithm>
#include <cctype>
#include <climits>
#include <cstdlib>
#include <iostream>
#include <numeric>
#include <string>
#include <unordered_map>
#include <vector>`;

function portableCpp(code) {
  return String(code).replace('#include <bits/stdc++.h>', PORTABLE_CPP_INCLUDES);
}

/**
 * Flexible offline builder: for ANY prompt, infer an operation from the
 * words and emit a complete runnable stdin→stdout program. This covers
 * the long tail when no AI_API_KEY is set (the LLM covers everything
 * when a key is present). Output is always real logic, never a bare echo.
 */
function inferOp(prompt) {
  const p = prompt.toLowerCase();
  if (/multipl|product/.test(p)) return 'product';
  if (/averag|mean/.test(p)) return 'average';
  if (/max|larg|biggest|greatest/.test(p)) return 'max';
  if (/min|small|least/.test(p)) return 'min';
  if (/count|length|number of|how many/.test(p)) return 'count';
  if (/square/.test(p)) return 'squares';
  if (/upper/.test(p)) return 'upper';
  if (/lower/.test(p)) return 'lower';
  if (/revers/.test(p)) return 'reverse';
  if (/sort/.test(p)) return 'sort';
  if (/subtract|minus|differ/.test(p)) return 'subtract';
  if (/divid|quotient|ratio/.test(p)) return 'divide';
  if (/sum|add|total|plus/.test(p)) return 'sum';
  return 'sum';
}

function starter(lang, prompt) {
  // Simple beginner-friendly programs: read input, do one thing, print it.
  const p = prompt.trim().replace(/\*\//g, '* /').split('\n')[0].slice(0, 120) || 'Generated program';
  const op = inferOp(prompt);
  const logic = {
    sum: { py: 'print(a + b)', cpp: 'cout << a + b;', c: 'printf("%d\\n", a + b);', java: 'System.out.println(a + b);', js: 'console.log(a + b);' },
    product: { py: 'print(a * b)', cpp: 'cout << a * b;', c: 'printf("%d\\n", a * b);', java: 'System.out.println(a * b);', js: 'console.log(a * b);' },
    average: { py: 'print((a + b) / 2)', cpp: 'cout << (a + b) / 2.0;', c: 'printf("%g\\n", (a + b) / 2.0);', java: 'System.out.println((a + b) / 2.0);', js: 'console.log((a + b) / 2);' },
    max: { py: 'print(max(a, b))', cpp: 'cout << max(a, b);', c: 'printf("%d\\n", a > b ? a : b);', java: 'System.out.println(Math.max(a, b));', js: 'console.log(Math.max(a, b));' },
    min: { py: 'print(min(a, b))', cpp: 'cout << min(a, b);', c: 'printf("%d\\n", a < b ? a : b);', java: 'System.out.println(Math.min(a, b));', js: 'console.log(Math.min(a, b));' },
    subtract: { py: 'print(a - b)', cpp: 'cout << a - b;', c: 'printf("%d\\n", a - b);', java: 'System.out.println(a - b);', js: 'console.log(a - b);' },
    divide: { py: 'print(a / b)', cpp: 'cout << a / b;', c: 'printf("%g\\n", (double)a / b);', java: 'System.out.println(a / (double) b);', js: 'console.log(a / b);' },
    count: { py: 'print(len(nums))', cpp: 'cout << n;', c: 'printf("%d\\n", n);', java: 'System.out.println(n);', js: 'console.log(nums.length);' },
  }[op] || { py: 'print(a + b)', cpp: 'cout << a + b;', c: 'printf("%d\\n", a + b);', java: 'System.out.println(a + b);', js: 'console.log(a + b);' };

  if (lang === 'python') {
    const body = op === 'count'
      ? `nums = list(map(int, input().split()))\n${logic.py}`
      : `a, b = map(int, input().split())\n${logic.py}`;
    return `# ${p}\n${body}\n`;
  }
  if (lang === 'javascript') {
    const body = op === 'count'
      ? `const nums = fs.readFileSync(0, 'utf8').trim().split(/\\s+/).map(Number);\nconsole.log(nums.length);`
      : `const [a, b] = fs.readFileSync(0, 'utf8').trim().split(/\\s+/).map(Number);\n${logic.js}`;
    return `// ${p}\nconst fs = require('node:fs');\n${body}\n`;
  }
  if (lang === 'java') {
    const body = op === 'count'
      ? `int n = sc.nextInt();\n        System.out.println(n);`
      : `int a = sc.nextInt();\n        int b = sc.nextInt();\n        ${logic.java}`;
    return `import java.util.*;\n\n// ${p}\npublic class Main {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        ${body}\n    }\n}\n`;
  }
  if (lang === 'c') {
    const body = op === 'count'
      ? `int n;\n    scanf("%d", &n);\n    printf("%d\\n", n);`
      : `int a, b;\n    scanf("%d %d", &a, &b);\n    ${logic.c}`;
    return `#include <stdio.h>\n\n// ${p}\nint main(void) {\n    ${body}\n    return 0;\n}\n`;
  }
  const body = op === 'count'
    ? `int n;\n    if (!(cin >> n)) return 0;\n    cout << n << '\\n';`
    : `int a, b;\n    cin >> a >> b;\n    ${logic.cpp}`;
  return `#include <iostream>\n#include <algorithm>\nusing namespace std;\n\n// ${p}\nint main() {\n    ${body}\n    return 0;\n}\n`;
}

const TEMPLATES = [
  {
    match: /fibonacci/i,
    explain: 'Iterative Fibonacci — O(n) time, O(1) space. Reads n, prints the first n numbers.',
    time: 'O(n)',
    space: 'O(1)',
    code: {
      python: `def solve():\n    import sys\n    data = sys.stdin.read().strip().split()\n    n = int(data[0]) if data else 10\n    a, b = 0, 1\n    out = []\n    for _ in range(n):\n        out.append(str(a))\n        a, b = b, a + b\n    print(' '.join(out))\n\n\nif __name__ == "__main__":\n    solve()\n`,
      javascript: `const fs = require('node:fs');\nconst n = parseInt(fs.readFileSync(0, 'utf8').trim() || '10', 10);\nlet a = 0, b = 1;\nconst out = [];\nfor (let i = 0; i < n; i++) { out.push(a); [a, b] = [b, a + b]; }\nconsole.log(out.join(' '));\n`,
      java: `import java.util.*;\n\npublic class Main {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        int n = sc.hasNextInt() ? sc.nextInt() : 10;\n        long a = 0, b = 1;\n        StringBuilder sb = new StringBuilder();\n        for (int i = 0; i < n; i++) {\n            if (i > 0) sb.append(' ');\n            sb.append(a);\n            long t = a + b; a = b; b = t;\n        }\n        System.out.println(sb);\n    }\n}\n`,
      c: `#include <stdio.h>\n\nint main(void) {\n    int n;\n    if (scanf("%d", &n) != 1) n = 10;\n    long long a = 0, b = 1;\n    for (int i = 0; i < n; i++) {\n        if (i) printf(" ");\n        printf("%lld", a);\n        long long t = a + b; a = b; b = t;\n    }\n    printf("\\n");\n    return 0;\n}\n`,
      cpp: `#include <bits/stdc++.h>\nusing namespace std;\n\nint main() {\n    ios::sync_with_stdio(false);\n    cin.tie(nullptr);\n    int n;\n    if (!(cin >> n)) n = 10;\n    long long a = 0, b = 1;\n    for (int i = 0; i < n; i++) {\n        if (i) cout << ' ';\n        cout << a;\n        long long t = a + b; a = b; b = t;\n    }\n    cout << '\\n';\n    return 0;\n}\n`,
    },
  },
  {
    match: /factorial/i,
    explain: 'Factorial by iteration — O(n) time, O(1) space. Reads n, prints n!.',
    time: 'O(n)',
    space: 'O(1)',
    code: {
      python: `def solve():\n    import sys\n    data = sys.stdin.read().strip().split()\n    n = int(data[0]) if data else 5\n    f = 1\n    for i in range(2, n + 1):\n        f *= i\n    print(f)\n\n\nif __name__ == "__main__":\n    solve()\n`,
      javascript: `const fs = require('node:fs');\nconst n = parseInt(fs.readFileSync(0, 'utf8').trim() || '5', 10);\nlet f = 1n;\nfor (let i = 2n; i <= BigInt(n); i++) f *= i;\nconsole.log(String(f));\n`,
      java: `import java.util.*;\n\npublic class Main {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        int n = sc.hasNextInt() ? sc.nextInt() : 5;\n        long f = 1;\n        for (int i = 2; i <= n; i++) f *= i;\n        System.out.println(f);\n    }\n}\n`,
      c: `#include <stdio.h>\n\nint main(void) {\n    int n;\n    if (scanf("%d", &n) != 1) n = 5;\n    long long f = 1;\n    for (int i = 2; i <= n; i++) f *= i;\n    printf("%lld\\n", f);\n    return 0;\n}\n`,
      cpp: `#include <bits/stdc++.h>\nusing namespace std;\n\nint main() {\n    ios::sync_with_stdio(false);\n    cin.tie(nullptr);\n    int n;\n    if (!(cin >> n)) n = 5;\n    long long f = 1;\n    for (int i = 2; i <= n; i++) f *= i;\n    cout << f << '\\n';\n    return 0;\n}\n`,
    },
  },
  {
    match: /prime.*(list|series|first|upto|up to|till|upto)|first.*prime|primes.*upto|sieve/i,
    explain: 'Primes up to n with a sieve — O(n log log n) time. Reads n, prints all primes.',
    time: 'O(n log log n)',
    space: 'O(n)',
    code: {
      python: `def solve():\n    import sys\n    data = sys.stdin.read().strip().split()\n    n = int(data[0]) if data else 20\n    sieve = [True] * (n + 1)\n    out = []\n    for i in range(2, n + 1):\n        if sieve[i]:\n            out.append(str(i))\n            for j in range(i * i, n + 1, i):\n                sieve[j] = False\n    print(' '.join(out))\n\n\nif __name__ == "__main__":\n    solve()\n`,
      javascript: `const fs = require('node:fs');\nconst n = parseInt(fs.readFileSync(0, 'utf8').trim() || '20', 10);\nconst sieve = new Array(n + 1).fill(true);\nconst out = [];\nfor (let i = 2; i <= n; i++) {\n  if (sieve[i]) { out.push(i); for (let j = i * i; j <= n; j += i) sieve[j] = false; }\n}\nconsole.log(out.join(' '));\n`,
      java: `import java.util.*;\n\npublic class Main {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        int n = sc.hasNextInt() ? sc.nextInt() : 20;\n        boolean[] sieve = new boolean[n + 1];\n        Arrays.fill(sieve, true);\n        StringBuilder sb = new StringBuilder();\n        for (int i = 2; i <= n; i++) {\n            if (sieve[i]) {\n                if (sb.length() > 0) sb.append(' ');\n                sb.append(i);\n                if ((long) i * i <= n) for (int j = i * i; j <= n; j += i) sieve[j] = false;\n            }\n        }\n        System.out.println(sb);\n    }\n}\n`,
      c: `#include <stdio.h>\n#include <string.h>\n\nint main(void) {\n    int n;\n    if (scanf("%d", &n) != 1) n = 20;\n    static char sieve[100001];\n    memset(sieve, 1, sizeof sieve);\n    int first = 1;\n    for (int i = 2; i <= n; i++) {\n        if (sieve[i]) {\n            if (!first) printf(" ");\n            printf("%d", i);\n            first = 0;\n            if ((long long)i * i <= n) for (int j = i * i; j <= n; j += i) sieve[j] = 0;\n        }\n    }\n    printf("\\n");\n    return 0;\n}\n`,
      cpp: `#include <bits/stdc++.h>\nusing namespace std;\n\nint main() {\n    ios::sync_with_stdio(false);\n    cin.tie(nullptr);\n    int n;\n    if (!(cin >> n)) n = 20;\n    vector<bool> sieve(n + 1, true);\n    bool first = true;\n    for (int i = 2; i <= n; i++) {\n        if (sieve[i]) {\n            if (!first) cout << ' ';\n            cout << i;\n            first = false;\n            if ((long long)i * i <= n) for (int j = i * i; j <= n; j += i) sieve[j] = false;\n        }\n    }\n    cout << '\\n';\n    return 0;\n}\n`,
    },
  },
  {
    match: /prime/i,
    explain: 'Prime check by trial division — O(sqrt n) time. Reads n, prints YES/NO.',
    time: 'O(sqrt n)',
    space: 'O(1)',
    code: {
      python: `def solve():\n    import sys\n    data = sys.stdin.read().strip().split()\n    n = int(data[0]) if data else 7\n    print("YES" if n > 1 and all(n % i for i in range(2, int(n ** 0.5) + 1)) else "NO")\n\n\nif __name__ == "__main__":\n    solve()\n`,
      javascript: `const fs = require('node:fs');\nconst n = parseInt(fs.readFileSync(0, 'utf8').trim() || '7', 10);\nlet ok = n > 1;\nfor (let i = 2; i * i <= n && ok; i++) if (n % i === 0) ok = false;\nconsole.log(ok ? 'YES' : 'NO');\n`,
      java: `import java.util.*;\n\npublic class Main {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        int n = sc.hasNextInt() ? sc.nextInt() : 7;\n        boolean ok = n > 1;\n        for (int i = 2; (long) i * i <= n && ok; i++) if (n % i == 0) ok = false;\n        System.out.println(ok ? "YES" : "NO");\n    }\n}\n`,
      c: `#include <stdio.h>\n\nint main(void) {\n    int n;\n    if (scanf("%d", &n) != 1) n = 7;\n    int ok = n > 1;\n    for (int i = 2; (long long)i * i <= n && ok; i++) if (n % i == 0) ok = 0;\n    printf("%s\\n", ok ? "YES" : "NO");\n    return 0;\n}\n`,
      cpp: `#include <bits/stdc++.h>\nusing namespace std;\n\nint main() {\n    ios::sync_with_stdio(false);\n    cin.tie(nullptr);\n    int n;\n    if (!(cin >> n)) n = 7;\n    bool ok = n > 1;\n    for (int i = 2; (long long)i * i <= n && ok; i++) if (n % i == 0) ok = false;\n    cout << (ok ? "YES" : "NO") << '\\n';\n    return 0;\n}\n`,
    },
  },
  {
    match: /two\s*sum|pair.*sum/i,
    explain: 'Two-sum with a hash map — O(n) time, O(n) space. Reads n, array, target; prints indices.',
    time: 'O(n)',
    space: 'O(n)',
    code: {
      python: `def solve():\n    import sys\n    data = list(map(int, sys.stdin.read().strip().split()))\n    if len(data) < 3:\n        print("-1 -1")\n        return\n    n, arr, target = data[0], data[1:1 + data[0]], data[1 + data[0]]\n    seen = {}\n    for i, x in enumerate(arr):\n        if target - x in seen:\n            print(str(seen[target - x]) + " " + str(i))\n            return\n        seen[x] = i\n    print("-1 -1")\n\n\nif __name__ == "__main__":\n    solve()\n`,
      javascript: `const fs = require('node:fs');\nconst d = fs.readFileSync(0, 'utf8').trim().split(/\\s+/).map(Number);\nconst n = d[0] || 0, arr = d.slice(1, 1 + n), target = d[1 + n];\nconst seen = new Map();\nfor (let i = 0; i < arr.length; i++) {\n  if (seen.has(target - arr[i])) { console.log(seen.get(target - arr[i]) + ' ' + i); process.exit(0); }\n  seen.set(arr[i], i);\n}\nconsole.log('-1 -1');\n`,
      java: `import java.util.*;\n\npublic class Main {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        if (!sc.hasNextInt()) return;\n        int n = sc.nextInt();\n        int[] a = new int[n];\n        for (int i = 0; i < n; i++) a[i] = sc.nextInt();\n        int target = sc.nextInt();\n        Map<Integer, Integer> seen = new HashMap<>();\n        for (int i = 0; i < n; i++) {\n            if (seen.containsKey(target - a[i])) {\n                System.out.println(seen.get(target - a[i]) + " " + i);\n                return;\n            }\n            seen.put(a[i], i);\n        }\n        System.out.println("-1 -1");\n    }\n}\n`,
      c: `#include <stdio.h>\n\nint main(void) {\n    int n;\n    if (scanf("%d", &n) != 1) return 0;\n    int a[100000];\n    for (int i = 0; i < n; i++) scanf("%d", &a[i]);\n    int t; scanf("%d", &t);\n    for (int i = 0; i < n; i++)\n        for (int j = i + 1; j < n; j++)\n            if (a[i] + a[j] == t) { printf("%d %d\\n", i, j); return 0; }\n    printf("-1 -1\\n");\n    return 0;\n}\n`,
      cpp: `#include <bits/stdc++.h>\nusing namespace std;\n\nint main() {\n    ios::sync_with_stdio(false);\n    cin.tie(nullptr);\n    int n;\n    if (!(cin >> n)) return 0;\n    vector<int> a(n);\n    for (auto &x : a) cin >> x;\n    int t; cin >> t;\n    unordered_map<int,int> seen;\n    for (int i = 0; i < n; i++) {\n        if (seen.count(t - a[i])) { cout << seen[t - a[i]] << ' ' << i << '\\n'; return 0; }\n        seen[a[i]] = i;\n    }\n    cout << "-1 -1\\n";\n    return 0;\n}\n`,
    },
  },
  {
    match: /binary.*search/i,
    explain: 'Binary search — O(log n) time. Reads n, sorted array, key; prints index or -1.',
    time: 'O(log n)',
    space: 'O(1)',
    code: {
      python: `def solve():\n    import sys\n    data = list(map(int, sys.stdin.read().strip().split()))\n    if not data:\n        print(-1)\n        return\n    n, a, key = data[0], data[1:1 + data[0]], data[1 + data[0]] if len(data) > 1 + data[0] else 0\n    lo, hi, ans = 0, len(a) - 1, -1\n    while lo <= hi:\n        mid = (lo + hi) // 2\n        if a[mid] == key:\n            ans = mid\n            break\n        elif a[mid] < key:\n            lo = mid + 1\n        else:\n            hi = mid - 1\n    print(ans)\n\n\nif __name__ == "__main__":\n    solve()\n`,
      javascript: `const fs = require('node:fs');\nconst d = fs.readFileSync(0, 'utf8').trim().split(/\\s+/).map(Number);\nif (!d.length) { console.log(-1); process.exit(0); }\nconst n = d[0], a = d.slice(1, 1 + n), key = d[1 + n] || 0;\nlet lo = 0, hi = a.length - 1, ans = -1;\nwhile (lo <= hi) { const mid = (lo + hi) >> 1; if (a[mid] === key) { ans = mid; break; } else if (a[mid] < key) lo = mid + 1; else hi = mid - 1; }\nconsole.log(ans);\n`,
      java: `import java.util.*;\n\npublic class Main {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        if (!sc.hasNextInt()) { System.out.println(-1); return; }\n        int n = sc.nextInt();\n        int[] a = new int[n];\n        for (int i = 0; i < n; i++) a[i] = sc.nextInt();\n        int key = sc.hasNextInt() ? sc.nextInt() : 0;\n        int lo = 0, hi = n - 1, ans = -1;\n        while (lo <= hi) { int mid = lo + (hi - lo) / 2; if (a[mid] == key) { ans = mid; break; } else if (a[mid] < key) lo = mid + 1; else hi = mid - 1; }\n        System.out.println(ans);\n    }\n}\n`,
      c: `#include <stdio.h>\n\nint main(void) {\n    int n;\n    if (scanf("%d", &n) != 1) { printf("-1\\n"); return 0; }\n    int a[100000];\n    for (int i = 0; i < n; i++) scanf("%d", &a[i]);\n    int key = 0; scanf("%d", &key);\n    int lo = 0, hi = n - 1, ans = -1;\n    while (lo <= hi) { int mid = lo + (hi - lo) / 2; if (a[mid] == key) { ans = mid; break; } else if (a[mid] < key) lo = mid + 1; else hi = mid - 1; }\n    printf("%d\\n", ans);\n    return 0;\n}\n`,
      cpp: `#include <bits/stdc++.h>\nusing namespace std;\n\nint main() {\n    ios::sync_with_stdio(false);\n    cin.tie(nullptr);\n    int n;\n    if (!(cin >> n)) { cout << -1 << '\\n'; return 0; }\n    vector<int> a(n);\n    for (auto &x : a) cin >> x;\n    int key = 0; cin >> key;\n    int lo = 0, hi = n - 1, ans = -1;\n    while (lo <= hi) { int mid = lo + (hi - lo) / 2; if (a[mid] == key) { ans = mid; break; } else if (a[mid] < key) lo = mid + 1; else hi = mid - 1; }\n    cout << ans << '\\n';\n    return 0;\n}\n`,
    },
  },
  {
    match: { test: (s) => /linear.*search|search.*array|find.*(element|number|key)|search/i.test(s) && !/largest|greatest|smallest|three/i.test(s) },
    explain: 'Linear search — O(n) time. Reads n, array, key; prints index or -1.',
    time: 'O(n)',
    space: 'O(1)',
    code: {
      python: `def solve():\n    import sys\n    data = list(map(int, sys.stdin.read().strip().split()))\n    if not data:\n        print(-1)\n        return\n    n, a, key = data[0], data[1:1 + data[0]], data[1 + data[0]] if len(data) > 1 + data[0] else 0\n    print(a.index(key) if key in a else -1)\n\n\nif __name__ == "__main__":\n    solve()\n`,
      javascript: `const fs = require('node:fs');\nconst d = fs.readFileSync(0, 'utf8').trim().split(/\\s+/).map(Number);\nif (!d.length) { console.log(-1); process.exit(0); }\nconst n = d[0], a = d.slice(1, 1 + n), key = d[1 + n] || 0;\nconsole.log(a.indexOf(key));\n`,
      java: `import java.util.*;\n\npublic class Main {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        if (!sc.hasNextInt()) { System.out.println(-1); return; }\n        int n = sc.nextInt();\n        int ans = -1;\n        int[] a = new int[n];\n        for (int i = 0; i < n; i++) a[i] = sc.nextInt();\n        int key = sc.hasNextInt() ? sc.nextInt() : 0;\n        for (int i = 0; i < n; i++) if (a[i] == key) { ans = i; break; }\n        System.out.println(ans);\n    }\n}\n`,
      c: `#include <stdio.h>\n\nint main(void) {\n    int n;\n    if (scanf("%d", &n) != 1) { printf("-1\\n"); return 0; }\n    int a[100000];\n    for (int i = 0; i < n; i++) scanf("%d", &a[i]);\n    int key = 0; scanf("%d", &key);\n    int ans = -1;\n    for (int i = 0; i < n; i++) if (a[i] == key) { ans = i; break; }\n    printf("%d\\n", ans);\n    return 0;\n}\n`,
      cpp: `#include <bits/stdc++.h>\nusing namespace std;\n\nint main() {\n    ios::sync_with_stdio(false);\n    cin.tie(nullptr);\n    int n;\n    if (!(cin >> n)) { cout << -1 << '\\n'; return 0; }\n    vector<int> a(n);\n    for (auto &x : a) cin >> x;\n    int key = 0; cin >> key;\n    int ans = -1;\n    for (int i = 0; i < n; i++) if (a[i] == key) { ans = i; break; }\n    cout << ans << '\\n';\n    return 0;\n}\n`,
    },
  },
  {
    match: /palindrome/i,
    explain: 'Palindrome check by two pointers — O(n) time, O(1) space.',
    time: 'O(n)',
    space: 'O(1)',
    code: {
      python: `def solve():\n    import sys\n    s = sys.stdin.read().strip()\n    t = ''.join(ch.lower() for ch in s if ch.isalnum())\n    print("YES" if t == t[::-1] else "NO")\n\n\nif __name__ == "__main__":\n    solve()\n`,
      javascript: `const fs = require('node:fs');\nconst s = fs.readFileSync(0, 'utf8').trim().toLowerCase().replace(/[^a-z0-9]/g, '');\nconsole.log(s === s.split('').reverse().join('') ? 'YES' : 'NO');\n`,
      java: `import java.util.*;\n\npublic class Main {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        StringBuilder sb = new StringBuilder();\n        while (sc.hasNextLine()) sb.append(sc.nextLine());\n        String t = sb.toString().toLowerCase().replaceAll("[^a-z0-9]", "");\n        String r = new StringBuilder(t).reverse().toString();\n        System.out.println(t.equals(r) ? "YES" : "NO");\n    }\n}\n`,
      c: `#include <stdio.h>\n#include <string.h>\n#include <ctype.h>\n\nint main(void) {\n    char s[100000];\n    if (!fgets(s, sizeof s, stdin)) return 0;\n    int i = 0, j = strlen(s) - 1;\n    while (j >= 0 && (s[j] == '\\n' || s[j] == '\\r')) j--;\n    while (i < j) {\n        while (i < j && !isalnum((unsigned char)s[i])) i++;\n        while (i < j && !isalnum((unsigned char)s[j])) j--;\n        if (tolower((unsigned char)s[i]) != tolower((unsigned char)s[j])) { printf("NO\\n"); return 0; }\n        i++; j--;\n    }\n    printf("YES\\n");\n    return 0;\n}\n`,
      cpp: `#include <bits/stdc++.h>\nusing namespace std;\n\nint main() {\n    ios::sync_with_stdio(false);\n    cin.tie(nullptr);\n    string s, line;\n    while (getline(cin, line)) s += line;\n    string t;\n    for (char c : s) if (isalnum((unsigned char)c)) t += tolower((unsigned char)c);\n    string r = t;\n    reverse(r.begin(), r.end());\n    cout << (t == r ? "YES" : "NO") << '\\n';\n    return 0;\n}\n`,
    },
  },
  {
    match: /revers/i,
    explain: 'Reverse the input — O(n) time. Reads a line (or number) and prints it reversed.',
    time: 'O(n)',
    space: 'O(n)',
    code: {
      python: `def solve():\n    import sys\n    data = sys.stdin.read()\n    print(data.strip()[::-1])\n\n\nif __name__ == "__main__":\n    solve()\n`,
      javascript: `const fs = require('node:fs');\nconst s = fs.readFileSync(0, 'utf8').replace(/\\r?\\n$/, '');\nconsole.log(s.split('').reverse().join(''));\n`,
      java: `import java.util.*;\n\npublic class Main {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        StringBuilder sb = new StringBuilder();\n        while (sc.hasNextLine()) { if (sb.length() > 0) sb.append("\\n"); sb.append(sc.nextLine()); }\n        System.out.println(sb.reverse().toString());\n    }\n}\n`,
      c: `#include <stdio.h>\n#include <string.h>\n\nint main(void) {\n    char s[100000];\n    if (!fgets(s, sizeof s, stdin)) return 0;\n    size_t n = strlen(s);\n    while (n > 0 && (s[n-1] == '\\n' || s[n-1] == '\\r')) s[--n] = 0;\n    for (int i = (int)n - 1; i >= 0; i--) putchar(s[i]);\n    printf("\\n");\n    return 0;\n}\n`,
      cpp: `#include <bits/stdc++.h>\nusing namespace std;\n\nint main() {\n    ios::sync_with_stdio(false);\n    cin.tie(nullptr);\n    string s, line;\n    bool first = true;\n    while (getline(cin, line)) { if (!first) s += "\\n"; s += line; first = false; }\n    reverse(s.begin(), s.end());\n    cout << s << '\\n';\n    return 0;\n}\n`,
    },
  },
  {
    match: /sum.*digit|digit.*sum|sum of digits/i,
    explain: 'Sum of digits — O(d) time. Reads an integer, prints the digit sum.',
    time: 'O(d)',
    space: 'O(1)',
    code: {
      python: `def solve():\n    import sys\n    s = sys.stdin.read().strip().lstrip('-')\n    print(sum(int(ch) for ch in s if ch.isdigit()))\n\n\nif __name__ == "__main__":\n    solve()\n`,
      javascript: `const fs = require('node:fs');\nconst s = fs.readFileSync(0, 'utf8').trim().replace('-', '');\nlet sum = 0;\nfor (const ch of s) if (ch >= '0' && ch <= '9') sum += +ch;\nconsole.log(sum);\n`,
      java: `import java.util.*;\n\npublic class Main {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        String s = sc.hasNext() ? sc.next().replace("-", "") : "0";\n        int sum = 0;\n        for (char c : s.toCharArray()) if (Character.isDigit(c)) sum += c - '0';\n        System.out.println(sum);\n    }\n}\n`,
      c: `#include <stdio.h>\n\nint main(void) {\n    long long n;\n    if (scanf("%lld", &n) != 1) n = 0;\n    if (n < 0) n = -n;\n    long long s = 0;\n    if (n == 0) s = 0;\n    while (n > 0) { s += n % 10; n /= 10; }\n    printf("%lld\\n", s);\n    return 0;\n}\n`,
      cpp: `#include <bits/stdc++.h>\nusing namespace std;\n\nint main() {\n    ios::sync_with_stdio(false);\n    cin.tie(nullptr);\n    string s;\n    if (!(cin >> s)) s = "0";\n    long long sum = 0;\n    for (char c : s) if (isdigit((unsigned char)c)) sum += c - '0';\n    cout << sum << '\\n';\n    return 0;\n}\n`,
    },
  },
  {
    match: /armstrong/i,
    explain: 'Armstrong number check — O(d) time. Reads n, prints YES if sum of cubes of digits equals n.',
    time: 'O(d)',
    space: 'O(1)',
    code: {
      python: `def solve():\n    import sys\n    data = sys.stdin.read().strip().split()\n    n = int(data[0]) if data else 153\n    ds = [int(c) for c in str(abs(n))]\n    p = len(ds)\n    print("YES" if sum(d ** p for d in ds) == abs(n) else "NO")\n\n\nif __name__ == "__main__":\n    solve()\n`,
      javascript: `const fs = require('node:fs');\nconst n = parseInt(fs.readFileSync(0, 'utf8').trim() || '153', 10);\nconst ds = String(Math.abs(n)).split('').map(Number);\nconst p = ds.length;\nconsole.log(ds.reduce((s, d) => s + Math.pow(d, p), 0) === Math.abs(n) ? 'YES' : 'NO');\n`,
      java: `import java.util.*;\n\npublic class Main {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        int n = sc.hasNextInt() ? sc.nextInt() : 153;\n        String s = String.valueOf(Math.abs(n));\n        int p = s.length(), sum = 0;\n        for (char c : s.toCharArray()) sum += (int) Math.pow(c - '0', p);\n        System.out.println(sum == Math.abs(n) ? "YES" : "NO");\n    }\n}\n`,
      c: `#include <stdio.h>\n\nint main(void) {\n    int n;\n    if (scanf("%d", &n) != 1) n = 153;\n    int m = n < 0 ? -n : n, t = m, d = 0;\n    if (t == 0) d = 1;\n    while (t > 0) { d++; t /= 10; }\n    int sum = 0;\n    t = m;\n    while (t > 0) { int r = t % 10, pw = 1; for (int i = 0; i < d; i++) pw *= r; sum += pw; t /= 10; }\n    printf("%s\\n", sum == m ? "YES" : "NO");\n    return 0;\n}\n`,
      cpp: `#include <bits/stdc++.h>\nusing namespace std;\n\nint main() {\n    ios::sync_with_stdio(false);\n    cin.tie(nullptr);\n    int n;\n    if (!(cin >> n)) n = 153;\n    string s = to_string(abs(n));\n    int p = s.size(), sum = 0;\n    for (char c : s) { int d = c - '0', pw = 1; for (int i = 0; i < p; i++) pw *= d; sum += pw; }\n    cout << (sum == abs(n) ? "YES" : "NO") << '\\n';\n    return 0;\n}\n`,
    },
  },
  {
    match: /gcd|greatest common|hcf/i,
    explain: 'GCD with Euclid — O(log min(a,b)) time. Reads a b, prints gcd.',
    time: 'O(log n)',
    space: 'O(1)',
    code: {
      python: `def solve():\n    import sys, math\n    data = list(map(int, sys.stdin.read().strip().split()))\n    a = data[0] if len(data) > 0 else 12\n    b = data[1] if len(data) > 1 else 18\n    print(math.gcd(a, b))\n\n\nif __name__ == "__main__":\n    solve()\n`,
      javascript: `const fs = require('node:fs');\nconst d = fs.readFileSync(0, 'utf8').trim().split(/\\s+/).map(Number);\nlet a = d[0] || 12, b = d[1] || 18;\nwhile (b) { const t = a % b; a = b; b = t; }\nconsole.log(Math.abs(a));\n`,
      java: `import java.util.*;\n\npublic class Main {\n    static long gcd(long a, long b) { return b == 0 ? Math.abs(a) : gcd(b, a % b); }\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        long a = sc.hasNextLong() ? sc.nextLong() : 12;\n        long b = sc.hasNextLong() ? sc.nextLong() : 18;\n        System.out.println(gcd(a, b));\n    }\n}\n`,
      c: `#include <stdio.h>\n\nlong long gcd(long long a, long long b) { return b == 0 ? (a < 0 ? -a : a) : gcd(b, a % b); }\nint main(void) {\n    long long a = 12, b = 18;\n    scanf("%lld %lld", &a, &b);\n    printf("%lld\\n", gcd(a, b));\n    return 0;\n}\n`,
      cpp: `#include <bits/stdc++.h>\nusing namespace std;\n\nint main() {\n    ios::sync_with_stdio(false);\n    cin.tie(nullptr);\n    long long a = 12, b = 18;\n    if (!(cin >> a)) a = 12;\n    if (!(cin >> b)) b = 18;\n    cout << std::gcd(a, b) << '\\n';\n    return 0;\n}\n`,
    },
  },
  {
    match: /lcm|least common/i,
    explain: 'LCM via gcd — O(log n) time. Reads a b, prints lcm.',
    time: 'O(log n)',
    space: 'O(1)',
    code: {
      python: `def solve():\n    import sys, math\n    data = list(map(int, sys.stdin.read().strip().split()))\n    a = data[0] if len(data) > 0 else 12\n    b = data[1] if len(data) > 1 else 18\n    print(abs(a * b) // math.gcd(a, b))\n\n\nif __name__ == "__main__":\n    solve()\n`,
      javascript: `const fs = require('node:fs');\nconst d = fs.readFileSync(0, 'utf8').trim().split(/\\s+/).map(Number);\nlet a = d[0] || 12, b = d[1] || 18;\nconst g = (x, y) => y === 0 ? x : g(y, x % y);\nconsole.log(Math.abs(a * b) / g(a, b));\n`,
      java: `import java.util.*;\n\npublic class Main {\n    static long gcd(long a, long b) { return b == 0 ? Math.abs(a) : gcd(b, a % b); }\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        long a = sc.hasNextLong() ? sc.nextLong() : 12;\n        long b = sc.hasNextLong() ? sc.nextLong() : 18;\n        System.out.println(Math.abs(a * b) / gcd(a, b));\n    }\n}\n`,
      c: `#include <stdio.h>\n\nlong long gcd(long long a, long long b) { return b == 0 ? (a < 0 ? -a : a) : gcd(b, a % b); }\nint main(void) {\n    long long a = 12, b = 18;\n    scanf("%lld %lld", &a, &b);\n    printf("%lld\\n", (a < 0 ? -a : a) / gcd(a, b) * (b < 0 ? -b : b));\n    return 0;\n}\n`,
      cpp: `#include <bits/stdc++.h>\nusing namespace std;\n\nint main() {\n    ios::sync_with_stdio(false);\n    cin.tie(nullptr);\n    long long a = 12, b = 18;\n    if (!(cin >> a)) a = 12;\n    if (!(cin >> b)) b = 18;\n    cout << std::lcm(a, b) << '\\n';\n    return 0;\n}\n`,
    },
  },
  {
    match: /leap/i,
    explain: 'Leap year check — O(1). Reads year, prints YES/NO.',
    time: 'O(1)',
    space: 'O(1)',
    code: {
      python: `def solve():\n    import sys\n    data = sys.stdin.read().strip().split()\n    y = int(data[0]) if data else 2024\n    print("YES" if (y % 400 == 0 or (y % 4 == 0 and y % 100 != 0)) else "NO")\n\n\nif __name__ == "__main__":\n    solve()\n`,
      javascript: `const fs = require('node:fs');\nconst y = parseInt(fs.readFileSync(0, 'utf8').trim() || '2024', 10);\nconsole.log((y % 400 === 0 || (y % 4 === 0 && y % 100 !== 0)) ? 'YES' : 'NO');\n`,
      java: `import java.util.*;\n\npublic class Main {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        int y = sc.hasNextInt() ? sc.nextInt() : 2024;\n        System.out.println((y % 400 == 0 || (y % 4 == 0 && y % 100 != 0)) ? "YES" : "NO");\n    }\n}\n`,
      c: `#include <stdio.h>\n\nint main(void) {\n    int y = 2024;\n    scanf("%d", &y);\n    printf("%s\\n", (y % 400 == 0 || (y % 4 == 0 && y % 100 != 0)) ? "YES" : "NO");\n    return 0;\n}\n`,
      cpp: `#include <bits/stdc++.h>\nusing namespace std;\n\nint main() {\n    ios::sync_with_stdio(false);\n    cin.tie(nullptr);\n    int y = 2024;\n    if (!(cin >> y)) y = 2024;\n    cout << ((y % 400 == 0 || (y % 4 == 0 && y % 100 != 0)) ? "YES" : "NO") << '\\n';\n    return 0;\n}\n`,
    },
  },
  {
    match: /even.*odd|odd.*even|even or odd|check.*even/i,
    explain: 'Even/odd check — O(1). Reads n, prints EVEN/ODD.',
    time: 'O(1)',
    space: 'O(1)',
    code: {
      python: `def solve():\n    import sys\n    data = sys.stdin.read().strip().split()\n    n = int(data[0]) if data else 7\n    print("EVEN" if n % 2 == 0 else "ODD")\n\n\nif __name__ == "__main__":\n    solve()\n`,
      javascript: `const fs = require('node:fs');\nconst n = parseInt(fs.readFileSync(0, 'utf8').trim() || '7', 10);\nconsole.log(n % 2 === 0 ? 'EVEN' : 'ODD');\n`,
      java: `import java.util.*;\n\npublic class Main {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        int n = sc.hasNextInt() ? sc.nextInt() : 7;\n        System.out.println(n % 2 == 0 ? "EVEN" : "ODD");\n    }\n}\n`,
      c: `#include <stdio.h>\n\nint main(void) {\n    int n = 7;\n    scanf("%d", &n);\n    printf("%s\\n", n % 2 == 0 ? "EVEN" : "ODD");\n    return 0;\n}\n`,
      cpp: `#include <bits/stdc++.h>\nusing namespace std;\n\nint main() {\n    ios::sync_with_stdio(false);\n    cin.tie(nullptr);\n    int n = 7;\n    if (!(cin >> n)) n = 7;\n    cout << (n % 2 == 0 ? "EVEN" : "ODD") << '\\n';\n    return 0;\n}\n`,
    },
  },
  {
    match: /multiplication.*table|table of|print.*table/i,
    explain: 'Multiplication table — O(1). Reads n, prints n x 1..10.',
    time: 'O(1)',
    space: 'O(1)',
    code: {
      python: `def solve():\n    import sys\n    data = sys.stdin.read().strip().split()\n    n = int(data[0]) if data else 5\n    for i in range(1, 11):\n        print(str(n) + " x " + str(i) + " = " + str(n * i))\n\n\nif __name__ == "__main__":\n    solve()\n`,
      javascript: `const fs = require('node:fs');\nconst n = parseInt(fs.readFileSync(0, 'utf8').trim() || '5', 10);\nfor (let i = 1; i <= 10; i++) console.log(n + ' x ' + i + ' = ' + (n * i));\n`,
      java: `import java.util.*;\n\npublic class Main {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        int n = sc.hasNextInt() ? sc.nextInt() : 5;\n        for (int i = 1; i <= 10; i++) System.out.println(n + " x " + i + " = " + (n * i));\n    }\n}\n`,
      c: `#include <stdio.h>\n\nint main(void) {\n    int n = 5;\n    scanf("%d", &n);\n    for (int i = 1; i <= 10; i++) printf("%d x %d = %d\\n", n, i, n * i);\n    return 0;\n}\n`,
      cpp: `#include <bits/stdc++.h>\nusing namespace std;\n\nint main() {\n    ios::sync_with_stdio(false);\n    cin.tie(nullptr);\n    int n = 5;\n    if (!(cin >> n)) n = 5;\n    for (int i = 1; i <= 10; i++) cout << n << " x " << i << " = " << n * i << '\\n';\n    return 0;\n}\n`,
    },
  },
  {
    match: /calculator|simple.*calc/i,
    explain: 'Calculator — O(1). Reads "a op b" (e.g. 3 + 4), prints the result.',
    time: 'O(1)',
    space: 'O(1)',
    code: {
      python: `def solve():\n    import sys\n    parts = sys.stdin.read().strip().split()\n    if len(parts) < 3:\n        print("Usage: <a> <op> <b>")\n        return\n    a, op, b = float(parts[0]), parts[1], float(parts[2])\n    r = {"+": a + b, "-": a - b, "*": a * b, "/": a / b if b else float("nan"), "%": a % b if b else float("nan")}.get(op)\n    print(int(r) if r == int(r) else r)\n\n\nif __name__ == "__main__":\n    solve()\n`,
      javascript: `const fs = require('node:fs');\nconst p = fs.readFileSync(0, 'utf8').trim().split(/\\s+/);\nif (p.length < 3) { console.log('Usage: <a> <op> <b>'); process.exit(0); }\nconst a = +p[0], op = p[1], b = +p[2];\nconst r = op === '+' ? a + b : op === '-' ? a - b : op === '*' ? a * b : op === '/' ? a / b : a % b;\nconsole.log(Number.isInteger(r) ? r : r);\n`,
      java: `import java.util.*;\n\npublic class Main {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        if (!sc.hasNextDouble()) { System.out.println("Usage: <a> <op> <b>"); return; }\n        double a = sc.nextDouble();\n        String op = sc.hasNext() ? sc.next() : "+";\n        double b = sc.hasNextDouble() ? sc.nextDouble() : 0;\n        double r = op.equals("+") ? a + b : op.equals("-") ? a - b : op.equals("*") ? a * b : op.equals("/") ? a / b : a % b;\n        System.out.println(r == (long) r ? String.valueOf((long) r) : String.valueOf(r));\n    }\n}\n`,
      c: `#include <stdio.h>\n\nint main(void) {\n    double a, b; char op;\n    if (scanf("%lf %c %lf", &a, &op, &b) != 3) { printf("Usage: <a> <op> <b>\\n"); return 0; }\n    double r = op == '+' ? a + b : op == '-' ? a - b : op == '*' ? a * b : op == '/' ? a / b : 0;\n    printf("%g\\n", r);\n    return 0;\n}\n`,
      cpp: `#include <bits/stdc++.h>\nusing namespace std;\n\nint main() {\n    ios::sync_with_stdio(false);\n    cin.tie(nullptr);\n    double a, b; char op;\n    if (!(cin >> a >> op >> b)) { cout << "Usage: <a> <op> <b>\\n"; return 0; }\n    double r = op == '+' ? a + b : op == '-' ? a - b : op == '*' ? a * b : a / b;\n    cout << r << '\\n';\n    return 0;\n}\n`,
    },
  },
  {
    match: /pattern|pyramid|triangle|\bstar\b/i,
    explain: 'Star pyramid — O(n^2) time. Reads n, prints a right triangle of stars.',
    time: 'O(n^2)',
    space: 'O(1)',
    code: {
      python: `def solve():\n    import sys\n    data = sys.stdin.read().strip().split()\n    n = int(data[0]) if data else 5\n    for i in range(1, n + 1):\n        print("*" * i)\n\n\nif __name__ == "__main__":\n    solve()\n`,
      javascript: `const fs = require('node:fs');\nconst n = parseInt(fs.readFileSync(0, 'utf8').trim() || '5', 10);\nfor (let i = 1; i <= n; i++) console.log('*'.repeat(i));\n`,
      java: `import java.util.*;\n\npublic class Main {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        int n = sc.hasNextInt() ? sc.nextInt() : 5;\n        for (int i = 1; i <= n; i++) System.out.println("*".repeat(i));\n    }\n}\n`,
      c: `#include <stdio.h>\n\nint main(void) {\n    int n = 5;\n    scanf("%d", &n);\n    for (int i = 1; i <= n; i++) {\n        for (int j = 0; j < i; j++) putchar('*');\n        putchar('\\n');\n    }\n    return 0;\n}\n`,
      cpp: `#include <bits/stdc++.h>\nusing namespace std;\n\nint main() {\n    ios::sync_with_stdio(false);\n    cin.tie(nullptr);\n    int n = 5;\n    if (!(cin >> n)) n = 5;\n    for (int i = 1; i <= n; i++) cout << string(i, '*') << '\\n';\n    return 0;\n}\n`,
    },
  },
  {
    match: /vowel/i,
    explain: 'Count vowels — O(n) time. Reads a line, prints the vowel count.',
    time: 'O(n)',
    space: 'O(1)',
    code: {
      python: `def solve():\n    import sys\n    s = sys.stdin.read().lower()\n    print(sum(1 for c in s if c in "aeiou"))\n\n\nif __name__ == "__main__":\n    solve()\n`,
      javascript: `const fs = require('node:fs');\nconst s = fs.readFileSync(0, 'utf8').toLowerCase();\nconsole.log((s.match(/[aeiou]/g) || []).length);\n`,
      java: `import java.util.*;\n\npublic class Main {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        StringBuilder sb = new StringBuilder();\n        while (sc.hasNextLine()) sb.append(sc.nextLine()).append("\\n");\n        int c = 0;\n        for (char ch : sb.toString().toLowerCase().toCharArray()) if ("aeiou".indexOf(ch) >= 0) c++;\n        System.out.println(c);\n    }\n}\n`,
      c: `#include <stdio.h>\n#include <ctype.h>\n#include <string.h>\n\nint main(void) {\n    char s[100000];\n    if (!fgets(s, sizeof s, stdin)) { printf("0\\n"); return 0; }\n    int c = 0;\n    for (size_t i = 0; i < strlen(s); i++) {\n        char ch = tolower((unsigned char)s[i]);\n        if (ch=='a'||ch=='e'||ch=='i'||ch=='o'||ch=='u') c++;\n    }\n    printf("%d\\n", c);\n    return 0;\n}\n`,
      cpp: `#include <bits/stdc++.h>\nusing namespace std;\n\nint main() {\n    ios::sync_with_stdio(false);\n    cin.tie(nullptr);\n    string s, line;\n    while (getline(cin, line)) s += line + "\\n";\n    int c = 0;\n    for (char ch : s) { char l = tolower((unsigned char)ch); if (l=='a'||l=='e'||l=='i'||l=='o'||l=='u') c++; }\n    cout << c << '\\n';\n    return 0;\n}\n`,
    },
  },
  {
    match: /area.*circle|circle.*area/i,
    explain: 'Area of a circle — O(1). Reads radius r, prints pi*r^2.',
    time: 'O(1)',
    space: 'O(1)',
    code: {
      python: `def solve():\n    import sys, math\n    data = sys.stdin.read().strip().split()\n    r = float(data[0]) if data else 5.0\n    print(math.pi * r * r)\n\n\nif __name__ == "__main__":\n    solve()\n`,
      javascript: `const fs = require('node:fs');\nconst r = parseFloat(fs.readFileSync(0, 'utf8').trim() || '5');\nconsole.log(Math.PI * r * r);\n`,
      java: `import java.util.*;\n\npublic class Main {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        double r = sc.hasNextDouble() ? sc.nextDouble() : 5.0;\n        System.out.println(Math.PI * r * r);\n    }\n}\n`,
      c: `#include <stdio.h>\n\nint main(void) {\n    double r = 5.0;\n    scanf("%lf", &r);\n    printf("%f\\n", 3.141592653589793 * r * r);\n    return 0;\n}\n`,
      cpp: `#include <bits/stdc++.h>\nusing namespace std;\n\nint main() {\n    ios::sync_with_stdio(false);\n    cin.tie(nullptr);\n    double r = 5.0;\n    if (!(cin >> r)) r = 5.0;\n    cout.setf(ios::fixed); cout.precision(6);\n    cout << 3.141592653589793 * r * r << '\\n';\n    return 0;\n}\n`,
    },
  },
  {
    match: /average|mean of/i,
    explain: 'Average of n numbers — O(n) time. Reads n then n integers, prints the mean.',
    time: 'O(n)',
    space: 'O(1)',
    code: {
      python: `def solve():\n    import sys\n    data = list(map(float, sys.stdin.read().strip().split()))\n    if not data:\n        print(0)\n        return\n    a = data[1:1 + int(data[0])]\n    print(sum(a) / len(a) if a else 0)\n\n\nif __name__ == "__main__":\n    solve()\n`,
      javascript: `const fs = require('node:fs');\nconst d = fs.readFileSync(0, 'utf8').trim().split(/\\s+/).map(Number);\nif (!d.length) { console.log(0); process.exit(0); }\nconst a = d.slice(1, 1 + d[0]);\nconsole.log(a.reduce((s, x) => s + x, 0) / (a.length || 1));\n`,
      java: `import java.util.*;\n\npublic class Main {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        if (!sc.hasNextInt()) { System.out.println(0); return; }\n        int n = sc.nextInt();\n        long sum = 0;\n        for (int i = 0; i < n && sc.hasNextLong(); i++) sum += sc.nextLong();\n        System.out.println(n == 0 ? 0 : (double) sum / n);\n    }\n}\n`,
      c: `#include <stdio.h>\n\nint main(void) {\n    int n;\n    if (scanf("%d", &n) != 1 || n == 0) { printf("0\\n"); return 0; }\n    long long sum = 0, x;\n    for (int i = 0; i < n; i++) { scanf("%lld", &x); sum += x; }\n    printf("%f\\n", (double)sum / n);\n    return 0;\n}\n`,
      cpp: `#include <bits/stdc++.h>\nusing namespace std;\n\nint main() {\n    ios::sync_with_stdio(false);\n    cin.tie(nullptr);\n    int n;\n    if (!(cin >> n) || n == 0) { cout << 0 << '\\n'; return 0; }\n    long long sum = 0, x;\n    for (int i = 0; i < n; i++) { cin >> x; sum += x; }\n    cout << (double)sum / n << '\\n';\n    return 0;\n}\n`,
    },
  },
  {
    match: { test: (s) => /largest|maximum|max.*array|smallest|minimum|min.*array|greatest/i.test(s) && !/three/i.test(s) },
    explain: 'Max/min of array — O(n) time. Reads n then n integers, prints max and min.',
    time: 'O(n)',
    space: 'O(1)',
    code: {
      python: `def solve():\n    import sys\n    data = list(map(int, sys.stdin.read().strip().split()))\n    a = data[1:1 + data[0]] if data else [3, 1, 4, 1, 5]\n    print(str(max(a)) + " " + str(min(a)))\n\n\nif __name__ == "__main__":\n    solve()\n`,
      javascript: `const fs = require('node:fs');\nconst d = fs.readFileSync(0, 'utf8').trim().split(/\\s+/).map(Number);\nconst a = d.length ? d.slice(1, 1 + d[0]) : [3, 1, 4, 1, 5];\nconsole.log(Math.max.apply(null, a) + ' ' + Math.min.apply(null, a));\n`,
      java: `import java.util.*;\n\npublic class Main {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        if (!sc.hasNextInt()) { System.out.println("5 1"); return; }\n        int n = sc.nextInt();\n        int mx = Integer.MIN_VALUE, mn = Integer.MAX_VALUE;\n        for (int i = 0; i < n && sc.hasNextInt(); i++) { int x = sc.nextInt(); mx = Math.max(mx, x); mn = Math.min(mn, x); }\n        System.out.println(mx + " " + mn);\n    }\n}\n`,
      c: `#include <stdio.h>\n#include <limits.h>\n\nint main(void) {\n    int n;\n    if (scanf("%d", &n) != 1) { printf("5 1\\n"); return 0; }\n    int mx = INT_MIN, mn = INT_MAX, x;\n    for (int i = 0; i < n; i++) { scanf("%d", &x); if (x > mx) mx = x; if (x < mn) mn = x; }\n    printf("%d %d\\n", mx, mn);\n    return 0;\n}\n`,
      cpp: `#include <bits/stdc++.h>\nusing namespace std;\n\nint main() {\n    ios::sync_with_stdio(false);\n    cin.tie(nullptr);\n    int n;\n    if (!(cin >> n)) { cout << "5 1\\n"; return 0; }\n    int mx = INT_MIN, mn = INT_MAX, x;\n    for (int i = 0; i < n; i++) { cin >> x; mx = max(mx, x); mn = min(mn, x); }\n    cout << mx << ' ' << mn << '\\n';\n    return 0;\n}\n`,
    },
  },
  {
    match: /sort|bubble|merge|quick/i,
    explain: 'Fast sorting with the standard library — O(n log n) time. Reads n then n integers.',
    time: 'O(n log n)',
    space: 'O(n)',
    code: {
      python: `def solve():\n    import sys\n    data = list(map(int, sys.stdin.read().strip().split()))\n    a = data[1:1 + data[0]] if data else []\n    a.sort()\n    print(' '.join(map(str, a)))\n\n\nif __name__ == "__main__":\n    solve()\n`,
      javascript: `const fs = require('node:fs');\nconst d = fs.readFileSync(0, 'utf8').trim().split(/\\s+/).map(Number);\nconst a = d.slice(1, 1 + d[0]);\na.sort((x, y) => x - y);\nconsole.log(a.join(' '));\n`,
      java: `import java.util.*;\n\npublic class Main {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        if (!sc.hasNextInt()) return;\n        int n = sc.nextInt();\n        int[] a = new int[n];\n        for (int i = 0; i < n; i++) a[i] = sc.nextInt();\n        Arrays.sort(a);\n        for (int i = 0; i < n; i++) System.out.print((i > 0 ? " " : "") + a[i]);\n        System.out.println();\n    }\n}\n`,
      c: `#include <stdio.h>\n#include <stdlib.h>\nint cmp(const void *a, const void *b) { return *(int*)a - *(int*)b; }\nint main(void) {\n    int n;\n    if (scanf("%d", &n) != 1) return 0;\n    int a[100000];\n    for (int i = 0; i < n; i++) scanf("%d", &a[i]);\n    qsort(a, n, sizeof(int), cmp);\n    for (int i = 0; i < n; i++) printf("%d%c", a[i], i + 1 == n ? '\\n' : ' ');\n    return 0;\n}\n`,
      cpp: `#include <bits/stdc++.h>\nusing namespace std;\n\nint main() {\n    ios::sync_with_stdio(false);\n    cin.tie(nullptr);\n    int n;\n    if (!(cin >> n)) return 0;\n    vector<int> a(n);\n    for (auto &x : a) cin >> x;\n    sort(a.begin(), a.end());\n    for (int i = 0; i < n; i++) cout << a[i] << (i + 1 == n ? '\\n' : ' ');\n    return 0;\n}\n`,
    },
  },
  {
    match: /hello.*world|first.*program/i,
    explain: 'Hello World — reads nothing, prints Hello, World!.',
    time: 'O(1)',
    space: 'O(1)',
    code: {
      python: `print("Hello, World!")\n`,
      javascript: `console.log("Hello, World!");\n`,
      java: `public class Main {\n    public static void main(String[] args) {\n        System.out.println("Hello, World!");\n    }\n}\n`,
      c: `#include <stdio.h>\n\nint main(void) {\n    printf("Hello, World!\\n");\n    return 0;\n}\n`,
      cpp: `#include <iostream>\nusing namespace std;\n\nint main() {\n    cout << "Hello, World!\\n";\n    return 0;\n}\n`,
    },
  },
  {
    match: /add.*two|sum.*two|two.*number.*sum/i,
    explain: 'Add two numbers — O(1). Type two numbers (e.g. "4 6") as input, prints their sum.',
    time: 'O(1)',
    space: 'O(1)',
    code: {
      python: `# add two numbers\na, b = map(int, input().split())\nprint(a + b)\n`,
      javascript: `// add two numbers\nconst fs = require('node:fs');\nconst [a, b] = fs.readFileSync(0, 'utf8').trim().split(/\\s+/).map(Number);\nconsole.log(a + b);\n`,
      java: `import java.util.*;\n\n// add two numbers\npublic class Main {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        int a = sc.nextInt();\n        int b = sc.nextInt();\n        System.out.println(a + b);\n    }\n}\n`,
      c: `#include <stdio.h>\n\n// add two numbers\nint main(void) {\n    int a, b;\n    scanf("%d %d", &a, &b);\n    printf("%d\\n", a + b);\n    return 0;\n}\n`,
      cpp: `#include <iostream>\nusing namespace std;\n\n// add two numbers\nint main() {\n    int a, b;\n    cin >> a >> b;\n    cout << a + b << '\\n';\n    return 0;\n}\n`,
    },
  },
  {
    match: /largest.*three|biggest.*three|greatest.*three|max.*three|three.*number/i,
    explain: 'Largest of three — O(1). Type three numbers (e.g. "5 9 2") as input, prints the biggest.',
    time: 'O(1)',
    space: 'O(1)',
    code: {
      python: `# largest of three numbers\na, b, c = map(int, input().split())\nprint(max(a, b, c))\n`,
      javascript: `// largest of three numbers\nconst fs = require('node:fs');\nconst [a, b, c] = fs.readFileSync(0, 'utf8').trim().split(/\\s+/).map(Number);\nconsole.log(Math.max(a, b, c));\n`,
      java: `import java.util.*;\n\n// largest of three numbers\npublic class Main {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        int a = sc.nextInt();\n        int b = sc.nextInt();\n        int c = sc.nextInt();\n        System.out.println(Math.max(a, Math.max(b, c)));\n    }\n}\n`,
      c: `#include <stdio.h>\n\n// largest of three numbers\nint main(void) {\n    int a, b, c;\n    scanf("%d %d %d", &a, &b, &c);\n    int m = a;\n    if (b > m) m = b;\n    if (c > m) m = c;\n    printf("%d\\n", m);\n    return 0;\n}\n`,
      cpp: `#include <iostream>\nusing namespace std;\n\n// largest of three numbers\nint main() {\n    int a, b, c;\n    cin >> a >> b >> c;\n    int m = a;\n    if (b > m) m = b;\n    if (c > m) m = c;\n    cout << m << '\\n';\n    return 0;\n}\n`,
    },
  },
  {
    match: /swap.*two|swap.*number|interchange/i,
    explain: 'Swap two numbers — O(1). Reads a b, prints "b a".',
    time: 'O(1)',
    space: 'O(1)',
    code: {
      python: `def solve():\n    import sys\n    d = sys.stdin.read().strip().split()\n    a = d[0] if len(d) > 0 else "5"\n    b = d[1] if len(d) > 1 else "9"\n    print(b + " " + a)\n\n\nif __name__ == "__main__":\n    solve()\n`,
      javascript: `const fs = require('node:fs');\nconst d = fs.readFileSync(0, 'utf8').trim().split(/\\s+/);\nconst a = d[0] ?? '5', b = d[1] ?? '9';\nconsole.log(b + ' ' + a);\n`,
      java: `import java.util.*;\n\npublic class Main {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        String a = sc.hasNext() ? sc.next() : "5";\n        String b = sc.hasNext() ? sc.next() : "9";\n        System.out.println(b + " " + a);\n    }\n}\n`,
      c: `#include <stdio.h>\n\nint main(void) {\n    char a[64] = "5", b[64] = "9";\n    scanf("%63s %63s", a, b);\n    printf("%s %s\\n", b, a);\n    return 0;\n}\n`,
      cpp: `#include <iostream>\n#include <string>\nusing namespace std;\n\nint main() {\n    string a = "5", b = "9";\n    if (!(cin >> a)) a = "5";\n    if (!(cin >> b)) b = "9";\n    cout << b << ' ' << a << '\\n';\n    return 0;\n}\n`,
    },
  },
];

const SYSTEM = `You are Codexa AI, a senior competitive-programming tutor. Given a task and target language, solve it DIRECTLY in code: respond with STRICT JSON {"code": "<complete runnable program that reads from stdin and prints ONLY the final answer>", "explanation": "<2-4 sentence approach + complexity>", "timeComplexity": "e.g. O(n)", "spaceComplexity": "e.g. O(n)"}. Rules: the program must solve the task itself (compute and print the answer, no TODOs, no echo, no placeholders). No markdown fences inside values.`;

async function generateCode({ prompt, language = 'cpp' }) {
  const lang = String(language).toLowerCase() === 'js' ? 'javascript' : String(language).toLowerCase();
  const { isAvailable } = require('./client');
  if (isAvailable()) {
    // Gemini (or other provider) is configured: it answers every prompt, so
    // never silently serve a mismatched offline guess. On failure the caller
    // surfaces a clear retryable error instead.
    const ai = await tryAI(SYSTEM, `Language: ${lang}\nTask: ${prompt}`, true);
    if (ai && ai.parsed && typeof ai.parsed.code === 'string' && ai.parsed.code.trim()) {
      return {
        code: ai.parsed.code,
        explanation: ai.parsed.explanation || '',
        timeComplexity: ai.parsed.timeComplexity || null,
        spaceComplexity: ai.parsed.spaceComplexity || null,
        engine: 'ai',
        model: ai.model,
      };
    }
    const err = new Error(
      'Gemini is unreachable right now (free-tier quota or a demand spike). Wait a few seconds and press Generate again.',
    );
    err.code = 'AI_BAD_RESPONSE';
    throw err;
  }
  const hit = TEMPLATES.find((t) => t.match.test(prompt));
  if (hit && hit.code[lang]) {
    const code = lang === 'cpp' ? portableCpp(hit.code[lang]) : hit.code[lang];
    return { code, explanation: hit.explain, timeComplexity: hit.time || null, spaceComplexity: hit.space || null, engine: 'offline' };
  }
  const raw = starter(lang, prompt);
  const op = inferOp(prompt);
  return {
    code: lang === 'cpp' ? portableCpp(raw) : raw,
    explanation: `Simple ${op} program for "${prompt.trim().slice(0, 120)}". Type two numbers (e.g. "4 6") in the Run → stdin box and press Run. Set AI_API_KEY in backend/.env for full LLM generation on any prompt.`,
    timeComplexity: 'O(1)',
    spaceComplexity: 'O(1)',
    engine: 'offline',
  };
}

module.exports = { generateCode, LANGS };
