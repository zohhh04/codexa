/**
 * Codexa AI — recursive-descent + Pratt parser for the v1 C++ subset (Phase 4).
 * See compiler/grammar/cpp-subset.md. Panic-mode recovery: after an error the
 * parser skips to ';' / '}' / '{' and continues (max 25 errors, then stops).
 *
 * Input: lexer token array. COMMENT / PREPROCESSOR / INVALID tokens are
 * skipped up front (the lexer already diagnosed the invalid ones).
 */
const { TokenType } = require('../lexer/tokens');
const { N } = require('./ast');

const ASSIGN_OPS = new Set(['=', '+=', '-=', '*=', '/=', '%=']);
const PRECEDENCE = {
  '||': 2,
  '&&': 3,
  '==': 4, '!=': 4,
  '<': 5, '>': 5, '<=': 5, '>=': 5,
  '+': 6, '-': 6,
  '*': 7, '/': 7, '%': 7,
};
const TYPE_KEYWORDS = new Set(['int', 'float', 'char', 'bool', 'void']);
const MAX_ERRORS = 25;

class Parser {
  constructor(tokens) {
    this.toks = tokens.filter(
      (t) => t.type !== TokenType.COMMENT && t.type !== TokenType.PREPROCESSOR && t.type !== TokenType.INVALID,
    );
    this.pos = 0;
    this.diagnostics = [];
    this.loopDepth = 0;
    this.fnDepth = 0;
  }

  parse() {
    const start = this.peek();
    const body = [];
    while (!this.atEnd()) {
      const node = this.parseGlobal();
      if (node) body.push(node);
      if (this.diagnostics.length >= MAX_ERRORS) {
        this.diagnose('error', 'S103', 'too many syntax errors — stopping', this.peek());
        break;
      }
    }
    const end = this.prev() ?? start;
    return {
      ast: N('Program', tokStart(start), tokEnd(end), { body }),
      diagnostics: this.diagnostics,
    };
  }

  // ---- token helpers ----------------------------------------------------
  atEnd() {
    return this.pos >= this.toks.length;
  }
  peek(k = 0) {
    return this.toks[this.pos + k] ?? null;
  }
  prev() {
    return this.toks[this.pos - 1] ?? null;
  }
  is(type, value, k = 0) {
    const t = this.peek(k);
    return !!t && t.type === type && (value === undefined || t.value === value);
  }
  advance() {
    if (!this.atEnd()) this.pos += 1;
    return this.prev();
  }
  matchOp(...ops) {
    const t = this.peek();
    if (t && t.type === TokenType.OPERATOR && ops.includes(t.value)) {
      return this.advance();
    }
    return null;
  }
  matchDelim(...vals) {
    const t = this.peek();
    if (t && t.type === TokenType.DELIMITER && vals.includes(t.value)) {
      return this.advance();
    }
    return null;
  }
  matchKw(...kws) {
    const t = this.peek();
    if (t && t.type === TokenType.KEYWORD && kws.includes(t.value)) {
      return this.advance();
    }
    return null;
  }
  expectDelim(value, what) {
    const t = this.peek();
    if (t && t.type === TokenType.DELIMITER && t.value === value) return this.advance();
    this.diagnose('error', 'S101', `expected '${value}' ${what}`, t ?? this.prev());
    return null;
  }
  expectSemi(what) {
    if (this.expectDelim(';', what)) return true;
    this.synchronize();
    return false;
  }
  diagnose(severity, code, message, tok, endTok = null) {
    const s = tokStart(tok ?? this.prev());
    const e = tokEnd(endTok ?? tok ?? this.prev());
    this.diagnostics.push({
      phase: 'syntax', source: 'codexa', severity, code, message,
      line: s.line, column: s.column, endLine: e.endLine, endColumn: e.endColumn,
    });
  }
  synchronize() {
    while (!this.atEnd()) {
      const t = this.peek();
      if (t.type === TokenType.DELIMITER && t.value === ';') {
        this.advance();
        return;
      }
      if (t.type === TokenType.DELIMITER && (t.value === '}' || t.value === '{')) return;
      this.advance();
    }
  }

  // ---- globals ----------------------------------------------------------
  parseGlobal() {
    const t = this.peek();
    if (t.type === TokenType.DELIMITER && t.value === ';') {
      this.advance(); // stray semicolon: legal empty declaration
      return null;
    }
    if (t.type === TokenType.KEYWORD && t.value === 'using') return this.parseUsing();
    if (t.type === TokenType.KEYWORD && TYPE_KEYWORDS.has(t.value)) {
      const typeTok = this.advance();
      const nameTok = this.peek();
      if (!nameTok || nameTok.type !== TokenType.IDENTIFIER) {
        this.diagnose('error', 'S101', 'expected a name after type', nameTok);
        this.synchronize();
        return null;
      }
      this.advance();
      if (this.is(TokenType.DELIMITER, '(')) {
        return this.parseFunctionDef(typeTok, nameTok);
      }
      return this.parseVarDeclRest(typeTok, nameTok);
    }
    this.diagnose(
      'error', 'S102',
      `unexpected '${t.value}' — only declarations are allowed at global scope`,
      t,
    );
    this.synchronize();
    return null;
  }

  parseVarDeclRest(typeTok, firstName) {
    const declarators = [this.parseDeclarator(firstName)];
    while (this.matchDelim(',')) {
      const comma = this.prev();
      void comma;
      const name = this.peek();
      if (!name || name.type !== TokenType.IDENTIFIER) {
        this.diagnose('error', 'S101', "expected a variable name after ','", name);
        this.synchronize();
        return null;
      }
      this.advance();
      declarators.push(this.parseDeclarator(name));
    }
    const semi = this.expectDelim(';', 'after declaration');
    const end = semi ?? this.prev();
    return N('VarDecl', tokStart(typeTok), tokEnd(end), {
      declType: typeTok.value,
      declarators,
    });
  }

  parseDeclarator(nameTok) {
    let init = null;
    if (this.matchOp('=')) {
      init = this.parseExpression();
    }
    return N('Declarator', tokStart(nameTok), tokEnd(this.prev()), {
      name: nameTok.value,
      nameLoc: { line: nameTok.line, column: nameTok.column },
      init,
    });
  }

  parseFunctionDef(typeTok, nameTok) {
    this.advance(); // (
    const params = [];
    if (!this.is(TokenType.DELIMITER, ')')) {
      if (this.is(TokenType.KEYWORD, 'void') && this.peek(1) && this.peek(1).type === TokenType.DELIMITER && this.peek(1).value === ')') {
        this.advance(); // explicit (void): no params
      } else {
        for (;;) {
          const pt = this.peek();
          const pn = this.peek(1);
          if (!pt || pt.type !== TokenType.KEYWORD || !TYPE_KEYWORDS.has(pt.value) || !pn || pn.type !== TokenType.IDENTIFIER) {
            this.diagnose('error', 'S101', 'expected a parameter (type + name)', pt);
            this.synchronize();
            return null;
          }
          this.advance();
          this.advance();
          params.push(N('Param', tokStart(pt), tokEnd(pn), { name: pn.value, paramType: pt.value }));
          if (!this.matchDelim(',')) break;
        }
      }
    }
    if (!this.expectDelim(')', 'after parameter list')) return null;
    const bodyTok = this.peek();
    if (!bodyTok || bodyTok.type !== TokenType.DELIMITER || bodyTok.value !== '{') {
      this.diagnose('error', 'S106', 'function prototypes are not supported in v1 — provide a body', bodyTok);
      this.synchronize();
      return null;
    }
    this.fnDepth += 1;
    const savedLoop = this.loopDepth;
    this.loopDepth = 0;
    const body = this.parseBlock();
    this.loopDepth = savedLoop;
    this.fnDepth -= 1;
    return N('FunctionDef', tokStart(typeTok), tokEnd(this.prev()), {
      name: nameTok.value,
      returnType: typeTok.value,
      params,
      body,
    });
  }

  // ---- statements -------------------------------------------------------
  parseBlock() {
    const open = this.advance(); // caller verified '{'
    const statements = [];
    while (!this.atEnd() && !this.is(TokenType.DELIMITER, '}')) {
      const s = this.parseStatement();
      if (s) statements.push(s);
    }
    const close = this.expectDelim('}', 'to close block');
    return N('Block', tokStart(open), tokEnd(close ?? this.prev()), { statements });
  }

  parseStatement() {
    const t = this.peek();
    if (!t) return null;
    if (t.type === TokenType.DELIMITER && t.value === '{') return this.parseBlock();
    if (t.type === TokenType.DELIMITER && t.value === ';') {
      this.advance();
      return N('Empty', tokStart(t), tokEnd(t), {});
    }
    if (t.type === TokenType.KEYWORD && TYPE_KEYWORDS.has(t.value)) {
      const typeTok = this.advance();
      const name = this.peek();
      if (!name || name.type !== TokenType.IDENTIFIER) {
        this.diagnose('error', 'S101', 'expected a name after type', name);
        this.synchronize();
        return null;
      }
      this.advance();
      return this.parseVarDeclRest(typeTok, name);
    }
    if (t.type === TokenType.KEYWORD && t.value === 'if') return this.parseIf();
    if (t.type === TokenType.KEYWORD && t.value === 'while') return this.parseWhile();
    if (t.type === TokenType.KEYWORD && t.value === 'for') return this.parseFor();
    if (t.type === TokenType.KEYWORD && t.value === 'return') return this.parseReturn();
    if (t.type === TokenType.KEYWORD && t.value === 'break') {
      this.advance();
      if (this.loopDepth === 0) this.diagnose('error', 'S105', "'break' outside a loop", t);
      this.expectSemi("after 'break'");
      return N('Break', tokStart(t), tokEnd(this.prev()), {});
    }
    if (t.type === TokenType.KEYWORD && t.value === 'continue') {
      this.advance();
      if (this.loopDepth === 0) this.diagnose('error', 'S105', "'continue' outside a loop", t);
      this.expectSemi("after 'continue'");
      return N('Continue', tokStart(t), tokEnd(this.prev()), {});
    }
    if (t.type === TokenType.KEYWORD && t.value === 'using') return this.parseUsing();
    if (t.type === TokenType.IDENTIFIER && t.value === 'std' && this.peek(1) && this.peek(1).value === '::') {
      const nn = this.peek(2);
      if (nn && nn.type === TokenType.IDENTIFIER && nn.value === 'cout') return this.parseCout();
      if (nn && nn.type === TokenType.IDENTIFIER && nn.value === 'cin') return this.parseCin();
    }
    // Expression statement.
    const expr = this.parseExpression();
    if (!expr) {
      this.diagnose('error', 'S102', `unexpected '${t.value}'`, t);
      this.synchronize();
      return null;
    }
    const after = this.peek();
    if (after && after.type === TokenType.OPERATOR && (after.value === '<<' || after.value === '>>')) {
      this.diagnose(
        'error', 'S106',
        `'${after.value}' bit-shift is not in v1 — for output use 'std::cout << ...'`,
        after,
      );
      this.synchronize();
      return N('ExprStmt', startOf(expr), tokEnd(this.prev()), { expr });
    }
    this.expectSemi('after expression');
    return N('ExprStmt', expr.loc ? startOf(expr) : tokStart(t), tokEnd(this.prev()), { expr });
  }

  // Loop/if bodies: a bare declaration needs braces in C++.
  parseBody(what) {
    const t = this.peek();
    if (t && t.type === TokenType.KEYWORD && TYPE_KEYWORDS.has(t.value)) {
      this.diagnose('error', 'S101', `a declaration cannot be the body of ${what} without braces`, t);
      this.synchronize();
      return null;
    }
    return this.parseStatement();
  }

  parseIf() {
    const kw = this.advance();
    this.expectDelim('(', "after 'if'");
    const cond = this.parseExpression() ?? errorExpr(this);
    this.expectDelim(')', "after 'if' condition");
    const then = this.parseBody("'if'") ?? emptyBlock(this);
    let els = null;
    if (this.matchKw('else')) els = this.parseBody("'else'") ?? emptyBlock(this);
    return N('If', tokStart(kw), tokEnd(this.prev()), { cond, then, else: els });
  }

  parseWhile() {
    const kw = this.advance();
    this.expectDelim('(', "after 'while'");
    const cond = this.parseExpression() ?? errorExpr(this);
    this.expectDelim(')', "after 'while' condition");
    this.loopDepth += 1;
    const body = this.parseBody("'while'") ?? emptyBlock(this);
    this.loopDepth -= 1;
    return N('While', tokStart(kw), tokEnd(this.prev()), { cond, body });
  }

  parseFor() {
    const kw = this.advance();
    this.expectDelim('(', "after 'for'");
    let init = null;
    if (!this.is(TokenType.DELIMITER, ';')) {
      const t = this.peek();
      if (t.type === TokenType.KEYWORD && TYPE_KEYWORDS.has(t.value)) {
        const typeTok = this.advance();
        const name = this.peek();
        if (!name || name.type !== TokenType.IDENTIFIER) {
          this.diagnose('error', 'S101', 'expected a name after type', name);
          this.synchronize();
          return null;
        }
        this.advance();
        const declarators = [this.parseDeclarator(name)];
        init = N('VarDecl', tokStart(typeTok), tokEnd(this.prev()), {
          declType: typeTok.value, declarators,
        });
      } else {
        const e = this.parseExpression();
        if (e) init = N('ExprStmt', startOf(e), tokEnd(this.prev()), { expr: e });
      }
    }
    this.expectDelim(';', "in 'for' header");
    let cond = null;
    if (!this.is(TokenType.DELIMITER, ';')) cond = this.parseExpression();
    this.expectDelim(';', "in 'for' header");
    let update = null;
    if (!this.is(TokenType.DELIMITER, ')')) update = this.parseExpression();
    this.expectDelim(')', "after 'for' header");
    this.loopDepth += 1;
    const body = this.parseBody("'for'") ?? emptyBlock(this);
    this.loopDepth -= 1;
    return N('For', tokStart(kw), tokEnd(this.prev()), { init, cond, update, body });
  }

  parseReturn() {
    const kw = this.advance();
    if (this.fnDepth === 0) {
      this.diagnose('error', 'S104', "'return' outside a function", kw);
    }
    let value = null;
    if (!this.is(TokenType.DELIMITER, ';')) value = this.parseExpression();
    this.expectSemi("after 'return'");
    return N('Return', tokStart(kw), tokEnd(this.prev()), { value });
  }

  parseUsing() {
    const kw = this.advance();
    if (!this.matchKw('namespace')) {
      this.diagnose('error', 'S106', "only 'using namespace std;' is supported in v1", this.peek());
      this.synchronize();
      return N('Using', tokStart(kw), tokEnd(this.prev()), {});
    }
    const name = this.peek();
    if (!name || name.type !== TokenType.IDENTIFIER) {
      this.diagnose('error', 'S101', "expected a namespace name after 'using namespace'", name);
      this.synchronize();
      return N('Using', tokStart(kw), tokEnd(this.prev()), {});
    }
    this.advance();
    this.expectSemi('after using-directive');
    return N('Using', tokStart(kw), tokEnd(this.prev()), {});
  }

  parseCout() {
    const stdTok = this.advance(); // std
    this.advance(); // ::
    const coutTok = this.advance(); // cout
    void coutTok;
    const items = [];
    for (;;) {
      if (!this.matchOp('<<')) {
        this.diagnose('error', 'S101', "expected '<<' in cout statement", this.peek());
        this.synchronize();
        break;
      }
      const t = this.peek();
      if (t && t.type === TokenType.IDENTIFIER && t.value === 'std' &&
          this.peek(1) && this.peek(1).value === '::' &&
          this.peek(2) && this.peek(2).type === TokenType.IDENTIFIER && this.peek(2).value === 'endl') {
        this.advance();
        this.advance();
        const e = this.advance();
        items.push(N('Qualified', tokStart(t), tokEnd(e), { ns: 'std', name: 'endl' }));
      } else {
        const e = this.parseExpression();
        if (!e) {
          this.diagnose('error', 'S101', "expected an expression after '<<'", this.peek());
          this.synchronize();
          break;
        }
        items.push(e);
      }
      const n = this.peek();
      if (!n || n.type !== TokenType.OPERATOR || n.value !== '<<') break;
    }
    this.expectSemi('after cout statement');
    return N('Cout', tokStart(stdTok), tokEnd(this.prev()), { items });
  }

  parseCin() {
    const stdTok = this.advance();
    this.advance();
    const cinTok = this.advance();
    void cinTok;
    const targets = [];
    for (;;) {
      if (!this.matchOp('>>')) {
        this.diagnose('error', 'S101', "expected '>>' in cin statement", this.peek());
        this.synchronize();
        break;
      }
      const t = this.peek();
      if (!t || t.type !== TokenType.IDENTIFIER) {
        this.diagnose('error', 'S101', "expected a variable after '>>'", t);
        this.synchronize();
        break;
      }
      this.advance();
      targets.push(N('Identifier', tokStart(t), tokEnd(t), { name: t.value }));
      const n = this.peek();
      if (!n || n.type !== TokenType.OPERATOR || n.value !== '>>') break;
    }
    this.expectSemi('after cin statement');
    return N('Cin', tokStart(stdTok), tokEnd(this.prev()), { targets });
  }

  // ---- expressions (Pratt) ------------------------------------------------
  parseExpression(minPrec = 1) {
    let left = this.parseUnary();
    if (!left) return null;
    for (;;) {
      const t = this.peek();
      if (!t || t.type !== TokenType.OPERATOR) return left;
      if (ASSIGN_OPS.has(t.value)) {
        if (minPrec > 1) return left;
        this.advance();
        const right = this.parseExpression(1); // right-associative
        if (!right) {
          this.diagnose('error', 'S101', `expected an expression after '${t.value}'`, this.peek());
          return left;
        }
        left = N('Assignment', startOf(left), tokEnd(this.prev()), {
          op: t.value, left, right,
        });
        continue;
      }
      const prec = PRECEDENCE[t.value];
      // Unknown operators (<<, >>, ::, ...) terminate the expression here;
      // the statement level decides whether that deserves a targeted hint.
      if (prec === undefined || prec < minPrec) return left;
      this.advance();
      const right = this.parseExpression(prec + 1);
      if (!right) {
        this.diagnose('error', 'S101', `expected an expression after '${t.value}'`, this.peek());
        return left;
      }
      left = N('Binary', startOf(left), tokEnd(this.prev()), {
        op: t.value, left, right,
      });
    }
  }

  parseUnary() {
    const t = this.peek();
    if (t && t.type === TokenType.OPERATOR && ['!', '-', '+'].includes(t.value)) {
      this.advance();
      const operand = this.parseUnary();
      if (!operand) {
        this.diagnose('error', 'S101', `expected an expression after '${t.value}'`, this.peek());
        return null;
      }
      return N('Unary', tokStart(t), tokEnd(this.prev()), {
        op: t.value, operand, prefix: true,
      });
    }
    if (t && t.type === TokenType.OPERATOR && (t.value === '++' || t.value === '--')) {
      this.advance();
      const operand = this.parseUnary();
      if (!operand) {
        this.diagnose('error', 'S101', `expected an expression after '${t.value}'`, this.peek());
        return null;
      }
      return N('Update', tokStart(t), tokEnd(this.prev()), {
        op: t.value, operand, prefix: true,
      });
    }
    return this.parsePostfix();
  }

  parsePostfix() {
    let node = this.parsePrimary();
    if (!node) return null;
    for (;;) {
      const t = this.peek();
      if (t && t.type === TokenType.DELIMITER && t.value === '(') {
        this.advance();
        const args = [];
        if (!this.is(TokenType.DELIMITER, ')')) {
          for (;;) {
            const a = this.parseExpression();
            if (!a) break;
            args.push(a);
            if (!this.matchDelim(',')) break;
          }
        }
        this.expectDelim(')', 'after call arguments');
        node = N('Call', startOf(node), tokEnd(this.prev()), { callee: node, args });
        continue;
      }
      if (t && t.type === TokenType.OPERATOR && (t.value === '++' || t.value === '--')) {
        this.advance();
        node = N('Update', startOf(node), tokEnd(t), {
          op: t.value, operand: node, prefix: false,
        });
        continue;
      }
      if (t && t.type === TokenType.DELIMITER && t.value === '[') {
        this.diagnose('error', 'S106', 'array indexing is not supported in v1', t);
        this.advance();
        let depth = 1;
        while (!this.atEnd() && depth > 0) {
          const x = this.advance();
          if (x.type === TokenType.DELIMITER && x.value === '[') depth += 1;
          if (x.type === TokenType.DELIMITER && x.value === ']') depth -= 1;
        }
        continue;
      }
      if (t && t.type === TokenType.OPERATOR && (t.value === '.' || t.value === '->')) {
        this.diagnose('error', 'S106', `member access ('${t.value}') is not supported in v1`, t);
        this.advance();
        if (this.peek() && this.peek().type === TokenType.IDENTIFIER) this.advance();
        continue;
      }
      return node;
    }
  }

  parsePrimary() {
    const t = this.peek();
    if (!t) return null;
    if (t.type === TokenType.INT_LITERAL) {
      this.advance();
      return N('IntLit', tokStart(t), tokEnd(t), { value: t.value });
    }
    if (t.type === TokenType.FLOAT_LITERAL) {
      this.advance();
      return N('FloatLit', tokStart(t), tokEnd(t), { value: t.value });
    }
    if (t.type === TokenType.CHAR_LITERAL) {
      this.advance();
      return N('CharLit', tokStart(t), tokEnd(t), { value: t.value });
    }
    if (t.type === TokenType.STRING_LITERAL) {
      this.advance();
      return N('StringLit', tokStart(t), tokEnd(t), { value: t.value });
    }
    if (t.type === TokenType.BOOLEAN_LITERAL) {
      this.advance();
      return N('BoolLit', tokStart(t), tokEnd(t), { value: t.value });
    }
    if (t.type === TokenType.IDENTIFIER) {
      this.advance();
      const colon = this.peek();
      if (colon && colon.type === TokenType.OPERATOR && colon.value === '::') {
        this.advance();
        const name = this.peek();
        if (!name || name.type !== TokenType.IDENTIFIER) {
          this.diagnose('error', 'S101', "expected a name after '::'", name);
          return N('Identifier', tokStart(t), tokEnd(this.prev()), { name: t.value });
        }
        this.advance();
        return N('Qualified', tokStart(t), tokEnd(name), { ns: t.value, name: name.value });
      }
      return N('Identifier', tokStart(t), tokEnd(t), { name: t.value });
    }
    if (t.type === TokenType.DELIMITER && t.value === '(') {
      this.advance();
      const e = this.parseExpression();
      this.expectDelim(')', 'after parenthesized expression');
      return e;
    }
    if (t.type === TokenType.KEYWORD && t.value === 'sizeof') {
      this.diagnose('error', 'S106', "'sizeof' is not supported in v1", t);
      this.advance();
      return null;
    }
    return null;
  }
}

// ---- small helpers --------------------------------------------------------
function tokStart(t) {
  if (!t) return { line: 0, column: 0 };
  return { line: t.line ?? 0, column: t.column ?? 0 };
}
function tokEnd(t) {
  if (!t) return { endLine: 0, endColumn: 0 };
  return { endLine: t.endLine ?? t.line ?? 0, endColumn: t.endColumn ?? t.column ?? 0 };
}
function startOf(node) {
  return { line: node.loc.line, column: node.loc.column };
}
function errorExpr(p) {
  p.diagnose('error', 'S101', 'expected an expression', p.peek());
  const t = p.peek() ?? p.prev();
  const s = tokStart(t);
  const e = tokEnd(t);
  return N('IntLit', s, e, { value: '0', errorNode: true });
}
function emptyBlock(p) {
  const t = p.prev() ?? p.peek();
  const s = tokStart(t);
  return N('Block', s, tokEnd(t), { statements: [] });
}

module.exports = { Parser };
