export class SemanticEnvironment {
  private readonly definedVariables = new Set<string>();
  private readonly usedVariables = new Set<string>();

  constructor(private readonly parent: SemanticEnvironment | null = null) {}

  defineVariable(name: string): boolean {
    if (this.definedVariables.has(name)) {
      return false;
    }
    this.definedVariables.add(name);
    return true;
  }

  useVariable(name: string): void {
    this.usedVariables.add(name);
  }

  isVariableDefined(name: string): boolean {
    if (this.definedVariables.has(name)) {
      return true;
    }
    return this.parent?.isVariableDefined(name) ?? false;
  }

  isVariableUsed(name: string): boolean {
    if (this.usedVariables.has(name)) {
      return true;
    }
    return this.parent?.isVariableUsed(name) ?? false;
  }

  getUnusedVariables(): Set<string> {
    return new Set(this.definedVariables.difference(this.usedVariables));
  }
}
