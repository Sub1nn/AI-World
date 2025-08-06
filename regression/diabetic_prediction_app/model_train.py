import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.linear_model import LogisticRegression
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import accuracy_score
import joblib
import os

# Load dataset
df = pd.read_csv('/Users/subin/Documents/AI-Python/datasets/diabetes_dataset.csv')
print(f"Dataset loaded: {df.shape}")

# Split features and target
X = df.drop('Outcome', axis=1)
y = df['Outcome']

# Train-test split
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

# Scale features
scaler = StandardScaler()
X_train_scaled = scaler.fit_transform(X_train)
X_test_scaled = scaler.transform(X_test)

# Train model
model = LogisticRegression(random_state=42)
model.fit(X_train_scaled, y_train)

# Test accuracy
y_pred = model.predict(X_test_scaled)
accuracy = accuracy_score(y_test, y_pred)
print(f"Model Accuracy: {accuracy:.2%}")

# Save model to specific directory
save_path = '/Users/subin/Documents/AI-Python/regression/diabetic_prediction_app/diabetes_model.joblib'
print(f"Saving model to: {save_path}")

joblib.dump({'model': model, 'scaler': scaler, 'accuracy': accuracy}, save_path)

# Check if file was created
if os.path.exists(save_path):
    print("✅ Model saved successfully!")
    print(f"File size: {os.path.getsize(save_path)} bytes")
else:
    print("❌ Model file not created!")