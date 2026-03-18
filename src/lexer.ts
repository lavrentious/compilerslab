import { Token, TokenType } from "./types.ts";

export class Lexer {
  private readonly input: string;
  private readonly length: number;
  private position = 0;
  private line = 1;
  private column = 1;

  constructor(input: string) {
    this.input = input;
    this.length = input.length;
  }

  tokenize(): Token[] {
    const result: Token[] = [];

    while (this.position < this.length) {
      const current = this.peek();

      if (/\s/u.test(current)) {
        this.next();
        continue;
      }

      if (/[0-9]/u.test(current)) {
        this.tokenizeNumber(result);
        continue;
      }

      if (/[A-Za-z]/u.test(current)) {
        this.tokenizeWord(result);
        continue;
      }

      this.tokenizeOperator(result);
    }

    result.push(
      new Token(TokenType.EOF, "", this.position, this.line, this.column),
    );
    return result;
  }

  private tokenizeNumber(result: Token[]): void {
    const start = this.position;
    const line = this.line;
    const column = this.column;
    while (/[0-9]/u.test(this.peek())) {
      this.next();
    }

    const numberValue = this.input.slice(start, this.position);
    result.push(new Token(TokenType.NUMBER, numberValue, start, line, column));
  }

  private tokenizeWord(result: Token[]): void {
    const start = this.position;
    const line = this.line;
    const column = this.column;
    while (/[A-Za-z0-9]/u.test(this.peek())) {
      this.next();
    }

    const word = this.input.slice(start, this.position);
    switch (word) {
      case "var":
        this.addToken(result, TokenType.VAR, word, start, line, column);
        break;
      case "print":
        this.addToken(result, TokenType.PRINT, word, start, line, column);
        break;
      case "if":
        this.addToken(result, TokenType.IF, word, start, line, column);
        break;
      case "else":
        this.addToken(result, TokenType.ELSE, word, start, line, column);
        break;
      case "while":
        this.addToken(result, TokenType.WHILE, word, start, line, column);
        break;
      default:
        this.addToken(result, TokenType.ID, word, start, line, column);
        break;
    }
  }

  private tokenizeOperator(result: Token[]): void {
    const current = this.peek();
    const start = this.position;
    const line = this.line;
    const column = this.column;

    if (current === "=") {
      this.next();
      if (this.peek() === "=") {
        this.next();
        this.addToken(result, TokenType.EQEQ, "==", start, line, column);
      } else {
        this.addToken(result, TokenType.EQ, "=", start, line, column);
      }
      return;
    }

    if (current === "!") {
      this.next();
      if (this.peek() === "=") {
        this.next();
        this.addToken(result, TokenType.NEQ, "!=", start, line, column);
      } else {
        this.addToken(result, TokenType.EXCL, "!", start, line, column);
      }
      return;
    }

    if (current === "<") {
      this.next();
      if (this.peek() === "=") {
        this.next();
        this.addToken(result, TokenType.LTEQ, "<=", start, line, column);
      } else {
        this.addToken(result, TokenType.LT, "<", start, line, column);
      }
      return;
    }

    if (current === ">") {
      this.next();
      if (this.peek() === "=") {
        this.next();
        this.addToken(result, TokenType.GTEQ, ">=", start, line, column);
      } else {
        this.addToken(result, TokenType.GT, ">", start, line, column);
      }
      return;
    }

    if (current === "&") {
      this.next();
      if (this.peek() === "&") {
        this.next();
        this.addToken(result, TokenType.AND, "&&", start, line, column);
        return;
      }

      throw new Error(`Unexpected character '&' at position ${this.position}`);
    }

    if (current === "|") {
      this.next();
      if (this.peek() === "|") {
        this.next();
        this.addToken(result, TokenType.OR, "||", start, line, column);
        return;
      }

      throw new Error(`Unexpected character '|' at position ${this.position}`);
    }

    switch (current) {
      case "+":
        this.next();
        this.addToken(result, TokenType.PLUS, "+", start, line, column);
        return;
      case "-":
        this.next();
        this.addToken(result, TokenType.MINUS, "-", start, line, column);
        return;
      case "*":
        this.next();
        this.addToken(result, TokenType.STAR, "*", start, line, column);
        return;
      case "/":
        this.next();
        this.addToken(result, TokenType.SLASH, "/", start, line, column);
        return;
      case ";":
        this.next();
        this.addToken(result, TokenType.SEMICOLON, ";", start, line, column);
        return;
      case "(":
        this.next();
        this.addToken(result, TokenType.LPAREN, "(", start, line, column);
        return;
      case ")":
        this.next();
        this.addToken(result, TokenType.RPAREN, ")", start, line, column);
        return;
      case "{":
        this.next();
        this.addToken(result, TokenType.LBRACE, "{", start, line, column);
        return;
      case "}":
        this.next();
        this.addToken(result, TokenType.RBRACE, "}", start, line, column);
        return;
      default:
        throw new Error(
          `Unexpected character '${current}' at position ${this.position}`,
        );
    }
  }

  private peek(): string {
    if (this.position >= this.length) {
      return "\0";
    }

    return this.input[this.position] ?? "\0";
  }

  private next(): string {
    if (this.position >= this.length) {
      return "\0";
    }

    const char = this.input[this.position] ?? "\0";
    this.position += 1;
    if (char === "\n") {
      this.line += 1;
      this.column = 1;
    } else {
      this.column += 1;
    }
    return char;
  }

  private addToken(
    result: Token[],
    type: TokenType,
    value: string,
    start: number,
    line: number,
    column: number,
  ): void {
    result.push(new Token(type, value, start, line, column));
  }
}
