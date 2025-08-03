from pinecone import Pinecone
from google import genai
# from langchain.embeddings import HuggingFaceEmbeddings
from dotenv import load_dotenv
import os   
import fitz # PyMuPDF

load_dotenv() 
# Get API keys from environment variables
PINECONE_API_KEY = os.getenv("PINECONE_API_KEY")
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")

# Check if API keys are loaded
if not PINECONE_API_KEY:
    raise ValueError("PINECONE_API_KEY not found in environment variables. Please check your .env file.")
if not GOOGLE_API_KEY:
    raise ValueError("GOOGLE_API_KEY not found in environment variables. Please check your .env file.")

pinecone_client = Pinecone(api_key=PINECONE_API_KEY)
vector_index = pinecone_client.Index("my-first-db")

client = genai.Client(api_key=GOOGLE_API_KEY)

def extract_text_from_pdf(pdf_path):
    text = ""
    with fitz.open(pdf_path) as doc:
        for page in doc:
            text += page.get_text() + '\n'
    return text
    
# Function to embed text using Google Gemini
def embed_text(text):
    """
    Generates embeddings for a given text using Google's API.
    """
    if not text.strip():
        print("Warning: Attempting to embed empty text.")
        # Return None or a zero vector of appropriate size
        # Returning None here, handle this case in the calling function
        return None

    try:
        # Use the correct method and parameters for Google Generative AI embedding
        result = client.models.embed_content (
            model='gemini-embedding-001',  
            contents=text,                  
            config={
                'output_dimensionality': 1024
            }
        )
        # Extract the embedding vector from the result dictionary
        # The key is 'embedding' (singular)
        vector = result.embeddings[0].values
        return vector
    except Exception as e:
        print(f"Error generating embedding for text: {e}")
        # Depending on requirements, you might want to retry, skip, or raise the error
        return None # Or handle the error as appropriate

# Function to upsert vectors to Pinecone
def upsert_vectors_to_pinecone(document_texts):
    upsert_data = []
    for idx, text in enumerate(document_texts):
        embedding = embed_text(text)
        vector_id = f'doc-{idx}'
        meta_data = {'text': text}
        upsert_data.append((vector_id, embedding, meta_data))
    vector_index.upsert(upsert_data)
    print('Vectors upserted successfully.')


if __name__ == "__main__":
    document_texts = []
    document_dirs = os.listdir('documents')
    for doc in document_dirs:
        pdf_path = os.path.join('documents', doc)
        text = extract_text_from_pdf(pdf_path)
        document_texts.extend([chunk for chunk in text.split('\n\n') if chunk.strip()])
    upsert_vectors_to_pinecone(document_texts)
    print("Documents passed & upserted.")