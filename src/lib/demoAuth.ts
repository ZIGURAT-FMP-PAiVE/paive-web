import type { ProjectRole } from "@/lib/projects";

const SESSION_EMAIL_KEY = "paive-demo-user-email";

export const DEMO_ADMIN_EMAIL = "user@paive.eu";
export const DEMO_VIEWER_EMAIL = "viewer@paive.eu";
export const DEMO_LOGIN_PASSWORD = "0000";

/** @deprecated use DEMO_ADMIN_EMAIL */
export const DEMO_LOGIN_EMAIL = DEMO_ADMIN_EMAIL;

const DEMO_ACCOUNTS: Record<string, ProjectRole> = {
  [DEMO_ADMIN_EMAIL]: "admin",
  [DEMO_VIEWER_EMAIL]: "viewer",
};

export function normalizeDemoEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function loginRoleForEmail(email: string): ProjectRole {
  return DEMO_ACCOUNTS[normalizeDemoEmail(email)] ?? "viewer";
}

export function isDemoAuthenticated(): boolean {
  return getDemoUserEmail() != null;
}

export function getDemoUserEmail(): string | null {
  if (typeof window === "undefined") return null;
  try {
    let raw = sessionStorage.getItem(SESSION_EMAIL_KEY);
    if (!raw && sessionStorage.getItem("paive-demo-session") === "1") {
      raw = DEMO_ADMIN_EMAIL;
      sessionStorage.setItem(SESSION_EMAIL_KEY, raw);
      sessionStorage.removeItem("paive-demo-session");
    }
    if (!raw) return null;
    const email = normalizeDemoEmail(raw);
    return email in DEMO_ACCOUNTS ? email : null;
  } catch {
    return null;
  }
}

export function setDemoSession(email: string): void {
  try {
    sessionStorage.setItem(SESSION_EMAIL_KEY, normalizeDemoEmail(email));
    sessionStorage.removeItem("paive-demo-session");
  } catch {
    /* private mode */
  }
}

export function clearDemoSession(): void {
  try {
    sessionStorage.removeItem(SESSION_EMAIL_KEY);
    sessionStorage.removeItem("paive-demo-session");
  } catch {
    /* ignore */
  }
}

export function validateDemoLogin(email: string, password: string): string | null {
  if (password !== DEMO_LOGIN_PASSWORD) return null;
  const normalized = normalizeDemoEmail(email);
  return normalized in DEMO_ACCOUNTS ? normalized : null;
}