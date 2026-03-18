import { AstPrinter } from "./ast-printer.ts";
import { Lexer } from "./lexer.ts";
import { Parser } from "./parser.ts";

class DummyProgramGenerator {
  generate(_length: number): string {
    return `
        var x = 10;
        var y = 20;
        if (x < y) {
            print x + y * 2;
        } else {
            while (x > 0) {
                x = x - 1;
            }
        }
        `;
  }
}

const generator = new DummyProgramGenerator();
const randomCode = generator.generate(10);

console.log("=== SOURCE CODE ===");
console.log(randomCode);
console.log("===================\n");

const lexer = new Lexer(randomCode);
const tokens = lexer.tokenize();

const parser = new Parser(tokens);
const ast = parser.parse();

console.log(`successfully parsed ${ast.length} instructions at top level\n`);

const printer = new AstPrinter();
printer.printAst(ast);
