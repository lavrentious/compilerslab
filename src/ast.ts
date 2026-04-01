import { TokenType } from "./types.ts";

export interface SourceLocation {
  line: number;
  column: number;
}

export type Expression =
  | NumberExpression
  | StringExpression
  | BooleanExpression
  | VariableExpression
  | BinaryExpression
  | UnaryExpression
  | AssignExpression;

export type PrimitiveTypeName = "number" | "string" | "boolean";

export class NumberExpression {
  readonly kind = "NumberExpression";

  constructor(
    public readonly value: number,
    public readonly location: SourceLocation,
  ) {}
}

export class StringExpression {
  readonly kind = "StringExpression";

  constructor(
    public readonly value: string,
    public readonly location: SourceLocation,
  ) {}
}

export class BooleanExpression {
  readonly kind = "BooleanExpression";

  constructor(
    public readonly value: boolean,
    public readonly location: SourceLocation,
  ) {}
}

export class VariableExpression {
  readonly kind = "VariableExpression";

  constructor(
    public readonly name: string,
    public readonly location: SourceLocation,
  ) {}
}

export class BinaryExpression {
  readonly kind = "BinaryExpression";

  constructor(
    public readonly left: Expression,
    public readonly operator: TokenType,
    public readonly right: Expression,
    public readonly location: SourceLocation,
  ) {}
}

export class UnaryExpression {
  readonly kind = "UnaryExpression";

  constructor(
    public readonly operator: TokenType,
    public readonly right: Expression,
    public readonly location: SourceLocation,
  ) {}
}

export class AssignExpression {
  readonly kind = "AssignExpression";

  constructor(
    public readonly name: string,
    public readonly value: Expression,
    public readonly location: SourceLocation,
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

  constructor(
    public readonly expression: Expression,
    public readonly location: SourceLocation,
  ) {}
}

export class PrintStatement {
  readonly kind = "PrintStatement";

  constructor(
    public readonly expression: Expression,
    public readonly location: SourceLocation,
  ) {}
}

export class VarStatement {
  readonly kind = "VarStatement";

  constructor(
    public readonly name: string,
    public readonly typeName: string | null,
    public readonly initializer: Expression | null,
    public readonly location: SourceLocation,
    public readonly typeLocation: SourceLocation | null = null,
  ) {}
}

export class BlockStatement {
  readonly kind = "BlockStatement";

  constructor(
    public readonly statements: Statement[],
    public readonly location: SourceLocation,
  ) {}
}

export class IfStatement {
  readonly kind = "IfStatement";

  constructor(
    public readonly condition: Expression,
    public readonly thenBranch: Statement,
    public readonly location: SourceLocation,
    public readonly elseBranch: Statement | null = null,
  ) {}
}

export class WhileStatement {
  readonly kind = "WhileStatement";

  constructor(
    public readonly condition: Expression,
    public readonly body: Statement,
    public readonly location: SourceLocation,
  ) {}
}
