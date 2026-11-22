"""Fake back end for the front end - returns FIXED results, no AI, no database.

The screens import ONLY these four functions. Later we replace this file with the real back end
(pipeline.run, ve5_review.decide, db.py) using the SAME names and the SAME return format,
so no screen code has to change.

    from fake_backend import run, get_run, decide, get_log
"""
import json
from datetime import datetime, timezone
from pathlib import Path

HERE = Path(__file__).parent
_LOG = json.loads((HERE / "log.json").read_text(encoding="utf-8"))


def _load(name):
    return json.loads((HERE / name).read_text(encoding="utf-8"))


def run(ifc_path, project_id="pilot-sample", compare_to="last-accepted", note=""):
    """Upload + Run. Returns a run_id. Real version: pipeline.run(...)."""
    name = Path(str(ifc_path)).name.lower()
    if "v01" in name:
        return "run_001"
    if "v02" in name:
        return "run_002"
    return "run_003"          # any other file -> the 'blocked' example


def get_run(run_id):
    """Full result of one run (the JSON the screens draw). Real version: db.get_run(run_id)."""
    files = {"run_001": "run_001_baseline_v01.json",
             "run_002": "run_002_v02_value_down.json",
             "run_003": "run_003_blocked.json"}
    return _load(files[run_id])


def decide(run_id, decision, reviewer, reason, selected_option=None):
    """VE5 human gate. decision = 'accept' | 'reject'. A reason is always required.
    Real version: ve5_review.decide(...)."""
    if not (reason or "").strip():
        return {"error": {"code": "reason_required", "message": "A reason is required for every decision."}}
    if decision not in ("accept", "reject"):
        return {"error": {"code": "bad_decision", "message": "decision must be 'accept' or 'reject'."}}
    out = _load("decision_accept.json" if decision == "accept" else "decision_reject.json")
    out.update(run_id=run_id, reviewer=reviewer, reason=reason, selected_option=selected_option,
               at=datetime.now(timezone.utc).isoformat(timespec="seconds"))
    out["result"]["log_id"] = len(_LOG) + 1
    _LOG.append({"log_id": len(_LOG) + 1, "at": out["at"], "event": "decision", "run_id": run_id,
                 "decision": decision, "option": selected_option, "reason": reason, "user": reviewer})
    return out


def get_log():
    """Decision history, newest first. Real version: db.get_log()."""
    return sorted(_LOG, key=lambda e: e["log_id"], reverse=True)


if __name__ == "__main__":          # quick self-test: python fake_backend.py
    rid = run("typology_v02.ifc")
    r = get_run(rid)
    print(rid, r["d1"]["verdict_label"], r["d1"]["dV_pct"], "% |", [o["assembly_id"] for o in r["d2"]["options"]])
    print(decide(rid, "reject", "Valentina", "")["error"]["message"])
    print(decide(rid, "accept", "Omar", "Meets U target, still cheaper", "ALT-01")["result"])
    print(len(get_log()), "log entries")
