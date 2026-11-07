"""
Decision rules combining Model A and Model B probabilities,
claim-to-ledger matching, and intent-preservation scoring.
"""
import numpy as np

def apply_decision_rule(prob_a, prob_b):
    """
    Returns: (should_flag: bool, confidence: str, abstain: bool, note: str)
    """
    # 1. Abstain band: Both between 0.4 and 0.7, or disagree by more than 0.4
    if abs(prob_a - prob_b) > 0.4 or (0.4 <= prob_a <= 0.7 and 0.4 <= prob_b <= 0.7):
        return False, "", True, "No rule covers this"

    # 2. Both >= 0.7 -> High confidence flag
    if prob_a >= 0.7 and prob_b >= 0.7:
        return True, "High", False, ""
    
    # 3. Exactly one >= 0.7 -> Medium confidence flag, second opinion needed
    if (prob_a >= 0.7) ^ (prob_b >= 0.7):
        return True, "Medium", False, "second opinion needed"
        
    return False, "", False, ""

def match_claim_to_ledger(sentence_embedding, facts, encoder):
    """
    Computes cosine similarity against Claim Ledger facts.
    Returns match info or 'unsupported claim'.
    """
    if not facts or encoder is None:
        return {"status": "unsupported claim", "similarity": 0.0}
    
    fact_texts = [f["fact"] + " " + str(f["value"]) for f in facts]
    fact_embeddings = encoder.encode(fact_texts, convert_to_numpy=True)
    
    similarities = np.dot(fact_embeddings, sentence_embedding) / (
        np.linalg.norm(fact_embeddings, axis=1) * np.linalg.norm(sentence_embedding) + 1e-8
    )
    
    best_idx = int(np.argmax(similarities))
    best_sim = float(similarities[best_idx])
    matched_fact = facts[best_idx]
    
    if best_sim >= 0.6:
        status = "valid"
        if matched_fact.get("status") == "Expired":
            status = "stale fact"
        return {
            "status": status,
            "similarity": best_sim,
            "fact_id": matched_fact["id"],
            "matched_fact": matched_fact
        }
    else:
        return {"status": "unsupported claim", "similarity": best_sim}

def compute_intent_preservation(original_text, fixed_text, encoder):
    """
    Computes MiniLM cosine between original and fixed sentence.
    >= 0.85 -> Yes, 0.6-0.85 -> Partly, below -> No.
    """
    if encoder is None:
        return {"status": "No", "score": 0.0}
    
    embeddings = encoder.encode([original_text, fixed_text], convert_to_numpy=True)
    sim = float(np.dot(embeddings[0], embeddings[1]) / (
        np.linalg.norm(embeddings[0]) * np.linalg.norm(embeddings[1]) + 1e-8
    ))
    
    if sim >= 0.85:
        status = "Yes"
    elif sim >= 0.6:
        status = "Partly"
    else:
        status = "No"
        
    return {"status": status, "score": sim}