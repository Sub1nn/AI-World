from groq import Groq
from create_vectorsV4 import pinecone_client, vector_index, embed_text, extract_text_from_uploaded_pdf
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
    st.session_state.chat_history = []

if "flashcards" not in st.session_state:
    st.session_state.flashcards = []
if "current_flashcard_index" not in st.session_state:
    st.session_state.current_flashcard_index = 0
if "show_flashcards" not in st.session_state:
    st.session_state.show_flashcards = False

if "last_query" not in st.session_state:
    st.session_state.last_query = ""
if "last_answer" not in st.session_state:
    st.session_state.last_answer = ""

if "uploaded_pdfs" not in st.session_state:
    st.session_state.uploaded_pdfs = []
if "pdf_texts" not in st.session_state:
    st.session_state.pdf_texts = {}

if "pdf_upload_key" not in st.session_state:
    st.session_state.pdf_upload_key = "initial_key"

# --- System Prompt ---
system_prompt = '''You are a helpful assistant that answers questions based on the provided context.
If PDF context is available, prioritize it. Then, use the document database context if relevant.
If no specific context is available, answer from your own knowledge.
Provide clear, concise, and educational answers.'''
system_context = {'role': 'system', 'content': system_prompt}

# --- Sidebar ---
with st.sidebar:
    st.header("📁 Chat with PDF")
    uploaded_files = st.file_uploader(
        "Upload a PDF file", 
        type="pdf", 
        accept_multiple_files=True, 
        key=st.session_state.pdf_upload_key
    )

    if uploaded_files:
        for uploaded_pdf in uploaded_files:
            if uploaded_pdf.name not in [pdf.name for pdf in st.session_state.uploaded_pdfs]:
                st.session_state.uploaded_pdfs.append(uploaded_pdf)
                with st.spinner(f"Extracting text from {uploaded_pdf.name}..."):
                    pdf_text = extract_text_from_uploaded_pdf(uploaded_pdf)
                    if pdf_text:
                        st.session_state.pdf_texts[uploaded_pdf.name] = pdf_text
                        st.success(f"✅ PDF '{uploaded_pdf.name}' uploaded and text extracted!")
                    else:
                        st.session_state.uploaded_pdfs.pop()
                        st.error(f"❌ Failed to extract text from {uploaded_pdf.name}. Please try another file.")

    if st.session_state.uploaded_pdfs:
        st.write("**Loaded PDFs:**")
        for pdf in st.session_state.uploaded_pdfs:
            st.markdown(f"- {pdf.name}")
        if st.button("🗑️ Clear All PDFs"):
            st.session_state.uploaded_pdfs = []
            st.session_state.pdf_texts = {}
            st.session_state.pdf_upload_key = str(datetime.now())
            st.rerun()

    st.markdown("---")
    st.header("📚 Flashcard Options")
    if st.button("🔄 Generate Flashcards for Last Answer") and st.session_state.last_answer:
        if len(st.session_state.last_answer.strip()) < 500:
            st.warning("⚠️ Last answer is too short to generate meaningful flashcards. Try a more detailed question.", icon="⚠️")
        else:
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
            st.write("**Last Answer Length:**", len(st.session_state.last_answer))
            st.write("**Flashcards Count:**", len(st.session_state.flashcards))
            st.write("**PDFs Loaded:**", len(st.session_state.uploaded_pdfs))

    if st.button("🗑️ Clear Entire Chat History"):
        st.session_state.chat_history = []
        st.session_state.flashcards = []
        st.session_state.current_flashcard_index = 0
        st.session_state.show_flashcards = False
        st.session_state.last_query = ""
        st.session_state.last_answer = ""
        st.rerun()


# --- Main Application UI ---
st.title("🎓 Query-Bot")
st.write('This is a smart RAG agent that uses Groq, Pinecone, and PDFs to answer questions.')

st.subheader("💬 Conversation")
chat_container = st.container(border=True)
with chat_container:
    if st.session_state.chat_history:
        for message in st.session_state.chat_history:
            if message["role"] == "user":
                with st.chat_message("user"):
                    st.markdown(message['content'])
            else:
                with st.chat_message("assistant"):
                    st.markdown(message['content'])
    else:
        st.info("No messages yet. Start the conversation by asking a question!")

    if st.session_state.flashcards and st.session_state.show_flashcards:
        st.markdown("---")
        st.subheader("📖 Flashcards")
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
        progress = (st.session_state.current_flashcard_index + 1) / len(st.session_state.flashcards)
        st.progress(progress)

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
                st.session_state.show_flashcards = False
                st.rerun()

# --- Flashcard Toggle ---
if st.session_state.flashcards:
    toggle_label = "📖 Hide Flashcards" if st.session_state.show_flashcards else "📖 Show Flashcards"
    if st.button(toggle_label, key="toggle_flashcards_main", help="Toggle flashcard visibility"):
        if not st.session_state.show_flashcards:
            # Trying to show flashcards now
            if len(st.session_state.last_answer.strip()) < 500 and not st.session_state.flashcards:
                st.warning("⚠️ Not enough text in the last answer to generate flashcards. Try asking a more detailed question.", icon="⚠️")
            else:
                st.session_state.show_flashcards = True
        else:
            # Hiding flashcards
            st.session_state.show_flashcards = False
        st.rerun()
elif st.session_state.last_answer and len(st.session_state.last_answer.strip()) < 500:
    # If no flashcards and last answer short but flashcards not requested to show, do nothing (no warning)
    pass


# --- Query Input Section ---
st.subheader("❓ Your Question")
with st.form(key='query_form', clear_on_submit=True):
    user_query = st.text_input("Enter your query:", placeholder="Ask me something...", label_visibility='collapsed')
    submit_button = st.form_submit_button("🔍 Submit")

if submit_button and user_query:
    query_to_process = user_query.strip()
    if query_to_process:
        st.session_state.last_query = query_to_process
        st.session_state.chat_history.append({"role": "user", "content": query_to_process})

        with st.spinner("🔍 Searching context (PDF & Documents) and generating response..."):
            try:
                vector = embed_text(query_to_process)
                if vector is None:
                    st.error("Failed to embed the query.")
                    st.session_state.chat_history.pop()
                else:
                    combined_context_parts = []

                    for pdf_name, pdf_text in st.session_state.pdf_texts.items():
                        combined_context_parts.append(f"Relevant PDF Content from '{pdf_name}':\n{pdf_text}")

                    query_response = vector_index.query(vector=vector, top_k=5, include_metadata=True)
                    similar_docs = ''
                    for match in query_response['matches']:
                        text = match['metadata']['text']
                        similar_docs += 'Document Context: ' + text[:200] + '...\n'
                    if similar_docs:
                        combined_context_parts.append(f"Document Database Context:\n{similar_docs}")

                    combined_context = "\n\n".join(combined_context_parts)
                    if not combined_context:
                        combined_context = "No specific context found in PDFs or document database."

                    user_context = {
                        'role': 'user',
                        'content': f'Context:\n{combined_context}\n\nQuestion: {query_to_process}'
                    }

                    llm_response = groq_client.chat.completions.create(
                        model="llama3-70b-8192",
                        messages=[system_context, user_context],
                        temperature=0.7,
                        max_tokens=512
                    )
                    llm_answer = llm_response.choices[0].message.content.strip()
                    st.session_state.last_answer = llm_answer
                    st.session_state.chat_history.append({"role": "bot", "content": llm_answer})

                    # AUTO-GENERATE FLASHCARDS ONLY IF ANSWER IS LONG ENOUGH
                    if len(llm_answer.strip()) >= 500:
                        with st.spinner("📚 Creating flashcards..."):
                            flashcard_prompt = f"""
                            Based on the question and answer, create 2-3 educational flashcards.
                            Format: [{{"front": "...", "back": "..."}}]
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
                            except Exception:
                                pass
                    else:
                        # Clear flashcards if answer too short
                        st.session_state.flashcards = []
                        st.session_state.current_flashcard_index = 0
                        st.session_state.show_flashcards = False

            except Exception as e:
                st.error(f"An error occurred: {str(e)}")
                st.session_state.chat_history.pop()
        st.rerun()
