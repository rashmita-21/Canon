# Canon: Feature Status (Round 2)

## Completed and verified
| Feature | Where | Verification |
|---|---|---|
| Rule-based review (terminology, superlatives, ledger values, expiry) | `src/engine.ts` | 11 automated tests (`npm test`) |
| WCAG contrast + alt-text + palette checks | `src/engine.ts` | tests incl. 21:1 black/white |
| Claim Ledger with owner, source, expiry; status computed from real date | `src/data.ts`, `ClaimLedger.tsx` | manual + tests |
| Ripple: fact edit marks dependent content stale; re-check | `App.tsx`, `ClaimLedger.tsx` | manual |
| Intent Lock suggestions, no auto-apply, override reason | `ReviewDesk.tsx` | manual |
| Roles (creator / reviewer), high-risk routing flag | `ReviewDesk.tsx` | manual |
| Brand Canon drawer (versioned clauses with pass/fail examples) | `CanonDrawer.tsx` | manual |
| Brand Passport with content hash, rules version, AI disclosure | `BrandPassportModal.tsx` | manual |
| Claim-detection ML (2 models + abstain band) | `backend/ml/`, `main.py` | held-out metrics; decision tests |
| Offline fallback when backend is unreachable | `engine.ts` | manual |

## Partly done / honest limits
- ML models are trained on ClaimBuster (political debate) and are **not** tuned to marketing copy; domain shift expected. Held-out F1 0.67 (combined, 90% coverage, precision 0.85, recall 0.55).
- Tone ML is **disabled**: the model was trained on politeness data, not brand voice.
- Brand Passport hash is a content stamp, not yet a signed, hash-chained audit log.
- State lives in the browser session; no database or login yet.
- Image review is contrast + alt text + palette from user-entered colours; automatic OCR from an uploaded image is not wired in (`backend/legacy/` holds the earlier prototype).

## Not built yet (Round 3 plan)
Guideline Health dashboard / Clause Ambiguity Score, PDF/DOCX/PPTX import, persistent storage + auth, MCP server / API for other AI tools, feedback retraining (endpoint deliberately returns 501).
