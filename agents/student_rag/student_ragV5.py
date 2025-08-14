# student_ragV7.py
from groq import Groq
from create_vectorsV3 import pinecone_client, vector_index, embed_text # Adjust import if needed
import streamlit as st
import os
import json
import re
from dotenv import load_dotenv
from datetime import datetime

load_dotenv()
groq_client = Groq(api_key=os.getenv("GROQ_API_KEY"))

# --- Session State Initialization ---
if "chat_history" not in st.session_state:
    st.session_state.chat_history = [] # Stores dictionaries: {'role': 'user'/'bot', 'content': '...'}

if "flashcards" not in st.session_state:
    st.session_state.flashcards = []
if "current_flashcard_index" not in st.session_state:
    st.session_state.current_flashcard_index = 0
# --- Crucial: Control flashcard visibility ---
if "show_flashcards" not in st.session_state:
    st.session_state.show_flashcards = False # Hidden by default

if "last_query" not in st.session_state:
    st.session_state.last_query = ""
if "last_answer" not in st.session_state:
    st.session_state.last_answer = ""

# --- System Prompt ---
system_prompt = '''You are a helpful assistant that answers questions based on the provided context. If no context is available, answer from your own knowledge. Provide clear, concise, and educational answers.'''
system_context = {'role': 'system', 'content': system_prompt}

# --- Sidebar ---
with st.sidebar:
    st.header("📚 Flashcard Options")
    st.caption("Flashcards are generated automatically for detailed answers")

    if st.button("🔄 Generate Flashcards for Last Answer") and st.session_state.last_answer:
        with st.spinner("Creating flashcards..."):
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
                json_match = re.search(r'\[[\s\S]*\]', flashcard_text)
                if json_match:
                    flashcards = json.loads(json_match.group())
                    st.session_state.flashcards = flashcards
                    st.session_state.current_flashcard_index = 0
                    # Reset visibility state when new flashcards are generated via sidebar
                    st.session_state.show_flashcards = False
                    st.success(f"✅ Generated {len(flashcards)} flashcards!")
                else:
                    st.error("Could not parse flashcards. Try again.")
            except Exception as e:
                st.error(f"Error generating flashcards: {str(e)}")

    if st.session_state.flashcards:
        flashcard_json = json.dumps(st.session_state.flashcards, indent=2)
        st.download_button(
            label="📥 Export Flashcards (JSON)",
            data=flashcard_json,
            file_name=f"flashcards_{datetime.now().strftime('%Y%m%d_%H%M')}.json",
            mime="application/json"
        )

    st.markdown("---")
    st.subheader("⚙️ Advanced Options")
    if st.button("📊 View Search Context"):
        with st.expander("Search Context Details"):
            st.write("**Last Query:**", st.session_state.last_query)
            st.write("**Last Answer Length:**", len(st.session_state.last_answer) if st.session_state.last_answer else 0)
            st.write("**Flashcards Count:**", len(st.session_state.flashcards))

    if st.button("🗑️ Clear Entire Chat History"):
        st.session_state.chat_history = []
        st.session_state.flashcards = []
        st.session_state.current_flashcard_index = 0
        st.session_state.show_flashcards = False # Also hide flashcards on clear
        st.session_state.last_query = ""
        st.session_state.last_answer = ""
        st.rerun() # Use st.rerun() for Streamlit >= 1.33.0, otherwise st.experimental_rerun()


# --- Main Application UI ---
st.title("🎓 Query-Bot")
st.write('This is a smart RAG agent that uses Groq and Pinecone to answer questions based on uploaded documents and llm knowledge.')


# --- Chat History Display ---
st.subheader("💬 Conversation")
# Create a container for the chat history with a border and scroll
chat_container = st.container(border=True)
with chat_container:
    chat_history_height = 400
    # Use st.container's internal styling or add custom CSS if needed
    st.markdown(f"""<style>
        div[data-testid="stVerticalBlockBorderWrapper"] > div[data-testid="stVerticalBlock"]:has(> div.element-container:first-child > div.stMarkdown > div > p:first-child)
        {{
            max-height: {chat_history_height}px;
            overflow-y: auto;
            padding: 10px;
        }}
        </style>""", unsafe_allow_html=True)

    if st.session_state.chat_history:
        for message in st.session_state.chat_history:
            if message["role"] == "user":
                with st.chat_message("user"):
                    st.markdown(message['content'])
            else: # role == "bot"
                with st.chat_message("assistant"):
                    st.markdown(message['content'])
    else:
        st.info("No messages yet. Start the conversation by asking a question!")

    # --- Flashcard Section (Conditionally Displayed Inside Scrollable Area) ---
    # This block is controlled by the 'show_flashcards' state variable
    # It will appear at the bottom of the chat history if shown.
    if st.session_state.flashcards and st.session_state.show_flashcards:
        st.markdown("---") # Visual separator
        st.subheader("📖 Flashcards")

        # --- Flashcard Navigation Controls ---
        nav_col1, nav_col2, nav_col3, nav_col4 = st.columns([1, 2, 2, 1])
        with nav_col1:
            if st.button("◀ Previous") and st.session_state.current_flashcard_index > 0:
                st.session_state.current_flashcard_index -= 1
                st.rerun()
        with nav_col2:
            st.caption(f"Card {st.session_state.current_flashcard_index + 1} of {len(st.session_state.flashcards)}")
        with nav_col3:
            if st.button("Mark as Learned"):
                st.success("✅ Marked as learned!", icon="✅")
        with nav_col4:
            if st.button("Next ▶") and st.session_state.current_flashcard_index < len(st.session_state.flashcards) - 1:
                st.session_state.current_flashcard_index += 1
                st.rerun()

        # --- Display Current Flashcard ---
        if st.session_state.flashcards:
            current_card = st.session_state.flashcards[st.session_state.current_flashcard_index]
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

            # --- Progress Bar ---
            progress = (st.session_state.current_flashcard_index + 1) / len(st.session_state.flashcards)
            st.progress(progress)

            # --- Quick Action Buttons ---
            action_col1, action_col2 = st.columns(2)
            with action_col1:
                if st.button("🔄 Shuffle Flashcards"):
                    import random
                    random.shuffle(st.session_state.flashcards)
                    st.session_state.current_flashcard_index = 0
                    st.rerun()
            with action_col2:
                if st.button("🗑️ Clear Flashcards", key='clear_flashcards_main'):
                    st.session_state.flashcards = []
                    st.session_state.current_flashcard_index = 0
                    # Crucial: Hide the flashcard section after clearing
                    st.session_state.show_flashcards = False
                    st.rerun()

# --- Flashcard Toggle Button (Outside and Below Chat Container) ---
# This button is now placed statically below the scrollable chat container.
# It appears if flashcards exist (generated or loaded) and is left-aligned.
if st.session_state.flashcards:
    # Use st.container for layout control, but don't apply border here.
    # Place the button directly after the chat container.
    toggle_label = "📖 Hide Flashcards" if st.session_state.show_flashcards else "📖 Show Flashcards"
    # st.button without columns will be left-aligned by default in Streamlit's flow.
    # Adding a small margin/padding might be needed depending on exact look desired.
    if st.button(toggle_label, key="toggle_flashcards_main", help="Toggle flashcard visibility"):
        st.session_state.show_flashcards = not st.session_state.show_flashcards
        st.rerun()


# --- Query Input Section ---
st.subheader("❓ Your Question")
with st.form(key='query_form', clear_on_submit=True):
    user_query = st.text_input("Enter your query:", placeholder="Ask me something...", label_visibility='collapsed')
    submit_button = st.form_submit_button("🔍 Submit")


# --- Processing Query ---
if submit_button and user_query:
    query_to_process = user_query.strip()
    if query_to_process:
        st.session_state.last_query = query_to_process
        st.session_state.chat_history.append({"role": "user", "content": query_to_process})

        with st.spinner("🔍 Searching documents and generating response..."):
            try:
                vector = embed_text(query_to_process)
                if vector is None:
                     st.error("Failed to embed the query.")
                     if st.session_state.chat_history and st.session_state.chat_history[-1]["role"] == "user":
                         st.session_state.chat_history.pop()
                else:
                    query_response = vector_index.query(vector=vector, top_k=5, include_metadata=True)
                    similar_docs = ''
                    for match in query_response['matches']:
                        text = match['metadata']['text']
                        similar_docs += 'Document: ' + text[:200] + '...\n'

                    user_context = {
                        'role': 'user',
                        'content': 'Context: ' + similar_docs + '\nQuestion: ' + query_to_process
                    }

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

                    st.session_state.chat_history.append({"role": "bot", "content": llm_answer})

                    # --- Auto-generate Flashcards ---
                    if len(llm_answer) > 150:
                        with st.spinner("📚 Creating flashcards..."):
                            flashcard_prompt = f"""
                            Based on the question and answer, create 2-3 educational flashcards.
                            Each flashcard: clear front (concept/question), detailed back (explanation).
                            JSON format: [{{"front": "...", "back": "..."}}]
                            Question: {query_to_process}
                            Answer: {llm_answer}
                            Flashcards:
                            """
                            try:
                                flashcard_response = groq_client.chat.completions.create(
                                    model="llama3-70b-8192",
                                    messages=[
                                        {"role": "system", "content": "Flashcard creator. JSON only."},
                                        {"role": "user", "content": flashcard_prompt}
                                    ],
                                    temperature=0.3,
                                    max_tokens=800
                                )
                                flashcard_text = flashcard_response.choices[0].message.content.strip()
                                json_match = re.search(r'\[[\s\S]*\]', flashcard_text)
                                if json_match:
                                    flashcards = json.loads(json_match.group())
                                    st.session_state.flashcards = flashcards
                                    st.session_state.current_flashcard_index = 0
                                    # Flashcards are generated, but remain hidden by default.
                                    # st.session_state.show_flashcards = True # <-- Intentionally omitted
                            except Exception:
                                pass # Silently fail flashcard generation

            except Exception as e:
                st.error(f"An error occurred: {str(e)}")
                if st.session_state.chat_history and st.session_state.chat_history[-1]["role"] == "user":
                    st.session_state.chat_history.pop()

        st.rerun()
