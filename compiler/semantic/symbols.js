/**
 * Codexa AI — scoped symbol table (Phase 4).
 * Plain data, no I/O. The analyzer owns the scope stack; this module holds
 * scope/symbol construction so the output shape stays stable for the API.
 */

let nextId = 1;

function makeScope(kind, name, parent) {
  return {
    id: nextId++,
    kind, // 'global' | 'function' | 'block' | 'for'
    name,
    parent: parent ? parent.id : null,
    symbols: [],
  };
}

function resetIds() {
  nextId = 1;
}

function defineSymbol(scope, symbol) {
  scope.symbols.push({ used: false, ...symbol });
  return scope.symbols[scope.symbols.length - 1];
}

function findInScope(scope, name) {
  return scope.symbols.find((s) => s.name === name) ?? null;
}

module.exports = { makeScope, resetIds, defineSymbol, findInScope };
