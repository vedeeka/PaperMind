from state import ResearchState
from main import semantic_search


def search_papers(state: ResearchState):

    all_results = []

    for question in state["sub_questions"]:

        results = semantic_search(question)

        all_results.append({
            "question": question,
            "results": results
        })

    return {
        "research_results": all_results
    }