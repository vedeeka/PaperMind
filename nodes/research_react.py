from state import ResearchState
from search.semantic_search import semantic_search
from llm_helper import invoke_llm_safely
import re


def research_decision(state: ResearchState):
    question = state.get("question", "")
    sub_questions = state.get("sub_questions", [])
    previous_results = state.get("research_results", [])
    search_count = state.get("search_count", 0)
    api_key = state.get("api_key", None)
    steps = list(state.get("steps", []))

    # Safety guard: stop after enough searches or if no sub_questions
    if search_count >= 5 or (sub_questions and search_count >= len(sub_questions)):
        steps.append({
            "step": f"Reasoning Decision #{search_count + 1}",
            "type": "decision",
            "action": "DONE",
            "thought": "Sufficient literature context retrieved across all target research areas."
        })
        return {
            "current_question": "DONE",
            "steps": steps
        }

    prompt = f"""
You are an autonomous academic research agent executing a ReAct investigation loop.

Original research question:
{question}

Sub-questions to investigate:
{sub_questions}

Number of searches completed so far: {search_count}

Previous research findings:
{previous_results}

Decide what specific query to investigate next via academic vector search.

If more information is needed, return EXACTLY:
SEARCH: <one precise search query>

If enough information has been collected to synthesize a complete report, return:
DONE

Return ONLY one of these formats.
"""

    context_data = {
        "question": question,
        "sub_questions": sub_questions,
        "research_results": previous_results,
        "search_count": search_count
    }

    decision_text = invoke_llm_safely(
        prompt=prompt,
        override_key=api_key,
        fallback_type="decision",
        context_data=context_data
    )

    decision = decision_text.strip()

    if decision.startswith("SEARCH:"):
        search_query = decision.replace("SEARCH:", "").strip()
        search_query = re.sub(r"^\d+[\.\)]\s*", "", search_query)
        steps.append({
            "step": f"Reasoning Decision #{search_count + 1}",
            "type": "decision",
            "action": f"SEARCH: {search_query}",
            "thought": f"Agent determined next search focus: '{search_query}'"
        })
        return {
            "current_question": search_query,
            "steps": steps
        }

    steps.append({
        "step": f"Reasoning Decision #{search_count + 1}",
        "type": "decision",
        "action": "DONE",
        "thought": "Agent concluded that sufficient context has been retrieved."
    })
    return {
        "current_question": "DONE",
        "steps": steps
    }


def perform_search(state: ResearchState):
    query = state.get("current_question", "")
    current_results = list(state.get("research_results", []))
    search_count = state.get("search_count", 0)
    steps = list(state.get("steps", []))

    if not query or query == "DONE":
        return {
            "research_results": current_results,
            "search_count": search_count,
            "steps": steps
        }

    # Execute vector retrieval against ChromaDB
    try:
        search_hits = semantic_search(query)
    except Exception as e:
        print(f"Error performing semantic search: {e}")
        search_hits = []

    current_results.append({
        "query": query,
        "results": search_hits
    })

    steps.append({
        "step": f"Vector Search #{search_count + 1}",
        "type": "search",
        "query": query,
        "hits_count": len(search_hits),
        "top_sources": list(set(hit.get("source", "doc") for hit in search_hits[:3]))
    })

    return {
        "research_results": current_results,
        "search_count": search_count + 1,
        "steps": steps
    }


def research_router(state: ResearchState):
    current = state.get("current_question", "DONE")
    search_count = state.get("search_count", 0)

    if current != "DONE" and search_count < 5:
        return "search"

    return "done"