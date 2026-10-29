import os
from typing import Dict, Any, Tuple
import joblib
import numpy as np

MODEL_PATH = os.path.join(os.path.dirname(__file__), "delay_model.joblib")

class DelayRiskPredictor:
    """
    ML-Powered Delay Risk Prediction Module.
    Predicts probability of an application breaching its SLA deadlines.
    """

    _model = None

    @classmethod
    def get_model(cls):
        if cls._model is None and os.path.exists(MODEL_PATH):
            try:
                cls._model = joblib.load(MODEL_PATH)
            except Exception:
                cls._model = None
        return cls._model

    @classmethod
    def predict_risk(cls, features: Dict[str, Any]) -> Tuple[float, str, list]:
        """
        Features dict:
        - days_in_stage: float
        - sla_days_allowed: float
        - open_deficiencies_count: int
        - total_documents_uploaded: int
        - verified_documents_count: int
        - officer_active_applications_count: int
        - evc_scheduled: bool
        - stage_order: int
        """
        days_in_stage = float(features.get("days_in_stage", 0.0))
        sla_days_allowed = max(float(features.get("sla_days_allowed", 5.0)), 1.0)
        open_deficiencies = int(features.get("open_deficiencies_count", 0))
        total_docs = max(int(features.get("total_documents_uploaded", 1)), 1)
        verified_docs = int(features.get("verified_documents_count", 0))
        officer_load = int(features.get("officer_active_applications_count", 0))
        evc_scheduled = 1.0 if features.get("evc_scheduled") else 0.0
        stage_order = int(features.get("stage_order", 1))

        sla_ratio_consumed = days_in_stage / sla_days_allowed
        doc_verification_rate = verified_docs / total_docs

        model = cls.get_model()
        risk_score = 0.15

        if model:
            try:
                feature_vector = np.array([[
                    days_in_stage,
                    sla_ratio_consumed,
                    open_deficiencies,
                    doc_verification_rate,
                    officer_load,
                    evc_scheduled,
                    stage_order
                ]])
                proba = model.predict_proba(feature_vector)[0][1] # Probability of delay
                risk_score = float(proba)
            except Exception:
                risk_score = cls._rule_based_fallback(sla_ratio_consumed, open_deficiencies, officer_load, doc_verification_rate)
        else:
            risk_score = cls._rule_based_fallback(sla_ratio_consumed, open_deficiencies, officer_load, doc_verification_rate)

        # Classify label
        if risk_score >= 0.70:
            label = "HIGH"
        elif risk_score >= 0.40:
            label = "MEDIUM"
        else:
            label = "LOW"

        # Explain top contributing factors
        factors = []
        if sla_ratio_consumed > 0.8:
            factors.append(f"SLA time consumed ({int(sla_ratio_consumed * 100)}%)")
        if open_deficiencies > 0:
            factors.append(f"{open_deficiencies} unresolved deficiencies")
        if doc_verification_rate < 0.5:
            factors.append(f"Low document verification rate ({int(doc_verification_rate * 100)}%)")
        if officer_load > 10:
            factors.append(f"Officer high backlog ({officer_load} open files)")
        if not factors:
            factors.append("Normal processing pace")

        return round(risk_score, 2), label, factors

    @staticmethod
    def _rule_based_fallback(sla_ratio: float, deficiencies: int, officer_load: int, doc_rate: float) -> float:
        """Deterministic heuristic fallback when ML model artifact is not loaded."""
        score = 0.1
        score += min(sla_ratio * 0.45, 0.50)
        score += min(deficiencies * 0.15, 0.30)
        if officer_load > 8:
            score += 0.10
        if doc_rate < 0.5:
            score += 0.10
        return min(max(score, 0.05), 0.98)

