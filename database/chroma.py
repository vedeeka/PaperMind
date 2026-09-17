import chromadb
from chromadb.utils import embedding_functions
import os


chroma_client = chromadb.Client()

embedding_function = None
collection = None


def get_collection():

    global collection
    global embedding_function

    if embedding_function is None:
        embedding_function = (
            embedding_functions.SentenceTransformerEmbeddingFunction(
                model_name="all-MiniLM-L6-v2"
            )
        )

    if collection is None:
        collection = chroma_client.get_or_create_collection(
            name="deepresearch",
            embedding_function=embedding_function
        )

    return collection


def reset_database():

    col = get_collection()

    try:

        all_docs = col.get()

        if all_docs and all_docs.get("ids"):

            col.delete(
                ids=all_docs["ids"]
            )

    except Exception as e:

        print(
            f"Notice on wiping collection IDs: {e}"
        )

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

            for f in os.listdir(storage_dir):

                fp = os.path.join(
                    storage_dir,
                    f
                )

                if os.path.isfile(fp):
                    os.remove(fp)

        except Exception as e:

            print(
                f"Notice on cleaning uploaded_papers: {e}"
            )

    return True