import fitz
import os
import google.generativeai as genai

from dotenv import load_dotenv
from sentence_transformers import SentenceTransformer
from langchain_text_splitters import RecursiveCharacterTextSplitter

from pinecone import Pinecone, ServerlessSpec


# -----------------------------
# LOAD ENV VARIABLES
# -----------------------------

load_dotenv()

gemini_api_key = os.getenv("gem")
pinecone_api_key = os.getenv("pinecone")

genai.configure(api_key=gemini_api_key)

model_gemini = genai.GenerativeModel("gemini-2.5-flash")

print("Gemini loaded")


# -----------------------------
# INITIALIZE PINECONE
# -----------------------------

pc = Pinecone(api_key=pinecone_api_key)

index_name = "deepresearch"

# create index if not exists
if index_name not in pc.list_indexes().names():

    pc.create_index(
        name=index_name,
        dimension=384,
        metric="cosine",
        spec=ServerlessSpec(
            cloud="aws",
            region="us-east-1"
        )
    )

index = pc.Index(index_name)

print("Pinecone initialized")


# -----------------------------
# EMBEDDING MODEL
# -----------------------------

embedding_model = SentenceTransformer("BAAI/bge-small-en-v1.5")

print("Embedding model loaded")


# -----------------------------
# TEXT SPLITTER
# -----------------------------

splitter = RecursiveCharacterTextSplitter(
    chunk_size=800,
    chunk_overlap=200
)


# -----------------------------
# INGEST PDF PAPERS
# -----------------------------

papers_folder = "deepresearch/papers"

vectors = []

for file in os.listdir(papers_folder):

    if file.endswith(".pdf"):

        path = os.path.join(papers_folder, file)

        print("Processing:", file)

        doc = fitz.open(path)

        text = ""

        for page in doc:
            text += page.get_text()

        chunks = splitter.split_text(text)

        embeddings = embedding_model.encode(chunks)

        for i, chunk in enumerate(chunks):

            vectors.append({
                "id": file + "_" + str(i),
                "values": embeddings[i].tolist(),
                "metadata": {
                    "text": chunk,
                    "paper": file
                }
            })

# store in pinecone
if len(vectors) > 0:
    index.upsert(vectors=vectors)

print("Embeddings stored in Pinecone")


# -----------------------------
# USER QUERY
# -----------------------------

query = input("\nAsk your research question: ")

query_embedding = embedding_model.encode(query)


# -----------------------------
# VECTOR SEARCH
# -----------------------------

results = index.query(
    vector=query_embedding.tolist(),
    top_k=5,
    include_metadata=True
)


# -----------------------------
# RETRIEVE CONTEXT
# -----------------------------

retrieved_chunks = []
sources = []

for match in results["matches"]:
    retrieved_chunks.append(match["metadata"]["text"])
    sources.append(match["metadata"]["paper"])

print("\nRetrieved context:\n")

for chunk in retrieved_chunks:
    print("-----")
    print(chunk[:300])
    print()


# -----------------------------
# BUILD CONTEXT
# -----------------------------

context = "\n".join(retrieved_chunks)


prompt = f"""
You are an AI research assistant.

Use the research paper context to answer the question.

Context:
{context}

Question:
{query}

Give a clear explanation based on the research.
"""




response = model_gemini.generate_content(prompt)

print("\n==============================")
print("DeepResearch AI Answer")
print("==============================\n")

print(response.text)
print("\nSources used:")
print(set(sources))