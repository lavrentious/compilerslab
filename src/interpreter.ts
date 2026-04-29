import type { Expression, Statement } from "./ast";
import { RuntimeEnvironment } from "./runtime-environment";
import { TokenType } from "./types";

class ReturnValue {
  constructor(public readonly value: any) {}
}

export class Interpreter {
  constructor(
    private readonly runtimeEnvironment: RuntimeEnvironment,
    private readonly ast: Statement[],
  ) {}

  run(): void {
    for (const stmt of this.ast) {
      this.executeStatement(stmt, this.runtimeEnvironment);
    }
  }

  private executeStatement(stmt: Statement, env: RuntimeEnvironment): void {
    switch (stmt.kind) {
      case "VarStatement": {
        const value =
          stmt.initializer !== null
            ? this.evaluateExpression(stmt.initializer, env)
            : undefined;
        env.setVariable(stmt.name, value);
        break;
      }
      case "PrintStatement":
        console.log(this.evaluateExpression(stmt.expression, env));
        break;
      case "ExpressionStatement":
        this.evaluateExpression(stmt.expression, env);
        break;
      case "BlockStatement": {
        const childEnv = new RuntimeEnvironment(env);
        for (const s of stmt.statements) {
          this.executeStatement(s, childEnv);
        }
        break;
      }
      case "IfStatement": {
        const condition = this.evaluateExpression(stmt.condition, env);
        if (condition) {
          this.executeStatement(stmt.thenBranch, env);
        } else if (stmt.elseBranch !== null) {
          this.executeStatement(stmt.elseBranch, env);
        }
        break;
      }
      case "WhileStatement": {
        while (this.evaluateExpression(stmt.condition, env)) {
          this.executeStatement(stmt.body, env);
        }
        break;
      }
      case "FunctionStatement":
        env.defineFunction(stmt.name, stmt);
        break;
      case "ReturnStatement": {
        const val = stmt.value !== null ? this.evaluateExpression(stmt.value, env) : null;
        throw new ReturnValue(val);
      }
    }
  }

  private evaluateExpression(expr: Expression, env: RuntimeEnvironment): any {
    switch (expr.kind) {
      case "NumberExpression":
      case "StringExpression":
      case "BooleanExpression":
        return expr.value;
      case "VariableExpression":
        return env.getVariable(expr.name);
      case "UnaryExpression": {
        const right = this.evaluateExpression(expr.right, env);
        if (expr.operator === TokenType.MINUS) return -right;
        if (expr.operator === TokenType.EXCL) return !right;
        throw new Error(`Unknown unary operator: ${expr.operator}`);
      }
      case "BinaryExpression": {
        const left = this.evaluateExpression(expr.left, env);
        const right = this.evaluateExpression(expr.right, env);
        switch (expr.operator) {
          case TokenType.PLUS:
            return left + right;
          case TokenType.MINUS:
            return left - right;
          case TokenType.STAR:
            return left * right;
          case TokenType.SLASH:
            return left / right;
          case TokenType.LT:
            return left < right;
          case TokenType.LTEQ:
            return left <= right;
          case TokenType.GT:
            return left > right;
          case TokenType.GTEQ:
            return left >= right;
          case TokenType.EQEQ:
            return left === right;
          case TokenType.NEQ:
            return left !== right;
          case TokenType.AND:
            return left && right;
          case TokenType.OR:
            return left || right;
          default:
            throw new Error(`Unknown binary operator: ${expr.operator}`);
        }
      }
      case "AssignExpression": {
        const value = this.evaluateExpression(expr.value, env);
        env.assignVariable(expr.name, value);
        return value;
      }
      case "CallExpression": {
        const fn = env.getFunction(expr.callee);
        const args = expr.args.map((a) => this.evaluateExpression(a, env));
        const callEnv = new RuntimeEnvironment(env);
        for (let i = 0; i < fn.params.length; i++) {
          callEnv.setVariable(fn.params[i]!, args[i] ?? null);
        }
        try {
          for (const s of fn.body.statements) {
            this.executeStatement(s, callEnv);
          }
        } catch (e) {
          if (e instanceof ReturnValue) return e.value;
          throw e;
        }
        return null;
      }
    }
  }
}
