import chromadb
from chromadb.utils import embedding_functions


chroma_client = chromadb.Client()

embedding_function = embedding_functions.SentenceTransformerEmbeddingFunction(
    model_name="all-MiniLM-L6-v2"
)

collection = chroma_client.get_or_create_collection(
    name="deepresearch",
    embedding_function=embedding_function
)