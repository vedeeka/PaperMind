# PaperMind
# 🧠 PaperMind — Agentic RAG Research System

PaperMind is an AI-powered research assistant designed to analyze, compare, and extract insights from multiple research papers using Retrieval-Augmented Generation (RAG) and agentic workflows.

Unlike basic LLM tools that rely on single prompts, PaperMind uses a multi-step reasoning pipeline to retrieve relevant context, process information, and generate structured outputs with better accuracy and traceability.

---

## 🚀 Features

- 📄 **Multi-Paper Analysis** — Compare and synthesize insights across multiple research papers  
- 🔍 **Semantic Search** — Retrieve relevant sections using vector embeddings  
- 🤖 **Agentic Workflows** — Separate agents for retrieval, reasoning, and summarization  
- 🧾 **Citation-Aware Responses** — Outputs grounded in source documents  
- ⚡ **Scalable Pipeline** — Handles large document sets efficiently  

---

## 🏗️ System Architecture

PaperMind follows an Agentic RAG pipeline:

1. **Document Ingestion**
   - Upload research papers (PDFs)
   - Extract and chunk text

2. **Embedding & Storage**
   - Convert text into vector embeddings
   - Store in a vector database

3. **Retrieval Agent**
   - Finds the most relevant chunks based on user query

4. **Reasoning Agent**
   - Processes retrieved data
   - Performs comparison / summarization

5. **Response Generator**
   - Produces structured answers with references

---

## 🛠️ Tech Stack

- **LLMs:**   Gemini 
- **Framework:** LangChain  
- **Vector DB:** FAISS / Chroma  
- **Backend:** Python (Flask / FastAPI)  
- **Embedding Models:** Sentence Transformers  



