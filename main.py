import os
import tempfile
from typing import List, Optional

from fastapi import FastAPI, UploadFile, File, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel

from database.chroma import get_collection, reset_database
from search.semantic_search import semantic_search
from ingestion.pdf_ingestion import (
    process_pdf,
    list_indexed_papers,
    delete_paper,
    STORAGE_DIR,
)
from agent_service import (
    get_sub_questions,
    run_research_pipeline,
    compare_papers,
)
from llm_helper import set_gemini_api_key, get_gemini_api_key


app = FastAPI(
    title="PaperMind Agentic RAG API",
    description="Multi-Paper Agentic RAG Research Assistant powered by LangGraph, ChromaDB, and Gemini",
    version="2.0.0",
)


# --------------------------------------------------
# CORS
# --------------------------------------------------

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)




class SearchRequest(BaseModel):
    query: str
    top_k: int = 5


class BreakdownRequest(BaseModel):
    question: str
    api_key: Optional[str] = None


class ResearchRequest(BaseModel):
    question: str
    sub_questions: Optional[List[str]] = None
    api_key: Optional[str] = None


class CompareRequest(BaseModel):
    papers: List[str]
    api_key: Optional[str] = None


class KeyRequest(BaseModel):
    api_key: str


# --------------------------------------------------
# Health Check
# --------------------------------------------------

@app.get("/")
def root():
    return {
        "status": "online",
        "service": "PaperMind Agentic RAG API",
        "version": "2.0.0",
    }


@app.get("/health")
def health():
    return {
        "status": "healthy"
    }




@app.get("/api/status")
def get_status():
    total_chunks = get_collection().count()
    papers = list_indexed_papers()
    current_key = get_gemini_api_key()

    return {
        "status": "online",
        "papers_count": len(papers),
        "total_chunks": total_chunks,
        "has_api_key": bool(current_key),
        "api_key_masked": (
            f"{current_key[:4]}...{current_key[-4:]}"
            if len(current_key) > 8
            else ("Configured" if current_key else "Not Set")
        ),
        "papers": papers,
    }




@app.post("/api/reset")
def reset_session():
    reset_database()

    return {
        "message": "Vector database reset successfully. Fresh session initialized.",
        "papers_count": 0,
        "total_chunks": 0,
    }


# --------------------------------------------------
# API Key
# --------------------------------------------------

@app.post("/api/settings/key")
def update_api_key(req: KeyRequest):
    set_gemini_api_key(req.api_key)

    return {
        "message": "Gemini API key updated successfully",
        "configured": bool(req.api_key),
    }


# --------------------------------------------------
# Papers
# --------------------------------------------------

@app.get("/api/papers")
def get_papers():
    return {
        "papers": list_indexed_papers(),
        "total_chunks": get_collection().count(),
    }


@app.get("/api/papers/{filename}/chunks")
def get_paper_chunks(filename: str):
    try:
        data = get_collection().get(
            where={"source": filename},
            include=["documents", "metadatas"],
        )

        chunks = []

        if data and data.get("documents"):
            for i, doc in enumerate(data["documents"]):
                meta = (
                    data["metadatas"][i]
                    if data.get("metadatas")
                    else {}
                )

                chunks.append(
                    {
                        "id": data["ids"][i],
                        "text": doc,
                        "page": meta.get("page", 1),
                    }
                )

        return {
            "filename": filename,
            "count": len(chunks),
            "chunks": chunks,
        }

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=str(e),
        )


@app.get("/api/papers/{filename}/pdf")
def get_paper_pdf(filename: str):
    target_path = os.path.join(STORAGE_DIR, filename)

    if not os.path.exists(target_path):

        root_path = os.path.join(
            os.path.dirname(os.path.abspath(__file__)),
            filename,
        )

        deep_path = os.path.join(
            os.path.dirname(os.path.abspath(__file__)),
            "deepresearch",
            "papers",
            filename,
        )

        if os.path.exists(root_path):
            target_path = root_path

        elif os.path.exists(deep_path):
            target_path = deep_path

        else:
            raise HTTPException(
                status_code=404,
                detail=f"PDF file '{filename}' not found.",
            )

    return FileResponse(
        target_path,
        media_type="application/pdf",
        filename=filename,
    )


# --------------------------------------------------
# Upload PDF
# --------------------------------------------------

@app.post("/api/upload")
async def upload_pdf(file: UploadFile = File(...)):

    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(
            status_code=400,
            detail="Only PDF files are supported.",
        )

    with tempfile.NamedTemporaryFile(
        delete=False,
        suffix=".pdf",
    ) as temp:

        content = await file.read()
        temp.write(content)
        temp_path = temp.name

    try:

        result = process_pdf(
            temp_path,
            file.filename,
            save_copy=True,
        )

        return {
            "message": "PDF uploaded and indexed successfully",
            "paper": result,
            "total_chunks": get_collection().count(),
        }

    except Exception as e:

        raise HTTPException(
            status_code=500,
            detail=f"PDF indexing error: {str(e)}",
        )

    finally:

        if os.path.exists(temp_path):
            os.remove(temp_path)


# --------------------------------------------------
# Sample Papers
# --------------------------------------------------

@app.post("/api/papers/index-samples")
def index_sample_papers():

    base_dir = os.path.dirname(
        os.path.abspath(__file__)
    )

    candidates = [
        (
            os.path.join(
                base_dir,
                "paper1.pdf",
            ),
            "Attention_Is_All_You_Need.pdf",
        ),
        (
            os.path.join(
                base_dir,
                "deepresearch",
                "papers",
                "paper2.pdf",
            ),
            "PaperMind_Agentic_RAG_Architecture.pdf",
        ),
    ]

    indexed = []

    for path, target_name in candidates:

        if os.path.exists(path):

            try:

                result = process_pdf(
                    path,
                    target_name,
                    save_copy=True,
                )

                indexed.append(result)

            except Exception as e:

                print(
                    f"Error indexing sample {path}: {e}"
                )

    return {
        "message": (
            f"Successfully indexed "
            f"{len(indexed)} sample research papers."
        ),
        "indexed": indexed,
        "total_chunks": get_collection().count(),
    }


# --------------------------------------------------
# Delete Paper
# --------------------------------------------------

@app.delete("/api/papers/{filename}")
def remove_paper(filename: str):

    success = delete_paper(filename)

    return {
        "success": success,
        "message": f"Paper '{filename}' deleted.",
        "total_chunks": get_collection().count(),
    }


# --------------------------------------------------
# Semantic Search
# --------------------------------------------------

@app.post("/api/search")
def search_endpoint(req: SearchRequest):

    results = semantic_search(
        req.query,
        n_results=req.top_k,
    )

    return {
        "query": req.query,
        "count": len(results),
        "results": results,
    }


# --------------------------------------------------
# Legacy Search
# --------------------------------------------------

@app.get("/question")
def legacy_question(
    query: str = Query(...)
):

    results = semantic_search(query)

    return {
        "question": query,
        "results": results,
    }


# --------------------------------------------------
# Research Breakdown
# --------------------------------------------------

@app.post("/api/research/breakdown")
def breakdown_endpoint(req: BreakdownRequest):

    sub_questions = get_sub_questions(
        req.question,
        req.api_key,
    )

    return {
        "question": req.question,
        "sub_questions": sub_questions,
    }




@app.post("/api/research/run")
def research_endpoint(req: ResearchRequest):

    try:

        result = run_research_pipeline(
            question=req.question,
            sub_questions=req.sub_questions,
            api_key=req.api_key,
        )

        return result

    except Exception as e:

        raise HTTPException(
            status_code=500,
            detail=f"Research agent failed: {str(e)}",
        )



@app.post("/api/compare")
def compare_endpoint(req: CompareRequest):

    if not req.papers:
        raise HTTPException(
            status_code=400,
            detail="Please select at least 1 paper to compare.",
        )

    try:

        result = compare_papers(
            req.papers,
            req.api_key,
        )

        return result

    except Exception as e:

        raise HTTPException(
            status_code=500,
            detail=f"Comparison failed: {str(e)}",
        )

if __name__ == "__main__":
    import uvicorn

    # Render automatically provides the PORT environment variable
    port = int(os.environ.get("PORT", 10000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=False)