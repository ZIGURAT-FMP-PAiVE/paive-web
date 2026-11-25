import { describe, expect, it } from "vitest";
import { decide, getLog, getRun, loadRun, paiveRun } from "./fakeBackend";

describe("paive fakeBackend", () => {
  it("routes runs by filename and active version", () => {
    expect(paiveRun("typology_v01.ifc")).toBe("run_001");
    expect(paiveRun("typology_v02.ifc")).toBe("run_002");
    expect(paiveRun("typology_v03.ifc")).toBe("run_002");
    expect(paiveRun("typology_v04.ifc")).toBe("run_002");
    expect(paiveRun("typology_v03_no_psets.ifc")).toBe("run_003");
    expect(paiveRun("other.ifc")).toBe("run_002");
    expect(paiveRun("wall.ifc", "pilot-sample", "last-accepted", "", 1)).toBe("run_001");
    expect(paiveRun("wall.ifc", "pilot-sample", "last-accepted", "", 3)).toBe("run_002");
    expect(paiveRun("Snowdon_Towers_v01b_clean.ifc", "x", "last-accepted", "", 1)).toBe("run_001_snowdon");
    expect(paiveRun("Snowdon_Towers_v02b_clean.ifc", "x", "last-accepted", "", 2)).toBe("run_002_snowdon");
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