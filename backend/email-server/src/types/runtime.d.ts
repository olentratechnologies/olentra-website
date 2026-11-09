declare namespace NodeJS {
  interface ProcessEnv {
    readonly [name: string]: string | undefined;
  }
}

declare const process: {
  readonly env: NodeJS.ProcessEnv;
  once(signal: string, handler: () => void): void;
  exit(code?: number): never;
};

interface ImportMeta {
  readonly main?: boolean;
}

declare class Buffer extends Uint8Array {
  static from(input: string | ArrayBuffer | ArrayLike<number>, encoding?: string): Buffer;
  static concat(chunks: readonly Uint8Array[]): Buffer;
  toString(encoding?: string): string;
}

declare module "node:crypto" {
  export function timingSafeEqual(left: Uint8Array, right: Uint8Array): boolean;
}
