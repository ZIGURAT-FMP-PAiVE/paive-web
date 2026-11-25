const SESSION_KEY = "paive-demo-session";

export const DEMO_LOGIN_EMAIL = "user@paive.eu";
export const DEMO_LOGIN_PASSWORD = "0000";

export function isDemoAuthenticated(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return sessionStorage.getItem(SESSION_KEY) === "1";
  } catch {
    return false;
  }
}

export function setDemoSession(): void {
  try {
    sessionStorage.setItem(SESSION_KEY, "1");
  } catch {
    /* private mode */
  }
}

export function clearDemoSession(): void {
  try {
    sessionStorage.removeItem(SESSION_KEY);
  } catch {
    /* ignore */
  }
}

export function validateDemoLogin(email: string, password: string): boolean {
  return email.trim().toLowerCase() === DEMO_LOGIN_EMAIL && password === DEMO_LOGIN_PASSWORD;
}