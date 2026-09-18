# Codexa AI — C++ subset grammar (Phase 4, v1)

Educational subset of C++. Programs outside it either fail with a clear,
located diagnostic or (for full C++) are handled by sandboxed Clang (Phase 6).

## EBNF

```ebnf
program      := { functionDef | globalDecl } ;
globalDecl   := type ident { "," ident [ "=" expr ] } ";" ;
functionDef  := type ident "(" [ paramList | "void" ] ")" block ;
paramList    := type ident { "," type ident } ;
type         := "int" | "float" | "char" | "bool" | "void" ;  (* void: function returns only *)

statement    := block | varDecl | exprStmt | ifStmt | whileStmt | forStmt
              | returnStmt | "break" ";" | "continue" ";" | ";" | usingDir
              | coutStmt | cinStmt ;
block        := "{" { statement } "}" ;
varDecl      := type ident [ "=" expr ] { "," ident [ "=" expr ] } ";" ;
exprStmt     := expr ";" ;
ifStmt       := "if" "(" expr ")" body [ "else" body ] ;
whileStmt    := "while" "(" expr ")" body ;
forStmt      := "for" "(" forInit ";" [ expr ] ";" [ expr ] ")" body ;
forInit      := varDeclNoSemi | [ expr ] ;   (* varDeclNoSemi: no trailing ";" *)
body         := block | statementNoDecl ;    (* bare declarations need braces *)
returnStmt   := "return" [ expr ] ";" ;
usingDir     := "using" "namespace" ident ";" ;   (* accepted, ignored *)
coutStmt     := "std" "::" "cout" { "<<" ( expr | "std" "::" "endl" ) } ";" ;
cinStmt      := "std" "::" "cin" { ">>" ident } ";" ;

expr         := assign ;
assign       := logicOr { ( "=" | "+=" | "-=" | "*=" | "/=" | "%=" ) assign } ;  (* right-assoc *)
logicOr      := logicAnd { "||" logicAnd } ;
logicAnd     := equality { "&&" equality } ;
equality     := relation { ( "==" | "!=" ) relation } ;
relation     := additive { ( "<" | ">" | "<=" | ">=" ) additive } ;
additive     := multiplicative { ( "+" | "-" ) multiplicative } ;
multiplicative := unary { ( "*" | "/" | "%" ) unary } ;
unary        := ( "!" | "-" | "+" | "++" | "--" ) unary | postfix ;
postfix      := primary { "(" [ expr { "," expr } ] ")" | "++" | "--" } ;
primary      := literal | ident | "std" "::" ident | "(" expr ")" ;
literal      := INT | FLOAT | CHAR | STRING | "true" | "false" ;
```

## Deliberately out of v1 (clear error, never silent)

Arrays/`[]`, structs/classes, pointers/`*`-deref/`&`-addr/`->`, templates,
`switch`, do-while, `sizeof`, exceptions, function prototypes, overloading,
default args, references, `new`/`delete`, `goto`, `typedef`/`using`-aliases,
preprocessor beyond `#include`-style lines (directives are skipped),
member access `.`. Bare `cout << x` without `std::` suggests the fix.

## Operator precedence (high → low)

postfix call/`++`/`--` › unary › `*` `/` `%` › `+` `-` › relational ›
equality › `&&` › `||` › assignment (right-associative).

## AST nodes

`Program FunctionDef Param VarDecl Declarator Block If While For Return
Break Continue ExprStmt Empty Using Cout Cin Assignment Binary Unary Update
Call Identifier Qualified IntLit FloatLit CharLit StringLit BoolLit`.
Every node carries `loc: { line, column, endLine, endColumn }`.

## Diagnostic codes

- **S1xx** syntax (parser): S101 expected token · S102 unexpected token ·
  S103 too many errors · S104 `return` outside function · S105
  `break`/`continue` outside loop · S106 unsupported construct.
- **E2xx** declarations/scope: E201 redeclaration · E202 undeclared identifier.
- **E3xx** types: E301 not assignable · E304 incompatible assignment ·
  E305 invalid operands · E306 `%` needs integers · E307 arity mismatch ·
  E308 argument type · E309 void value used · E310 unsupported `std::` name ·
  E311 not printable · E312 bad `cin` target · E313 `void` variable ·
  E315/E316 bad `return` · E317 non-scalar condition · E318 void condition.
- **Wxx** warnings: W10 narrowing · W11 `main` with params · W12 missing
  `return` · W13 division by zero · W14 unused variable · W15 no `main`.
