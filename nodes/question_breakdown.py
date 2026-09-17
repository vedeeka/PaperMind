from state import ResearchState
from llm_helper import invoke_llm_safely


def breakdown_question(state: ResearchState):
    question = state["question"]
    api_key = state.get("api_key", None)

    prompt = f"""
You are a research planning agent.

Break this research question into 3-5 concise, precise sub-questions that should be investigated in academic papers.

Original question:
{question}

Return ONLY the questions.
One question per line.
"""

    response_text = invoke_llm_safely(
        prompt=prompt,
        override_key=api_key,
        fallback_type="breakdown",
        context_data={"question": question}
    )

    sub_questions = [
        line.strip()
        for line in response_text.split("\n")
        if line.strip() and not line.strip().lower().startswith("here are")
    ]

    return {
        "sub_questions": sub_questions,
        "search_count": 0,
        "research_results": []
    }