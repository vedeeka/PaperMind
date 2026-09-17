from langchain_google_genai import ChatGoogleGenerativeAI

from state import ResearchState


llm = ChatGoogleGenerativeAI(
    model="gemini-2.5-flash"
)


def breakdown_question(state: ResearchState):

    question = state["question"]

    prompt = f"""
You are a research planning agent.

Break this research question into 3-5 smaller
questions that should be investigated.

Original question:
{question}

Return ONLY the questions.
One question per line.
"""

    response = llm.invoke(prompt)

    sub_questions = [
        line.strip()
        for line in response.content.split("\n")
        if line.strip()
    ]

    return {
        "sub_questions": sub_questions
    }