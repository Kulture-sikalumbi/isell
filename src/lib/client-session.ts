const SESSION_KEY = "isell_session_hint";

export interface ClientSessionHint {
  loggedIn: boolean;
  email?: string;
  name?: string;
  isAdmin?: boolean;
  cachedAt: number;
}

export function saveSessionHint(
  hint: Omit<ClientSessionHint, "cachedAt">
) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(
      SESSION_KEY,
      JSON.stringify({ ...hint, cachedAt: Date.now() })
    );
  } catch {
    /* ignore */
  }
}

export function loadSessionHint(): ClientSessionHint | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as ClientSessionHint;
  } catch {
    return null;
  }
}

export function clearSessionHint() {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(SESSION_KEY);
}
