/**
 * Codexa AI — AST → three-address code generator (Phase 5).
 *
 * Walks the parse tree (Phase 4 AST) and lowers it to a linear sequence of
 * three-address instructions.  Each instruction has at most two source operands
 * and one destination (temporaries t1, t2, …).
 *
 * Supports: assignments, binary/unary ops, if/else, while, for, return,
 * function definitions, cout/cin, break/continue, and function calls.
 *
 * Unsupported AST nodes are reported as diagnostics (never silently dropped).
 */
const { instr } = require('./tac');

class TacGenerator {
  constructor() {
    this.instructions = [];
    this.diagnostics = [];
    this.tmpCount = 0;
    this.labelCount = 0;
    this.breakLabel = null;
    this.continueLabel = null;
  }

  generate(program) {
    for (const node of program.body ?? []) this.emitGlobal(node);
    return {
      instructions: this.instructions,
      diagnostics: this.diagnostics,
    };
  }

  // ---- infrastructure ---------------------------------------------------
  newTmp() {
    this.tmpCount += 1;
    return `t${this.tmpCount}`;
  }

  newLabel(prefix = 'L') {
    this.labelCount += 1;
    return `${prefix}${this.labelCount}`;
  }

  emit(i) {
    this.instructions.push(i);
  }

  loc(node) {
    return node?.loc ?? null;
  }

  diagnose(severity, code, message, node) {
    const loc = this.loc(node);
    this.diagnostics.push({
      phase: 'tac', source: 'codexa', severity, code, message,
      line: loc?.line ?? 0, column: loc?.column ?? 0,
      endLine: loc?.endLine ?? 0, endColumn: loc?.endColumn ?? 0,
    });
  }

  // ---- globals ----------------------------------------------------------
  emitGlobal(node) {
    switch (node.kind) {
      case 'FunctionDef': return this.emitFunction(node);
      case 'VarDecl': return this.emitGlobalVarDecl(node);
      case 'Using': return; // ignored
      default:
        this.diagnose('error', 'T101', `unsupported global '${node.kind}'`, node);
    }
  }

  emitGlobalVarDecl(node) {
    for (const d of node.declarators) {
      if (d.init) {
        const val = this.emitExpr(d.init);
        this.emit(instr('assign', d.name, val, null, null, this.loc(node)));
      }
    }
  }

  emitFunction(node) {
    this.emit(instr('label', null, null, null, `fn_${node.name}`, this.loc(node)));
    for (const p of node.params) {
      this.emit(instr('param', p.name, null, null, null, this.loc(node)));
    }
    this.emitBlock(node.body);
    // Implicit return for void functions
    if (node.returnType === 'void') {
      this.emit(instr('return', null, null, null, null, this.loc(node)));
    }
  }

  // ---- statements -------------------------------------------------------
  emitBlock(node) {
    for (const s of node.statements ?? []) this.emitStmt(s);
  }

  emitStmt(node) {
    if (!node) return;
    switch (node.kind) {
      case 'Block': return this.emitBlock(node);
      case 'VarDecl': return this.emitVarDecl(node);
      case 'ExprStmt': this.emitExpr(node.expr); return;
      case 'Empty': return;
      case 'Return': return this.emitReturn(node);
      case 'If': return this.emitIf(node);
      case 'While': return this.emitWhile(node);
      case 'For': return this.emitFor(node);
      case 'Break': return this.emitBreak(node);
      case 'Continue': return this.emitContinue(node);
      case 'Cout': return this.emitCout(node);
      case 'Cin': return this.emitCin(node);
      case 'Using': return;
      default:
        this.diagnose('error', 'T101', `unsupported statement '${node.kind}'`, node);
    }
  }

  emitVarDecl(node) {
    for (const d of node.declarators) {
      if (d.init) {
        const val = this.emitExpr(d.init);
        this.emit(instr('assign', d.name, val, null, null, this.loc(node)));
      }
    }
  }

  emitReturn(node) {
    if (node.value) {
      const val = this.emitExpr(node.value);
      this.emit(instr('return', null, val, null, null, this.loc(node)));
    } else {
      this.emit(instr('return', null, null, null, null, this.loc(node)));
    }
  }

  emitIf(node) {
    const condTmp = this.emitExpr(node.cond);
    const elseLabel = this.newLabel('else');
    const endLabel = this.newLabel('endif');
    const hasElse = node.else != null;

    // if_false cond goto elseLabel (or endLabel if no else)
    this.emit(instr('if_goto', null, condTmp, hasElse ? elseLabel : endLabel, null, this.loc(node)));
    this.emitThen = true;

    // then branch
    this.emitStmt(node.then);
    if (hasElse) {
      this.emit(instr('goto', null, null, null, endLabel, this.loc(node)));
    }

    // else label
    this.emit(instr('label', null, null, null, hasElse ? elseLabel : endLabel, this.loc(node)));
    if (hasElse) {
      this.emitStmt(node.else);
      this.emit(instr('label', null, null, null, endLabel, this.loc(node)));
    }
  }

  emitWhile(node) {
    const startLabel = this.newLabel('while');
    const endLabel = this.newLabel('endwhile');

    const savedBreak = this.breakLabel;
    const savedCont = this.continueLabel;
    this.breakLabel = endLabel;
    this.continueLabel = startLabel;

    this.emit(instr('label', null, null, null, startLabel, this.loc(node)));
    const condTmp = this.emitExpr(node.cond);
    this.emit(instr('if_goto', null, condTmp, endLabel, null, this.loc(node)));
    this.emitStmt(node.body);
    this.emit(instr('goto', null, null, null, startLabel, this.loc(node)));
    this.emit(instr('label', null, null, null, endLabel, this.loc(node)));

    this.breakLabel = savedBreak;
    this.continueLabel = savedCont;
  }

  emitFor(node) {
    const savedBreak = this.breakLabel;
    const savedCont = this.continueLabel;

    const startLabel = this.newLabel('for');
    const condLabel = this.newLabel('forcond');
    const updateLabel = this.newLabel('forupd');
    const endLabel = this.newLabel('endfor');

    this.breakLabel = endLabel;
    this.continueLabel = updateLabel;

    // init
    if (node.init) {
      if (node.init.kind === 'VarDecl') {
        this.emitVarDecl(node.init);
      } else {
        this.emitExpr(node.init.expr ?? node.init);
      }
    }

    // goto cond
    this.emit(instr('goto', null, null, null, condLabel, this.loc(node)));

    // cond
    this.emit(instr('label', null, null, null, condLabel, this.loc(node)));
    if (node.cond) {
      const condTmp = this.emitExpr(node.cond);
      this.emit(instr('if_goto', null, condTmp, endLabel, null, this.loc(node)));
    }
    this.emit(instr('goto', null, null, null, startLabel, this.loc(node)));

    // body
    this.emit(instr('label', null, null, null, startLabel, this.loc(node)));
    this.emitStmt(node.body);

    // update
    this.emit(instr('label', null, null, null, updateLabel, this.loc(node)));
    if (node.update) {
      this.emitExpr(node.update);
    }
    this.emit(instr('goto', null, null, null, condLabel, this.loc(node)));

    // end
    this.emit(instr('label', null, null, null, endLabel, this.loc(node)));

    this.breakLabel = savedBreak;
    this.continueLabel = savedCont;
  }

  emitBreak(node) {
    if (this.breakLabel) {
      this.emit(instr('goto', null, null, null, this.breakLabel, this.loc(node)));
    }
  }

  emitContinue(node) {
    if (this.continueLabel) {
      this.emit(instr('goto', null, null, null, this.continueLabel, this.loc(node)));
    }
  }

  emitCout(node) {
    for (const item of node.items) {
      if (item.kind === 'Qualified') {
        // std::endl — emit a special print_endl
        this.emit(instr('call', null, 'print_endl', null, null, this.loc(item)));
      } else {
        const val = this.emitExpr(item);
        this.emit(instr('call', null, 'print', val, null, this.loc(item)));
      }
    }
  }

  emitCin(node) {
    for (const target of node.targets) {
      this.emit(instr('call', target.name, 'read', null, null, this.loc(node)));
    }
  }

  // ---- expressions ------------------------------------------------------
  emitExpr(node) {
    if (!node) return '0';
    switch (node.kind) {
      case 'IntLit': return node.value;
      case 'FloatLit': return node.value;
      case 'CharLit': return node.value;
      case 'StringLit': return node.value;
      case 'BoolLit': return node.value;
      case 'Identifier': return node.name;
      case 'Qualified': return `${node.ns}::${node.name}`;
      case 'Binary': return this.emitBinary(node);
      case 'Unary': return this.emitUnary(node);
      case 'Update': return this.emitUpdate(node);
      case 'Assignment': return this.emitAssignment(node);
      case 'Call': return this.emitCall(node);
      default:
        this.diagnose('error', 'T102', `unsupported expression '${node.kind}'`, node);
        return '0';
    }
  }

  emitBinary(node) {
    const left = this.emitExpr(node.left);
    const right = this.emitExpr(node.right);
    const tmp = this.newTmp();
    this.emit(instr('binop', tmp, `${left} ${node.op} ${right}`, null, null, this.loc(node)));
    return tmp;
  }

  emitUnary(node) {
    const operand = this.emitExpr(node.operand);
    const tmp = this.newTmp();
    if (node.prefix) {
      this.emit(instr('unary', tmp, `${node.op} ${operand}`, null, null, this.loc(node)));
    } else {
      this.emit(instr('unary', tmp, `${operand}${node.op}`, null, null, this.loc(node)));
    }
    return tmp;
  }

  emitUpdate(node) {
    const name = node.operand.name;
    const tmp = this.newTmp();
    if (node.prefix) {
      // ++x: tmp = x + 1; x = tmp; return tmp
      this.emit(instr('binop', tmp, `${name} + 1`, null, null, this.loc(node)));
      this.emit(instr('assign', name, tmp, null, null, this.loc(node)));
      return tmp;
    }
    // x++: tmp = x; x = x + 1; return tmp
    this.emit(instr('assign', tmp, name, null, null, this.loc(node)));
    const tmp2 = this.newTmp();
    this.emit(instr('binop', tmp2, `${name} + 1`, null, null, this.loc(node)));
    this.emit(instr('assign', name, tmp2, null, null, this.loc(node)));
    return tmp;
  }

  emitAssignment(node) {
    const val = this.emitExpr(node.right);
    const target = node.left.name;
    if (node.op === '=') {
      this.emit(instr('assign', target, val, null, null, this.loc(node)));
      return target;
    }
    // Compound assignment: x += e → x = x + e (but keep original op in TAC)
    const tmp = this.newTmp();
    const baseOp = node.op.slice(0, -1); // '+=' → '+'
    this.emit(instr('binop', tmp, `${target} ${baseOp} ${val}`, null, null, this.loc(node)));
    this.emit(instr('assign', target, tmp, null, null, this.loc(node)));
    return target;
  }

  emitCall(node) {
    let name = '<unknown>';
    if (node.callee.kind === 'Identifier') {
      name = node.callee.name;
    }
    const args = node.args.map((a) => this.emitExpr(a));
    for (const arg of args) {
      this.emit(instr('param', null, arg, null, null, this.loc(node)));
    }
    const tmp = this.newTmp();
    this.emit(instr('call', tmp, name, null, null, this.loc(node)));
    return tmp;
  }
}

module.exports = { TacGenerator };
