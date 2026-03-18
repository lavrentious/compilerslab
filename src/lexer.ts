import { Token, TokenType } from "./types.ts";

export class Lexer {
  private readonly input: string;
  private readonly length: number;
  private position = 0;

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

    result.push(new Token(TokenType.EOF, "", this.position));
    return result;
  }

  private tokenizeNumber(result: Token[]): void {
    const start = this.position;
    while (/[0-9]/u.test(this.peek())) {
      this.next();
    }

    const numberValue = this.input.slice(start, this.position);
    result.push(new Token(TokenType.NUMBER, numberValue, start));
  }

  private tokenizeWord(result: Token[]): void {
    const start = this.position;
    while (/[A-Za-z0-9]/u.test(this.peek())) {
      this.next();
    }

    const word = this.input.slice(start, this.position);
    switch (word) {
      case "var":
        this.addToken(result, TokenType.VAR, word, start);
        break;
      case "print":
        this.addToken(result, TokenType.PRINT, word, start);
        break;
      case "if":
        this.addToken(result, TokenType.IF, word, start);
        break;
      case "else":
        this.addToken(result, TokenType.ELSE, word, start);
        break;
      case "while":
        this.addToken(result, TokenType.WHILE, word, start);
        break;
      default:
        this.addToken(result, TokenType.ID, word, start);
        break;
    }
  }

  private tokenizeOperator(result: Token[]): void {
    const current = this.peek();
    const start = this.position;

    if (current === "=") {
      this.next();
      if (this.peek() === "=") {
        this.next();
        this.addToken(result, TokenType.EQEQ, "==", start);
      } else {
        this.addToken(result, TokenType.EQ, "=", start);
      }
      return;
    }

    if (current === "!") {
      this.next();
      if (this.peek() === "=") {
        this.next();
        this.addToken(result, TokenType.NEQ, "!=", start);
      } else {
        this.addToken(result, TokenType.EXCL, "!", start);
      }
      return;
    }

    if (current === "<") {
      this.next();
      if (this.peek() === "=") {
        this.next();
        this.addToken(result, TokenType.LTEQ, "<=", start);
      } else {
        this.addToken(result, TokenType.LT, "<", start);
      }
      return;
    }

    if (current === ">") {
      this.next();
      if (this.peek() === "=") {
        this.next();
        this.addToken(result, TokenType.GTEQ, ">=", start);
      } else {
        this.addToken(result, TokenType.GT, ">", start);
      }
      return;
    }

    if (current === "&") {
      this.next();
      if (this.peek() === "&") {
        this.next();
        this.addToken(result, TokenType.AND, "&&", start);
        return;
      }

      throw new Error(`Unexpected character '&' at position ${this.position}`);
    }

    if (current === "|") {
      this.next();
      if (this.peek() === "|") {
        this.next();
        this.addToken(result, TokenType.OR, "||", start);
        return;
      }

      throw new Error(`Unexpected character '|' at position ${this.position}`);
    }

    switch (current) {
      case "+":
        this.next();
        this.addToken(result, TokenType.PLUS, "+", start);
        return;
      case "-":
        this.next();
        this.addToken(result, TokenType.MINUS, "-", start);
        return;
      case "*":
        this.next();
        this.addToken(result, TokenType.STAR, "*", start);
        return;
      case "/":
        this.next();
        this.addToken(result, TokenType.SLASH, "/", start);
        return;
      case ";":
        this.next();
        this.addToken(result, TokenType.SEMICOLON, ";", start);
        return;
      case "(":
        this.next();
        this.addToken(result, TokenType.LPAREN, "(", start);
        return;
      case ")":
        this.next();
        this.addToken(result, TokenType.RPAREN, ")", start);
        return;
      case "{":
        this.next();
        this.addToken(result, TokenType.LBRACE, "{", start);
        return;
      case "}":
        this.next();
        this.addToken(result, TokenType.RBRACE, "}", start);
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
    return char;
  }

  private addToken(
    result: Token[],
    type: TokenType,
    value: string,
    start: number,
  ): void {
    result.push(new Token(type, value, start));
  }
}
