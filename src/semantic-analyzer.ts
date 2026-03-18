import {
  AssignExpression,
  BinaryExpression,
  BlockStatement,
  ExpressionStatement,
  IfStatement,
  NumberExpression,
  PrintStatement,
  StringExpression,
  UnaryExpression,
  VariableExpression,
  VarStatement,
  WhileStatement,
} from "./ast.ts";
import type { Expression, Statement } from "./ast.ts";
import { SemanticEnvironment } from "./semantic-environment.ts";

export enum SemanticMessageType {
  ERROR = "ERROR",
  WARN = "WARN",
  INFO = "INFO",
}

export interface SemanticMessage {
  type: SemanticMessageType;
  text: string;
}

export class SemanticAnalyzer {
  private environment = new SemanticEnvironment();
  private readonly messagesList: SemanticMessage[] = [];

  analyze(statements: Statement[]): void {
    for (const statement of statements) {
      this.visitStatement(statement);
    }

    // Unused variables are valid code, but should still be reported.
    for (const unusedVar of this.environment.getUnusedVariables()) {
      this.messagesList.push({
        type: SemanticMessageType.WARN,
        text: `Variable '${unusedVar}' is unused.`,
      });
    }
  }

  visitStatement(statement: Statement): void {
    if (statement instanceof VarStatement) {
      if (statement.initializer !== null) {
        this.visitExpression(statement.initializer);
      }

      if (!this.environment.defineVariable(statement.name)) {
        this.pushMessage(
          SemanticMessageType.ERROR,
          `Variable '${statement.name}' is already defined.`,
        );
      }
      return;
    }

    if (statement instanceof PrintStatement) {
      this.visitExpression(statement.expression);
      return;
    }

    if (statement instanceof ExpressionStatement) {
      this.visitExpression(statement.expression);
      return;
    }

    if (statement instanceof BlockStatement) {
      const previousEnvironment = this.environment;
      this.environment = new SemanticEnvironment(previousEnvironment);

      for (const innerStatement of statement.statements) {
        this.visitStatement(innerStatement);
      }

      this.environment = previousEnvironment;
      return;
    }

    if (statement instanceof IfStatement) {
      this.visitExpression(statement.condition);
      this.visitStatement(statement.thenBranch);
      if (statement.elseBranch !== null) {
        this.visitStatement(statement.elseBranch);
      }
      return;
    }

    if (statement instanceof WhileStatement) {
      this.visitExpression(statement.condition);
      this.visitStatement(statement.body);
      return;
    }

    this.pushMessage(
      SemanticMessageType.ERROR,
      `Unsupported statement type: ${statement satisfies never}`,
    );
  }

  visitExpression(expression: Expression): void {
    if (
      expression instanceof NumberExpression ||
      expression instanceof StringExpression
    ) {
      return;
    }

    if (expression instanceof VariableExpression) {
      if (!this.environment.isVariableDefined(expression.name)) {
        this.pushMessage(
          SemanticMessageType.ERROR,
          `Variable '${expression.name}' is not defined.`,
        );
      }
      this.environment.useVariable(expression.name);
      return;
    }

    if (expression instanceof AssignExpression) {
      this.visitExpression(expression.value);
      if (!this.environment.isVariableDefined(expression.name)) {
        this.pushMessage(
          SemanticMessageType.ERROR,
          `Variable '${expression.name}' is not defined.`,
        );
      }
      return;
    }

    if (expression instanceof BinaryExpression) {
      this.visitExpression(expression.left);
      this.visitExpression(expression.right);
      return;
    }

    if (expression instanceof UnaryExpression) {
      this.visitExpression(expression.right);
      return;
    }

    this.pushMessage(
      SemanticMessageType.ERROR,
      `Unsupported expression type: ${expression satisfies never}`,
    );
  }

  get messages(): readonly SemanticMessage[] {
    return this.messagesList;
  }

  get hasErrors(): boolean {
    return this.messagesList.some(
      (message) => message.type === SemanticMessageType.ERROR,
    );
  }

  private pushMessage(type: SemanticMessageType, text: string): void {
    this.messagesList.push({ type, text });
  }
}
