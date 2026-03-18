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

    this.pushUnusedVariableWarnings(this.environment);
  }

  visitStatement(statement: Statement): void {
    if (statement instanceof VarStatement) {
      if (!this.environment.defineVariable(statement.name, false)) {
        this.pushMessage(
          SemanticMessageType.ERROR,
          `Variable '${statement.name}' is already initialized.`,
        );
        return;
      }

      if (statement.initializer !== null) {
        this.visitExpression(statement.initializer);
        this.environment.initializeVariable(statement.name);
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

      this.pushUnusedVariableWarnings(this.environment);
      this.environment = previousEnvironment;
      return;
    }

    if (statement instanceof IfStatement) {
      this.visitExpression(statement.condition);
      const baseEnvironment = this.environment;
      const thenEnvironment = baseEnvironment.fork();

      this.environment = thenEnvironment;
      this.visitStatement(statement.thenBranch);

      let elseEnvironment: SemanticEnvironment | null = null;
      if (statement.elseBranch !== null) {
        elseEnvironment = baseEnvironment.fork();
        this.environment = elseEnvironment;
        this.visitStatement(statement.elseBranch);
      }

      this.environment = baseEnvironment;
      this.mergeBranchState(baseEnvironment, thenEnvironment, elseEnvironment);
      return;
    }

    if (statement instanceof WhileStatement) {
      const baseEnvironment = this.environment;
      this.visitExpression(statement.condition);
      const loopEnvironment = baseEnvironment.fork();
      this.environment = loopEnvironment;
      this.visitStatement(statement.body);
      this.environment = baseEnvironment;
      this.mergeUsedState(baseEnvironment, loopEnvironment);
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
        return;
      }

      if (!this.environment.isVariableInitialized(expression.name)) {
        this.pushMessage(
          SemanticMessageType.ERROR,
          `Variable '${expression.name}' is not initialized.`,
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
        return;
      }
      this.environment.initializeVariable(expression.name);
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

  private pushUnusedVariableWarnings(environment: SemanticEnvironment): void {
    for (const unusedVar of environment.getUnusedVariables()) {
      this.messagesList.push({
        type: SemanticMessageType.WARN,
        text: `Variable '${unusedVar}' is unused.`,
      });
    }
  }

  private mergeBranchState(
    baseEnvironment: SemanticEnvironment,
    thenEnvironment: SemanticEnvironment,
    elseEnvironment: SemanticEnvironment | null,
  ): void {
    for (const variableName of baseEnvironment.getVisibleVariables()) {
      const isInitializedInThen =
        thenEnvironment.isVariableInitialized(variableName);
      const isInitializedInElse =
        elseEnvironment?.isVariableInitialized(variableName) ??
        baseEnvironment.isVariableInitialized(variableName);

      baseEnvironment.setVariableInitialized(
        variableName,
        isInitializedInThen && isInitializedInElse,
      );
    }

    this.mergeUsedState(baseEnvironment, thenEnvironment);
    if (elseEnvironment !== null) {
      this.mergeUsedState(baseEnvironment, elseEnvironment);
    }
  }

  private mergeUsedState(
    baseEnvironment: SemanticEnvironment,
    branchEnvironment: SemanticEnvironment,
  ): void {
    for (const variableName of baseEnvironment.getVisibleVariables()) {
      if (branchEnvironment.isVariableUsed(variableName)) {
        baseEnvironment.setVariableUsed(variableName, true);
      }
    }
  }
}
