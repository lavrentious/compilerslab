import { Lexer } from "./lexer.ts";

class DummyProgramGenerator {
  generate(_length: number): string {
    return "var count = 10; \nwhile (count > 0) { \n    print count; \n    count = count - 1; \n}";
  }
}

const generator = new DummyProgramGenerator();
const randomCode = generator.generate(10);

console.log("=== GENERATED CODE ===");
console.log(randomCode);
console.log("======================\n");

const lexer = new Lexer(randomCode);
const tokens = lexer.tokenize();

console.log("=== TOKENS ===");
for (const token of tokens) {
  console.log(token.toString());
}
