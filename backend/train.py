"""
backend/train.py - trains CLAIM and TONE models on REAL public data only.
CLAIM: ClaimBuster (check-worthy factual sentence = positive)
TONE : Stanford Politeness Corpus via convokit (impolite = positive)
Optional: backend/data/regulator_claims.csv (text,label,source_url,...) as a marketing-domain claim test.
No synthetic data. Fails with a clear error if data is missing.
"""
import os, glob, json
import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.metrics import precision_recall_fscore_support, confusion_matrix, brier_score_loss
from sklearn.linear_model import LogisticRegression
from sklearn.calibration import CalibratedClassifierCV

from ml.models import ClaimToneClassifierSystem
from ml.decision import apply_decision_rule

HERE = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(HERE, "data")
REPORTS_DIR = os.path.join(HERE, "reports")
os.makedirs(REPORTS_DIR, exist_ok=True)
SEED = 42
MAX_ROWS = 20000  # keeps CPU training to a few minutes


def load_claimbuster():
    files = glob.glob(os.path.join(DATA_DIR, "claimbuster", "**", "*.csv"), recursive=True)
    if not files:
        raise FileNotFoundError(
            "No ClaimBuster CSVs found. Download from https://zenodo.org/record/3609356 "
            "and put the CSV files in backend/data/claimbuster/")
    frames = []
    for f in files:
        df = pd.read_csv(f)
        cols = {c.lower(): c for c in df.columns}
        tcol = next((cols[k] for k in ("text", "sentence") if k in cols), None)
        lcol = next((cols[k] for k in ("verdict", "label", "class") if k in cols), None)
        print(f"  {os.path.basename(f)}: columns={list(df.columns)} text={tcol} label={lcol}")
        if tcol and lcol:
            frames.append(pd.DataFrame({
                "text": df[tcol].astype(str),
                "label": (pd.to_numeric(df[lcol], errors="coerce") == 1).astype(int),  # 1 = check-worthy factual
            }))
    if not frames:
        raise ValueError("ClaimBuster CSVs found but no file has both a text and a label column. Check the printed columns above.")
    return pd.concat(frames, ignore_index=True)


def load_politeness():
    from convokit import Corpus, download
    rows = []
    for name in ("wikipedia-politeness-corpus", "stack-exchange-politeness-corpus"):
        corpus = Corpus(filename=download(name))
        for utt in corpus.iter_utterances():
            b = utt.meta.get("Binary")
            if b in (0, 1):  # neutral/unlabelled (-1) dropped
                rows.append((utt.text, 1 if b == 0 else 0))  # 1 = impolite = tone problem
    if not rows:
        raise ValueError("Politeness corpora loaded but no labelled rows found.")
    return pd.DataFrame(rows, columns=["text", "label"])


def prf(y, p):
    pr, rc, f1, _ = precision_recall_fscore_support(y, p, average="binary", zero_division=0)
    return {"precision": float(pr), "recall": float(rc), "f1": float(f1),
            "confusion_matrix": confusion_matrix(y, p, labels=[0, 1]).tolist()}


def train_task(system, task, df, marketing_test=None):
    df = df.dropna().drop_duplicates(subset="text")
    df = df[df.text.str.len().between(10, 600)]
    if len(df) > MAX_ROWS:
        df = df.sample(MAX_ROWS, random_state=SEED)
    print(f"\n[{task}] rows={len(df)} positives={int(df.label.sum())}")
    if df.label.nunique() < 2 or df.label.sum() < 50:
        raise ValueError(f"Not enough positive examples for {task}.")

    X_tr, X_te, y_tr, y_te = train_test_split(
        df.text.tolist(), df.label.values, test_size=0.2, stratify=df.label.values, random_state=SEED)

    # Model A: TF-IDF + calibrated Logistic Regression
    vec, cal_a = system.build_model_a()
    cal_a.fit(vec.fit_transform(X_tr), y_tr)

    # Model B: MiniLM embeddings + calibrated Logistic Regression (no cache: avoids stale files)
    emb_tr = system.get_embeddings(X_tr)
    emb_te = system.get_embeddings(X_te)
    lr_b = CalibratedClassifierCV(
        estimator=LogisticRegression(class_weight="balanced", max_iter=1000), cv=5, method="sigmoid")
    lr_b.fit(emb_tr, y_tr)

    system.save_models(task, cal_a, lr_b, vec)

    pa = cal_a.predict_proba(vec.transform(X_te))[:, 1]
    pb = lr_b.predict_proba(emb_te)[:, 1]
    out = {
        "rows": int(len(df)), "train": len(X_tr), "test": len(X_te),
        "model_a": {**prf(y_te, (pa >= 0.5).astype(int)), "brier": float(brier_score_loss(y_te, pa))},
        "model_b": {**prf(y_te, (pb >= 0.5).astype(int)), "brier": float(brier_score_loss(y_te, pb))},
    }

    # Combined A+B with the abstain band, on held-out data only
    flags, abst = [], []
    for a, b in zip(pa, pb):
        flag, _conf, abstain, _note = apply_decision_rule(float(a), float(b))
        flags.append(int(flag)); abst.append(bool(abstain))
    flags, abst = np.array(flags), np.array(abst)
    keep = ~abst
    out["combined"] = {"coverage": float(keep.mean()),
                       **(prf(y_te[keep], flags[keep]) if keep.sum() else {})}

    if marketing_test is not None and len(marketing_test) >= 40:
        m_emb = system.get_embeddings(marketing_test.text.tolist())
        m_a = cal_a.predict_proba(vec.transform(marketing_test.text.tolist()))[:, 1]
        m_b = lr_b.predict_proba(m_emb)[:, 1]
        out["marketing_domain_recall"] = {
            "n": int(len(marketing_test)),
            "model_a": float((m_a >= 0.5).mean()), "model_b": float((m_b >= 0.5).mean())}
    return out


def main():
    system = ClaimToneClassifierSystem()
    metrics = {"data_sources": {
        "claim": "ClaimBuster (Zenodo 10.5281/zenodo.3609356): check-worthy factual = positive",
        "tone": "Stanford Politeness Corpus via convokit (CC BY 4.0): impolite = positive; neutral dropped"},
        "limits": "Domain shift: ClaimBuster is political debate; Politeness is Wikipedia/StackExchange requests, not marketing copy."}

    print("Loading ClaimBuster...")
    claim_df = load_claimbuster()
    marketing = None
    reg_path = os.path.join(DATA_DIR, "regulator_claims.csv")
    if os.path.exists(reg_path):
        try:
            marketing = pd.read_csv(reg_path)[["text"]].dropna()
            print(f"Regulator claims file: {len(marketing)} rows")
        except Exception as e:
            print(f"Could not read regulator_claims.csv: {e}")

    metrics["claim"] = train_task(system, "claim", claim_df, marketing)

    print("Loading Politeness corpora (first run downloads them)...")
    tone_df = load_politeness()
    metrics["tone"] = train_task(system, "tone", tone_df)

    with open(os.path.join(REPORTS_DIR, "metrics.json"), "w", encoding="utf-8") as f:
        json.dump(metrics, f, indent=2)
    with open(os.path.join(REPORTS_DIR, "metrics.md"), "w", encoding="utf-8") as f:
        f.write("# Held-out evaluation (real data only)\n\n")
        for t in ("claim", "tone"):
            m = metrics[t]
            f.write(f"## {t.upper()} (train {m['train']}, test {m['test']})\n")
            for k in ("model_a", "model_b"):
                f.write(f"- {k}: precision {m[k]['precision']:.2f}, recall {m[k]['recall']:.2f}, "
                        f"F1 {m[k]['f1']:.2f}, Brier {m[k]['brier']:.3f}\n")
            c = m["combined"]
            if "f1" in c:
                f.write(f"- A+B with abstain band: coverage {c['coverage']:.0%}, precision {c['precision']:.2f}, "
                        f"recall {c['recall']:.2f}, F1 {c['f1']:.2f}\n")
            f.write("\n")
        f.write(f"Limits: {metrics['limits']}\n")
    print("Done. See backend/reports/metrics.md")


if __name__ == "__main__":
    main()