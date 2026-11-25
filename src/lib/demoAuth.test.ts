import { describe, expect, it } from "vitest";
import { DEMO_LOGIN_EMAIL, DEMO_LOGIN_PASSWORD, validateDemoLogin } from "./demoAuth";

describe("validateDemoLogin", () => {
  it("accepts the demo credentials", () => {
    expect(validateDemoLogin(DEMO_LOGIN_EMAIL, DEMO_LOGIN_PASSWORD)).toBe(true);
    expect(validateDemoLogin("  User@PAiVE.eu  ", DEMO_LOGIN_PASSWORD)).toBe(true);
  });

  it("rejects wrong email or password", () => {
    expect(validateDemoLogin("other@paive.eu", DEMO_LOGIN_PASSWORD)).toBe(false);
    expect(validateDemoLogin(DEMO_LOGIN_EMAIL, "1234")).toBe(false);
  });
});