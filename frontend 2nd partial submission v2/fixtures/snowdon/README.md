# PAiVE fixed results: Snowdon Towers (Revit sample, architectural) - PAiVE pilot (real pipeline output)

**For:** Valentina (screens) · **From:** Omar · **Schema:** 0.1 (same as `app/fixtures/`) · made by `scripts/make_app_fixtures.py` at commit `fec1a12`

Same files and field names as the typology fixtures one folder up, so the fake back end only needs the new
file names. Unlike those, **every number here is real pipeline output** on Asiya's clean IFC exports
(`Snowdon_Towers_Sample_Architectural_v01b_clean.ifc` = baseline, `Snowdon_Towers_Sample_Architectural_v02b_clean.ifc` = changed): VE2 model `classifier ve2_classifier_v06 + Revit Function (category)`, Asiya's targets
and weights, Ahmed's rates. Run ids are renamed run_001 / run_002 (`_source.real_run_id` keeps the real one).
Wall `guid` = the IfcGUID in the IFC, so the 3D view colours walls by `walls[].colour`.

| File | What | Screens |
|---|---|---|
| `run_001_baseline_v01b.json` | baseline, accepted as the reference | 1, 2, 4 |
| `run_002_v02b.json` | latest compared with the baseline | 1, 2, 3, 4 |
| `decision_accept.json` | what Accept returned for run_001 | 3 |
| `log.json` | the decision log of both runs | 4 |

Use the IFC files from Drive `03_Development/data/projects/<project>/ifc/` (134 MB each, not in Git).

## The numbers

| | run_001 (baseline) | run_002 (latest) |
|---|---|---|
| Version | v01b | v02b |
| Verdict | Baseline | **Value down** |
| Walls (mapped / out of scope / unsure) | 941 / 185 / 0 | 941 / 185 / 0 |
| Changed / new / removed walls | - | 14 / 1 / 1 |
| Envelope cost R (USD) | 911,208 | 938,004 (+26,797) |
| Achievement | 99.9 % | 99.9 % |
| Value change ΔV | - | -2.9 % |
| Options offered | 0 | 6 |

**run_002 reason (show under the badge):** Value falls -2.9%. Value risk: Attenuate Sound now below the preferred target on 6 external wall(s) (44 vs 45 dB). Check: 1 wall(s) were measured differently by the IFC export (+32,578 USD of the cost change) - confirm their area in Revit.

New field `d1.value_risk` (true) + `d1.preferred_targets_missed[]`: show a **Value risk** tag next to the
verdict (cheaper but loses a preferred function). Walls below a preferred target are not red; their
`flags` say why.

New field `d1.area_checks[]`: walls the IFC export measured differently (an export issue, not a design
change). Show them as **Check in Revit** with `cost_effect`; the wall's `flags` carry the same text.

Field differences from the typology fixtures (all additive, nothing removed): `weights.method` = `direct` (client weights 40/35/25, no AHP matrix); `input.version_label` keeps the letter (`v02b`); `walls[].ve2.category_source` (`Revit Function` / `model`).

**Made from:** the `walls.json` of the Drive runs `outputs/runs/runs/run_021` (v01b) and `run_022` (v02b) of 25 Nov,
replayed through the pipeline at the commit above (same rows VE1 read from the IFCs; VE2-VE6 re-run). The VE6
text is the template (no LLM key here); a run with `GEMINI_API_KEY` gives the LLM text with the same numbers.

**Known data issue (Asiya to fix in Revit / the export):** wall 1919205 is measured differently in the v02b IFC
(no Height, +77 m², +32,578 USD). That alone makes the verdict *Value down −2.9 %*; with its Revit area the
result is *No change (+0.6 %)* + value risk. Re-make these files after the re-export:
`python scripts/make_app_fixtures.py --project Snowdon_Towers_Sample_Architectural --name snowdon` (Colab).
