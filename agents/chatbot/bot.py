
import os, pathlib, streamlit as st
from langchain_chroma import Chroma
from langchain_huggingface import HuggingFaceEmbeddings
from langchain.prompts import PromptTemplate
from langchain_core.runnables import RunnablePassthrough, RunnableLambda
from langchain_groq import ChatGroq
from dotenv import load_dotenv

load_dotenv()

ROOT = pathlib.Path(__file__).parent.resolve()

@st.cache_resource(show_spinner=False)
def build_retriever():
    embeddings = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")
    return Chroma(
        persist_directory=str(ROOT / "chroma_db"),
        embedding_function=embeddings,
        collection_name="resume",
    ).as_retriever(search_kwargs={"k": 6})

@st.cache_resource(show_spinner=False)
def build_chain():
    retriever = build_retriever()
    llm = ChatGroq(
        model="llama3-70b-8192",
        temperature=0.7,
        groq_api_key=os.getenv("GROQ_API_KEY"),
    )

    prompt_template = """Answer the question using the context below if relevant; otherwise answer from your own knowledge.

Context:
{context}

Question: {question}
Answer:"""

    prompt = PromptTemplate.from_template(prompt_template)

    def format_docs(docs):
        return "\n\n".join(d.page_content for d in docs)

    chain = (
        {"context": retriever | format_docs, "question": RunnablePassthrough()}
        | prompt
        | llm
    )
    return chain

st.set_page_config(page_title="RésuméBot", page_icon="🤖")
st.title("🤖 RésuméBot – ask about my CV or anything else")

if "chain" not in st.session_state:
    st.session_state.chain = build_chain()

if "messages" not in st.session_state:
    st.session_state.messages = []

for msg in st.session_state.messages:
    st.chat_message(msg["role"]).write(msg["content"])

if prompt := st.chat_input("Ask me anything..."):
    st.session_state.messages.append({"role": "user", "content": prompt})
    st.chat_message("user").write(prompt)

    with st.spinner("Thinking..."):
        raw = st.session_state.chain.invoke(prompt)
        answer = raw.content if hasattr(raw, "content") else str(raw)
        st.session_state.messages.append({"role": "assistant", "content": answer})
        st.chat_message("assistant").write(answer)