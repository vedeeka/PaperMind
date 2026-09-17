import os
import shutil
import time
from langchain_community.document_loaders import PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from database.chroma import get_collection

STORAGE_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "uploaded_papers")
os.makedirs(STORAGE_DIR, exist_ok=True)


def process_pdf(file_path: str, filename: str, save_copy: bool = True):
    col = get_collection()
    # If requested, save a copy in STORAGE_DIR
    target_path = os.path.join(STORAGE_DIR, filename)
    if save_copy and file_path != target_path:
        shutil.copyfile(file_path, target_path)

    loader = PyPDFLoader(file_path)
    documents = loader.load()

    splitter = RecursiveCharacterTextSplitter(
        chunk_size=1000,
        chunk_overlap=200
    )

    chunks = splitter.split_documents(documents)

    # First remove any existing chunks for this filename to prevent duplicate entries
    try:
        existing = col.get(where={"source": filename})
        if existing and existing.get("ids"):
            col.delete(ids=existing["ids"])
    except Exception as e:
        print(f"Notice on chunk deduplication: {e}")

    if chunks:
        col.add(
            documents=[
                chunk.page_content
                for chunk in chunks
            ],
            ids=[
                f"{filename}_{i}_{int(time.time())}"
                for i in range(len(chunks))
            ],
            metadatas=[
                {
                    "source": filename,
                    "page": chunk.metadata.get("page", 0) + 1  # 1-indexed for display
                }
                for chunk in chunks
            ]
        )

    file_size = os.path.getsize(target_path) if os.path.exists(target_path) else os.path.getsize(file_path)

    return {
        "filename": filename,
        "pages": len(documents),
        "chunks": len(chunks),
        "file_size": file_size
    }


def list_indexed_papers():
    """Returns a list of all indexed papers with chunk counts and page estimates."""
    col = get_collection()
    try:
        data = col.get(include=["metadatas"])
        if not data or not data.get("metadatas"):
            return []

        papers_map = {}
        for meta in data["metadatas"]:
            src = meta.get("source", "Unknown")
            page = meta.get("page", 1)
            if src not in papers_map:
                pdf_path = os.path.join(STORAGE_DIR, src)
                papers_map[src] = {
                    "filename": src,
                    "chunks": 0,
                    "max_page": 1,
                    "has_pdf": os.path.exists(pdf_path),
                    "file_size": os.path.getsize(pdf_path) if os.path.exists(pdf_path) else 0
                }
            papers_map[src]["chunks"] += 1
            if page > papers_map[src]["max_page"]:
                papers_map[src]["max_page"] = page

        return [
            {
                "filename": info["filename"],
                "chunks": info["chunks"],
                "pages": info["max_page"],
                "has_pdf": info["has_pdf"],
                "file_size": info["file_size"]
            }
            for info in papers_map.values()
        ]
    except Exception as e:
        print(f"Error listing indexed papers: {e}")
        return []


def delete_paper(filename: str):
    """Deletes all chunks of a paper from Chroma and removes the stored PDF."""
    col = get_collection()
    try:
        existing = col.get(where={"source": filename})
        if existing and existing.get("ids"):
            col.delete(ids=existing["ids"])

        pdf_path = os.path.join(STORAGE_DIR, filename)
        if os.path.exists(pdf_path):
            os.remove(pdf_path)

        return True
    except Exception as e:
        print(f"Error deleting paper {filename}: {e}")
        return False