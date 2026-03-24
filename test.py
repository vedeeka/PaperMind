import fitz
import os
import google.generativeai as genai

from dotenv import load_dotenv
from sentence_transformers import SentenceTransformer

from langchain_text_splitters import RecursiveCharacterTextSplitter

from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_pinecone import PineconeVectorStore
from langchain_core.tools import tool

from langchain_classic.chains import RetrievalQA

from pinecone import Pinecone, ServerlessSpec




load_dotenv()

gemini_api_key = os.getenv("gem")
pinecone_api_key = os.getenv("pinecone")

genai.configure(api_key=gemini_api_key)

print("Gemini API configured")



pc = Pinecone(api_key=pinecone_api_key)

index_name = "deepresearch"

existing_indexes = [i["name"] for i in pc.list_indexes()]

if index_name not in existing_indexes:

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




embeddings = HuggingFaceEmbeddings(
    model_name="BAAI/bge-small-en-v1.5"
)

print("Embedding model loaded")



splitter = RecursiveCharacterTextSplitter(
    chunk_size=800,
    chunk_overlap=200
)




papers_folder = "deepresearch/papers"

if index.describe_index_stats()["total_vector_count"] == 0:

    vectors = []

    original_embedding_model = SentenceTransformer(
        "BAAI/bge-small-en-v1.5"
    )

    for file in os.listdir(papers_folder):

        if file.endswith(".pdf"):

            path = os.path.join(papers_folder, file)

            print("Processing:", file)

            doc = fitz.open(path)

            text = ""

            for page in doc:
                text += page.get_text()

            chunks = splitter.split_text(text)

            embeds = original_embedding_model.encode(chunks)

            for i, chunk in enumerate(chunks):

                vectors.append({
                    "id": f"{file}_{i}",
                    "values": embeds[i].tolist(),
                    "metadata": {
                        "text": chunk,
                        "paper": file
                    }
                })

    if len(vectors) > 0:
        index.upsert(vectors=vectors)
        print("Embeddings stored in Pinecone")

else:

    print("Pinecone index already populated")


llm = ChatGoogleGenerativeAI(
    model="gemini-2.5-flash",
    google_api_key=gemini_api_key,
    temperature=0.3
)

print("Gemini LLM initialized")




vector_store = PineconeVectorStore(
    index=index,
    embedding=embeddings,
    text_key="text"
)

retriever = vector_store.as_retriever(
    search_kwargs={"k": 5}
)

print("Retriever initialized")




qa_chain = RetrievalQA.from_chain_type(
    llm=llm,
    retriever=retriever,
    chain_type="stuff",
    return_source_documents=True
)

    

print("RAG chain ready")




def comparison_agent(papers: str):

    paper_list = [p.strip() for p in papers.split(",")]

    embed_model = SentenceTransformer("BAAI/bge-small-en-v1.5")

    context = ""

    for paper in paper_list:

        query_vec = embed_model.encode(
            f"summary of {paper}"
        ).tolist()
        

        results = index.query(
            vector=query_vec,
            filter={"paper": paper},
            top_k=200,
            include_metadata=True
        )

        context += f"\n--- {paper} ---\n"

        for r in results["matches"]:
            context += r["metadata"]["text"] + "\n"

    prompt = f"""
Compare these research papers.

Context:
{context}

For each paper give:

1. Technique
2. Strengths
3. Weaknesses

Then give a final comparison.
"""

    return llm.invoke(prompt).content


def literature_review_agent(_):

    stats = index.describe_index_stats()

    embed_model = SentenceTransformer("BAAI/bge-small-en-v1.5")

    query = embed_model.encode(
        "research paper summary"
    ).tolist()

    results = index.query(
        vector=query,
        top_k=stats["total_vector_count"],
        include_metadata=True
    )

    context = ""

    for r in results["matches"]:
        context += r["metadata"]["text"] + "\n"

    prompt = f"""
Write a structured literature review.

Context:
{context}

Sections:

1 Introduction
2 Existing Methods
3 Key Findings
4 Limitations
5 Future Work
"""

    return llm.invoke(prompt).content



@tool
def research_qa(query: str) -> str:
    """Answer questions from research papers."""
    return qa_chain.invoke({"query": query})["result"]

@tool
def comparison_agent_tool(papers: str) -> str:
    """Compare research papers."""
    return comparison_agent(papers)


@tool
def review_agent_tool(_: str) -> str:
    """Write a literature review."""
    return literature_review_agent(_)

tools = [research_qa, comparison_agent_tool, review_agent_tool]



from langchain.agents import create_agent
from langchain_core.prompts import PromptTemplate



prompt =  """You are a research assistant.

            Use the available tools to answer questions about research papers.
            Be concise and to the point.
            Always use the tools when relevant.

            Tools:
            {tools}

            Question: {input}
            {agent_scratchpad}
            """


agent = create_agent(
    model=llm,
    tools=tools,
    system_prompt=prompt
)





print("Agent ready")




print("\nDeepResearch AI Agent\n")

while True:

    query = input("Ask question: ")

    if query == "exit":
        break

    response = agent.invoke({
        "messages": [
            {"role": "user", "content": query}
        ]
    })

    print("\nAnswer:\n")
    print(response)