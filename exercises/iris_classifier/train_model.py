
import os
from pathlib import Path
from sklearn.datasets import load_iris
from sklearn.model_selection import train_test_split
from sklearn.neighbors import KNeighborsClassifier
from sklearn.metrics import accuracy_score
import joblib

# -------------------------------------------------
# 1. Load data
# -------------------------------------------------
iris = load_iris()
X, y = iris.data, iris.target

# -------------------------------------------------
# 2. Train / test split
# -------------------------------------------------
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42, stratify=y
)

# -------------------------------------------------
# 3. Train model
# -------------------------------------------------
knn = KNeighborsClassifier(n_neighbors=3)
knn.fit(X_train, y_train)

# -------------------------------------------------
# 4. Evaluate quickly
# -------------------------------------------------
pred = knn.predict(X_test)
acc = accuracy_score(y_test, pred)
print(f"Validation accuracy: {acc:.3f}")

# -------------------------------------------------
# 5. Persist model
# -------------------------------------------------
model_dir = Path(__file__).parent / "model"
model_dir.mkdir(exist_ok=True)

model_path = model_dir / "iris_knn_model.joblib"
joblib.dump(knn, model_path)

print(f"Model saved → {model_path.resolve()}")