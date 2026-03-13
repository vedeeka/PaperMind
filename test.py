import fitz
import chromadb
import google.generativeai as genai
import os

from sentence_transformers import SentenceTransformer
from langchain_text_splitters import RecursiveCharacterTextSplitter
from chromadb.config import Settings
from dotenv import load_dotenv

# -----------------------------
# LOAD ENV VARIABLES
# -----------------------------

load_dotenv()

gemini_api_key = os.getenv("gem")

genai.configure(api_key=gemini_api_key)

model_gemini = genai.GenerativeModel("gemini-2.5-flash")

print("Gemini loaded")

# -----------------------------
# LOAD PDF
# -----------------------------

doc = fitz.open("deepresearch/papers/paper1.pdf")

text = ""

for page in doc:
    text += page.get_text()

print("PDF loaded")

# -----------------------------
# TEXT CHUNKING
# -----------------------------

splitter = RecursiveCharacterTextSplitter(
    chunk_size=800,
    chunk_overlap=200
)

chunks = splitter.split_text(text)

print("Chunks created:", len(chunks))

# -----------------------------
# EMBEDDING MODEL
# -----------------------------

embedding_model = SentenceTransformer("BAAI/bge-small-en-v1.5")

print("Embedding model loaded")

# -----------------------------
# CREATE EMBEDDINGS
# -----------------------------

embeddings = embedding_model.encode(chunks)

print("Embeddings generated")

# -----------------------------
# VECTOR DATABASE (CHROMADB)
# -----------------------------

from chromadb.config import Settings

client = chromadb.Client(
    Settings(
        persist_directory="./chromadb_storage"
    )
)
db_path = os.path.join(os.getcwd(), "chromadb_storage")

client = chromadb.PersistentClient(path=db_path)

collection = client.get_or_create_collection("research_papers")


# Avoid duplicate inserts
if collection.count() == 0:

    for i, chunk in enumerate(chunks):
        collection.add(
            documents=[chunk],
            embeddings=[embeddings[i].tolist()],
            ids=[str(i)]
        )

    print("Stored in ChromaDB")
    print("ChromaDB path:", db_path)

else:
    print("Database already contains data")


# -----------------------------
# USER QUERY
# -----------------------------

query = input("\nAsk your research question: ")

query_embedding = embedding_model.encode(query)

# -----------------------------
# RETRIEVE RELEVANT CHUNKS
# -----------------------------

results = collection.query(
    query_embeddings=[query_embedding.tolist()],
    n_results=5
)

retrieved_chunks = results["documents"][0]

print("\nRetrieved context:")

for chunk in retrieved_chunks:
    print("\n----- Chunk -----\n")
    print(chunk)

# -----------------------------
# PREPARE CONTEXT FOR LLM
# -----------------------------

context = "\n".join(retrieved_chunks)

prompt = f"""
You are an AI research assistant.

Use the research paper context to answer the question.

Context:
{context}

Question:
{query}

Give a clear answer using the research context.
"""

# -----------------------------
# GEMINI RESPONSE
# -----------------------------

response = model_gemini.generate_content(prompt)

print("\n============================")
print("DeepResearch AI Answer")
print("============================\n")

print(response.text)