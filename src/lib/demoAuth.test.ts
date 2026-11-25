import { describe, expect, it } from "vitest";
import {
  DEMO_ADMIN_EMAIL,
  DEMO_LOGIN_PASSWORD,
  DEMO_VIEWER_EMAIL,
  loginRoleForEmail,
  validateDemoLogin,
} from "./demoAuth";

describe("validateDemoLogin", () => {
  it("accepts admin and viewer demo credentials", () => {
    expect(validateDemoLogin(DEMO_ADMIN_EMAIL, DEMO_LOGIN_PASSWORD)).toBe(DEMO_ADMIN_EMAIL);
    expect(validateDemoLogin(DEMO_VIEWER_EMAIL, DEMO_LOGIN_PASSWORD)).toBe(DEMO_VIEWER_EMAIL);
    expect(validateDemoLogin("  User@PAiVE.eu  ", DEMO_LOGIN_PASSWORD)).toBe(DEMO_ADMIN_EMAIL);
  });

  it("rejects wrong email or password", () => {
    expect(validateDemoLogin("other@paive.eu", DEMO_LOGIN_PASSWORD)).toBeNull();
    expect(validateDemoLogin(DEMO_ADMIN_EMAIL, "1234")).toBeNull();
  });
});

describe("loginRoleForEmail", () => {
  it("maps known demo accounts", () => {
    expect(loginRoleForEmail(DEMO_ADMIN_EMAIL)).toBe("admin");
    expect(loginRoleForEmail(DEMO_VIEWER_EMAIL)).toBe("viewer");
    expect(loginRoleForEmail("unknown@paive.eu")).toBe("viewer");
  });
});