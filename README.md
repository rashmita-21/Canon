# Canon: Version Control and CI for Brand Truth

Brand content proofing desk. Brand rules and approved facts are structured, versioned and checkable; **AI explains, humans decide**. Built for the Inkloom AI Brand-Governance Challenge (Team: Sri Harshitha Javangula, Rashmita Perumanla).

Demo brand: **Lumen Bank** (fictional).

## What works today
- **Review Desk**: paste copy + one-line intent + channel → cited findings with exact highlighted span, rule ID, confidence, rule-based / AI-assisted label.
- **Rule layer** (runs in the browser): banned guarantees, legacy terminology, unsupported superlatives, ledger value mismatches, expired facts, WCAG contrast, missing alt text, off-palette colours.
- **Claim Ledger + Ripple**: approved facts with owner, source and expiry; editing or expiring a fact marks every dependent content item stale.
- **Intent Lock**: up to three options per issue (edit / alternative / keep with reason); nothing is auto-applied; overrides need a reason.
- **ML layer (optional backend)**: two claim detectors (TF-IDF+LR and MiniLM embeddings+LR), abstain band, "No rule covers this" guideline-gap findings, claim-to-ledger semantic matching, intent-preservation score.
- **Workflow + Brand Passport**: Draft → Checked → In review → Approved / Changes requested; role-based view; hash-stamped passport with AI disclosure.

See [FEATURES_STATUS.md](FEATURES_STATUS.md) for exactly what is and is not finished.

## Run locally
```bash
npm install
npm run dev            # http://localhost:3000  (works with no backend)
npm test               # rule-engine tests
```
Optional ML backend:
```bash
cd backend
python -m venv venv && source venv/bin/activate   # Windows: venv\Scripts\activate
pip install torch --index-url https://download.pytorch.org/whl/cpu
pip install -r requirements.txt
uvicorn main:app --port 8000
```
The dev server proxies/targets `http://localhost:8000`. For a deployed frontend set `VITE_API_URL` (see `.env.example`).

## Deploy
- **Frontend**: any static host (Vercel / Netlify). Build `npm run build`, output `dist`.
- **Backend**: Docker (`backend/Dockerfile`), e.g. a Hugging Face Space (Docker SDK, port 7860). Set `CORS_ORIGINS` to your frontend URL to lock it down.

## Repository layout
```
src/            React + TypeScript UI and deterministic rule engine (engine.ts)
tests/          rule-engine tests (npm test)
backend/        FastAPI ML service (main.py, ml/, models/, reports/, tests/)
backend/legacy/ earlier prototype modules, not used by the running app
```
Data sources and licences: `backend/DATA_SOURCES.md`. Held-out ML metrics: `backend/reports/metrics.md`.
