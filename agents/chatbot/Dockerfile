FROM python:3.10-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    sqlite3 \
    libsqlite3-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for better caching
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Create chroma_db directory
RUN mkdir -p chroma_db

# Expose port
EXPOSE 8501

# Run the app
CMD ["streamlit", "run", "botV2.py", "--server.port=8501", "--server.address=0.0.0.0"]