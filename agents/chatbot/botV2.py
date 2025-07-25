# botV2.py
import os, pathlib, tempfile, shutil, streamlit as st
from langchain_chroma import Chroma
from langchain_community.document_loaders import PyPDFLoader
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_huggingface import HuggingFaceEmbeddings
from langchain.prompts import PromptTemplate
from langchain_core.runnables import RunnablePassthrough, RunnableLambda
from langchain_groq import ChatGroq
import subprocess
import sys
from dotenv import load_dotenv

load_dotenv()

# Absolute paths
RESUME_PDF = "./documents/resume_SubinKhatiwada.pdf"
CHROMA_DIR = os.path.join(os.path.dirname(__file__), "chroma_db")

# Build chroma_db if it doesn't exist
if not os.path.exists(CHROMA_DIR):
    st.info("🏗️ Building vector database...")
    try:
        subprocess.run([sys.executable, "vectorizor.py"], check=True)
        st.success("✅ Vector database built!")
    except subprocess.CalledProcessError as e:
        st.error(f"❌ Failed to build vector database: {e}")
        st.stop()

# Build / rebuild merged retrieve
@st.cache_resource(show_spinner=False)
def build_merged_retriever(new_pdf_bytes=None):
    embeddings = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")

    # resume
    resume_store = Chroma(
        persist_directory=str(CHROMA_DIR),
        embedding_function=embeddings,
        collection_name="resume",
    )
    docs = resume_store.similarity_search("dummy", k=1000)

    # uploaded PDF
    if new_pdf_bytes is not None:
        with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as f:
            f.write(new_pdf_bytes)
            temp_path = f.name
        loader = PyPDFLoader(temp_path)
        docs_extra = loader.load()
        os.remove(temp_path)
        text_splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=100)
        docs_extra = text_splitter.split_documents(docs_extra)
        docs.extend(docs_extra)

    # combined store
    return Chroma.from_documents(
        docs, embeddings, collection_name="combined"
    ).as_retriever(search_kwargs={"k": 6})

@st.cache_resource(show_spinner=False)
def build_chain(new_pdf_bytes=None):
    retriever = build_merged_retriever(new_pdf_bytes)
    
    # Get API key from environment or Streamlit secrets
    groq_api_key = os.getenv("GROQ_API_KEY")
    
    # Try Streamlit secrets if env var not found
    if not groq_api_key and hasattr(st, 'secrets'):
        try:
            groq_api_key = st.secrets.get("GROQ_API_KEY")
        except Exception:
            pass
    
    # If still no API key, show input field
    if not groq_api_key:
        st.warning("🔑 Groq API key not found!")
        groq_api_key = st.text_input("Enter your Groq API Key:", type="password")
        if not groq_api_key:
            st.info("💡 Get your free API key from [Groq Console](https://console.groq.com)")
            st.stop()
    
    llm = ChatGroq(model="llama3-70b-8192", temperature=0.7, groq_api_key=groq_api_key)

    prompt = PromptTemplate.from_template(
        """Use the context to answer the question. If empty, answer from your own knowledge.

Context:
{context}

Question: {question}
Answer:"""
    )

    def format_docs(docs):
        return "\n\n".join(d.page_content for d in docs)

    return (
        {"context": retriever | format_docs, "question": RunnablePassthrough()}
        | prompt
        | llm
    )

# Page config & sidebar toggle
st.set_page_config(page_title="My-Personal-ChatBot+", page_icon="🤖", layout="wide")

with st.sidebar:
    st.markdown("### 📎 Attach PDF")
    uploaded = st.file_uploader("Drop PDF here…", type="pdf")
    if uploaded and st.session_state.get("last_upload") != uploaded.name:
        st.session_state.last_upload = uploaded.name
        with st.spinner("Indexing…"):
            st.session_state.chain = build_chain(uploaded.getvalue())
        st.success("Ready!")

# Program main layout
st.title("🤖 ChatBot+")
st.caption("Chat with me or any PDF you attach")

if "messages" not in st.session_state:
    st.session_state.messages = []
if "chain" not in st.session_state:
    st.session_state.chain = build_chain()  # résumé only on first load

# Display chat + input bottom
for msg in st.session_state.messages:
    st.chat_message(msg["role"]).write(msg["content"])

if prompt := st.chat_input("Ask me anything…"):
    st.session_state.messages.append({"role": "user", "content": prompt})
    st.chat_message("user").write(prompt)

    with st.spinner("Thinking…"):
        raw = st.session_state.chain.invoke(prompt)
        answer = raw.content if hasattr(raw, "content") else str(raw)
        st.session_state.messages.append({"role": "assistant", "content": answer})
        st.chat_message("assistant").write(answer)