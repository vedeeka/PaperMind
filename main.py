from fastapi import FastAPI, UploadFile, File
import tempfile
import os

from search.semantic_search import semantic_search
from ingestion.pdf_ingestion import process_pdf


app = FastAPI()


@app.get("/question")
def question(query: str):

    results = semantic_search(query)

    return {
        "question": query,
        "results": results
    }


@app.post("/upload")
async def upload(file: UploadFile = File(...)):

    with tempfile.NamedTemporaryFile(
        delete=False,
        suffix=".pdf"
    ) as temp:

        temp.write(await file.read())
        temp_path = temp.name

    try:

        result = process_pdf(
            temp_path,
            file.filename
        )

        return {
            "message": "PDF uploaded successfully",
            "filename": file.filename,
            "pages": result["pages"],
            "chunks": result["chunks"]
        }

    finally:

        os.remove(temp_path)