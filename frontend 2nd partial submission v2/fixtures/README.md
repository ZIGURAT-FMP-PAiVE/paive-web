# PAiVE: fixed results for building the front end

**For:** Valentina (screens) · **From:** Omar · **Status:** fixed test data, schema 0.1 · the real back end (`POST /run`, see `docs/integration/api-contract.md`) returns the same format

These files are **fixed test results**. They look exactly like what the AI workflow will return, but nothing
here is produced by the trained model, Chroma or the LLM. They were calculated once from our own sample data:
the IFC models `typology_v01.ifc` / `typology_v02.ifc`, `cost_db.csv`, `alternatives.csv` and `project_data.json`.
Because of that, the numbers add up and can be checked by hand.

The front end and the AI workflow are kept separate. The screens only call the 4 functions in
`fake_backend.py`. Later the real back end gets the same function names and returns the same JSON, so we
swap one import and the screens keep working.

## What's in the folder

| File | What it is | Used on |
|---|---|---|
| `data/sample/versions/typology_v01.ifc`, `typology_v02.ifc` (in the zip: `ifc/`) | The two test models to upload. The wall GUIDs match the results. | Screen 1, 3D view |
| `run_001_baseline_v01.json` | First upload, the **baseline**. All targets are met. | Screens 2 and 4 |
| `run_002_v02_value_down.json` | **The main test.** v02 is cheaper but misses a target: **Value down**, with 2 options. | Screens 2, 3, 4 |
| `run_003_blocked.json` | A **blocked** run: data is missing (failure test F1). | Screen 1 error state |
| `decision_accept.json` | What comes back after **Accept**. | Screen 3 |
| `decision_reject.json` | What comes back after **Reject**. The next option is offered. | Screen 3 |
| `decision_missing_reason.json` | The error when the reason box is empty. | Screen 3 |
| `log.json` | Decision history. | Screen 4 |
| `fake_backend.py` | The 4 functions the screens call (see below). | All screens |

## The test story (run_002)

The designer changes all 4 facades from **EW-A** (brick + 120 mm wool, U 0.25) to **EW-B** (brick + 60 mm wool, U 0.35).

| | v01 (previous) | v02 (current) |
|---|---|---|
| Wall cost R | 86,141 € | 74,781 € (−11,359 €) |
| Function score F | 1.128 | 0.977 |
| Achievement | 100 % | 90.7 % |
| Required target failed | none | **Control Heat:** U 0.35 > 0.28 |
| Value change ΔV | — | −0.3 % |
| **Verdict** | Baseline | **Value down** |

The cost went down, but a required target is now missed, so the verdict is **Value down, not a saving**
(failure test F4). The screen must say this clearly.

The **"Generic - 200mm"** wall has no data, so it is **unmapped** (grey). A person has to classify it (failure test F2).

The options, ranked:

| Rank | Option | U / fire / Rw | Cost vs v02 | ΔV vs v02 | Meets all required targets |
|---|---|---|---|---|---|
| 1 | ALT-01: concrete block + 140 mm EPS ETICS | 0.24 / 90 min / 50 dB | −4,260 € | +24.2 % | Yes |
| 2 | ALT-02: steel frame + 160 mm wool + rainscreen | 0.22 / 60 min / 46 dB | +6,153 € | +3.6 % | Yes |

There are also two **excluded** options, shown greyed out with a reason:
- **ALT-03** loses Attenuate Sound, so it can't be used.
- **ALT-04** is the current design, so it isn't an alternative.

The ranking is marked **Stable**: it stays the same when each client weight is moved by ±10%.

## Lovable (TypeScript) or Python

In Lovable, use `app/lovable/paiveApi.ts`: `fullRun()`, `getRun()`, `decide()`, `log()` return exactly these JSON
shapes (types `RunResult`, `DecisionResult`, `LogEvent`). Until the Colab back end is live, load the JSON files here
instead. `fake_backend.py` is the same idea for a Python front end.

## The 4 functions the screens call

```python
from fake_backend import run, get_run, decide, get_log

run_id = run(uploaded_path, project_id="pilot-sample", compare_to="last-accepted", note="")  # Screen 1
result = get_run(run_id)                                                                 # Screens 2-3
answer = decide(run_id, "accept" or "reject", reviewer, reason, selected_option)        # Screen 3
history = get_log()                                                                      # Screen 4
```

The fake chooses the result from the file name: a name containing `v01` gives the baseline, `v02` gives
Value down, and anything else gives the blocked run. Screens never calculate anything; they only display what they get.

## The result types: which field goes where

### Screen 1: Upload and Run

| Show | Field (in `get_run(run_id)`) | Type |
|---|---|---|
| Progress of the 6 steps | `steps[]`: `step`, `name`, `status` (`done` / `waiting` / `draft` / `blocked` / `not_run`) | list |
| Blocked message | `status == "blocked"` → `blocked.message`, `blocked.missing[]`, `blocked.what_to_do` | text + table |
| Model summary | `ve1.summary`: walls_total, mapped, unmapped, changed, unchanged, area_in_scope_m2 | numbers |

### Screen 2: Result (D1 card + walls)

| Show | Field | UI element |
|---|---|---|
| Big verdict | `d1.verdict_label` (`Value up` / `Value down` / `No change` / `Baseline`) | Coloured badge: up green, down red, no change grey |
| Why | `d1.reason` | One line under the badge |
| KPIs | `d1.achievement_previous_pct` → `achievement_current_pct`, `d1.dV_pct`, `d1.dR_eur` | 3 metric tiles with arrows |
| Failed targets | `d1.required_targets_failed[]`: statement, target, actual, unit, walls | Red list |
| Wall table | `walls[]`: name, type, area_m2, change, u_value, fire_min, rw_db, `achievement_pct`, `flags` | Table, sortable |
| Functions per wall | `walls[].ve2.functions[]`: statement + probability (the "AI model" output) | Chips with % |
| 3D / colour view | `walls[].guid` + `walls[].colour` (`red` failed · `amber` changed · `green` OK · `grey` unmapped) | Colour each wall by GUID in the viewer |
| Unmapped walls | `walls[]` where `ve2.status == "unmapped"` → `ve2.reason` | Grey box "Needs a person" |
| Client weights | `weights.weights` (AHP) + `weights.consistency_ratio` | Small bar chart |

### Screen 3: Options and decision

| Show | Field | UI element |
|---|---|---|
| Option cards (ranked) | `d2.options[]`: rank, description, performance, dV_vs_current_pct, dR_vs_current_eur, `why`, source, similarity | One card each, rank 1 highlighted |
| Target check per option | `options[].achievement_pct`, `meets_all_required_targets` | ✓ / ✗ per function |
| Compare with current | `d2.current_design` | Row "Current design" above the cards |
| Stability | `d2.stability.label` (`Stable` / `Sensitive`) | Badge |
| Excluded options | `ve3.excluded[]`: description, reason | Greyed-out list |
| Decision | Accept / Reject buttons + reviewer + **required reason** → `decide(...)` | Form; keep the button disabled while the reason is empty |
| After Reject | `result.next_option` | Show the next card |
| Error | `error.message` | Red text |

Nothing is ever written back to Revit; show "No changes are made to the BIM model" under the buttons.

### Screen 4: Report and log

| Show | Field | UI element |
|---|---|---|
| Report text (the "LLM" output) | `ve6.text` + `ve6.number_check.passed` | Text block + "numbers checked ✓" |
| Export | the same JSON → PDF/CSV later | Button (can be inactive for now) |
| History | `get_log()`: at, event, run_id, version, verdict / decision, reason, user | Table, newest first |

## Which part of the AI each field stands for

| Part of the workflow | Fields | Who builds it for real |
|---|---|---|
| VE1 reading the IFC | `walls[]` properties, `ve1.summary`, `ve1.missing_fields` | Asiya |
| VE1 LLM reading the brief (done once) | `ve1.brief_extraction` | Silvana |
| VE2 classifier (trained model) | `walls[].ve2` (functions + probability, category, unmapped) | Omar + Silvana |
| VE3 alternatives search (embeddings + Chroma) | `ve3`, `d2.options[].similarity`, `source` | Silvana |
| VE4 maths (no AI) | `weights`, `d1`, scores, `d2` ranking + stability | Omar |
| VE5 human decision | `decide()`, `decision_*.json` | Ahmed |
| VE6 LLM report + number check | `ve6` | Ahmed + Silvana |

**Rule for later:** the real back end must return the same field names. If a field has to change, we change
`schema_version` and tell Valentina first.
