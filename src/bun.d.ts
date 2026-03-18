declare namespace Bun {
  const argv: string[];

  function exit(code?: number): never;

  function file(path: string): {
    exists(): Promise<boolean>;
    text(): Promise<string>;
  };

  const stdin: {
    stream(): ReadableStream<Uint8Array>;
  };
}
