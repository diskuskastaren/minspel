import "server-only";

/** Förväntat spelfel som skickas till klienten som `{ code }`. */
export class GameError extends Error {
  constructor(
    public code: string,
    public status = 400,
  ) {
    super(code);
  }
}
