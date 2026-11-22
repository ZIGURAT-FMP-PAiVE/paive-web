import { describe, expect, it } from "vitest";
import { decide, getLog, getRun, paiveRun } from "./fakeBackend";

describe("paive fakeBackend", () => {
  it("routes runs by filename", () => {
    expect(paiveRun("typology_v01.ifc")).toBe("run_001");
    expect(paiveRun("typology_v02.ifc")).toBe("run_002");
    expect(paiveRun("other.ifc")).toBe("run_003");
  });

  it("returns run_002 value down fixture", () => {
    const run = getRun("run_002");
    expect(run.d1?.verdict_label).toMatch(/down/i);
    expect(run.d2?.options.length).toBeGreaterThan(0);
  });

  it("requires reason on decide", () => {
    const err = decide("run_002", "accept", "Tester", "");
    expect("error" in err).toBe(true);
  });

  it("appends log on successful decide", () => {
    const before = getLog().length;
    const ok = decide("run_002", "accept", "Tester", "Pilot sign-off", "ALT-01");
    expect("error" in ok).toBe(false);
    expect(getLog().length).toBeGreaterThan(before);
  });
});