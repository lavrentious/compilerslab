import { TokenType } from "./types.ts";
import {
  type Expression,
  type Statement,
  NumberExpression,
  StringExpression,
  BinaryExpression,
  UnaryExpression,
  AssignExpression,
  CallExpression,
  ExpressionStatement,
  PrintStatement,
  VarStatement,
  BlockStatement,
  IfStatement,
  WhileStatement,
  FunctionStatement,
  ReturnStatement,
} from "./ast.ts";

export class AstOptimizer {
  optimize(statements: Statement[]): Statement[] {
    return statements.map((s) => this.optimizeStatement(s));
  }

  private optimizeStatement(stmt: Statement): Statement {
    switch (stmt.kind) {
      case "VarStatement":
        return new VarStatement(
          stmt.name,
          stmt.typeName,
          stmt.initializer ? this.optimizeExpression(stmt.initializer) : null,
          stmt.location,
          stmt.typeLocation,
        );
      case "ExpressionStatement":
        return new ExpressionStatement(
          this.optimizeExpression(stmt.expression),
          stmt.location,
        );
      case "PrintStatement":
        return new PrintStatement(
          this.optimizeExpression(stmt.expression),
          stmt.location,
        );
      case "BlockStatement":
        return new BlockStatement(
          stmt.statements.map((s) => this.optimizeStatement(s)),
          stmt.location,
        );
      case "IfStatement":
        return new IfStatement(
          this.optimizeExpression(stmt.condition),
          this.optimizeStatement(stmt.thenBranch),
          stmt.location,
          stmt.elseBranch ? this.optimizeStatement(stmt.elseBranch) : null,
        );
      case "WhileStatement":
        return new WhileStatement(
          this.optimizeExpression(stmt.condition),
          this.optimizeStatement(stmt.body),
          stmt.location,
        );
      case "FunctionStatement":
        return new FunctionStatement(
          stmt.name,
          stmt.params,
          this.optimizeStatement(stmt.body) as BlockStatement,
          stmt.location,
        );
      case "ReturnStatement":
        return new ReturnStatement(
          stmt.value ? this.optimizeExpression(stmt.value) : null,
          stmt.location,
        );
    }
  }

  private optimizeExpression(expr: Expression): Expression {
    switch (expr.kind) {
      case "BinaryExpression": {
        const left = this.optimizeExpression(expr.left);
        const right = this.optimizeExpression(expr.right);

        if (
          left.kind === "NumberExpression" &&
          right.kind === "NumberExpression"
        ) {
          const l = left.value, r = right.value;
          switch (expr.operator) {
            case TokenType.PLUS:
              return new NumberExpression(l + r, expr.location);
            case TokenType.MINUS:
              return new NumberExpression(l - r, expr.location);
            case TokenType.STAR:
              return new NumberExpression(l * r, expr.location);
            case TokenType.SLASH:
              // skip folding division by zero to avoid silent Infinity/NaN
              if (r !== 0) return new NumberExpression(l / r, expr.location);
              break;
          }
        }

        if (
          left.kind === "StringExpression" &&
          right.kind === "StringExpression" &&
          expr.operator === TokenType.PLUS
        ) {
          return new StringExpression(left.value + right.value, expr.location);
        }

        return new BinaryExpression(left, expr.operator, right, expr.location);
      }
      case "UnaryExpression":
        return new UnaryExpression(
          expr.operator,
          this.optimizeExpression(expr.right),
          expr.location,
        );
      case "AssignExpression":
        return new AssignExpression(
          expr.name,
          this.optimizeExpression(expr.value),
          expr.location,
        );
      case "CallExpression":
        return new CallExpression(
          expr.callee,
          expr.args.map((a) => this.optimizeExpression(a)),
          expr.location,
        );
      default:
        return expr;
    }
  }
}
