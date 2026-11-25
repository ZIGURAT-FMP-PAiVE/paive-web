# Web app (front end) - template

**Owners:** Valentina (screens) + Ahmed (VE5 gate, VE6 report). STATUS: to be built by the team.

Planned screens (one per step of a run, from Valentina's wireframes in Drive `02_Design_and_Planning/Wireframes_UI`):

| Folder / file | Screen |
|---|---|
| `pages/1_upload_and_run` | Upload the latest IFC version, choose what to compare with, press **Run** |
| `pages/2_result` | Value up / down, achievement %, what changed (walls highlighted) |
| `pages/3_options` | Ranked alternatives (cards with sources) + Accept / Modify / Reject with reason |
| `pages/4_report_and_log` | Value report export + decision history |
| `components/` | Shared pieces: cards, model viewer, tables |

The screens are built in **Lovable** (repo `ZIGURAT-FMP-PAiVE/paive-app`) and read the back end through the API:
`lovable/paiveApi.ts` (client to copy into Lovable) and `lovable/FIRST_PROMPT.md` (first prompt).
Guide: `docs/integration/lovable-github-colab-drive.md`. Contract: `docs/integration/api-contract.md`.
