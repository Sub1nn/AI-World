from groq import Groq
from create_vectorsV3 import pinecone_client, vector_index, embed_text
import streamlit as st
import os
from dotenv import load_dotenv

load_dotenv()
groq_client = Groq(api_key=os.getenv("GROQ_API_KEY"))

st.title("Student RAG Agent")
st.write('This is a simple RAG agent that uses Groq and Pinecone to answer questions based on uploaded documents.')

system_prompt = '''You are a helpful assistant that answers questions based on the provided context. If no context is available, answer from your own knowledge.
'''
system_context = {
        'role': 'system',
        'content': system_prompt
    }

user_query = st.text_input("Enter your query:")
submit_button = st.button("Submit")

if submit_button:
    vector = embed_text(user_query)
    query_response = vector_index.query(vector = vector, top_k=5, include_metadata=True)

    similar_docs = ''
    for match in query_response['matches']:
        text = match['metadata']['text']
        similar_docs += 'Document from context: ' + text + '\n\n'
    
    print("Similar documents found:")
    print(similar_docs)

    user_context = {
        'role': 'user',
        'content': 'Following is the knowledge base for your context :' + similar_docs + '\n' + user_query
    }

    print("User context:")
    print(user_context)

    llm_response = groq_client.chat.completions.create(
        model="llama3-70b-8192",
        messages=[system_context, user_context],
        temperature=0.7,
        max_tokens=512,
        top_p=0.9,
        frequency_penalty=0.0,
        presence_penalty=0.0,
        stop=None
    )
    llm_answer = llm_response.choices[0].message.content.strip()
    st.write("LLM Answer:", llm_answer)