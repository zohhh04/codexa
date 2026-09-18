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
