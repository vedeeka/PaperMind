import fitz
import os
import google.generativeai as genai

from dotenv import load_dotenv
from sentence_transformers import SentenceTransformer
from langchain_text_splitters import RecursiveCharacterTextSplitter

from pinecone import Pinecone, ServerlessSpec


# -----------------------------
# LOAD ENV VARIABLES
# -----------------------------

load_dotenv()

gemini_api_key = os.getenv("gem")
pinecone_api_key = os.getenv("pinecone")

genai.configure(api_key=gemini_api_key)

model_gemini = genai.GenerativeModel("gemini-2.5-flash")

print("Gemini loaded")


# -----------------------------
# INITIALIZE PINECONE
# -----------------------------

pc = Pinecone(api_key=pinecone_api_key)

index_name = "deepresearch"

# create index if not exists
if index_name not in pc.list_indexes().names():

    pc.create_index(
        name=index_name,
        dimension=384,
        metric="cosine",
        spec=ServerlessSpec(
            cloud="aws",
            region="us-east-1"
        )
    )

index = pc.Index(index_name)

print("Pinecone initialized")


# -----------------------------
# EMBEDDING MODEL
# -----------------------------

embedding_model = SentenceTransformer("BAAI/bge-small-en-v1.5")

print("Embedding model loaded")


# -----------------------------
# TEXT SPLITTER
# -----------------------------

splitter = RecursiveCharacterTextSplitter(
    chunk_size=800,
    chunk_overlap=200
)


# -----------------------------
# INGEST PDF PAPERS (Modified to only ingest if index is empty)
# -----------------------------
# Only ingest if the index is empty to avoid re-uploading on every run
if index.describe_index_stats().total_vector_count == 0:
    papers_folder = "deepresearch/papers"
    vectors = []

    # Create the papers folder if it doesn't exist
    if not os.path.exists(papers_folder):
        os.makedirs(papers_folder)
        print(f"Created folder: {papers_folder}. Please add your PDF papers here.")
    else:
        for file in os.listdir(papers_folder):
            if file.endswith(".pdf"):
                path = os.path.join(papers_folder, file)
                print("Processing:", file)

                doc = fitz.open(path)
                text = ""
                for page in doc:
                    text += page.get_text()

                chunks = splitter.split_text(text)
                embeddings = embedding_model.encode(chunks)

                for i, chunk in enumerate(chunks):
                    vectors.append({
                        "id": file + "_" + str(i),
                        "values": embeddings[i].tolist(),
                        "metadata": {
                            "text": chunk,
                            "paper": file
                        }
                    })

        # store in pinecone
        if len(vectors) > 0:
            index.upsert(vectors=vectors)
            print("Embeddings stored in Pinecone")
        else:
            print("No new PDF papers found to ingest.")
else:
    print("Pinecone index already contains vectors. Skipping ingestion.")


# -----------------------------
# AGENT FUNCTIONS
# -----------------------------

def planner_agent(query):
    """Breaks down a complex research question into actionable steps."""
    prompt = f"""
    Break this research question into logical, sequential steps that an AI research assistant can follow.
    Each step should be a clear, concise instruction.

    Question: {query}

    Example Output Format:
    1. Understand the main concepts in the question.
    2. Identify key entities or terms.
    3. Search for information related to X.
    4. Analyze findings for Y.
    5. Synthesize a comprehensive answer.
    """
    response = model_gemini.generate_content(prompt)
    return response.text

def retriever_agent(query_text, top_k=5):
    """
    Retrieves relevant document chunks from Pinecone based on a query.
    """
    query_embedding = embedding_model.encode(query_text).tolist()

    results = index.query(
        vector=query_embedding,
        top_k=top_k,
        include_metadata=True
    )

    retrieved_chunks = [match["metadata"]["text"] for match in results["matches"]]
    sources = [match["metadata"]["paper"] for match in results["matches"]]

    return retrieved_chunks, list(set(sources)) # Return unique sources

def analyzer_agent(chunks):
    """Extracts key research findings and synthesizes information from retrieved chunks."""
    context = "\n".join(chunks)

    prompt = f"""
    You are an expert research analyst.
    Review the following research context and extract the most important findings,
    key arguments, and critical data points relevant to a research question.
    Synthesize this information into a concise and informative summary.

    Context:
    {context}
    """
    response = model_gemini.generate_content(prompt)
    return response.text

def writer_agent(original_query, analysis, retrieved_sources):
    """Generates a structured answer based on the original query and the analysis."""
    prompt = f"""
    You are an AI research assistant.
    Based on the following original research question and the provided analysis,
    formulate a comprehensive and well-structured answer.
    Cite the sources where the information was retrieved from.

    Original Question:
    {original_query}

    Analysis from Research:
    {analysis}

    Sources:
    {', '.join(retrieved_sources)}

    Provide a clear, detailed, and evidence-based explanation.
    Start directly with the answer without preamble.
    """
    response = model_gemini.generate_content(prompt)
    return response.text

def comparison_agent(paper_names):
    """
    Compares specified research papers by retrieving all chunks for each paper
    and then analyzing them for key techniques, strengths, weaknesses, and a final comparison.
    """
    if not paper_names:
        return "Please specify at least two papers to compare."

    all_paper_chunks = {}
    for paper in paper_names:
        query_vec = embedding_model.encode(f"summary of the research paper {paper}").tolist()

        results = index.query(
            vector=query_vec,
            filter={"paper": paper},
            top_k=500, # Get a large number to ensure all chunks are potentially retrieved
            include_metadata=True
        )

        chunks_for_paper = [match["metadata"]["text"] for match in results["matches"]]
        if chunks_for_paper:
            all_paper_chunks[paper] = chunks_for_paper
        else:
            print(f"Warning: No chunks found for paper '{paper}' in the index with a relevant query.")

    if not all_paper_chunks:
        return "Could not retrieve content for the specified papers. Please ensure they are indexed."

    comparison_context = ""
    for paper, chunks in all_paper_chunks.items():
        comparison_context += f"\n--- Paper: {paper} ---\n"
        comparison_context += "\n".join(chunks) + "\n"

    prompt = f"""
    You are an AI research analyst.
    Compare the research ideas across these papers based on the provided context.

    Context:
    {comparison_context}

    For each paper, clearly provide:
    1.  **Key Technique/Methodology:** Describe the core approach or technique used.
    2.  **Strengths:** What are the main advantages or contributions of this paper?
    3.  **Weaknesses/Limitations:** What are the drawbacks, unresolved issues, or areas for improvement?

    Finally, provide a **Comprehensive Comparison** that highlights similarities, differences,
    and unique contributions across all papers, and suggest potential future research directions
    or areas for synergy.
    """
    response = model_gemini.generate_content(prompt)
    return response.text

def literature_review_agent():
    """
    Generates a structured literature review from all papers currently in the Pinecone index.
    """
    print("Generating context for literature review...")

    # To get all documents from Pinecone, we need to iterate or perform a broad query.
    # A simple way for a relatively small index is to query with a generic vector
    # and a very high top_k, potentially iterating with pagination if the index is huge.
    # For now, let's use a generic query and assume top_k is sufficient for demonstration.

    # Generate a generic query to get all vectors. Using a zero vector can sometimes work,
    # or a very common word embedding.
    # A better way is to iterate through IDs if you track them.
    # For simplicity, let's query with a generic vector that is likely to return all (or most)
    # documents if top_k is set high enough.
    # If the index is truly large, a more sophisticated pagination would be needed.
    
    # We will use the index's `list_ids` or `describe_index_stats` to get an idea of scale,
    # then iterate. For now, a high `top_k` with a generic query.
    
    # A better approach would be to fetch all IDs and then batch fetch:
    # Example (conceptual, requires knowing all IDs):
    # all_ids = [v.id for v in index.describe_index_stats().vectors_per_namespace[''].top_k_items] # This doesn't get all IDs
    # all_ids = [] # This would need to be built during ingestion or queried via a more advanced API.
    # fetched_vectors = index.fetch(ids=all_ids) # If all_ids were available.

    # Simpler approach: query with a high top_k and a generic query vector
    generic_query_embedding = embedding_model.encode("research paper summary document").tolist()
    
    all_results = index.query(
        vector=generic_query_embedding,
        top_k=index.describe_index_stats().total_vector_count + 100, # Fetch more than total count
        include_metadata=True
    )
    
    # Organize chunks by paper for the literature review
    paper_context = {}
    if all_results and all_results.matches:
        for match in all_results.matches:
            doc = match["metadata"]["text"]
            paper = match["metadata"]["paper"]
            if paper not in paper_context:
                paper_context[paper] = []
            paper_context[paper].append(doc)
    else:
        return "No documents found in the Pinecone index to generate a literature review."

    context = ""
    for paper, chunks in paper_context.items():
        context += f"\n--- Paper: {paper} ---\n"
        context += "\n".join(chunks) + "\n"

    if not context:
        return "No relevant context could be compiled for the literature review."

    prompt = f"""
    You are an AI research assistant.

    Generate a structured literature review using the research paper context provided below.
    Synthesize information from different papers where appropriate.

    Context:
    {context}

    Write the literature review in the following structured format, including citations with paper names:

    1.  **Introduction:** Briefly introduce the overall research area and the purpose of this review.
    2.  **Existing Methods/Approaches:** Discuss the various methodologies, techniques, or models presented in the papers. Group similar approaches.
    3.  **Key Findings:** Summarize the main discoveries, contributions, and important results from each paper.
    4.  **Limitations:** Highlight the shortcomings, challenges, or areas for improvement identified in the reviewed research.
    5.  **Future Research Directions:** Suggest potential avenues for future work, open questions, or extensions based on the current literature.

    Use citations with paper names in square brackets, like: [paper_name.pdf].
    """
    response = model_gemini.generate_content(prompt)
    return response.text


# -----------------------------
# MAIN INTERACTION LOOP
# -----------------------------

print("\n==============================")
print("DeepResearch AI Assistant")
print("==============================\n")

while True:
    user_input = input("Ask your research question (e.g., 'What is X?', 'Compare paper1.pdf and paper2.pdf', 'Generate literature review', or 'exit'): ")

    if user_input.lower() == 'exit':
        print("Exiting DeepResearch AI Assistant. Goodbye!")
        break

    # Check for literature review command
    if user_input.lower() == 'generate literature review':
        print("\n--- Generating Literature Review ---")
        lit_review_output = literature_review_agent()
        print("\nLiterature Review:\n")
        print(lit_review_output)
        print("\n" + "="*50 + "\n")

    # Check for comparison command
    elif user_input.lower().startswith("compare "):
        paper_names_str = user_input[len("compare "):].strip()
        paper_names = [name.strip() for name in paper_names_str.split(' and ')]

        if len(paper_names) < 2:
            print("Please specify at least two papers to compare, e.g., 'Compare paper1.pdf and paper2.pdf'.")
            continue

        print(f"\n--- Comparing Papers: {', '.join(paper_names)} ---")
        comparison_output = comparison_agent(paper_names)
        print("\nResearch Paper Comparison:\n")
        print(comparison_output)
        print("\n" + "="*50 + "\n")

    else:
        # Standard Q&A flow
        user_query = user_input
        print(f"\nProcessing your question: '{user_query}'...")

        # Step 1: Plan the research
        print("\n--- Planning Research ---")
        plan_steps = planner_agent(user_query)
        print(plan_steps)

        # Step 2: Retrieve relevant information
        print("\n--- Retrieving Information ---")
        retrieved_chunks, sources = retriever_agent(user_query)
        if not retrieved_chunks:
            print("No relevant information found in the knowledge base. Please try a different query or add more papers.")
            continue

        print("\nRetrieved context (first 300 chars of each chunk):\n")
        for i, chunk in enumerate(retrieved_chunks):
            print(f"----- Chunk {i+1} (Source: {sources[0] if sources else 'N/A'}) -----") # Simplified source display
            print(chunk[:300] + "...")
            print()


        # Step 3: Analyze the retrieved information
        print("\n--- Analyzing Information ---")
        analysis_result = analyzer_agent(retrieved_chunks)
        print("\nKey Research Findings:\n")
        print(analysis_result)

        # Step 4: Write the final answer
        print("\n--- Generating Final Answer ---")
        final_answer = writer_agent(user_query, analysis_result, sources)

        print("\n==============================")
        print("DeepResearch AI Answer")
        print("==============================\n")
        print(final_answer)
        print("\nSources Used:")
        print(', '.join(sources))

        print("\n" + "="*50 + "\n")