/**
 * Codexa AI — semantic analyzer for the v1 C++ subset (Phase 4).
 * Single-pass walk enforcing declare-before-use (like C++), scope resolution,
 * type compatibility, function arity, return rules and a set of teaching
 * warnings (unused vars, narrowing, division by zero, missing main, ...).
 *
 * Emits E2xx (scope), E3xx (types) and Wxx (warnings); see grammar doc.
 */
const { makeScope, resetIds, defineSymbol, findInScope } = require('./symbols');

const NUMERIC = new Set(['int', 'float', 'char', 'bool']);

function isNumeric(t) {
  return NUMERIC.has(t);
}

function arithResult(a, b) {
  if (a === 'error' || b === 'error') return 'error';
  if (a === 'float' || b === 'float') return 'float';
  return 'int'; // char / bool promote to int
}

// 'ok' | 'warn' (narrowing) | 'error'
function assignable(from, to) {
  if (from === to || from === 'error' || to === 'error') return 'ok';
  if (to === 'float' && isNumeric(from)) return 'ok';
  if (to === 'int' && (from === 'char' || from === 'bool')) return 'ok';
  if (to === 'char' && from === 'bool') return 'ok';
  if (to === 'bool' && isNumeric(from)) return 'ok';
  if (to === 'int' && from === 'float') return 'warn';
  if (to === 'char' && (from === 'int' || from === 'float')) return 'warn';
  return 'error';
}

class Analyzer {
  constructor() {
    resetIds();
    this.diagnostics = [];
    this.scopes = [];
    this.global = makeScope('global', '<global>', null);
    this.scopes.push(this.global);
    this.stack = [this.global];
    this.currentFunction = null;
    this.hasReturn = false;
  }

  analyze(program) {
    for (const node of program.body ?? []) this.walkGlobal(node);
    this.checkUnused();
    if (!this.global.symbols.some((s) => s.kind === 'function' && s.name === 'main')) {
      this.diagnose('warning', 'W15', "no 'main' function found — the program will not link", {
        line: 1, column: 1, endLine: 1, endColumn: 2,
      });
    }
    return { symbols: this.scopes, diagnostics: this.diagnostics };
  }

  // ---- infrastructure -----------------------------------------------------
  scope() {
    return this.stack[this.stack.length - 1];
  }
  push(kind, name) {
    const s = makeScope(kind, name, this.scope());
    this.scopes.push(s);
    this.stack.push(s);
    return s;
  }
  pop() {
    this.stack.pop();
  }
  resolve(name) {
    for (let i = this.stack.length - 1; i >= 0; i -= 1) {
      const hit = findInScope(this.stack[i], name);
      if (hit) return hit;
    }
    return null;
  }
  diagnose(severity, code, message, loc) {
    this.diagnostics.push({
      phase: 'semantic', source: 'codexa', severity, code, message,
      line: loc.line, column: loc.column, endLine: loc.endLine, endColumn: loc.endColumn,
    });
  }
  at(node) {
    return node.loc;
  }

  // ---- globals ------------------------------------------------------------
  walkGlobal(node) {
    if (node.kind === 'FunctionDef') return this.defineFunction(node);
    if (node.kind === 'VarDecl') return this.defineVars(node, this.global);
    if (node.kind === 'Using') return;
    this.diagnose('error', 'E201', `unexpected '${node.kind}' at global scope`, this.at(node));
  }

  defineFunction(node) {
    if (findInScope(this.global, node.name)) {
      this.diagnose('error', 'E201', `redefinition of '${node.name}'`, this.at(node));
    } else {
      defineSymbol(this.global, {
        name: node.name,
        kind: 'function',
        type: node.returnType,
        line: node.loc.line,
        column: node.loc.column,
        signature: `(${node.params.map((p) => p.paramType).join(', ')}) -> ${node.returnType}`,
        params: node.params.map((p) => ({ name: p.name, type: p.paramType })),
      });
    }
    const savedFn = this.currentFunction;
    const savedRet = this.hasReturn;
    this.currentFunction = node;
    this.hasReturn = false;
    this.push('function', node.name);
    const seenParams = new Set();
    for (const p of node.params) {
      if (seenParams.has(p.name)) {
        this.diagnose('error', 'E201', `duplicate parameter '${p.name}'`, p.loc);
      } else {
        seenParams.add(p.name);
        if (p.paramType === 'void') {
          this.diagnose('error', 'E313', `parameter '${p.name}' has incomplete type 'void'`, p.loc);
        } else {
          defineSymbol(this.scope(), {
            name: p.name, kind: 'param', type: p.paramType,
            line: p.loc.line, column: p.loc.column,
          });
        }
      }
    }
    this.walkBlock(node.body);
    if (node.returnType !== 'void' && !this.hasReturn) {
      this.diagnose('warning', 'W12', `control may reach the end of non-void function '${node.name}'`, this.at(node));
    }
    if (node.name === 'main' && node.params.length > 0) {
      this.diagnose('warning', 'W11', "'main' with parameters is not supported in v1 — parameters will be ignored", this.at(node));
    }
    this.pop();
    this.currentFunction = savedFn;
    this.hasReturn = savedRet;
  }

  defineVars(node, scopeOverride = null) {
    if (node.declType === 'void') {
      this.diagnose('error', 'E313', `variable declaration uses incomplete type 'void'`, this.at(node));
      return;
    }
    const scope = scopeOverride ?? this.scope();
    for (const d of node.declarators) {
      const loc = { line: d.nameLoc.line, column: d.nameLoc.column, endLine: d.nameLoc.line, endColumn: d.nameLoc.column + d.name.length };
      if (findInScope(scope, d.name)) {
        this.diagnose('error', 'E201', `redeclaration of '${d.name}'`, loc);
        continue;
      }
      defineSymbol(scope, {
        name: d.name, kind: 'var', type: node.declType,
        line: loc.line, column: loc.column,
      });
      if (d.init) {
        const t = this.typeOf(d.init);
        const verdict = assignable(t, node.declType);
        if (verdict === 'error') {
          this.diagnose('error', 'E314', `cannot initialize '${node.declType} ${d.name}' with '${t}'`, this.at(d.init));
        } else if (verdict === 'warn') {
          this.diagnose('warning', 'W10', `narrowing conversion from '${t}' to '${node.declType}'`, this.at(d.init));
        }
      }
    }
  }

  checkUnused() {
    for (const scope of this.scopes) {
      for (const s of scope.symbols) {
        if (s.kind === 'var' && !s.used) {
          this.diagnose('warning', 'W14', `unused variable '${s.name}'`, {
            line: s.line, column: s.column, endLine: s.line, endColumn: s.column + s.name.length,
          });
        }
      }
    }
  }

  // ---- statements -----------------------------------------------------------
  walkBlock(block) {
    this.push('block', '{}');
    for (const s of block.statements ?? []) this.walkStmt(s);
    this.pop();
  }

  walkStmt(node) {
    switch (node.kind) {
      case 'Block': return this.walkBlock(node);
      case 'VarDecl': return this.defineVars(node);
      case 'ExprStmt': this.typeOf(node.expr); return;
      case 'Empty': case 'Using': case 'Break': case 'Continue': return;
      case 'If': {
        this.checkCondition(node.cond);
        this.walkStmt(node.then);
        if (node.else) this.walkStmt(node.else);
        return;
      }
      case 'While': {
        this.checkCondition(node.cond);
        this.walkStmt(node.body);
        return;
      }
      case 'For': {
        this.push('for', 'for');
        if (node.init) {
          if (node.init.kind === 'VarDecl') this.defineVars(node.init);
          else this.typeOf(node.init.expr ?? node.init);
        }
        if (node.cond) this.checkCondition(node.cond);
        if (node.update) this.typeOf(node.update);
        this.walkStmt(node.body);
        this.pop();
        return;
      }
      case 'Return': {
        if (!this.currentFunction) return;
        this.hasReturn = true;
        const ret = this.currentFunction.returnType;
        if (!node.value) {
          if (ret !== 'void') this.diagnose('error', 'E316', `return with no value in '${ret}' function`, this.at(node));
          return;
        }
        if (ret === 'void') {
          this.diagnose('error', 'E315', 'return with a value in void function', this.at(node));
          return;
        }
        const t = this.typeOf(node.value);
        const verdict = assignable(t, ret);
        if (verdict === 'error') this.diagnose('error', 'E304', `cannot return '${t}' from '${ret}' function`, this.at(node.value));
        else if (verdict === 'warn') this.diagnose('warning', 'W10', `narrowing return from '${t}' to '${ret}'`, this.at(node.value));
        return;
      }
      case 'Cout': {
        for (const item of node.items) {
          if (item.kind === 'Qualified') continue; // std::endl, validated in typeOf
          const t = this.typeOf(item);
          if (t === 'void' || t === 'manipulator') {
            this.diagnose('error', 'E311', 'expression is not printable with std::cout', this.at(item));
          } else if (t !== 'error' && !isNumeric(t) && t !== 'char' && t !== 'string' && t !== 'bool') {
            this.diagnose('error', 'E311', `cannot print value of type '${t}'`, this.at(item));
          }
        }
        return;
      }
      case 'Cin': {
        for (const target of node.targets) {
          const sym = this.resolve(target.name);
          if (!sym || sym.kind === 'function') {
            this.diagnose('error', 'E312', `cin target '${target.name}' is not a declared variable`, this.at(target));
            continue;
          }
          sym.used = true;
          if (sym.type === 'void') {
            this.diagnose('error', 'E312', `cannot read into '${target.name}' of type 'void'`, this.at(target));
          }
        }
        return;
      }
      default:
        this.diagnose('error', 'E201', `unsupported statement '${node.kind}'`, this.at(node));
    }
  }

  checkCondition(node) {
    const t = this.typeOf(node);
    if (t === 'void' || t === 'manipulator') {
      this.diagnose('error', 'E318', 'condition has incomplete type', this.at(node));
    } else if (t !== 'error' && !isNumeric(t)) {
      this.diagnose('error', 'E317', `condition must be a scalar (number/bool), got '${t}'`, this.at(node));
    }
  }

  requireValue(t, node, what) {
    if (t === 'void') {
      this.diagnose('error', 'E309', `${what} uses a void value`, this.at(node));
      return false;
    }
    if (t === 'manipulator') {
      this.diagnose('error', 'E309', `${what} misuses 'std::endl' (only valid in cout chains)`, this.at(node));
      return false;
    }
    return t !== 'error';
  }

  // ---- expressions → type -----------------------------------------------------
  typeOf(node) {
    switch (node.kind) {
      case 'IntLit': return 'int';
      case 'FloatLit': return 'float';
      case 'CharLit': return 'char';
      case 'StringLit': return 'string';
      case 'BoolLit': return 'bool';
      case 'Identifier': {
        const sym = this.resolve(node.name);
        if (!sym) {
          this.diagnose('error', 'E202', `use of undeclared identifier '${node.name}'`, this.at(node));
          return 'error';
        }
        sym.used = true;
        if (sym.kind === 'function') {
          this.diagnose('error', 'E309', `function '${node.name}' used as a value (did you forget '()'?)`, this.at(node));
          return 'error';
        }
        return sym.type;
      }
      case 'Qualified': {
        if (node.ns === 'std' && node.name === 'endl') return 'manipulator';
        this.diagnose('error', 'E310', `'${node.ns}::${node.name}' is not supported in v1`, this.at(node));
        return 'error';
      }
      case 'Call': return this.typeOfCall(node);
      case 'Assignment': return this.typeOfAssignment(node);
      case 'Binary': return this.typeOfBinary(node);
      case 'Unary': {
        const t = this.typeOf(node.operand);
        if (!this.requireValue(t, node.operand, `unary '${node.op}'`)) return 'error';
        if (node.op === '!') {
          if (!isNumeric(t)) {
            this.diagnose('error', 'E317', `operator '!' needs a scalar, got '${t}'`, this.at(node));
            return 'error';
          }
          return 'bool';
        }
        if (!isNumeric(t)) {
          this.diagnose('error', 'E305', `invalid operand '${t}' for unary '${node.op}'`, this.at(node));
          return 'error';
        }
        return t === 'float' ? 'float' : 'int';
      }
      case 'Update': {
        if (node.operand.kind !== 'Identifier') {
          this.diagnose('error', 'E301', `'${node.op}' needs a variable`, this.at(node));
          return 'error';
        }
        const sym = this.resolve(node.operand.name);
        if (!sym || sym.kind === 'function') {
          this.diagnose('error', sym ? 'E301' : 'E202',
            sym ? `cannot apply '${node.op}' to function '${node.operand.name}'` : `use of undeclared identifier '${node.operand.name}'`,
            this.at(node.operand));
          return 'error';
        }
        sym.used = true;
        if (!isNumeric(sym.type)) {
          this.diagnose('error', 'E305', `invalid operand '${sym.type}' for '${node.op}'`, this.at(node));
          return 'error';
        }
        return sym.type;
      }
      default:
        this.diagnose('error', 'E201', `unsupported expression '${node.kind}'`, this.at(node));
        return 'error';
    }
  }

  typeOfCall(node) {
    let name = null;
    if (node.callee.kind === 'Identifier') name = node.callee.name;
    else {
      this.diagnose('error', 'E319', 'only direct function calls are supported in v1', this.at(node.callee));
      for (const a of node.args) this.typeOf(a);
      return 'error';
    }
    const sym = this.resolve(name);
    if (!sym) {
      this.diagnose('error', 'E202', `call to undeclared function '${name}'`, this.at(node.callee));
      for (const a of node.args) this.typeOf(a);
      return 'error';
    }
    sym.used = true;
    if (sym.kind !== 'function') {
      this.diagnose('error', 'E319', `'${name}' is not a function`, this.at(node.callee));
      for (const a of node.args) this.typeOf(a);
      return 'error';
    }
    if (node.args.length !== sym.params.length) {
      this.diagnose('error', 'E307',
        `'${name}' expects ${sym.params.length} argument(s) but got ${node.args.length}`,
        this.at(node));
    }
    const n = Math.min(node.args.length, sym.params.length);
    for (let i = 0; i < n; i += 1) {
      const at = this.typeOf(node.args[i]);
      const verdict = assignable(at, sym.params[i].type);
      if (verdict === 'error') {
        this.diagnose('error', 'E308',
          `argument ${i + 1} of '${name}' expects '${sym.params[i].type}' but got '${at}'`,
          this.at(node.args[i]));
      } else if (verdict === 'warn') {
        this.diagnose('warning', 'W10',
          `narrowing argument ${i + 1} of '${name}' from '${at}' to '${sym.params[i].type}'`,
          this.at(node.args[i]));
      }
    }
    for (let i = n; i < node.args.length; i += 1) this.typeOf(node.args[i]);
    return sym.type;
  }

  typeOfAssignment(node) {
    if (node.left.kind !== 'Identifier') {
      this.diagnose('error', 'E301', 'assignment target is not a variable', this.at(node.left));
      this.typeOf(node.left);
      this.typeOf(node.right);
      return 'error';
    }
    const sym = this.resolve(node.left.name);
    if (!sym) {
      this.diagnose('error', 'E202', `assignment to undeclared identifier '${node.left.name}'`, this.at(node.left));
      this.typeOf(node.right);
      return 'error';
    }
    if (sym.kind === 'function') {
      this.diagnose('error', 'E301', `cannot assign to function '${node.left.name}'`, this.at(node.left));
      this.typeOf(node.right);
      return 'error';
    }
    sym.used = true;
    const rt = this.typeOf(node.right);
    if (!this.requireValue(rt, node.right, 'assignment')) return 'error';
    if (node.op !== '=') {
      if (!isNumeric(sym.type) || !isNumeric(rt)) {
        this.diagnose('error', 'E305', `invalid operands '${sym.type}' and '${rt}' for '${node.op}'`, this.at(node));
        return 'error';
      }
      if (assignable(rt, sym.type) === 'warn') {
        this.diagnose('warning', 'W10', `possible loss of data in '${node.op}'`, this.at(node.right));
      }
      return sym.type;
    }
    const verdict = assignable(rt, sym.type);
    if (verdict === 'error') {
      this.diagnose('error', 'E304', `cannot assign '${rt}' to '${sym.type} ${sym.name}'`, this.at(node));
    } else if (verdict === 'warn') {
      this.diagnose('warning', 'W10', `narrowing assignment from '${rt}' to '${sym.type}'`, this.at(node.right));
    }
    return sym.type;
  }

  typeOfBinary(node) {
    const lt = this.typeOf(node.left);
    const rt = this.typeOf(node.right);
    const lok = this.requireValue(lt, node.left, `operator '${node.op}'`);
    const rok = this.requireValue(rt, node.right, `operator '${node.op}'`);
    if (!lok || !rok) return 'error';
    const { op } = node;

    if (op === '%') {
      if (!isNumeric(lt) || !isNumeric(rt)) {
        this.diagnose('error', 'E305', `invalid operands '${lt}' and '${rt}' for '%'`, this.at(node));
        return 'error';
      }
      if (lt === 'float' || rt === 'float') {
        this.diagnose('error', 'E306', "'%' needs integer operands", this.at(node));
        return 'error';
      }
      return 'int';
    }
    if (['+', '-', '*', '/'].includes(op)) {
      if (!isNumeric(lt) || !isNumeric(rt)) {
        this.diagnose('error', 'E305', `invalid operands '${lt}' and '${rt}' for '${op}'`, this.at(node));
        return 'error';
      }
      if ((op === '/' || op === '%') && node.right.kind === 'IntLit' && node.right.value === '0') {
        this.diagnose('warning', 'W13', 'division by zero', this.at(node.right));
      }
      return arithResult(lt, rt);
    }
    if (['<', '>', '<=', '>='].includes(op)) {
      if (!isNumeric(lt) || !isNumeric(rt)) {
        this.diagnose('error', 'E305', `invalid operands '${lt}' and '${rt}' for '${op}'`, this.at(node));
        return 'error';
      }
      return 'bool';
    }
    if (op === '==' || op === '!=') {
      const bothStr = lt === 'string' && rt === 'string';
      if ((isNumeric(lt) && isNumeric(rt)) || bothStr) return 'bool';
      this.diagnose('error', 'E305', `invalid operands '${lt}' and '${rt}' for '${op}'`, this.at(node));
      return 'error';
    }
    if (op === '&&' || op === '||') {
      if (!isNumeric(lt) || !isNumeric(rt)) {
        this.diagnose('error', 'E317', `operator '${op}' needs scalars, got '${lt}' and '${rt}'`, this.at(node));
        return 'error';
      }
      return 'bool';
    }
    this.diagnose('error', 'E305', `unknown operator '${op}'`, this.at(node));
    return 'error';
  }
}

module.exports = { Analyzer, assignable, isNumeric };
