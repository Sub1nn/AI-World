import os, pathlib
from pypdf import PdfReader
from langchain_community.document_loaders import PyPDFLoader
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_chroma import Chroma

ROOT       = pathlib.Path(__file__).parent.resolve()
# PDF_PATH   = ROOT / "resume_SubinKhatiwada.pdf"
PDF_PATH = "/Users/subin/documents/job-applications/resume_SubinKhatiwada.pdf"
CHROMA_DIR = ROOT / "chroma_db"

loader = PyPDFLoader(str(PDF_PATH))
docs   = loader.load()

text_splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=100)
chunks = text_splitter.split_documents(docs)

embeddings = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")

# Create / overwrite the vector store
Chroma.from_documents(
    chunks,
    embeddings,
    collection_name="resume",
    persist_directory=str(CHROMA_DIR),
)
print("✅ Vector store built at", CHROMA_DIR)