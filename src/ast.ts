import { TokenType } from "./types.ts";

export type Expression =
  | NumberExpression
  | StringExpression
  | VariableExpression
  | BinaryExpression
  | UnaryExpression
  | AssignExpression;

export class NumberExpression {
  readonly kind = "NumberExpression";

  constructor(public readonly value: number) {}
}

export class StringExpression {
  readonly kind = "StringExpression";

  constructor(public readonly value: string) {}
}

export class VariableExpression {
  readonly kind = "VariableExpression";

  constructor(public readonly name: string) {}
}

export class BinaryExpression {
  readonly kind = "BinaryExpression";

  constructor(
    public readonly left: Expression,
    public readonly operator: TokenType,
    public readonly right: Expression,
  ) {}
}

export class UnaryExpression {
  readonly kind = "UnaryExpression";

  constructor(
    public readonly operator: TokenType,
    public readonly right: Expression,
  ) {}
}

export class AssignExpression {
  readonly kind = "AssignExpression";

  constructor(
    public readonly name: string,
    public readonly value: Expression,
  ) {}
}

export type Statement =
  | ExpressionStatement
  | PrintStatement
  | VarStatement
  | BlockStatement
  | IfStatement
  | WhileStatement;

export class ExpressionStatement {
  readonly kind = "ExpressionStatement";

  constructor(public readonly expression: Expression) {}
}

export class PrintStatement {
  readonly kind = "PrintStatement";

  constructor(public readonly expression: Expression) {}
}

export class VarStatement {
  readonly kind = "VarStatement";

  constructor(
    public readonly name: string,
    public readonly initializer: Expression | null,
  ) {}
}

export class BlockStatement {
  readonly kind = "BlockStatement";

  constructor(public readonly statements: Statement[]) {}
}

export class IfStatement {
  readonly kind = "IfStatement";

  constructor(
    public readonly condition: Expression,
    public readonly thenBranch: Statement,
    public readonly elseBranch: Statement | null = null,
  ) {}
}

export class WhileStatement {
  readonly kind = "WhileStatement";

  constructor(
    public readonly condition: Expression,
    public readonly body: Statement,
  ) {}
}
