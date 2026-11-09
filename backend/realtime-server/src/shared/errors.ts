/** Stable application errors translated by the HTTP and WebSocket adapters. */
export class DomainError extends Error {
  constructor(public readonly code: string, message: string) {
    super(message);
    this.name = "DomainError";
  }
}
