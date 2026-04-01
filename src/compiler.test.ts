import { describe, expect, test } from "bun:test";
import { Lexer } from "./lexer.ts";
import { Parser } from "./parser.ts";
import {
  SemanticAnalyzer,
  SemanticMessageType,
  type SemanticMessage,
} from "./semantic-analyzer.ts";
import { TokenType } from "./types.ts";

async function readExampleFile(name: string): Promise<string> {
  const path = new URL(`../examples/${name}`, import.meta.url).pathname;
  return await Bun.file(path).text();
}

function parseSource(source: string) {
  const tokens = new Lexer(source).tokenize();
  return new Parser(tokens).parse();
}

function analyzeSource(source: string): readonly SemanticMessage[] {
  const statements = parseSource(source);
  const analyzer = new SemanticAnalyzer();
  analyzer.analyze(statements);
  return analyzer.messages;
}

describe("lexer", () => {
  test("tokenizes typed declarations with boolean and string literals", () => {
    const tokens = new Lexer(
      'var flag: boolean = false; print "ok";',
    ).tokenize();

    expect(tokens.map((token) => token.type)).toEqual([
      TokenType.VAR,
      TokenType.ID,
      TokenType.COLON,
      TokenType.ID,
      TokenType.EQ,
      TokenType.FALSE,
      TokenType.SEMICOLON,
      TokenType.PRINT,
      TokenType.STRING,
      TokenType.SEMICOLON,
      TokenType.EOF,
    ]);
  });
});

describe("parser", () => {
  test("rejects invalid syntax example", async () => {
    const source = await readExampleFile("invalid_syntax.mk1");
    expect(() => parseSource(source)).toThrow("Expected variable name.");
  });
});

describe("semantic analyzer", () => {
  test("accepts the baseline program", async () => {
    const source = await readExampleFile("program.mk1");
    expect(analyzeSource(source)).toEqual([]);
  });

  test("reports duplicate declarations", async () => {
    const source = await readExampleFile("duplicate_var.mk1");
    expect(analyzeSource(source)).toEqual([
      {
        type: SemanticMessageType.ERROR,
        text: "Variable 'x' is already defined.",
        location: { line: 2, column: 5 },
      },
      {
        type: SemanticMessageType.WARN,
        text: "Variable 'x' is unused.",
        location: { line: 1, column: 5 },
      },
    ]);
  });

  test("reports unused variables", async () => {
    const source = await readExampleFile("unused_var.mk1");
    expect(analyzeSource(source)).toEqual([
      {
        type: SemanticMessageType.WARN,
        text: "Variable 'z' is unused.",
        location: { line: 3, column: 5 },
      },
    ]);
  });

  test("reports undefined variables", async () => {
    const source = await readExampleFile("undefined_var.mk1");
    expect(analyzeSource(source)).toEqual([
      {
        type: SemanticMessageType.ERROR,
        text: "Variable 'z' is not defined.",
        location: { line: 5, column: 15 },
      },
    ]);
  });

  test("tracks initialization through if branches", async () => {
    const source = await readExampleFile("if_initializer.mk1");
    expect(analyzeSource(source)).toEqual([
      {
        type: SemanticMessageType.WARN,
        text: "Variable 'j' is unused.",
        location: { line: 16, column: 9 },
      },
      {
        type: SemanticMessageType.ERROR,
        text: "Variable 'j' is not defined.",
        location: { line: 22, column: 7 },
      },
    ]);
  });

  test("reports uninitialized typed variables", async () => {
    const source = await readExampleFile("uninitialized_var.mk1");
    expect(analyzeSource(source)).toEqual([
      {
        type: SemanticMessageType.ERROR,
        text: "Variable 'z' is not initialized.",
        location: { line: 5, column: 5 },
      },
    ]);
  });

  test("reports combined initialization and scope issues", async () => {
    const source = await readExampleFile("uninitialized_var2.mk1");
    expect(analyzeSource(source)).toEqual([
      {
        type: SemanticMessageType.ERROR,
        text: "Variable 'z' is not initialized.",
        location: { line: 6, column: 5 },
      },
      {
        type: SemanticMessageType.WARN,
        text: "Variable 'j' is unused.",
        location: { line: 13, column: 9 },
      },
      {
        type: SemanticMessageType.ERROR,
        text: "Variable 'j' is not defined.",
        location: { line: 19, column: 7 },
      },
    ]);
  });

  test("accepts well-typed primitive programs", async () => {
    const source = await readExampleFile("typed_valid.mk1");
    expect(analyzeSource(source)).toEqual([]);
  });

  test("rejects invalid primitive typing", async () => {
    const source = await readExampleFile("typed_invalid.mk1");
    expect(analyzeSource(source)).toEqual([
      {
        type: SemanticMessageType.ERROR,
        text: "Cannot assign value of type 'string' to variable 'count' of type 'number'.",
        location: { line: 6, column: 7 },
      },
      {
        type: SemanticMessageType.ERROR,
        text: "if condition must be boolean, got 'number'.",
        location: { line: 8, column: 1 },
      },
      {
        type: SemanticMessageType.ERROR,
        text: "Unary operator '!' requires a boolean operand, got 'number'.",
        location: { line: 12, column: 7 },
      },
      {
        type: SemanticMessageType.WARN,
        text: "Variable 'pending' is unused.",
        location: { line: 3, column: 5 },
      },
    ]);
  });

  test("rejects untyped declarations without an initializer", () => {
    expect(analyzeSource("var x; print x;")).toEqual([
      {
        type: SemanticMessageType.ERROR,
        text: "Variable 'x' requires a type annotation or initializer.",
        location: { line: 1, column: 5 },
      },
      {
        type: SemanticMessageType.ERROR,
        text: "Variable 'x' is not defined.",
        location: { line: 1, column: 14 },
      },
    ]);
  });
});
