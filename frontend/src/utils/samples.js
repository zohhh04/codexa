export const CPP_SAMPLES = {
  hello: {
    label: 'Hello World',
    code: `#include <iostream>

int main() {
    std::cout << "Hello, Codexa!" << std::endl;
    return 0;
}
`,
  },
  arithmetic: {
    label: 'Arithmetic (TAC demo)',
    code: `int main() {
    int a, b, c, d;
    a = b + c * d;
    return 0;
}
`,
  },
  loopError: {
    label: 'Loop with error',
    code: `#include <iostream>

int main() {
    for (int i = 0; i < 5; i++) {
        std::cout << x << std::endl;
    }
    return 0;
}
`,
  },
};

export const C_SAMPLES = {
  hello: {
    label: 'Hello World',
    code: `#include <stdio.h>

int main() {
    printf("Hello, Codexa!\\n");
    return 0;
}
`,
  },
  arithmetic: {
    label: 'Arithmetic (TAC demo)',
    code: `int main() {
    int a, b, c, d;
    a = b + c * d;
    return 0;
}
`,
  },
  loopError: {
    label: 'Loop with error',
    code: `#include <stdio.h>

int main() {
    for (int i = 0; i < 5; i++) {
        printf("%d\\n", x);
    }
    return 0;
}
`,
  },
};

export const JAVA_SAMPLES = {
  hello: {
    label: 'Hello World',
    code: `public class Main {
    public static void main(String[] args) {
        System.out.println("Hello, Codexa!");
    }
}
`,
  },
  arithmetic: {
    label: 'Arithmetic',
    code: `public class Main {
    public static void main(String[] args) {
        int a = 2, b = 3, c = 4;
        int d = a + b * c;
        System.out.println("d = " + d);
    }
}
`,
  },
  loopError: {
    label: 'Loop with error',
    code: `public class Main {
    public static void main(String[] args) {
        for (int i = 0; i < 5; i++) {
            System.out.println(x);
        }
    }
}
`,
  },
};

export const PYTHON_SAMPLES = {
  hello: {
    label: 'Hello World',
    code: `def main():
    print("Hello, Codexa!")


if __name__ == "__main__":
    main()
`,
  },
  arithmetic: {
    label: 'Arithmetic',
    code: `def main():
    a, b, c = 2, 3, 4
    d = a + b * c
    print(f"d = {d}")


if __name__ == "__main__":
    main()
`,
  },
  loopError: {
    label: 'Loop with error',
    code: `def main():
    for i in range(5):
        print(x)


if __name__ == "__main__":
    main()
`,
  },
};

export const JS_SAMPLES = {
  hello: {
    label: 'Hello World',
    code: `console.log("Hello, Codexa!");
`,
  },
  arithmetic: {
    label: 'Arithmetic',
    code: `const fs = require('node:fs');
const data = fs.readFileSync(0, 'utf8').trim().split(/\\s+/).map(Number);
const [a = 2, b = 3, c = 4] = data;
const d = a + b * c;
console.log(\`d = \${d}\`);
`,
  },
  loopError: {
    label: 'Loop with error',
    code: `for (let i = 0; i < 5; i++) {
    console.log(x);
}
`,
  },
};

export const SAMPLES_BY_LANG = {  cpp: CPP_SAMPLES,
  c: C_SAMPLES,
  java: JAVA_SAMPLES,
  python: PYTHON_SAMPLES,
  javascript: JS_SAMPLES,
};

export const LANGUAGE_META = {
  cpp: { label: 'C++', file: 'main.cpp', monaco: 'cpp', fullPipeline: true },
  c: { label: 'C', file: 'main.c', monaco: 'c', fullPipeline: true },
  java: { label: 'Java', file: 'Main.java', monaco: 'java', fullPipeline: false },
  python: { label: 'Python', file: 'main.py', monaco: 'python', fullPipeline: false },
  javascript: { label: 'JavaScript', file: 'main.js', monaco: 'javascript', fullPipeline: false },
};

export const PIPELINE_PHASES = [
  {
    id: 'lex',
    name: 'Lexical Analysis',
    desc: 'Characters → tokens (keywords, identifiers, literals, operators).',
    status: 'Phase 3',
  },
  {
    id: 'parse',
    name: 'Syntax Analysis',
    desc: 'Tokens → Abstract Syntax Tree using the documented C++ subset grammar.',
    status: 'Phase 4',
  },
  {
    id: 'semantic',
    name: 'Semantic Analysis',
    desc: 'Scopes, types and declarations → symbol table + semantic diagnostics.',
    status: 'Phase 4',
  },
  {
    id: 'tac',
    name: 'Intermediate Code',
    desc: 'AST → three-address code with temporaries (t1, t2, …).',
    status: 'Phase 5',
  },
  {
    id: 'clang',
    name: 'Clang Diagnostics',
    desc: 'Authentic compiler errors from a sandboxed Clang process.',
    status: 'Phase 6',
  },
  {
    id: 'ai',
    name: 'AI Detective',
    desc: 'Grounded explanations and user-approved fixes. Never auto-edits code.',
    status: 'Phase 7',
  },
];
