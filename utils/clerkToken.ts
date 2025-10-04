// Global Clerk token bridge for non-React modules (e.g., services/api)
// Usage:
// 1) In a top-level React tree (e.g., app/_layout.tsx), call setClerkTokenGetter(() => getToken({ template }));
// 2) Anywhere else (non-React), call await getClerkToken() to retrieve the latest JWT.

export type TokenGetter = () => Promise<string | null>;

let getter: TokenGetter | null = null;

export function setClerkTokenGetter(fn: TokenGetter) {
  getter = fn;
}

export async function getClerkToken(): Promise<string | null> {
  try {
    return getter ? await getter() : null;
  } catch {
    return null;
  }
}
