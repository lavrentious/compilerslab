declare namespace Bun {
  const argv: string[];

  function file(path: string): {
    exists(): Promise<boolean>;
    text(): Promise<string>;
  };

  const stdin: {
    stream(): ReadableStream<Uint8Array>;
  };
}

declare const process: {
  exit(code?: number): never;
};
