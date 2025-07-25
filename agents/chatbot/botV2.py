# bot.py
import os, pathlib, tempfile, shutil, streamlit as st
from langchain_chroma import Chroma
from langchain_community.document_loaders import PyPDFLoader
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_huggingface import HuggingFaceEmbeddings
from langchain.prompts import PromptTemplate
from langchain_core.runnables import RunnablePassthrough, RunnableLambda
from langchain_groq import ChatGroq
from dotenv import load_dotenv


load_dotenv()

# Absolute paths
RESUME_PDF = "./documents/resume_SubinKhatiwada.pdf"
CHROMA_DIR = pathlib.Path(__file__).parent / "chroma_db"

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
    llm = ChatGroq(model="llama3-70b-8192", temperature=0.7,
                   groq_api_key=os.getenv("GROQ_API_KEY"))

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
st.caption("Chat with my résumé or any PDF you attach")

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