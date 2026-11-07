# Held-out evaluation (real data only)

## CLAIM (train 16000, test 4000)
- model_a: precision 0.76, recall 0.60, F1 0.67, Brier 0.100
- model_b: precision 0.73, recall 0.58, F1 0.65, Brier 0.108
- A+B with abstain band: coverage 90%, precision 0.85, recall 0.55, F1 0.67

## TONE (train 6556, test 1639)
- model_a: precision 0.72, recall 0.94, F1 0.81, Brier 0.195
- model_b: precision 0.70, recall 0.96, F1 0.81, Brier 0.205
- A+B with abstain band: coverage 70%, precision 0.77, recall 0.98, F1 0.86

Limits: Domain shift: ClaimBuster is political debate; Politeness is Wikipedia/StackExchange requests, not marketing copy.
