
"""
Main FastAPI Application for Canon Governance Engine.
Claim ML classifier, Claim-to-Ledger semantic matching,
and Intent Preservation scoring.

Tone predictions are intentionally disabled because the current
tone model was trained on politeness data, not verified brand voice.
Deterministic brand rules remain in the frontend (src/engine.ts).
"""

import os
import re
import sys
import json
import time
import uuid
from typing import List, Optional, Dict, Any

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# Ensure backend directory is in sys.path for direct module imports
BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from ml.models import ClaimToneClassifierSystem
from ml.decision import (
    apply_decision_rule,
    match_claim_to_ledger,
    compute_intent_preservation,
)

app = FastAPI(title="Canon Governance Engine API", version="4.2.1")

# ---------------- CORS ----------------

_cors_env = os.getenv("CORS_ORIGINS", "*")
origins = [o.strip() for o in _cors_env.split(",") if o.strip()]  # "*" = public demo, no cookies/credentials

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------- ML models ----------------

ml_system = ClaimToneClassifierSystem()

claim_model_a, claim_model_b = None, None
tone_model_a, tone_model_b = None, None
ml_available = False


@app.on_event("startup")
def load_ml_models():
    global claim_model_a, claim_model_b
    global tone_model_a, tone_model_b, ml_available

    try:
        c_a, c_b = ml_system.load_models("claim")

        if c_a and c_b:
            claim_model_a, claim_model_b = c_a, c_b
            ml_available = True
            print("Claim ML models loaded.")
            print("ML tone warnings disabled: model is not brand-voice validated.")
        else:
            print("Trained claim models not found. ML layer disabled.")
            ml_available = False

    except Exception as e:
        print(f"Error loading claim ML models on startup: {e}")
        ml_available = False


# ---------------- Schemas ----------------

class FactItemSchema(BaseModel):
    id: str
    fact: str
    value: Any
    category: Optional[str] = ""
    status: Optional[str] = ""
    effectiveDate: Optional[str] = ""
    expiryDate: Optional[str] = None
    sourceDoc: Optional[str] = ""


class ImageAssetSchema(BaseModel):
    textColor: str
    bgColor: str
    altText: str


class ReviewRequest(BaseModel):
    content: str
    intent: Optional[str] = ""
    channel: Optional[str] = "Ad"
    facts: List[FactItemSchema] = []
    imageAsset: Optional[ImageAssetSchema] = None


class FeedbackRetrainRequest(BaseModel):
    decisions: List[Dict[str, Any]]


# ---------------- Helpers ----------------

MAX_CONTENT_CHARS = 5000


def new_id(prefix: str) -> str:
    return f"{prefix}-{uuid.uuid4().hex[:10]}"


def split_sentences(content: str):
    """
    Yield (sentence, start, end).

    Splits only where . ! ? is followed by whitespace or end,
    so numbers like 6.5% are not broken apart.
    """
    for m in re.finditer(
        r"\S.*?(?:[.!?]+(?=\s|$)|$)",
        content,
        flags=re.S,
    ):
        s = m.group(0).strip()
        if s:
            yield s, m.start(), m.end()


def simple_fix(sentence: str) -> str:
    """Safe template fix. Returns the same text if no template applies."""
    fixed = sentence

    for bad, good in [
        ("cheapest", "affordable"),
        ("guaranteed", "targeted"),
        ("best", "strong"),
    ]:
        fixed = re.sub(
            rf"\b{bad}\b",
            good,
            fixed,
            flags=re.I,
        )

    return fixed


# ---------------- Endpoints ----------------

@app.get("/api/health")
def health():
    return {
        "status": "ok",
        "ml_available": ml_available,
        "cors_origins": origins,
    }


@app.post("/api/review")
def review_content(payload: ReviewRequest):
    start_time = time.time()

    if len(payload.content) > MAX_CONTENT_CHARS:
        raise HTTPException(
            status_code=413,
            detail=f"Content too long (max {MAX_CONTENT_CHARS} characters).",
        )

    facts_dict = [f.dict() for f in payload.facts]
    findings: List[Dict[str, Any]] = []

    if ml_available and ml_system.encoder is not None:
        try:
            for sentence, s_start, s_end in split_sentences(payload.content):

                # ----- CLAIM task -----

                vec_a = claim_model_a["vectorizer"].transform([sentence])

                prob_a = float(
                    claim_model_a["classifier"].predict_proba(vec_a)[0][1]
                )

                emb = ml_system.get_embeddings([sentence])

                prob_b = float(
                    claim_model_b["classifier"].predict_proba(emb)[0][1]
                )

                flag, conf, abstain, note = apply_decision_rule(
                    prob_a,
                    prob_b,
                )

                if flag:
                    ledger_match = match_claim_to_ledger(
                        emb[0],
                        facts_dict,
                        ml_system.encoder,
                    )

                    suggestions = []

                    fixed = simple_fix(sentence)

                    if fixed != sentence:
                        intent_eval = compute_intent_preservation(
                            sentence,
                            fixed,
                            ml_system.encoder,
                        )

                        suggestions.append({
                            "id": new_id("sug-ml"),
                            "label": "Suggested wording",
                            "replacementText": fixed,
                            "intentPreserved": {
                                "status": intent_eval["status"],
                                "explanation": (
                                    "Embedding similarity to the original: "
                                    f"{intent_eval['score']:.2f}"
                                ),
                            },
                        })

                    findings.append({
                        "id": new_id("fnd-ml-claim"),
                        "ruleId": "RULE-FIN-CLAIM-01",
                        "ruleName": "Factual Claim Substantiation Required",
                        "severity": "warning",
                        "category": "Claim",
                        "flaggedText": sentence,
                        "whyFlagged": (
                            "The trained claim detector marked this sentence "
                            "as a claim that needs evidence. "
                            f"Ledger match: {ledger_match['status']}. "
                            f"{note or ''}"
                        ).strip(),
                        "origin": "AI-assisted",
                        "confidence": conf,
                        "isHighRisk": conf == "High",
                        "isAbstain": False,
                        "startOffset": s_start,
                        "endOffset": s_start + len(sentence),
                        "decision": {"status": "pending"},
                        "suggestions": suggestions,
                    })

                elif abstain:
                    findings.append({
                        "id": new_id("fnd-ml-gap"),
                        "ruleId": "GAP-UNCODIFIED",
                        "ruleName": "No Rule Covers This",
                        "severity": "gap",
                        "category": "Guideline Gap",
                        "flaggedText": sentence,
                        "whyFlagged": (
                            "The two models were unsure or disagreed, "
                            "so no flag was raised. Logged as a possible "
                            "guideline gap."
                        ),
                        "origin": "AI-assisted",
                        "confidence": "Low",
                        "isHighRisk": False,
                        "isAbstain": True,
                        "startOffset": s_start,
                        "endOffset": s_start + len(sentence),
                        "decision": {"status": "pending"},
                        "suggestions": [],
                    })

                # ----- TONE task -----
                # Intentionally disabled.
                # The current model was trained on politeness data,
                # not verified brand voice.
                # Do not present its predictions as brand-tone findings.
                # Brand voice checks should come from approved brand rules.

        except Exception as e:
            print(f"Error executing ML evaluation: {e}")
            findings = []
            ml_ok = False

        else:
            ml_ok = True

    else:
        ml_ok = False

    latency_ms = int((time.time() - start_time) * 1000)

    return {
        "findings": findings,
        "meta": {
            "model_versions": {
                "claim": (
                    claim_model_a.get("version", "unknown")
                    if ml_ok and claim_model_a
                    else "none"
                ),
                "tone": "disabled",
            },
            "ml_available": ml_ok,
            "latency_ms": latency_ms,
        },
    }


@app.get("/api/metrics")
def get_metrics():
    metrics_path = os.path.join(
        BACKEND_DIR,
        "reports",
        "metrics.json",
    )

    if os.path.exists(metrics_path):
        with open(metrics_path, "r", encoding="utf-8") as f:
            return json.load(f)

    raise HTTPException(
        status_code=404,
        detail="Models not evaluated yet. Run train.py first.",
    )


@app.post("/api/feedback-retrain")
def feedback_retrain(payload: FeedbackRetrainRequest):
    # Not implemented: returning made-up before/after numbers would be dishonest.
    raise HTTPException(
        status_code=501,
        detail="Retraining from reviewer feedback is not implemented yet.",
    )
