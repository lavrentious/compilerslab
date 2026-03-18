import {
  AssignExpression,
  BinaryExpression,
  BlockStatement,
  ExpressionStatement,
  IfStatement,
  NumberExpression,
  PrintStatement,
  UnaryExpression,
  VariableExpression,
  VarStatement,
  WhileStatement,
} from "./ast.ts";
import type { Expression, Statement } from "./ast.ts";
import { Token, TokenType } from "./types.ts";

export class Parser {
  private position = 0;

  constructor(private readonly tokens: Token[]) {}

  parse(): Statement[] {
    const statements: Statement[] = [];
    while (!this.isAtEnd()) {
      statements.push(this.parseDeclaration());
    }
    return statements;
  }

  private parseDeclaration(): Statement {
    if (this.match(TokenType.VAR)) {
      return this.parseVarDeclaration();
    }

    return this.parseStatement();
  }

  private parseStatement(): Statement {
    if (this.match(TokenType.IF)) {
      return this.parseIfStatement();
    }

    if (this.match(TokenType.WHILE)) {
      return this.parseWhileStatement();
    }

    if (this.match(TokenType.PRINT)) {
      return this.parsePrintStatement();
    }

    if (this.match(TokenType.LBRACE)) {
      return new BlockStatement(this.parseBlock());
    }

    return this.parseExpressionStatement();
  }

  private parseVarDeclaration(): Statement {
    const name = this.consume(TokenType.ID, "Expected variable name.");
    let initializer: Expression | null = null;

    if (this.match(TokenType.EQ)) {
      initializer = this.parseExpression();
    }

    this.consume(TokenType.SEMICOLON, "Expected ';' after variable declaration.");
    return new VarStatement(name.value, initializer);
  }

  private parseIfStatement(): Statement {
    this.consume(TokenType.LPAREN, "Expected '(' after 'if'.");
    const condition = this.parseExpression();
    this.consume(TokenType.RPAREN, "Expected ')' after if condition.");

    const thenBranch = this.parseStatement();
    let elseBranch: Statement | null = null;

    if (this.match(TokenType.ELSE)) {
      elseBranch = this.parseStatement();
    }

    return new IfStatement(condition, thenBranch, elseBranch);
  }

  private parseWhileStatement(): Statement {
    this.consume(TokenType.LPAREN, "Expected '(' after 'while'.");
    const condition = this.parseExpression();
    this.consume(TokenType.RPAREN, "Expected ')' after while condition.");

    const body = this.parseStatement();
    return new WhileStatement(condition, body);
  }

  private parsePrintStatement(): Statement {
    const value = this.parseExpression();
    this.consume(TokenType.SEMICOLON, "Expected ';' after value.");
    return new PrintStatement(value);
  }

  private parseExpressionStatement(): Statement {
    const expression = this.parseExpression();
    this.consume(TokenType.SEMICOLON, "Expected ';' after expression.");
    return new ExpressionStatement(expression);
  }

  private parseBlock(): Statement[] {
    const statements: Statement[] = [];

    while (!this.check(TokenType.RBRACE) && !this.isAtEnd()) {
      statements.push(this.parseDeclaration());
    }

    this.consume(TokenType.RBRACE, "Expected '}' after block.");
    return statements;
  }

  private parseExpression(): Expression {
    return this.parseAssignment();
  }

  private parseAssignment(): Expression {
    const expression = this.parseLogicalOr();

    if (this.match(TokenType.EQ)) {
      const equals = this.previous();
      const value = this.parseAssignment();

      if (expression instanceof VariableExpression) {
        return new AssignExpression(expression.name, value);
      }

      throw new Error(
        `[Parser Error] Line ${equals.line}, Col ${equals.column}: Invalid assignment target.`,
      );
    }

    return expression;
  }

  private parseLogicalOr(): Expression {
    let expression = this.parseLogicalAnd();

    while (this.match(TokenType.OR)) {
      const operator = this.previous().type;
      const right = this.parseLogicalAnd();
      expression = new BinaryExpression(expression, operator, right);
    }

    return expression;
  }

  private parseLogicalAnd(): Expression {
    let expression = this.parseEquality();

    while (this.match(TokenType.AND)) {
      const operator = this.previous().type;
      const right = this.parseEquality();
      expression = new BinaryExpression(expression, operator, right);
    }

    return expression;
  }

  private parseEquality(): Expression {
    let expression = this.parseComparison();

    while (this.match(TokenType.EQEQ, TokenType.NEQ)) {
      const operator = this.previous().type;
      const right = this.parseComparison();
      expression = new BinaryExpression(expression, operator, right);
    }

    return expression;
  }

  private parseComparison(): Expression {
    let expression = this.parseTerm();

    while (
      this.match(TokenType.LT, TokenType.LTEQ, TokenType.GT, TokenType.GTEQ)
    ) {
      const operator = this.previous().type;
      const right = this.parseTerm();
      expression = new BinaryExpression(expression, operator, right);
    }

    return expression;
  }

  private parseTerm(): Expression {
    let expression = this.parseFactor();

    while (this.match(TokenType.PLUS, TokenType.MINUS)) {
      const operator = this.previous().type;
      const right = this.parseFactor();
      expression = new BinaryExpression(expression, operator, right);
    }

    return expression;
  }

  private parseFactor(): Expression {
    let expression = this.parseUnary();

    while (this.match(TokenType.STAR, TokenType.SLASH)) {
      const operator = this.previous().type;
      const right = this.parseUnary();
      expression = new BinaryExpression(expression, operator, right);
    }

    return expression;
  }

  private parseUnary(): Expression {
    if (this.match(TokenType.EXCL, TokenType.MINUS)) {
      const operator = this.previous().type;
      const right = this.parseUnary();
      return new UnaryExpression(operator, right);
    }

    return this.parsePrimary();
  }

  private parsePrimary(): Expression {
    if (this.match(TokenType.NUMBER)) {
      return new NumberExpression(Number(this.previous().value));
    }

    if (this.match(TokenType.ID)) {
      return new VariableExpression(this.previous().value);
    }

    if (this.match(TokenType.LPAREN)) {
      const expression = this.parseExpression();
      this.consume(TokenType.RPAREN, "Expected ')' after expression.");
      return expression;
    }

    const token = this.peek();
    throw new Error(
      `[Parser Error] Line ${token.line}, Col ${token.column}: Expected expression.`,
    );
  }

  private match(...types: TokenType[]): boolean {
    for (const type of types) {
      if (this.check(type)) {
        this.advance();
        return true;
      }
    }

    return false;
  }

  private check(type: TokenType): boolean {
    if (this.isAtEnd()) {
      return false;
    }

    return this.peek().type === type;
  }

  private advance(): Token {
    if (!this.isAtEnd()) {
      this.position += 1;
    }

    return this.previous();
  }

  private isAtEnd(): boolean {
    return this.peek().type === TokenType.EOF;
  }

  private peek(): Token {
    return this.tokens[this.position]!;
  }

  private previous(): Token {
    return this.tokens[this.position - 1]!;
  }

  private consume(type: TokenType, message: string): Token {
    if (this.check(type)) {
      return this.advance();
    }

    const token = this.peek();
    throw new Error(
      `[Parser Error] Line ${token.line}, Col ${token.column}: ${message}`,
    );
  }
}
