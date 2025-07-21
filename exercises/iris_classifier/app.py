"""
Streamlit Iris Flower Classifier
"""
import streamlit as st
import joblib
from sklearn.datasets import load_iris
import numpy as np

iris = load_iris()

st.set_page_config(page_title="Iris Classifier", page_icon="🌸")
st.title("🌸 Iris Flower Classifier")

with st.form("iris_form"):
    col1, col2 = st.columns(2)
    with col1:
        sepal_length = st.number_input("Sepal length (cm)", 0.0, 20.0, 5.8, 0.1)
        sepal_width  = st.number_input("Sepal width  (cm)", 0.0, 20.0, 3.0, 0.1)
    with col2:
        petal_length = st.number_input("Petal length (cm)", 0.0, 20.0, 4.3, 0.1)
        petal_width  = st.number_input("Petal width  (cm)", 0.0, 20.0, 1.3, 0.1)

    submitted = st.form_submit_button("Predict", use_container_width=True)

if submitted:
    try:
        model = joblib.load("./model/iris_knn_model.joblib")
        sample = np.array([[sepal_length, sepal_width, petal_length, petal_width]])
        pred_class = model.predict(sample)[0]
        flower_name = iris.target_names[pred_class]

        st.success(f"Predicted flower: **{flower_name.title()}** 🌼")

    except FileNotFoundError:
        st.error("Model not found. Run `python train_model.py` first.")