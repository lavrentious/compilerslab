import { Lexer } from "./lexer.ts";
import { Parser } from "./parser.ts";

const codeExample = "var x = 123; print x + 5;";

const lexer = new Lexer(codeExample);
const tokens = lexer.tokenize();

const parser = new Parser(tokens);
const ast = parser.parse();

console.dir(ast, { depth: null });
