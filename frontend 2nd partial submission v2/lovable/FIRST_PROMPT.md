# First prompt for Lovable (copy everything below the line into the Lovable chat)

Attach `app/lovable/paiveApi.ts` as text, or paste it at the end of the prompt.

---

Build the first test version of **PAiVE**, a web app for AI-assisted Value Engineering on BIM models
(architecture/construction master's project). The back end already exists: a Python FastAPI server that runs
in Google Colab. Do NOT build a back end, database or auth in Lovable for now - the app only calls our API.

**API client:** create `src/lib/paiveApi.ts` with exactly the code I paste below (types + fetch functions).
All calls go through `paiveApi`. The back-end URL and API key are stored in localStorage by the Settings page.

**Pages (React Router, shadcn/ui, Tailwind, clean professional look, dark/light):**

1. **Settings** (`/settings`): two inputs "Back-end URL" (e.g. https://xxxx.trycloudflare.com) and "API key"
   (password field), a Save button, and a "Test connection" button that calls `paiveApi.health()` and shows a
   green "Connected - storage: google_drive - commit abc123" or a red error message.
2. **Upload & Run** (`/`): a header badge showing connection status (calls health every 30 s).
   A drag-and-drop zone for one `.ifc` file, OR a select "Use a sample model" filled from `paiveApi.samples()`.
   A model select filled from `paiveApi.models()`; models with `available=false` are shown disabled with their
   `status` text as tooltip. A **Run** button calls `paiveApi.classify(model, {file} or {sample})` and shows a
   spinner (it can take up to 60 s), then navigates to the result.
3. **Result** (`/runs/:runId`): summary cards (number of walls, mapped / unmapped / out of scope counts, model
   name, IFC file name, date). A table of elements: name, type, category, functions as coloured badges
   (F-HEAT orange, F-FIRE red, F-SOUND blue, F-ENCL grey, F-LOAD purple), confidence as a progress bar,
   status badge (mapped green, unmapped amber "needs human review", out_of_scope grey, read neutral),
   U-value, fire rating, thickness. Filter by status, search by name. Load with `paiveApi.run(runId)`.
4. **History** (`/runs`): table from `paiveApi.runs()` with date, IFC file, model, number of walls; click opens the result.

Show API errors (`PaiveApiError.message`) in a toast. If the URL is not set, redirect to Settings.
Footer text: "PAiVE - advisory only: a human approves every recommendation."

```ts
// paste app/lovable/paiveApi.ts here
```
