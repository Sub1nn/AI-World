import streamlit as st
import numpy as np
import joblib

st.title("🩺 Diabetes Prediction App")

# Load model
@st.cache_data
def load_model():
    return joblib.load('/Users/subin/Documents/AI-Python/regression/diabetic_prediction_app/diabetes_model.joblib')

model_data = load_model()
model = model_data['model']
scaler = model_data['scaler']
accuracy = model_data['accuracy']

st.sidebar.info(f"Model Accuracy: {accuracy:.1%}")

# Input form
st.header("Enter Health Information")

col1, col2 = st.columns(2)

with col1:
    glucose = st.number_input("Glucose Level", 50, 300, 100)
    bmi = st.number_input("BMI", 15.0, 50.0, 25.0)

with col2:
    age = st.number_input("Age", 18, 100, 35)
    hba1c = st.number_input("HbA1c (%)", 4.0, 15.0, 5.5)

# Predict
if st.button("Predict"):
    # Use median values for other features (simplified approach)
    input_data = np.array([[
        age, 1, bmi, glucose, 80, hba1c, 100, 50, 150, 85, 100, 0.85, 0, 1, 0, 0
    ]])
    
    # Scale and predict
    input_scaled = scaler.transform(input_data)
    prediction = model.predict(input_scaled)[0]
    probability = model.predict_proba(input_scaled)[0][1]
    
    # Results
    if probability >= 0.7:
        st.error(f"🚨 HIGH RISK - {probability:.1%} chance of diabetes")
        st.warning("**Recommendation:** Please consult a doctor immediately for comprehensive diabetes screening and treatment plan.")
    elif probability >= 0.3:
        st.warning(f"⚠️ MODERATE RISK - {probability:.1%} chance of diabetes")
        st.info("**Recommendation:** Schedule a check-up with your healthcare provider and consider lifestyle modifications.")
    else:
        st.success(f"✅ LOW RISK - {probability:.1%} chance of diabetes")
        st.info("**Recommendation:** Maintain healthy habits with regular exercise and balanced diet.")
    
    st.progress(probability)