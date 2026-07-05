export class OfflineError extends Error {
  readonly code = "OFFLINE" as const;

  constructor(message = "You are offline. Check your internet connection.") {
    super(message);
    this.name = "OfflineError";
  }
}

export function isOffline(): boolean {
  return typeof navigator !== "undefined" && !navigator.onLine;
}

export function isNetworkFailure(err: unknown): boolean {
  if (err instanceof OfflineError) return true;
  if (err instanceof TypeError) return true;
  return false;
}

export function offlineMessage(err: unknown): string {
  if (err instanceof OfflineError) return err.message;
  if (err instanceof TypeError) {
    return "No internet connection. You are still signed in — try again when back online.";
  }
  return err instanceof Error ? err.message : "Something went wrong";
}

export async function offlineAwareFetch(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  if (isOffline()) {
    throw new OfflineError();
  }

  try {
    return await fetch(input, init);
  } catch (err) {
    if (err instanceof TypeError) {
      throw new OfflineError();
    }
    throw err;
  }
}
