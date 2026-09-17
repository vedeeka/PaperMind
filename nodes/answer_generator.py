from langchain_google_genai import ChatGoogleGenerativeAI

from state import ResearchState


llm = ChatGoogleGenerativeAI(
    model="gemini-2.5-flash"
)


def generate_answer(state: ResearchState):

    prompt = f"""
You are a research assistant.

Original question:
{state["question"]}

Research questions:
{state["sub_questions"]}

Retrieved research:
{state["research_results"]}

Using ONLY the retrieved research:

- Synthesize the information
- Do not invent facts
- Explain important findings
- Mention sources and pages when available
- Clearly distinguish information from different sources

Write a clear, structured answer.
"""

    response = llm.invoke(prompt)

    return {
        "final_answer": response.content
    }