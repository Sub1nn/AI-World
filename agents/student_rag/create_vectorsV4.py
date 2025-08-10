# create_vectorsV2.py
from pinecone import Pinecone
from google import genai
# from langchain.embeddings import HuggingFaceEmbeddings
from dotenv import load_dotenv
import os
import fitz  # PyMuPDF
import io   # Import io to handle byte streams

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
vector_index = pinecone_client.Index("my-first-db") # Make sure this index name is correct

client = genai.Client(api_key=GOOGLE_API_KEY)

def extract_text_from_pdf(pdf_path):
    """
    Extracts text from a PDF file on disk.
    """
    text = ""
    try:
        with fitz.open(pdf_path) as doc:
            for page in doc:
                text += page.get_text() + '\n'
    except Exception as e:
        print(f"Error extracting text from PDF file {pdf_path}: {e}")
        # Depending on requirements, you might want to raise the error
        # Returning empty string for now
    return text

def extract_text_from_uploaded_pdf(uploaded_file):
    """
    Extracts text from a Streamlit st.uploaded_file object (PDF).
    This function is used for processing PDFs uploaded by users in the Streamlit app.
    """
    text = ""
    try:
        # Read the file content as bytes
        # uploaded_file.getvalue() returns the file's content as bytes
        # io.BytesIO treats these bytes as an in-memory binary file
        file_bytes = uploaded_file.getvalue()
        with fitz.open(stream=io.BytesIO(file_bytes)) as doc:
            for page in doc:
                text += page.get_text() + '\n'
    except Exception as e:
        print(f"Error extracting text from uploaded PDF: {e}")
        # Returning empty string allows the app to continue, perhaps warning the user.
        # You could also choose to re-raise the exception if you want the app to stop.
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
        # Ensure 'gemini-embedding-001' is the correct model name for your use case
        result = client.models.embed_content(
            model='gemini-embedding-001', # Updated model name format
            contents=text,
            # Adjust output dimensionality if needed, matching your Pinecone index dimension
            config={'output_dimensionality': 1024} 
        )
        # Extract the embedding vector from the result dictionary
        # The key is 'embedding' (singular) for the first content item
        vector = result.embeddings[0].values
        return vector
    except Exception as e:
        print(f"Error generating embedding for text: {e}")
        # Depending on requirements, you might want to retry, skip, or raise the error
        return None # Or handle the error as appropriate

# Function to upsert vectors to Pinecone
def upsert_vectors_to_pinecone(document_texts):
    """
    Embeds a list of texts and upserts them to the Pinecone index.
    """
    upsert_data = []
    for idx, text in enumerate(document_texts):
        embedding = embed_text(text)
        if embedding is not None: # Only upsert if embedding was successful
            vector_id = f'doc-{idx}'
            meta_data = {'text': text}
            # Pinecone upsert expects a list of tuples: (id, vector, metadata)
            upsert_data.append((vector_id, embedding, meta_data))
        else:
            print(f"Skipping text at index {idx} due to embedding failure.")
    
    if upsert_data: # Only upsert if there's data to upsert
        vector_index.upsert(upsert_data)
        print(f'{len(upsert_data)} vectors upserted successfully.')
    else:
        print('No vectors to upsert.')

if __name__ == "__main__":
    """
    Script to process PDFs from the 'documents' directory and upsert them to Pinecone.
    This is the original functionality.
    """
    document_texts = []
    documents_dir = 'documents' # Ensure this directory exists
    
    if not os.path.exists(documents_dir):
        print(f"Warning: Directory '{documents_dir}' not found. No documents will be processed.")
    else:
        try:
            document_dirs = os.listdir(documents_dir)
            if not document_dirs:
                 print(f"Warning: Directory '{documents_dir}' is empty.")
            for doc in document_dirs:
                pdf_path = os.path.join(documents_dir, doc)
                # Basic check to ensure it's a file (could be more robust)
                if os.path.isfile(pdf_path) and pdf_path.lower().endswith('.pdf'):
                    print(f"Processing {pdf_path}...")
                    text = extract_text_from_pdf(pdf_path)
                    # Simple chunking by double newlines - you might want a more sophisticated method
                    chunks = [chunk for chunk in text.split('\n\n') if chunk.strip()]
                    if chunks:
                        document_texts.extend(chunks)
                    else:
                        # If splitting by \n\n yields nothing, add the whole text if it's not empty
                        if text.strip():
                            document_texts.append(text.strip())
                        else:
                            print(f"Warning: No text extracted from {pdf_path}")
                else:
                    print(f"Skipping {pdf_path} (not a .pdf file or not a file).")

            if document_texts:
                print(f"Total text chunks extracted: {len(document_texts)}")
                upsert_vectors_to_pinecone(document_texts)
                print("Initial document processing & upserting completed.")
            else:
                print("No text was extracted from any documents. Nothing upserted to Pinecone.")

        except Exception as e:
            print(f"An error occurred during initial document processing: {e}")
