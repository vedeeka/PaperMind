import os
import hashlib
import chromadb
from chromadb.api.types import EmbeddingFunction, Documents, Embeddings
from dotenv import load_dotenv

load_dotenv()

# =========================================
# Lightweight Zero-RAM Embedding Engine
# =========================================

def get_api_key():
    return os.environ.get("GOOGLE_API_KEY") or os.environ.get("GEMINI_API_KEY") or os.environ.get("gem") or ""

def _fast_text_vector(text: str, dim: int = 384) -> list:
    """
    Blazing-fast zero-RAM deterministic vector representation.
    Consumes ~0 MB RAM on Render (free tier compatible).
    """
    vec = [0.0] * dim
    words = text.lower().replace("\n", " ").split()
    if not words:
        return vec
    for word in words:
        h = int(hashlib.md5(word.encode("utf-8")).hexdigest(), 16)
        idx = h % dim
        sign = 1.0 if (h % 2 == 0) else -1.0
        vec[idx] += sign
    norm = sum(x * x for x in vec) ** 0.5
    if norm > 0:
        vec = [x / norm for x in vec]
    return vec

class CloudOrLocalEmbeddingFunction(EmbeddingFunction):
    """
    Memory-efficient embedding function for Render (under 512MB RAM).
    Uses Google Cloud API if valid GOOGLE_API_KEY is present, else fast zero-RAM vectorizer.
    """
    def __init__(self):
        self._key_tested = False
        self._use_cloud = False

    def _check_cloud_availability(self, api_key: str):
        if not api_key or len(api_key) < 10:
            self._use_cloud = False
            self._key_tested = True
            return

        try:
            from google import genai
            client = genai.Client(api_key=api_key)
            # Quick 1-token test
            res = client.models.embed_content(
                model="text-embedding-004",
                contents="test"
            )
            if res and hasattr(res, "embeddings") and res.embeddings:
                self._use_cloud = True
            else:
                self._use_cloud = False
        except Exception as e:
            self._use_cloud = False
        finally:
            self._key_tested = True

    def __call__(self, input: Documents) -> Embeddings:
        api_key = get_api_key()
        
        # Test key on first use or if key changed
        if not self._key_tested:
            self._check_cloud_availability(api_key)

        if self._use_cloud and api_key:
            try:
                from google import genai
                client = genai.Client(api_key=api_key)
                
                all_embeddings = []
                batch_size = 20
                for i in range(0, len(input), batch_size):
                    batch = list(input[i:i + batch_size])
                    resp = client.models.embed_content(
                        model="text-embedding-004",
                        contents=batch
                    )
                    for emb in resp.embeddings:
                        all_embeddings.append(list(emb.values))
                return all_embeddings
            except Exception as e:
                print(f"Cloud embedding error: {e}. Utilizing fast zero-RAM vectorizer.")

        # Zero-RAM fallback vectorizer (<1ms per doc, 0MB RAM)
        return [_fast_text_vector(doc) for doc in input]


# =========================================
# ChromaDB In-Memory Instance
# =========================================

embedding_function = CloudOrLocalEmbeddingFunction()
chroma_client = chromadb.Client()

collection = chroma_client.get_or_create_collection(
    name="deepresearch",
    embedding_function=embedding_function
)

def get_collection():
    global collection
    if collection is None:
        collection = chroma_client.get_or_create_collection(
            name="deepresearch",
            embedding_function=embedding_function
        )
    return collection

def reset_database():
    """Wipes all documents from ChromaDB and deletes uploaded PDF files without invalidating collection object."""
    col = get_collection()
    try:
        all_docs = col.get()
        if all_docs and all_docs.get("ids") and len(all_docs["ids"]) > 0:
            col.delete(ids=all_docs["ids"])
    except Exception as e:
        print(f"Notice on wiping collection IDs: {e}")

    storage_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "uploaded_papers")
    if os.path.exists(storage_dir):
        try:
            for filename in os.listdir(storage_dir):
                fp = os.path.join(storage_dir, filename)
                if os.path.isfile(fp):
                    os.remove(fp)
        except Exception as e:
            print(f"Notice on cleaning uploaded_papers: {e}")

    return True