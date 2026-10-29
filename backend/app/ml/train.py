import os
import joblib
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, precision_score, recall_score, roc_auc_score
from sklearn.model_selection import train_test_split

MODEL_PATH = os.path.join(os.path.dirname(__file__), "delay_model.joblib")

def generate_synthetic_training_data(n_samples: int = 2000):
    """Generates synthetic features and ground-truth delay outcomes."""
    np.random.seed(42)

    days_in_stage = np.random.uniform(0.5, 20.0, n_samples)
    sla_allowed = np.random.choice([3, 5, 7, 10, 15], n_samples)
    sla_ratio = days_in_stage / sla_allowed

    open_deficiencies = np.random.poisson(lam=1.0, size=n_samples)
    doc_verification_rate = np.random.beta(a=5, b=2, size=n_samples)
    officer_load = np.random.randint(1, 25, size=n_samples)
    evc_scheduled = np.random.binomial(n=1, p=0.3, size=n_samples)
    stage_order = np.random.randint(1, 7, size=n_samples)

    # Delay likelihood formula
    delay_prob = (
        0.45 * (sla_ratio > 0.9).astype(float) +
        0.25 * (open_deficiencies > 1).astype(float) +
        0.15 * (officer_load > 12).astype(float) +
        0.15 * (doc_verification_rate < 0.6).astype(float)
    )
    delay_prob = np.clip(delay_prob + np.random.normal(0, 0.1, n_samples), 0.0, 1.0)
    labels = (delay_prob > 0.5).astype(int)

    X = np.column_stack([
        days_in_stage,
        sla_ratio,
        open_deficiencies,
        doc_verification_rate,
        officer_load,
        evc_scheduled,
        stage_order
    ])
    return X, labels

def train_and_save_model():
    print("Generating synthetic application training data...")
    X, y = generate_synthetic_training_data()
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    print("Training Random Forest Delay Risk Classifier...")
    model = RandomForestClassifier(n_estimators=100, max_depth=6, random_state=42)
    model.fit(X_train, y_train)

    preds = model.predict(X_test)
    probs = model.predict_proba(X_test)[:, 1]

    acc = accuracy_score(y_test, preds)
    prec = precision_score(y_test, preds)
    rec = recall_score(y_test, preds)
    auc = roc_auc_score(y_test, probs)

    print(f"Model Metrics -> Accuracy: {acc:.3f}, Precision: {prec:.3f}, Recall: {rec:.3f}, ROC-AUC: {auc:.3f}")

    joblib.dump(model, MODEL_PATH)
    print(f"Model artifact saved to {MODEL_PATH}")
    return model

if __name__ == "__main__":
    train_and_save_model()

