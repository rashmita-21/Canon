"""
Pytest unit tests for the Canon Governance Engine API and Decision Logic.
"""
import pytest
from fastapi.testclient import TestClient

# Use absolute import from backend package
from backend.main import app
from backend.ml.decision import apply_decision_rule

client = TestClient(app)

def test_decision_rule_high_confidence():
    flag, conf, abstain, note = apply_decision_rule(0.85, 0.80)
    assert flag is True
    assert conf == "High"
    assert abstain is False

def test_decision_rule_medium_confidence():
    flag, conf, abstain, note = apply_decision_rule(0.75, 0.50)
    assert flag is True
    assert conf == "Medium"
    assert note == "second opinion needed"
    assert abstain is False

def test_decision_rule_abstain_band():
    flag, conf, abstain, note = apply_decision_rule(0.55, 0.50)
    assert flag is False
    assert abstain is True
    assert note == "No rule covers this"

def test_decision_rule_disagreement_abstain():
    flag, conf, abstain, note = apply_decision_rule(0.90, 0.40) # Disagreement > 0.4
    assert flag is False
    assert abstain is True

def test_api_review_endpoint():
    response = client.post("/api/review", json={
        "content": "Get guaranteed 50% returns instantly with zero documentation.",
        "facts": []
    })
    assert response.status_code == 200
    data = response.json()
    assert "findings" in data
    assert "meta" in data