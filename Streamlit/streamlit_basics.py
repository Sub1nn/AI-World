import streamlit as st

st.title('This is an streamlit application')
st.header('Hello I am a Header')
st.subheader('Hello I am subheader')
st.text('I am just some random text. I dont convery any information nor do i have an actual meaning. I am just here for fun. :)')
st.markdown("""
**This is a bold text**  
- *This is an italic text*  
- `This is a code snippet`
""")

st.success('Congratulations for creating your first streamlit app.')
st.warning('This is a warning message. Please concentrate.')
st.error('This is an error message. Something went wrong')
st.write(range(10)) # .write method lets us write python functions
st.write((lambda x : x + 2)(2)) # create a labbda function and call it directly
st.info('This is an information message.')

is_checked = st.checkbox("check me out!")
if is_checked:
    st.write("You have checked the box!")
else:
    st.write("You have not checked the box.")

gender = st.radio("choose your gender", ("Male", "Female", "other"))
if gender == "Male":
    st.write("You are Male.")
elif gender == "Female":
    st.write("You are Female.")
elif gender == "other":
    st.write("You are other.")

fav_fruit = st.selectbox('Select your favourite fruit', ['Apple', 'Banana', 'Mango', 'Orange'])

if fav_fruit == 'Apple':
    st.write('You selected Apple.')
elif fav_fruit == 'Banana':
    st.write('You selected Banana.')
elif fav_fruit == 'Mango':
    st.write('You selected Mango.')
elif fav_fruit == 'Orange':
    st.write('You selected Orange.')

st.write(f'Your favourite fruit is {fav_fruit}.')

hobbies = st.multiselect('Select your hobbies', ['Reading', 'Traveling', 'Cooking', 'Gaming'])
st.write('Your hobbies are:', ', '.join(hobbies))

age = st.slider('Select your age', 0, 100, 25, step=2)
st.write(f'Your age is {age}.')


def predict_diabetes(age, bmi):
    if age > 50 and bmi > 30:
        return "High risk of diabetes"
    elif age > 30 and bmi > 25:
        return "Moderate risk of diabetes"
    else:
        return "Low risk of diabetes"

age = st.number_input('Enter your age', min_value=0, max_value=120, value=30)
bmi = st.number_input('Enter your BMI', min_value=10.0, max_value=50.0, value=25.0, step=0.1)

btn = st.button('Predict Diabetes Risk')
if btn:   
    risk = predict_diabetes(age, bmi)
    st.write(f'Your diabetes risk is: {risk}')

petal_length = st.number_input('Enter petal length')
petal_width = st.number_input('Enter petal width')
sepal_length = st.number_input('Enter sepal length')
sepal_width = st.number_input('Enter sepal width')

name = st.text_input('Enter your name', 'Type Here...')
long_text = st.text_area('Enter a long text', 'Type Here...')

from PIL import Image
image = Image.open('streamlit_logo.png')
st.image(image, caption='Streamlit Logo', use_container_width=False)


st.title("🧓 Age Category Checker")

# Input age from user
age = st.number_input("Enter your age:", min_value=0, max_value=150, step=1)

# Display result based on age
if age < 18:
    st.warning("You are too young.")
elif 18 <= age <= 35:
    st.success("You are an adult.")
elif 36 <= age <= 60:
    st.info("You are mature.")
else:
    st.error("You are old.")
