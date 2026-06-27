import os
import fitz  # PyMuPDF
import tempfile
import requests
import uvicorn
import uuid
import google.generativeai as genai
import firebase_admin
import cloudinary
import cloudinary.uploader
from typing import List, Optional
from dotenv import load_dotenv

from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from firebase_admin import credentials, firestore
# LangChain Imports
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_pinecone import PineconeVectorStore
from langchain_classic.agents import create_react_agent, AgentExecutor
from langchain_core.tools import tool
from langchain_core.prompts import PromptTemplate
from langchain_text_splitters import RecursiveCharacterTextSplitter
from pinecone import Pinecone, ServerlessSpec

load_dotenv()

# --- Configuration ---
GEMINI_API_KEY = os.getenv("gem")
PINECONE_API_KEY = os.getenv("pinecone")
FIREBASE_KEY_PATH = os.getenv("FIREBASE_SERVICE_ACCOUNT_KEY_PATH", "./serviceAccountKey.json")
CLOUDINARY_NAME = os.getenv("CLOUDINARY_CLOUD_NAME")
CLOUDINARY_API_KEY = os.getenv("CLOUDINARY_API_KEY")
CLOUDINARY_API_SECRET = os.getenv("CLOUDINARY_API_SECRET")

# Initialize Firebase
if not firebase_admin._apps:
    cred = credentials.Certificate(FIREBASE_KEY_PATH)
    firebase_admin.initialize_app(cred)
db = firestore.client()

# Initialize Cloudinary
cloudinary.config(cloud_name=CLOUDINARY_NAME, api_key=CLOUDINARY_API_KEY, api_secret=CLOUDINARY_API_SECRET)

# Initialize Pinecone
pc = Pinecone(api_key=PINECONE_API_KEY)
index_name = "deepresearch"
if index_name not in [i["name"] for i in pc.list_indexes()]:
    pc.create_index(name=index_name, dimension=384, metric="cosine", 
                    spec=ServerlessSpec(cloud="aws", region="us-east-1"))
index = pc.Index(index_name)

# Models & Tools Setup
embeddings = HuggingFaceEmbeddings(model_name="BAAI/bge-small-en-v1.5")
llm = ChatGoogleGenerativeAI(model="gemini-3-flash-preview", google_api_key=GEMINI_API_KEY, temperature=0.1)
splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=150)

# --- 2. Helper Functions ---

def extract_text_from_pdf(file_bytes):
    """Extracts raw text from PDF bytes."""
    with tempfile.NamedTemporaryFile(delete=False) as tmp:
        tmp.write(file_bytes)
        tmp_path = tmp.name
    
    text = ""
    try:
        doc = fitz.open(tmp_path)
        for page in doc:
            text += page.get_text()
    finally:
        os.unlink(tmp_path)
    return text

def process_and_upload_text(text: str, doc_id: str, title: str):
    """Chunks, embeds, and stores text in Pinecone with metadata."""
    chunks = splitter.split_text(text)
    if not chunks:
        return
        
    embeds = embeddings.embed_documents(chunks)
    vectors = []
    for i, chunk in enumerate(chunks):
        vectors.append({
            "id": f"{doc_id}_{i}_{uuid.uuid4().hex[:6]}",
            "values": embeds[i],
            "metadata": {
                "text": chunk, 
                "paper_id": doc_id,
                "title": title
            }
        })
    index.upsert(vectors=vectors)

def fetch_and_process_library_docs(doc_ids: List[str]):
    """Fetches PDFs from Firebase/Cloudinary and processes them."""
    processed_info = []
    for d_id in doc_ids:
        doc_ref = db.collection("documents").document(d_id).get()
        if doc_ref.exists:
            data = doc_ref.to_dict()
            title = data.get("title", "Unknown Document")
            url = data.get("cloudinary_url")
            
            # Download and process
            resp = requests.get(url)
            text = extract_text_from_pdf(resp.content)
            process_and_upload_text(text, d_id, title)
            processed_info.append({"id": d_id, "title": title})
    return processed_info

# --- 3. Agent Tools ---

@tool
def research_qa(query: str, paper_ids: str) -> str:
    """Search for answers within specific papers. Input 'paper_ids' must be comma-separated."""
    id_list = [pid.strip() for pid in paper_ids.split(",") if pid.strip()]
    
    query_vector = embeddings.embed_query(query)
    search_results = index.query(
        vector=query_vector, 
        filter={"paper_id": {"$in": id_list}}, 
        top_k=6, 
        include_metadata=True
    )
    
    context = ""
    for res in search_results["matches"]:
        source = res['metadata'].get('title', 'Unknown')
        context += f"\n[Source: {source}] {res['metadata']['text']}\n"
    
    if not context:
        return "No relevant information found in the specified documents."

    prompt = f"Using the context below, answer the user query: {query}\n\nContext:\n{context}"
    return llm.invoke(prompt).content

@tool
def compare_papers(paper_ids: str) -> str:
    """Summarizes and compares multiple papers by their IDs."""
    id_list = [pid.strip() for pid in paper_ids.split(",") if pid.strip()]
    full_context = ""
    
    for pid in id_list:
        res = index.query(vector=[0.0]*384, filter={"paper_id": pid}, top_k=5, include_metadata=True)
        title = res['matches'][0]['metadata'].get('title', pid) if res['matches'] else pid
        text = "\n".join([m['metadata']['text'] for m in res['matches']])
        full_context += f"\n--- PAPER: {title} ---\n{text}\n"

    prompt = f"Provide a comparative analysis of these papers highlighting differences in methods and results:\n{full_context}"
    return llm.invoke(prompt).content

tools = [research_qa, compare_papers]

# --- 4. Agent Prompt Template ---

AGENT_PROMPT_TEMPLATE = """You are a Research Assistant. You help users analyze specific documents.

DOCUMENT LOOKUP TABLE (Use these IDs for tools):
{doc_map_str}

INSTRUCTIONS:
1. If the user mentions a document by name, find its ID in the table above.
2. To answer questions, you MUST use the 'research_qa' tool and pass the correct IDs.
3. If you need to compare, use 'compare_papers'.
4. If a document is not in the table, tell the user you don't have access to it.

Tools: {tools}
Tool Names: {tool_names}

Format:
Question: the input question
Thought: I should check which document IDs the user is referring to.
Action: the action to take (one of [{tool_names}])
Action Input: "the query string", "id1, id2"
Observation: the result
... (repeat if needed)
Final Answer: The final response to the user.

Begin!
Question: {input}
Thought: {agent_scratchpad}"""

# --- 5. FastAPI App ---

app = FastAPI()
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

@app.post("/ask")
async def ask_question(
    query: str = Form(...),
    files: Optional[List[UploadFile]] = File(None),
    document_ids_to_reference: Optional[str] = Form(None)
):
    active_docs = []

    # A. Process IDs from the Library (Firebase)
    if document_ids_to_reference:
        lib_ids = [i.strip() for i in document_ids_to_reference.split(",") if i.strip()]
        active_docs.extend(fetch_and_process_library_docs(lib_ids))

    # B. Process direct File Uploads from the chat
    if files:
        for file in files:
            file_bytes = await file.read()
            text = extract_text_from_pdf(file_bytes)
            temp_id = f"upload_{uuid.uuid4().hex[:6]}"
            title = file.filename
            process_and_upload_text(text, temp_id, title)
            active_docs.append({"id": temp_id, "title": title})

    if not active_docs:
        # If no documents are sent, the agent will have no table to look at
        doc_map_str = "No documents provided."
    else:
        # Build the table the Agent uses to identify docs by name
        doc_map_str = "\n".join([f"- ID: {d['id']}, Name: {d['title']}" for d in active_docs])

    # C. Initialize Agent with Dynamic Prompt
    prompt = PromptTemplate.from_template(
        AGENT_PROMPT_TEMPLATE.replace("{doc_map_str}", doc_map_str)
    )
    
    agent = create_react_agent(llm, tools, prompt)
    agent_executor = AgentExecutor(
        agent=agent, 
        tools=tools, 
        verbose=True, 
        handle_parsing_errors=True,
        max_iterations=5
    )

    try:
        # D. Run the Agent
        result = agent_executor.invoke({"input": query})
        return {"answer": result["output"]}
    except Exception as e:
        print(f"Agent Error: {str(e)}")
        return {"answer": "I'm sorry, I couldn't process that research request. Please try again."}

@app.get("/health")
async def health():
    return {"status": "online"}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)