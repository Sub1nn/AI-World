from groq import Groq
from create_vectorsV3 import pinecone_client, vector_index, embed_text
import streamlit as st
import os
import json
import re
from dotenv import load_dotenv
from datetime import datetime

load_dotenv()
groq_client = Groq(api_key=os.getenv("GROQ_API_KEY"))

# Initialize session state
if "flashcards" not in st.session_state:
    st.session_state.flashcards = []
if "current_flashcard_index" not in st.session_state:
    st.session_state.current_flashcard_index = 0
if "last_query" not in st.session_state:
    st.session_state.last_query = ""
if "last_answer" not in st.session_state:
    st.session_state.last_answer = ""

st.title("🎓 Student RAG Agent")
st.write('This is a smart RAG agent that uses Groq and Pinecone to answer questions based on uploaded documents.')

# Add custom CSS for flashcards
st.markdown("""
<style>
.flashcard {
    border: 2px solid #4CAF50;
    border-radius: 10px;
    padding: 20px;
    margin: 10px 0;
    background-color: #f9f9f9;
    box-shadow: 0 4px 8px rgba(0,0,0,0.1);
}
.flashcard-front {
    color: #333;
    font-weight: bold;
    font-size: 1.1em;
}
.flashcard-back {
    color: #666;
    margin-top: 10px;
}
.stButton>button {
    background-color: #4CAF50;
    color: white;
    border: none;
    padding: 10px 20px;
    text-align: center;
    text-decoration: none;
    display: inline-block;
    font-size: 16px;
    margin: 4px 2px;
    cursor: pointer;
    border-radius: 5px;
}
</style>
""", unsafe_allow_html=True)

system_prompt = '''You are a helpful assistant that answers questions based on the provided context. If no context is available, answer from your own knowledge. Provide clear, concise, and educational answers.
'''
system_context = {
        'role': 'system',
        'content': system_prompt
    }

# Sidebar
with st.sidebar:
    st.header("📚 Flashcard Options")
    st.caption("Flashcards will be generated automatically for detailed answers")
    
    if st.button("🔄 Generate Flashcards for Last Answer") and st.session_state.last_answer:
        with st.spinner("Creating flashcards..."):
            # Generate flashcards using LLM
            flashcard_prompt = f"""
            Based on the following question and answer, create 3-5 educational flashcards.
            Each flashcard should have a clear concept on the front and detailed explanation on the back.
            Format as JSON array of objects with 'front' and 'back' keys.
            
            Question: {st.session_state.last_query}
            Answer: {st.session_state.last_answer}
            
            Flashcards (JSON format):
            """
            
            try:
                flashcard_response = groq_client.chat.completions.create(
                    model="llama3-70b-8192",
                    messages=[
                        {"role": "system", "content": "You are a flashcard creator. Create educational flashcards in JSON format."},
                        {"role": "user", "content": flashcard_prompt}
                    ],
                    temperature=0.3,
                    max_tokens=1000
                )
                
                flashcard_text = flashcard_response.choices[0].message.content.strip()
                
                # Extract JSON from response
                json_match = re.search(r'\[[\s\S]*\]', flashcard_text)
                if json_match:
                    flashcards = json.loads(json_match.group())
                    st.session_state.flashcards = flashcards
                    st.session_state.current_flashcard_index = 0
                    st.success(f"✅ Generated {len(flashcards)} flashcards!")
                else:
                    st.error("Could not parse flashcards. Try again.")
            except Exception as e:
                st.error(f"Error generating flashcards: {str(e)}")
    
    # Export flashcards
    if st.session_state.flashcards:
        flashcard_json = json.dumps(st.session_state.flashcards, indent=2)
        st.download_button(
            label="📥 Export Flashcards (JSON)",
            data=flashcard_json,
            file_name=f"flashcards_{datetime.now().strftime('%Y%m%d_%H%M')}.json",
            mime="application/json"
        )

# Main query interface
user_query = st.text_input("Enter your query:", placeholder="Ask me anything about the documents...")
submit_button = st.button("🔍 Submit")

if submit_button and user_query:
    st.session_state.last_query = user_query
    
    with st.spinner("🔍 Searching documents..."):
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

    with st.spinner("🧠 Generating answer..."):
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
        st.session_state.last_answer = llm_answer
        
        # Display answer
        st.subheader("💬 Answer:")
        st.write(llm_answer)
        
        # Auto-generate flashcards for detailed answers
        if len(llm_answer) > 150:
            with st.spinner("📚 Creating flashcards..."):
                # Generate flashcards using LLM
                flashcard_prompt = f"""
                Based on the following question and answer, create 3-5 educational flashcards.
                Each flashcard should have a clear concept on the front and detailed explanation on the back.
                Format as JSON array of objects with 'front' and 'back' keys.
                
                Question: {user_query}
                Answer: {llm_answer}
                
                Flashcards (JSON format):
                """
                
                try:
                    flashcard_response = groq_client.chat.completions.create(
                        model="llama3-70b-8192",
                        messages=[
                            {"role": "system", "content": "You are a flashcard creator. Create educational flashcards in JSON format."},
                            {"role": "user", "content": flashcard_prompt}
                        ],
                        temperature=0.3,
                        max_tokens=1000
                    )
                    
                    flashcard_text = flashcard_response.choices[0].message.content.strip()
                    
                    # Extract JSON from response
                    json_match = re.search(r'\[[\s\S]*\]', flashcard_text)
                    if json_match:
                        flashcards = json.loads(json_match.group())
                        st.session_state.flashcards = flashcards
                        st.session_state.current_flashcard_index = 0
                        st.info(f"📚 {len(flashcards)} flashcards created! Scroll down to view.")
                except Exception as e:
                    st.warning("Could not auto-generate flashcards. Use the sidebar button to try again.")

# Flashcard section
if st.session_state.flashcards:
    st.markdown("---")
    st.header("📖 Flashcards")
    
    # Flashcard navigation
    col1, col2, col3, col4 = st.columns([1, 2, 2, 1])
    
    with col1:
        if st.button("◀ Previous") and st.session_state.current_flashcard_index > 0:
            st.session_state.current_flashcard_index -= 1
            
    with col2:
        st.caption(f"Card {st.session_state.current_flashcard_index + 1} of {len(st.session_state.flashcards)}")
        
    with col3:
        if st.button("Mark as Learned"):
            st.success("✅ Marked as learned!")
            
    with col4:
        if st.button("Next ▶") and st.session_state.current_flashcard_index < len(st.session_state.flashcards) - 1:
            st.session_state.current_flashcard_index += 1
    
    # Display current flashcard
    if st.session_state.flashcards:
        current_card = st.session_state.flashcards[st.session_state.current_flashcard_index]
        
        # Flashcard UI
        st.markdown(f"""
        <div class="flashcard">
            <div class="flashcard-front">
                <strong>Q:</strong> {current_card['front']}
            </div>
            <details>
                <summary style="color: #4CAF50; cursor: pointer; margin-top: 15px;"><strong>Show Answer</strong></summary>
                <div class="flashcard-back">
                    <strong>A:</strong> {current_card['back']}
                </div>
            </details>
        </div>
        """, unsafe_allow_html=True)
        
        # Progress bar
        progress = (st.session_state.current_flashcard_index + 1) / len(st.session_state.flashcards)
        st.progress(progress)
        
        # Quick actions
        col1, col2 = st.columns(2)
        with col1:
            if st.button("🔄 Shuffle Flashcards"):
                import random
                random.shuffle(st.session_state.flashcards)
                st.session_state.current_flashcard_index = 0
                st.rerun()
                
        with col2:
            if st.button("🗑️ Clear Flashcards"):
                st.session_state.flashcards = []
                st.session_state.current_flashcard_index = 0
                st.rerun()

# Additional features in sidebar
with st.sidebar:
    st.markdown("---")
    st.subheader("⚙️ Advanced Options")
    
    if st.button("📊 View Search Context"):
        with st.expander("Search Context Details"):
            st.write("Last query:", st.session_state.last_query)
            st.write("Last answer length:", len(st.session_state.last_answer) if st.session_state.last_answer else 0)
            st.write("Flashcards count:", len(st.session_state.flashcards))