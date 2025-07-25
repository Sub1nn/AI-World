import os, pathlib
from pypdf import PdfReader
from langchain_community.document_loaders import PyPDFLoader
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_chroma import Chroma

ROOT = pathlib.Path(__file__).parent.resolve()
PDF_PATH = ROOT / "documents" / "resume_SubinKhatiwada.pdf"
CHROMA_DIR = ROOT / "chroma_db"

def build_vector_store():
    print("🔍 Loading PDF...")
    if not PDF_PATH.exists():
        raise FileNotFoundError(f"PDF not found at {PDF_PATH}")
    
    loader = PyPDFLoader(str(PDF_PATH))
    docs = loader.load()
    print(f"📄 Loaded {len(docs)} pages")

    print("✂️ Splitting text...")
    text_splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=100)
    chunks = text_splitter.split_documents(docs)
    print(f"📦 Created {len(chunks)} chunks")

    print("🤖 Loading embeddings...")
    embeddings = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")

    print("💾 Creating vector store...")
    # Create / overwrite the vector store
    Chroma.from_documents(
        chunks,
        embeddings,
        collection_name="resume",
        persist_directory=str(CHROMA_DIR),
    )
    print("✅ Vector store built at", CHROMA_DIR)

if __name__ == "__main__":
    build_vector_store()