import type { PrimitiveTypeName } from "./ast.ts";

interface VariableState {
  initialized: boolean;
  used: boolean;
  type: PrimitiveTypeName;
}

export class SemanticEnvironment {
  private readonly definedVariables = new Map<string, VariableState>();

  constructor(private readonly parent: SemanticEnvironment | null = null) {}

  defineVariable(
    name: string,
    type: PrimitiveTypeName,
    initialized: boolean,
  ): boolean {
    if (this.definedVariables.has(name)) {
      return false;
    }
    this.definedVariables.set(name, { initialized, used: false, type });
    return true;
  }

  useVariable(name: string): void {
    const variable = this.definedVariables.get(name);
    if (variable !== undefined) {
      variable.used = true;
      return;
    }

    this.parent?.useVariable(name);
  }

  initializeVariable(name: string): void {
    const variable = this.definedVariables.get(name);
    if (variable !== undefined) {
      variable.initialized = true;
      return;
    }

    this.parent?.initializeVariable(name);
  }

  isVariableDefined(name: string): boolean {
    if (this.definedVariables.has(name)) {
      return true;
    }
    return this.parent?.isVariableDefined(name) ?? false;
  }

  isVariableInitialized(name: string): boolean {
    const variable = this.definedVariables.get(name);
    if (variable !== undefined) {
      return variable.initialized;
    }
    return this.parent?.isVariableInitialized(name) ?? false;
  }

  isVariableUsed(name: string): boolean {
    const variable = this.definedVariables.get(name);
    if (variable?.used) {
      return true;
    }
    return this.parent?.isVariableUsed(name) ?? false;
  }

  getVariableType(name: string): PrimitiveTypeName | null {
    const variable = this.definedVariables.get(name);
    if (variable !== undefined) {
      return variable.type;
    }

    return this.parent?.getVariableType(name) ?? null;
  }

  getUnusedVariables(): Set<string> {
    const unusedVariables = new Set<string>();

    for (const [name, variable] of this.definedVariables) {
      if (!variable.used) {
        unusedVariables.add(name);
      }
    }

    return unusedVariables;
  }

  getVisibleVariables(): Set<string> {
    const visibleVariables = this.parent?.getVisibleVariables() ?? new Set();

    for (const name of this.definedVariables.keys()) {
      visibleVariables.add(name);
    }

    return visibleVariables;
  }

  fork(): SemanticEnvironment {
    const parent = this.parent?.fork() ?? null;
    const forked = new SemanticEnvironment(parent);

    for (const [name, variable] of this.definedVariables) {
      forked.definedVariables.set(name, { ...variable });
    }

    return forked;
  }

  setVariableInitialized(name: string, initialized: boolean): void {
    const variable = this.definedVariables.get(name);
    if (variable !== undefined) {
      variable.initialized = initialized;
      return;
    }

    this.parent?.setVariableInitialized(name, initialized);
  }

  setVariableUsed(name: string, used: boolean): void {
    const variable = this.definedVariables.get(name);
    if (variable !== undefined) {
      variable.used = used;
      return;
    }

    this.parent?.setVariableUsed(name, used);
  }

  setVariableType(name: string, type: PrimitiveTypeName): void {
    const variable = this.definedVariables.get(name);
    if (variable !== undefined) {
      variable.type = type;
      return;
    }

    this.parent?.setVariableType(name, type);
  }
}
