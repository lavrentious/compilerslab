#!/usr/bin/env bun

import chalk from "chalk";
import { AstPrinter } from "./ast-printer.ts";
import { Lexer } from "./lexer.ts";
import { Parser } from "./parser.ts";
import {
  SemanticAnalyzer,
  SemanticMessageType,
  type SemanticMessage,
} from "./semantic-analyzer.ts";

type OutputMode = "tokens" | "ast" | "tree" | "semantic";

interface CliOptions {
  code: string | null;
  filePath: string | null;
  mode: OutputMode;
  help: boolean;
}

const SEMANTIC_MESSAGE_PRIORITY: Record<SemanticMessageType, number> = {
  [SemanticMessageType.ERROR]: 0,
  [SemanticMessageType.WARN]: 1,
  [SemanticMessageType.INFO]: 2,
};

const SEMANTIC_MESSAGE_COLOR: Record<
  SemanticMessageType,
  (text: string) => string
> = {
  [SemanticMessageType.ERROR]: chalk.red,
  [SemanticMessageType.WARN]: chalk.yellow,
  [SemanticMessageType.INFO]: chalk.cyan,
};

const HELP_TEXT = `mk1-ts

Usage:
  bun run src/index.ts [options] [file]
  bun run cli -- [options] [file]

Options:
  --code "<source>"    Parse the provided source string
  --tokens             Print lexer tokens
  --ast                Print the parsed AST as an object
  --tree               Print the parsed AST as a tree (default)
  --semantic           Run semantic analysis and print errors or success
  --help, -h           Show this help

Input:
  Provide either a file path, --code, or pipe source via stdin.
`;

async function main(): Promise<void> {
  const options = parseArgs(Bun.argv.slice(2));

  if (options.help) {
    console.log(HELP_TEXT);
    return;
  }

  const source = await resolveSource(options);
  const lexer = new Lexer(source);
  const tokens = lexer.tokenize();

  if (options.mode === "tokens") {
    for (const token of tokens) {
      console.log(token.toString());
    }
    return;
  }

  const parser = new Parser(tokens);
  const ast = parser.parse();

  if (options.mode === "ast") {
    console.dir(ast, { depth: null });
    return;
  }

  if (options.mode === "semantic") {
    const analyzer = new SemanticAnalyzer();
    analyzer.analyze(ast);

    if (analyzer.messages.length > 0) {
      const sortedMessages = [...analyzer.messages].sort(
        (left, right) =>
          SEMANTIC_MESSAGE_PRIORITY[left.type] -
          SEMANTIC_MESSAGE_PRIORITY[right.type],
      );
      const hasErrors = analyzer.hasErrors;
      console.log(
        hasErrors
          ? "Semantic analysis found messages:"
          : "Semantic analysis completed with messages:",
      );
      for (const message of sortedMessages) {
        const label = formatSemanticLabel(message.type);
        const location = formatSemanticLocation(message);
        console.log(`- [${label}] ${location}${message.text}`);
      }

      if (hasErrors) {
        return;
      }

      return;
    }

    console.log(
      chalk.green(
        "Semantic analysis completed successfully. No messages found.",
      ),
    );
    return;
  }

  new AstPrinter().printAst(ast);
}

function parseArgs(args: string[]): CliOptions {
  const options: CliOptions = {
    code: null,
    filePath: null,
    mode: "tree",
    help: false,
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg == null) {
      continue;
    }

    switch (arg) {
      case "--help":
      case "-h":
        options.help = true;
        break;
      case "--code": {
        const value = args[index + 1];
        if (value == null) {
          throw new Error("Missing value after --code.");
        }
        options.code = value;
        index += 1;
        break;
      }
      case "--tokens":
        options.mode = "tokens";
        break;
      case "--ast":
        options.mode = "ast";
        break;
      case "--tree":
        options.mode = "tree";
        break;
      case "--semantic":
      case "--check":
        options.mode = "semantic";
        break;
      default:
        if (arg.startsWith("--")) {
          throw new Error(`Unknown option: ${arg}`);
        }
        if (options.filePath !== null) {
          throw new Error("Only one input file can be provided.");
        }
        options.filePath = arg;
        break;
    }
  }

  if (options.code !== null && options.filePath !== null) {
    throw new Error("Use either --code or a file path, not both.");
  }

  return options;
}

async function resolveSource(options: CliOptions): Promise<string> {
  if (options.code !== null) {
    return options.code;
  }

  if (options.filePath !== null) {
    const file = Bun.file(options.filePath);
    if (!(await file.exists())) {
      throw new Error(`Input file not found: ${options.filePath}`);
    }
    return await file.text();
  }

  const stdin = await new Response(Bun.stdin.stream()).text();
  if (stdin.trim().length > 0) {
    return stdin;
  }

  throw new Error("No input provided. Pass --code, a file path, or stdin.");
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exit(1);
});

function formatSemanticLabel(type: SemanticMessageType): string {
  const label = type.padEnd(SemanticMessageType.ERROR.length);
  return SEMANTIC_MESSAGE_COLOR[type](label);
}

function formatSemanticLocation(message: SemanticMessage): string {
  if (message.location === null) {
    return "";
  }

  return `Line ${message.location.line}, Col ${message.location.column}: `;
}
