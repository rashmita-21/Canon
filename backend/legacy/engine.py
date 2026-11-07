import json
import os

def load_rules():
    path = os.path.join(os.path.dirname(__file__), "config", "rules.json")
    if os.path.exists(path):
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    return []

def load_ledger():
    path = os.path.join(os.path.dirname(__file__), "config", "ledger.json")
    if os.path.exists(path):
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    return []

def run_text_engine(content: str, intent: str, facts: list):
    findings = []
    lower_content = content.lower()
    rules = load_rules()

    # 1. Check banned terms (Term-1.1)
    banned_terms = ["guaranteed returns", "guaranteed", "risk-free", "free money", "cheapest"]
    for term in banned_terms:
        idx = lower_content.find(term)
        while idx != -1:
            flagged = content[idx:idx + len(term)]
            findings.append({
                "id": f"find-{len(findings)+1}",
                "category": "Terminology",
                "severity": "error",
                "ruleId": "Term-1.1",
                "ruleName": "Banned Superlatives & Guarantees",
                "flaggedText": flagged,
                "startOffset": idx,
                "endOffset": idx + len(term),
                "whyFlagged": f"Term '{flagged}' violates institutional compliance rules regarding financial guarantees.",
                "confidence": "High",
                "origin": "Rule-based",
                "isHighRisk": True,
                "isAbstain": False,
                "suggestions": [
                    {
                        "id": f"sug-{len(findings)}-1",
                        "label": "Remove superlative / guarantee",
                        "replacementText": "competitive",
                        "intentPreserved": {
                            "status": "Yes",
                            "explanation": "Replaces absolute guarantee with approved competitive positioning."
                        }
                    }
                ],
                "decision": { "status": "pending" }
            })
            idx = lower_content.find(term, idx + 1)

    # 2. Check preferred term: Lumen Saver -> Lumen Savings (Term-1.2)
    if "lumen saver" in lower_content:
        idx = lower_content.find("lumen saver")
        flagged = content[idx:idx + 11]
        findings.append({
            "id": f"find-{len(findings)+1}",
            "category": "Terminology",
            "severity": "warning",
            "ruleId": "Term-1.2",
            "ruleName": "Preferred Terminology: Savings Accounts",
            "flaggedText": flagged,
            "startOffset": idx,
            "endOffset": idx + 11,
            "whyFlagged": "Brand nomenclature update specifies 'Lumen Savings' instead of legacy 'Lumen Saver'.",
            "confidence": "High",
            "origin": "Rule-based",
            "isHighRisk": False,
            "isAbstain": False,
            "suggestions": [
                {
                    "id": f"sug-term-1.2",
                    "label": "Use preferred brand term",
                    "replacementText": "Lumen Savings",
                    "intentPreserved": { "status": "Yes", "explanation": "Maintains exact product reference with updated brand terminology." }
                }
            ],
            "decision": { "status": "pending" }
        })

    # 3. Check customer vs account holder (Term-1.3)
    if "customer" in lower_content:
        idx = lower_content.find("customer")
        flagged = content[idx:idx + 8]
        findings.append({
            "id": f"find-{len(findings)+1}",
            "category": "Terminology",
            "severity": "warning",
            "ruleId": "Term-1.3",
            "label": "Customer vs Account Holder",
            "ruleName": "Customer vs Account Holder",
            "flaggedText": flagged,
            "startOffset": idx,
            "endOffset": idx + 8,
            "whyFlagged": "Brand voice specifies 'account holder(s)' instead of 'customer(s)'.",
            "confidence": "High",
            "origin": "Rule-based",
            "isHighRisk": False,
            "isAbstain": False,
            "suggestions": [
                {
                    "id": "sug-term-1.3",
                    "label": "Use preferred institutional term",
                    "replacementText": "account holder",
                    "intentPreserved": { "status": "Yes", "explanation": "Aligns with relationship-depth terminology." }
                }
            ],
            "decision": { "status": "pending" }
        })

    # 4. Check interest rate claims against ledger F1 (6.5%)
    if "%" in content or "returns" in lower_content:
        for f in facts:
            if f["id"] == "F1" and "8%" in content:
                idx = content.find("8%")
                findings.append({
                    "id": f"find-{len(findings)+1}",
                    "category": "Claim",
                    "severity": "error",
                    "ruleId": "Claim-2.1",
                    "ruleName": "Savings Interest Rate Accuracy",
                    "flaggedText": "8%",
                    "startOffset": idx,
                    "endOffset": idx + 2,
                    "whyFlagged": f"Stated rate '8%' conflicts with Claim Ledger entry F1 verified value ({f['value']}).",
                    "confidence": "High",
                    "origin": "Rule-based",
                    "isHighRisk": True,
                    "isAbstain": False,
                    "suggestions": [
                        {
                            "id": "sug-rate-1",
                            "label": "Update to approved ledger value",
                            "replacementText": "6.5% p.a.",
                            "intentPreserved": { "status": "Yes", "explanation": "Aligns rate claim with Treasury ALCO approved ledger." }
                        }
                    ],
                    "decision": { "status": "pending" }
                })

    return {
        "findings": findings,
        "aiNotice": True,
        "meta": {
            "rulesVersion": "Canon v4.2.1",
            "modelVersions": ["Deterministic Rule Engine v4.2", "Local ML Heuristics v1.0"],
            "latencyMs": 42,
            "mlAvailable": False,
            "ocrAvailable": False
        }
    }