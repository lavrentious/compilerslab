import type { FunctionStatement } from "./ast.ts";

export class RuntimeEnvironment {
  private readonly variables = new Map<string, any>();
  private readonly functions = new Map<string, FunctionStatement>();

  constructor(private readonly parent: RuntimeEnvironment | null = null) {}

  setVariable(name: string, value: any): void {
    this.variables.set(name, value);
  }

  assignVariable(name: string, value: any): void {
    if (this.variables.has(name)) {
      this.variables.set(name, value);
      return;
    }
    if (this.parent !== null) {
      this.parent.assignVariable(name, value);
      return;
    }
    throw new ReferenceError(`Variable "${name}" is not defined.`);
  }

  getVariable(name: string): any {
    if (this.variables.has(name)) {
      return this.variables.get(name);
    }
    if (this.parent !== null) {
      return this.parent.getVariable(name);
    }
    throw new ReferenceError(`Variable "${name}" is not defined.`);
  }

  defineFunction(name: string, fn: FunctionStatement): void {
    this.functions.set(name, fn);
  }

  getFunction(name: string): FunctionStatement {
    if (this.functions.has(name)) return this.functions.get(name)!;
    if (this.parent !== null) return this.parent.getFunction(name);
    throw new ReferenceError(`Function "${name}" is not defined.`);
  }
}
