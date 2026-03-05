/* Minimal Deno type shim so the Vite/TS checker doesn't error on edge-function code. */
declare namespace Deno {
  interface Env {
    get(key: string): string | undefined;
    set(key: string, value: string): void;
    toObject(): Record<string, string>;
  }
  const env: Env;
  function serve(handler: (req: Request) => Response | Promise<Response>): void;
}

// Allow bare https:// imports used by edge functions (esm.sh, etc.)
declare module "https://*" {
  const mod: any; // eslint-disable-line @typescript-eslint/no-explicit-any
  export default mod;
  export = mod;
}
