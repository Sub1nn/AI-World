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
# Chat History: List of dictionaries {'role': 'user'/'bot', 'content': '...'}
if "chat_history" not in st.session_state:
    st.session_state.chat_history = []

if "flashcards" not in st.session_state:
    st.session_state.flashcards = []
if "current_flashcard_index" not in st.session_state:
    st.session_state.current_flashcard_index = 0
if "show_flashcards" not in st.session_state:
    st.session_state.show_flashcards = False # Controls flashcard visibility

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
        st.session_state.show_flashcards = False
        st.session_state.last_query = ""
        st.session_state.last_answer = ""
        st.rerun() # Use st.rerun() for Streamlit >= 1.33.0, otherwise st.experimental_rerun()


# --- Main Application UI ---
st.title("🎓 Student RAG Agent")
st.write('This is a smart RAG agent that uses Groq and Pinecone to answer questions based on uploaded documents.')


# --- Chat History Display ---
st.subheader("💬 Conversation")

# Create a container for the chat history with a border and scroll
with st.container(border=True):
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
                # Use st.chat_message for a standard look, or st.info/warning for distinct colors
                with st.chat_message("user"):
                    st.markdown(f"**You:** {message['content']}")
            else: # role == "bot"
                with st.chat_message("assistant"):
                    st.markdown(f"**Bot:** {message['content']}")
    else:
        st.info("No messages yet. Start the conversation by asking a question!")


# --- Query Input Section ---
st.subheader("❓ Your Question")
# Use form to handle Enter key submission
with st.form(key='query_form', clear_on_submit=True):
    user_query = st.text_input("Enter your query:", placeholder="Ask me anything about the documents...", label_visibility='collapsed')
    submit_button = st.form_submit_button("🔍 Submit")


# --- Processing Query ---
if submit_button and user_query:
    st.session_state.last_query = user_query
    # Add user message to history immediately
    st.session_state.chat_history.append({"role": "user", "content": user_query})

    with st.spinner("🔍 Searching documents and generating response..."):
        try:
            vector = embed_text(user_query)
            if vector is None:
                 st.error("Failed to embed the query.")
                 # Remove the last user message if embedding failed
                 if st.session_state.chat_history and st.session_state.chat_history[-1]["role"] == "user":
                     st.session_state.chat_history.pop()
            else:
                query_response = vector_index.query(vector=vector, top_k=5, include_metadata=True)
                similar_docs = ''
                for match in query_response['matches']:
                    text = match['metadata']['text']
                    similar_docs += 'Document: ' + text[:200] + '...\n' # Limit context size

                user_context = {
                    'role': 'user',
                    'content': 'Context: ' + similar_docs + '\nQuestion: ' + user_query
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

                # Add bot response to history
                st.session_state.chat_history.append({"role": "bot", "content": llm_answer})

                # --- Auto-generate Flashcards ---
                if len(llm_answer) > 150:
                    with st.spinner("📚 Creating flashcards..."):
                        flashcard_prompt = f"""
                        Based on the question and answer, create 2-3 educational flashcards.
                        Each flashcard: clear front (concept/question), detailed back (explanation).
                        JSON format: [{{"front": "...", "back": "..."}}]
                        Question: {user_query}
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
                                # Flashcards are generated, show them by default
                                st.session_state.show_flashcards = True
                        except Exception:
                            pass # Silently fail flashcard generation

        except Exception as e:
            st.error(f"An error occurred: {str(e)}")
            # Remove the last user message if processing failed
            if st.session_state.chat_history and st.session_state.chat_history[-1]["role"] == "user":
                st.session_state.chat_history.pop()


# --- Flashcard Section ---
# Controlled by st.session_state.show_flashcards
if st.session_state.flashcards and st.session_state.show_flashcards:
    st.markdown("---")
    st.subheader("📖 Flashcards")

    col1, col2, col3, col4 = st.columns([1, 2, 2, 1])
    with col1:
        if st.button("◀ Previous") and st.session_state.current_flashcard_index > 0:
            st.session_state.current_flashcard_index -= 1
    with col2:
        st.caption(f"Card {st.session_state.current_flashcard_index + 1} of {len(st.session_state.flashcards)}")
    with col3:
        if st.button("Mark as Learned"):
            st.success("✅ Marked as learned!", icon="✅")
    with col4:
        if st.button("Next ▶") and st.session_state.current_flashcard_index < len(st.session_state.flashcards) - 1:
            st.session_state.current_flashcard_index += 1

    if st.session_state.flashcards:
        current_card = st.session_state.flashcards[st.session_state.current_flashcard_index]
        # Simplified flashcard display using standard Streamlit elements
        st.markdown(f"**Q:** {current_card['front']}")
        with st.expander("Show Answer"):
            st.markdown(f"**A:** {current_card['back']}")

        progress = (st.session_state.current_flashcard_index + 1) / len(st.session_state.flashcards)
        st.progress(progress)

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
                st.session_state.show_flashcards = False # Hide flashcards
                st.rerun()

# --- Show Flashcards Button (if hidden) ---
if st.session_state.flashcards and not st.session_state.show_flashcards:
    st.markdown("---")
    if st.button("▶ Show Flashcards"):
        st.session_state.show_flashcards = True
        st.rerun()
