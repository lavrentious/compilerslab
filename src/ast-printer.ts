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
import type { Statement } from "./ast.ts";

export class AstPrinter {
  printAst(statements: Statement[]): void {
    console.log("Root (Program)");
    statements.forEach((statement, index) => {
      this.printNode(statement, "", index === statements.length - 1);
    });
  }

  private printNode(node: unknown, indent: string, isLast: boolean): void {
    if (node == null) {
      return;
    }

    const marker = isLast ? "└── " : "├── ";
    const childIndent = indent + (isLast ? "    " : "│   ");

    if (node instanceof VarStatement) {
      console.log(`${indent}${marker}VarStatement: ${node.name}`);
      if (node.initializer !== null) {
        this.printNode(node.initializer, childIndent, true);
      }
      return;
    }

    if (node instanceof PrintStatement) {
      console.log(`${indent}${marker}PrintStatement`);
      this.printNode(node.expression, childIndent, true);
      return;
    }

    if (node instanceof IfStatement) {
      console.log(`${indent}${marker}IfStatement`);
      this.printNode(node.condition, childIndent, false);
      this.printNode(node.thenBranch, childIndent, node.elseBranch === null);
      if (node.elseBranch !== null) {
        this.printNode(node.elseBranch, childIndent, true);
      }
      return;
    }

    if (node instanceof WhileStatement) {
      console.log(`${indent}${marker}WhileStatement`);
      this.printNode(node.condition, childIndent, false);
      this.printNode(node.body, childIndent, true);
      return;
    }

    if (node instanceof BlockStatement) {
      console.log(`${indent}${marker}BlockStatement`);
      node.statements.forEach((statement, index) => {
        this.printNode(
          statement,
          childIndent,
          index === node.statements.length - 1,
        );
      });
      return;
    }

    if (node instanceof ExpressionStatement) {
      console.log(`${indent}${marker}ExpressionStatement`);
      this.printNode(node.expression, childIndent, true);
      return;
    }

    if (node instanceof BinaryExpression) {
      console.log(`${indent}${marker}BinaryExpression: ${node.operator}`);
      this.printNode(node.left, childIndent, false);
      this.printNode(node.right, childIndent, true);
      return;
    }

    if (node instanceof UnaryExpression) {
      console.log(`${indent}${marker}UnaryExpression: ${node.operator}`);
      this.printNode(node.right, childIndent, true);
      return;
    }

    if (node instanceof AssignExpression) {
      console.log(`${indent}${marker}AssignExpression: ${node.name} =`);
      this.printNode(node.value, childIndent, true);
      return;
    }

    if (node instanceof NumberExpression) {
      console.log(`${indent}${marker}Number: ${node.value}`);
      return;
    }

    if (node instanceof VariableExpression) {
      console.log(`${indent}${marker}Variable: ${node.name}`);
      return;
    }

    console.log(`${indent}${marker}Unknown Node: ${String(node)}`);
  }
}
