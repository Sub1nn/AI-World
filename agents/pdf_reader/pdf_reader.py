# app.py
import os, tempfile, streamlit as st
from dotenv import load_dotenv
from PyPDF2 import PdfReader
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_community.embeddings import HuggingFaceEmbeddings
from langchain_community.vectorstores import FAISS
from langchain.chains import RetrievalQA
from langchain_groq import ChatGroq

load_dotenv()

# ----------------- Helper: build / cache vectorstore -----------------
@st.cache_resource(show_spinner=False)
def build_vectorstore(pdf_files):
    """Reads PDFs → splits → embeds → returns FAISS index."""
    text = ""
    for pdf in pdf_files:
        reader = PdfReader(pdf)
        for p in reader.pages:
            text += p.extract_text() or ""
    splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=100)
    chunks = splitter.split_text(text)
    print("Total chunks:", len(chunks))
    embeddings = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")
    return FAISS.from_texts(chunks, embeddings)

# ----------------- Helper: build QA chain -----------------
def build_qa_chain(store):
    llm = ChatGroq(
        model="llama3-70b-8192",
        temperature=0.7,
        groq_api_key=os.getenv("GROQ_API_KEY"),
    )
    return RetrievalQA.from_chain_type(
        llm=llm,
        retriever=store.as_retriever(search_kwargs={"k": 4}),
        return_source_documents=False,
    )

# ----------------- Streamlit UI -----------------
st.set_page_config(page_title="Chat-with-PDF", page_icon="📄")
st.title("📄 Chat with your PDF")

# --- Step 1: Upload PDF(s) ---
uploaded_files = st.file_uploader(
    "Upload one or more PDFs",
    type="pdf",
    accept_multiple_files=True,
    key="pdf_uploader",
)

if st.button("Index PDF(s)") and uploaded_files:
    with st.spinner("📚 Indexing document(s)..."):
        vs = build_vectorstore(uploaded_files)
        st.session_state.vs = vs
        st.session_state.qa = build_qa_chain(vs)
        st.success("✅ Ready! Ask me anything about the uploaded PDFs.")

# --- Step 2: Chat area (only appears after indexing) ---
if "qa" not in st.session_state:
    st.info("👆 Upload PDF(s) and click **Index PDF(s)** first.")
    st.stop()

# Show previous messages
if "messages" not in st.session_state:
    st.session_state.messages = []

for msg in st.session_state.messages:
    st.chat_message(msg["role"]).write(msg["content"])

# Prompt box
if prompt := st.chat_input("Ask something about the PDF..."):
    st.session_state.messages.append({"role": "user", "content": prompt})
    st.chat_message("user").write(prompt)

    with st.spinner("🤖 Thinking..."):
        answer = st.session_state.qa.invoke(prompt)["result"]
        st.session_state.messages.append({"role": "assistant", "content": answer})
        st.chat_message("assistant").write(answer)