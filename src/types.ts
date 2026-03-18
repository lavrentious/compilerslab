export enum TokenType {
  NUMBER = "NUMBER",
  ID = "ID",
  STRING = "STRING",
  VAR = "VAR",
  PRINT = "PRINT",
  IF = "IF",
  ELSE = "ELSE",
  WHILE = "WHILE",
  PLUS = "PLUS",
  MINUS = "MINUS",
  STAR = "STAR",
  SLASH = "SLASH",
  EQ = "EQ",
  EQEQ = "EQEQ",
  EXCL = "EXCL",
  NEQ = "NEQ",
  LT = "LT",
  GT = "GT",
  LTEQ = "LTEQ",
  GTEQ = "GTEQ",
  AND = "AND",
  OR = "OR",
  LPAREN = "LPAREN",
  RPAREN = "RPAREN",
  LBRACE = "LBRACE",
  RBRACE = "RBRACE",
  SEMICOLON = "SEMICOLON",
  EOF = "EOF",
}

export class Token {
  constructor(
    public readonly type: TokenType,
    public readonly value: string,
    public readonly position: number,
    public readonly line: number,
    public readonly column: number,
  ) {}

  toString(): string {
    return `Token(${this.type}, ${this.value}, ${this.position}, ${this.line}:${this.column})`;
  }
}
