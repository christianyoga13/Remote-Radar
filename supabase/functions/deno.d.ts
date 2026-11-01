// Ambient definitions for Deno runtime globals in IDE/editors
declare namespace Deno {
  export const env: {
    get(key: string): string | undefined;
    set(key: string, value: string): void;
  };
  export function serve(handler: (req: Request) => Promise<Response> | Response): void;
  export function test(name: string, fn: () => void | Promise<void>): void;
  export function readTextFile(path: string): Promise<string>;
}
