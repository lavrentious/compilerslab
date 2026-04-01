import {
  AssignExpression,
  BooleanExpression,
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
import type { Expression, PrimitiveTypeName, Statement } from "./ast.ts";
import { SemanticEnvironment } from "./semantic-environment.ts";
import { TokenType } from "./types.ts";

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
      const declaredType = this.resolveDeclaredType(statement.typeName);
      const initializerType =
        statement.initializer === null
          ? null
          : this.visitExpression(statement.initializer);

      if (statement.typeName !== null && declaredType === null) {
        return;
      }

      let variableType: PrimitiveTypeName | null = declaredType;
      if (variableType === null && initializerType !== null) {
        variableType = initializerType;
      }

      if (variableType === null) {
        this.pushMessage(
          SemanticMessageType.ERROR,
          `Variable '${statement.name}' requires a type annotation or initializer.`,
        );
        return;
      }

      if (!this.environment.defineVariable(statement.name, variableType, false)) {
        this.pushMessage(
          SemanticMessageType.ERROR,
          `Variable '${statement.name}' is already defined.`,
        );
        return;
      }

      if (declaredType !== null && initializerType !== null) {
        this.ensureAssignable(
          declaredType,
          initializerType,
          `Cannot initialize variable '${statement.name}' of type '${declaredType}' with value of type '${initializerType}'.`,
        );
      }

      if (statement.initializer !== null) {
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
      const conditionType = this.visitExpression(statement.condition);
      this.ensureBooleanCondition(conditionType, "if");
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
      const conditionType = this.visitExpression(statement.condition);
      this.ensureBooleanCondition(conditionType, "while");
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

  visitExpression(expression: Expression): PrimitiveTypeName | null {
    if (
      expression instanceof NumberExpression ||
      expression instanceof StringExpression ||
      expression instanceof BooleanExpression
    ) {
      if (expression instanceof NumberExpression) {
        return "number";
      }

      if (expression instanceof StringExpression) {
        return "string";
      }

      return "boolean";
    }

    if (expression instanceof VariableExpression) {
      if (!this.environment.isVariableDefined(expression.name)) {
        this.pushMessage(
          SemanticMessageType.ERROR,
          `Variable '${expression.name}' is not defined.`,
        );
        return null;
      }

      if (!this.environment.isVariableInitialized(expression.name)) {
        this.pushMessage(
          SemanticMessageType.ERROR,
          `Variable '${expression.name}' is not initialized.`,
        );
      }
      this.environment.useVariable(expression.name);
      return this.environment.getVariableType(expression.name);
    }

    if (expression instanceof AssignExpression) {
      if (!this.environment.isVariableDefined(expression.name)) {
        this.pushMessage(
          SemanticMessageType.ERROR,
          `Variable '${expression.name}' is not defined.`,
        );
        return null;
      }

      const variableType = this.environment.getVariableType(expression.name);
      const valueType = this.visitExpression(expression.value);
      if (variableType !== null && valueType !== null) {
        this.ensureAssignable(
          variableType,
          valueType,
          `Cannot assign value of type '${valueType}' to variable '${expression.name}' of type '${variableType}'.`,
        );
      }
      this.environment.initializeVariable(expression.name);
      return variableType;
    }

    if (expression instanceof BinaryExpression) {
      const leftType = this.visitExpression(expression.left);
      const rightType = this.visitExpression(expression.right);
      return this.getBinaryExpressionType(expression.operator, leftType, rightType);
    }

    if (expression instanceof UnaryExpression) {
      const rightType = this.visitExpression(expression.right);
      return this.getUnaryExpressionType(expression.operator, rightType);
    }

    this.pushMessage(
      SemanticMessageType.ERROR,
      `Unsupported expression type: ${expression satisfies never}`,
    );
    return null;
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

  private resolveDeclaredType(typeName: string | null): PrimitiveTypeName | null {
    if (typeName === null) {
      return null;
    }

    if (this.isPrimitiveType(typeName)) {
      return typeName;
    }

    this.pushMessage(
      SemanticMessageType.ERROR,
      `Unknown type '${typeName}'. Expected one of: number, string, boolean.`,
    );
    return null;
  }

  private isPrimitiveType(typeName: string): typeName is PrimitiveTypeName {
    return (
      typeName === "number" ||
      typeName === "string" ||
      typeName === "boolean"
    );
  }

  private ensureAssignable(
    expected: PrimitiveTypeName,
    actual: PrimitiveTypeName,
    message: string,
  ): void {
    if (expected !== actual) {
      this.pushMessage(SemanticMessageType.ERROR, message);
    }
  }

  private ensureBooleanCondition(
    conditionType: PrimitiveTypeName | null,
    statementName: "if" | "while",
  ): void {
    if (conditionType !== null && conditionType !== "boolean") {
      this.pushMessage(
        SemanticMessageType.ERROR,
        `${statementName} condition must be boolean, got '${conditionType}'.`,
      );
    }
  }

  private getBinaryExpressionType(
    operator: TokenType,
    leftType: PrimitiveTypeName | null,
    rightType: PrimitiveTypeName | null,
  ): PrimitiveTypeName | null {
    if (leftType === null || rightType === null) {
      return null;
    }

    switch (operator) {
      case TokenType.PLUS:
      case TokenType.MINUS:
      case TokenType.STAR:
      case TokenType.SLASH:
        return this.requireBinaryOperands(
          operator,
          leftType,
          rightType,
          "number",
          "number",
        );
      case TokenType.AND:
      case TokenType.OR:
        return this.requireBinaryOperands(
          operator,
          leftType,
          rightType,
          "boolean",
          "boolean",
        );
      case TokenType.LT:
      case TokenType.LTEQ:
      case TokenType.GT:
      case TokenType.GTEQ: {
        const operandType = this.requireBinaryOperands(
          operator,
          leftType,
          rightType,
          "number",
          "boolean",
        );
        return operandType === null ? null : "boolean";
      }
      case TokenType.EQEQ:
      case TokenType.NEQ:
        if (leftType !== rightType) {
          this.pushMessage(
            SemanticMessageType.ERROR,
            `Operator '${this.formatOperator(operator)}' requires both operands to have the same type, got '${leftType}' and '${rightType}'.`,
          );
          return null;
        }
        return "boolean";
      default:
        this.pushMessage(
          SemanticMessageType.ERROR,
          `Unsupported binary operator '${this.formatOperator(operator)}'.`,
        );
        return null;
    }
  }

  private getUnaryExpressionType(
    operator: TokenType,
    rightType: PrimitiveTypeName | null,
  ): PrimitiveTypeName | null {
    if (rightType === null) {
      return null;
    }

    switch (operator) {
      case TokenType.MINUS:
        if (rightType !== "number") {
          this.pushMessage(
            SemanticMessageType.ERROR,
            `Unary operator '-' requires a number operand, got '${rightType}'.`,
          );
          return null;
        }
        return "number";
      case TokenType.EXCL:
        if (rightType !== "boolean") {
          this.pushMessage(
            SemanticMessageType.ERROR,
            `Unary operator '!' requires a boolean operand, got '${rightType}'.`,
          );
          return null;
        }
        return "boolean";
      default:
        this.pushMessage(
          SemanticMessageType.ERROR,
          `Unsupported unary operator '${this.formatOperator(operator)}'.`,
        );
        return null;
    }
  }

  private requireBinaryOperands(
    operator: TokenType,
    leftType: PrimitiveTypeName,
    rightType: PrimitiveTypeName,
    expectedType: PrimitiveTypeName,
    resultType: PrimitiveTypeName,
  ): PrimitiveTypeName | null {
    if (leftType !== expectedType || rightType !== expectedType) {
      this.pushMessage(
        SemanticMessageType.ERROR,
        `Operator '${this.formatOperator(operator)}' requires ${expectedType} operands, got '${leftType}' and '${rightType}'.`,
      );
      return null;
    }

    return resultType;
  }

  private formatOperator(operator: TokenType): string {
    switch (operator) {
      case TokenType.PLUS:
        return "+";
      case TokenType.MINUS:
        return "-";
      case TokenType.STAR:
        return "*";
      case TokenType.SLASH:
        return "/";
      case TokenType.AND:
        return "&&";
      case TokenType.OR:
        return "||";
      case TokenType.LT:
        return "<";
      case TokenType.LTEQ:
        return "<=";
      case TokenType.GT:
        return ">";
      case TokenType.GTEQ:
        return ">=";
      case TokenType.EQEQ:
        return "==";
      case TokenType.NEQ:
        return "!=";
      case TokenType.EXCL:
        return "!";
      default:
        return String(operator);
    }
  }
}
