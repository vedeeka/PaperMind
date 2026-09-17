from langchain_google_genai import ChatGoogleGenerativeAI

from search.semantic_search import semantic_search
from state import ResearchState


llm = ChatGoogleGenerativeAI(
    model="gemini-2.5-flash"
)


def research_decision(state: ResearchState):

    question = state["question"]

    sub_questions = state["sub_questions"]

    previous_results = state["research_results"]

    prompt = f"""
You are a research agent.

Original research question:
{question}

Research areas:
{sub_questions}

Previous research:
{previous_results}

Decide what you should investigate next.

If more information is needed, return:

SEARCH: <one precise search query>

If enough information has been collected, return:

DONE

Return ONLY one of these formats.
"""

    response = llm.invoke(prompt)

    decision = response.content.strip()

    if decision.startswith("SEARCH:"):

        search_query = decision.replace(
            "SEARCH:",
            ""
        ).strip()

        return {
            "current_question": search_query
        }

    return {
        "current_question": "DONE"
    }