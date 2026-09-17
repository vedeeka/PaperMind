from langchain_community.document_loaders import PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter

from database.chroma import collection


def process_pdf(file_path: str, filename: str):

    loader = PyPDFLoader(file_path)

    documents = loader.load()

    splitter = RecursiveCharacterTextSplitter(
        chunk_size=1000,
        chunk_overlap=200
    )

    chunks = splitter.split_documents(documents)

    collection.add(
        documents=[
            chunk.page_content
            for chunk in chunks
        ],

        ids=[
            f"{filename}_{i}"
            for i in range(len(chunks))
        ],

        metadatas=[
            {
                "source": filename,
                "page": chunk.metadata.get("page", 0)
            }
            for chunk in chunks
        ]
    )

    return {
        "pages": len(documents),
        "chunks": len(chunks)
    }