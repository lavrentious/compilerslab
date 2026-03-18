# mk1-ts

TypeScript/Bun port of the Python `mk1` lexer, parser, AST model, and AST printer.

## Run

```bash
bun run cli -- --code "var x = 123; print x + 5;"
bun run cli -- --tokens examples/program.mk1
bun run cli -- --ast examples/program.mk1
bun run cli -- --tree examples/program.mk1
```

You can also pipe source code:

```bash
echo "var x = 1; print x;" | bun run cli -- --tokens
```

The CLI accepts:

```bash
bun run start
bun run demo:lexer
bun run demo:parser
```
