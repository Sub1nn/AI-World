"""
Streamlit BMI Calculator (Assignment 1)

- Input: weight (kg) and height (feet)
- Output: BMI value and status category
"""

import streamlit as st

# ---------------------------
# Helper: convert feet → metres
# ---------------------------
def feet_to_metres(feet: float) -> float:
    return feet / 3.28084

# ---------------------------
# Helper: BMI → category & color
# ---------------------------
def bmi_category(bmi: float):
    if bmi < 16:
        return "Extremely Underweight", "❌", "error"
    elif bmi < 18.5:
        return "Underweight", "⚠️", "warning"
    elif bmi < 25:
        return "Healthy", "✅", "success"
    elif bmi < 30:
        return "Overweight", "ℹ️", "info"
    else:
        return "Extremely Overweight", "❌", "error"

# ---------------------------
# Streamlit UI
# ---------------------------
st.set_page_config(
    page_title="BMI Calculator",
    page_icon="📊",
    layout="centered"
)

st.title("📊 Body-Mass Index (BMI) Calculator")

with st.form("bmi_form"): # Form to collect weight and height
    # Destructuring columns to col1 and col2
    col1, col2 = st.columns(2)
    with col1:
        weight = st.number_input("Weight (kg)", min_value=1.0, step=0.1)
    with col2:
        height_feet = st.number_input("Height (feet)", min_value=0.1, step=0.01)

    submitted = st.form_submit_button("Calculate BMI", use_container_width=True)

if submitted:
    height_m = feet_to_metres(height_feet)
    bmi = weight / (height_m ** 2)

    label, icon, color = bmi_category(bmi)

    st.metric(label=f"{icon} Your BMI", value=f"{bmi:.2f}")
    st.markdown(
        f"""
        **Category:** <span style='color:{color}; font-size:1.3em; font-weight:bold'>
        {label}
        </span>
        """,
        unsafe_allow_html=True
    )