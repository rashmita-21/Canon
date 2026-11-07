"""
Model definitions for Model A (Explainable TF-IDF + LogisticRegression)
and Model B (Semantic Sentence-Transformers + LogisticRegression).
Includes disk caching (.npy), CalibratedClassifierCV, and feature coefficient extraction.
"""
import os
import joblib
import numpy as np
from datetime import datetime
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.pipeline import FeatureUnion
from sklearn.linear_model import LogisticRegression
from sklearn.calibration import CalibratedClassifierCV
from sentence_transformers import SentenceTransformer

MODELS_DIR = os.path.join(os.path.dirname(__file__), "../models")
EMBEDDING_CACHE_DIR = os.path.join(os.path.dirname(__file__), "../models/cache")
os.makedirs(MODELS_DIR, exist_ok=True)
os.makedirs(EMBEDDING_CACHE_DIR, exist_ok=True)

class ClaimToneClassifierSystem:
    def __init__(self):
        self.model_a = None
        self.model_b = None
        self.encoder = None
        self.version = "v1.0.0"
        self._load_encoder()

    def _load_encoder(self):
        try:
            self.encoder = SentenceTransformer("all-MiniLM-L6-v2")
        except Exception as e:
            print(f"Warning: Could not load SentenceTransformer: {e}")

    def get_embeddings(self, texts, cache_key=None):
        if self.encoder is None:
            raise RuntimeError("SentenceTransformer encoder is not loaded.")
        
        cache_path = os.path.join(EMBEDDING_CACHE_DIR, f"{cache_key}.npy") if cache_key else None
        if cache_path and os.path.exists(cache_path):
            return np.load(cache_path)
        
        embeddings = self.encoder.encode(texts, batch_size=64, show_progress_bar=False, convert_to_numpy=True)
        if cache_path:
            np.save(cache_path, embeddings)
        return embeddings

    def build_model_a(self):
        # FeatureUnion combining word n-grams (1-2) and char_wb n-grams (2-5)
        word_vec = TfidfVectorizer(ngram_range=(1, 2), max_features=50000, sublinear_tf=True, analyzer='word')
        char_vec = TfidfVectorizer(ngram_range=(2, 5), max_features=50000, sublinear_tf=True, analyzer='char_wb')
        union = FeatureUnion([("word", word_vec), ("char", char_vec)])
        
        lr = LogisticRegression(class_weight="balanced", max_iter=1000, n_jobs=4)
        calibrated = CalibratedClassifierCV(estimator=lr, cv=5, method="sigmoid")
        return union, calibrated

    def explain_model_a(self, text, vectorizer, classifier):
        """Returns top 5 words/features that pushed the score (coefficient x tfidf value)."""
        try:
            transformed = vectorizer.transform([text])
            feature_names = vectorizer.get_feature_names_out()
            base_estimator = classifier.calibrated_classifiers_[0].estimator
            coefs = base_estimator.coef_[0]
            
            scores = []
            coo = transformed.tocoo()
            for idx, val in zip(coo.col, coo.data):
                score = coefs[idx] * val
                scores.append((feature_names[idx], score))
            
            scores.sort(key=lambda x: x[1], reverse=True)
            return [{"feature": f, "contribution": float(s)} for f, s in scores[:5]]
        except Exception:
            return []

    def save_models(self, task_name, pipe_a, lr_b, vectorizer_a):
        today = datetime.now().strftime("%Y-%m-%d")
        payload_a = {
            "vectorizer": vectorizer_a,
            "classifier": pipe_a,
            "version": self.version,
            "trained_date": today
        }
        payload_b = {
            "classifier": lr_b,
            "version": self.version,
            "trained_date": today
        }
        joblib.dump(payload_a, os.path.join(MODELS_DIR, f"{task_name}_model_a.joblib"))
        joblib.dump(payload_b, os.path.join(MODELS_DIR, f"{task_name}_model_b.joblib"))
        print(f"Saved {task_name} models successfully to {MODELS_DIR}")

    def load_models(self, task_name):
        try:
            path_a = os.path.join(MODELS_DIR, f"{task_name}_model_a.joblib")
            path_b = os.path.join(MODELS_DIR, f"{task_name}_model_b.joblib")
            if os.path.exists(path_a) and os.path.exists(path_b):
                return joblib.load(path_a), joblib.load(path_b)
        except Exception as e:
            print(f"Error loading models for {task_name}: {e}")
        return None, None