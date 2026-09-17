import os
import chromadb

from chromadb.api.types import (
    EmbeddingFunction,
    Documents,
    Embeddings
)

from google import genai


# =========================================
# Gemini Client
# =========================================

google_client = genai.Client(
    api_key=os.environ["GOOGLE_API_KEY"]
)


# =========================================
# Gemini Embedding Function
# =========================================

class GeminiEmbeddingFunction(EmbeddingFunction):

    def __call__(
        self,
        input: Documents
    ) -> Embeddings:

        response = google_client.models.embed_content(
            model="gemini-embedding-001",
            contents=input
        )

        return [
            embedding.values
            for embedding in response.embeddings
        ]


# =========================================
# Embedding Function
# =========================================

embedding_function = GeminiEmbeddingFunction()


# =========================================
# ChromaDB
# =========================================

chroma_client = chromadb.Client()


collection = chroma_client.get_or_create_collection(
    name="deepresearch",
    embedding_function=embedding_function
)


# =========================================
# Get Collection
# =========================================

def get_collection():

    global collection

    if collection is None:

        collection = chroma_client.get_or_create_collection(
            name="deepresearch",
            embedding_function=embedding_function
        )

    return collection


# =========================================
# Reset Database
# =========================================

def reset_database():

    col = get_collection()

    try:

        all_docs = col.get()

        if (
            all_docs
            and all_docs.get("ids")
            and len(all_docs["ids"]) > 0
        ):

            col.delete(
                ids=all_docs["ids"]
            )

    except Exception as e:

        print(
            f"Notice on wiping collection IDs: {e}"
        )


    # =====================================
    # Delete uploaded PDFs
    # =====================================

    storage_dir = os.path.join(
        os.path.dirname(
            os.path.dirname(
                os.path.abspath(__file__)
            )
        ),
        "uploaded_papers"
    )


    if os.path.exists(storage_dir):

        try:

            for filename in os.listdir(storage_dir):

                file_path = os.path.join(
                    storage_dir,
                    filename
                )

                if os.path.isfile(file_path):

                    os.remove(file_path)

        except Exception as e:

            print(
                f"Notice on cleaning uploaded_papers: {e}"
            )


    return True