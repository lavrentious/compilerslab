#!/usr/bin/env bun

import chalk from "chalk";
import { Command } from "commander";
import { AstPrinter } from "./ast-printer.ts";
import { Interpreter } from "./interpreter.ts";
import { Lexer } from "./lexer.ts";
import { Parser } from "./parser.ts";
import { RuntimeEnvironment } from "./runtime-environment.ts";
import {
  SemanticAnalyzer,
  SemanticMessageType,
  type SemanticMessage,
} from "./semantic-analyzer.ts";

const SEMANTIC_MESSAGE_COLOR: Record<
  SemanticMessageType,
  (text: string) => string
> = {
  [SemanticMessageType.ERROR]: chalk.red,
  [SemanticMessageType.WARN]: chalk.yellow,
  [SemanticMessageType.INFO]: chalk.cyan,
};

function formatSemanticLocation(message: SemanticMessage): string {
  if (message.location === null) return "";
  return `Line ${message.location.line}, Col ${message.location.column}: `;
}

interface InputOptions {
  code?: string;
  file?: string;
}

async function resolveSource(options: InputOptions): Promise<string> {
  if (options.code !== undefined) return options.code;

  if (options.file !== undefined) {
    const f = Bun.file(options.file);
    if (!(await f.exists())) throw new Error(`File not found: ${options.file}`);
    return await f.text();
  }

  const stdin = await new Response(Bun.stdin.stream()).text();
  if (stdin.trim().length > 0) return stdin;

  throw new Error("No input provided. Pass --code, --file, or pipe via stdin.");
}

function parseSource(source: string) {
  const tokens = new Lexer(source).tokenize();
  return new Parser(tokens).parse();
}

const program = new Command();

program
  .name("mk1-ts")
  .description("mk1 language compiler and interpreter")
  .version("0.1.0");

const inputOptions = (cmd: Command) =>
  cmd
    .option("--code <source>", "inline source string")
    .option("--file <path>", "path to source file");

inputOptions(
  program
    .command("tokens")
    .description("print lexer tokens"),
).action(async (options: InputOptions) => {
  const source = await resolveSource(options);
  const tokens = new Lexer(source).tokenize();
  for (const token of tokens) console.log(token.toString());
});

inputOptions(
  program
    .command("ast")
    .description("print the AST as a JSON object"),
).action(async (options: InputOptions) => {
  const source = await resolveSource(options);
  console.dir(parseSource(source), { depth: null });
});

inputOptions(
  program
    .command("tree")
    .description("print the AST as a formatted tree (default)"),
).action(async (options: InputOptions) => {
  const source = await resolveSource(options);
  new AstPrinter().printAst(parseSource(source));
});

inputOptions(
  program
    .command("check")
    .description("run semantic analysis and report errors"),
).action(async (options: InputOptions) => {
  const source = await resolveSource(options);
  const ast = parseSource(source);
  const analyzer = new SemanticAnalyzer();
  analyzer.analyze(ast);

  if (analyzer.messages.length === 0) {
    console.log(chalk.green("Semantic analysis completed successfully. No messages found."));
    return;
  }

  const sorted = [...analyzer.messages].sort((a, b) => {
    const order = { [SemanticMessageType.ERROR]: 0, [SemanticMessageType.WARN]: 1, [SemanticMessageType.INFO]: 2 };
    return order[a.type] - order[b.type];
  });

  console.log(analyzer.hasErrors ? "Semantic analysis found messages:" : "Semantic analysis completed with messages:");
  for (const msg of sorted) {
    const label = SEMANTIC_MESSAGE_COLOR[msg.type](msg.type.padEnd(SemanticMessageType.ERROR.length));
    console.log(`- [${label}] ${formatSemanticLocation(msg)}${msg.text}`);
  }

  if (analyzer.hasErrors) process.exit(1);
});

inputOptions(
  program
    .command("run")
    .description("execute a mk1 program"),
).action(async (options: InputOptions) => {
  const source = await resolveSource(options);
  const ast = parseSource(source);

  const analyzer = new SemanticAnalyzer();
  analyzer.analyze(ast);
  if (analyzer.hasErrors) {
    for (const msg of analyzer.messages) {
      if (msg.type === SemanticMessageType.ERROR) {
        console.error(`[error] ${formatSemanticLocation(msg)}${msg.text}`);
      }
    }
    process.exit(1);
  }

  new Interpreter(new RuntimeEnvironment(), ast).run();
});

program.parseAsync(Bun.argv).catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
