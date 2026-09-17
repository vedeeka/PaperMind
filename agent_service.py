import os
import time
from typing import List, Dict, Any, Optional
from graph import research_agent
from nodes.question_breakdown import breakdown_question
from nodes.research_react import perform_search, research_decision
from nodes.answer_generator import generate_answer
from llm_helper import invoke_llm_safely
from database.chroma import collection


def get_sub_questions(question: str, api_key: Optional[str] = None) -> List[str]:
    """Generates 3-5 sub-questions for human review."""
    state = {
        "question": question,
        "api_key": api_key
    }
    result = breakdown_question(state)
    return result.get("sub_questions", [])


def run_research_pipeline(
    question: str,
    sub_questions: Optional[List[str]] = None,
    api_key: Optional[str] = None
) -> Dict[str, Any]:
    """
    Executes the full agentic research pipeline with detailed telemetry
    and step-by-step logs for UI visualization.
    """
    start_time = time.time()
    steps = []

    # Step 1: Breakdown if not provided
    if not sub_questions:
        steps.append({
            "stage": "breakdown",
            "title": "Query Deconstruction & Planning",
            "timestamp": time.time(),
            "detail": f"Analyzing query: '{question}' and extracting core scientific sub-questions."
        })
        sq_result = breakdown_question({"question": question, "api_key": api_key})
        sub_questions = sq_result.get("sub_questions", [])

    steps.append({
        "stage": "validation",
        "title": "Sub-Questions Formulation",
        "timestamp": time.time(),
        "sub_questions": sub_questions,
        "detail": f"Validated {len(sub_questions)} target research areas."
    })

    # Execute ReAct loop
    state = {
        "question": question,
        "sub_questions": sub_questions,
        "research_results": [],
        "search_count": 0,
        "human_approved": True,
        "api_key": api_key,
        "steps": []
    }

    # Iterate through ReAct loop
    react_iterations = 0
    max_iterations = min(len(sub_questions), 4)

    for i in range(max_iterations):
        react_iterations += 1
        # Decision node
        decision_res = research_decision(state)
        state["current_question"] = decision_res.get("current_question", "DONE")
        if "steps" in decision_res:
            state["steps"] = decision_res["steps"]

        if state["current_question"] == "DONE":
            steps.append({
                "stage": "react_decision",
                "title": f"ReAct Reasoning Cycle #{react_iterations}",
                "timestamp": time.time(),
                "action": "DONE",
                "thought": "Agent determined sufficient literature context has been accumulated."
            })
            break

        current_q = state["current_question"]
        steps.append({
            "stage": "react_decision",
            "title": f"ReAct Reasoning Cycle #{react_iterations}",
            "timestamp": time.time(),
            "action": f"SEARCH: {current_q}",
            "thought": f"Agent decided to investigate vector embeddings for: '{current_q}'"
        })

        # Search node
        search_res = perform_search(state)
        state["research_results"] = search_res.get("research_results", state["research_results"])
        state["search_count"] = search_res.get("search_count", state["search_count"])
        if "steps" in search_res:
            state["steps"] = search_res["steps"]

        latest_hits = state["research_results"][-1].get("results", []) if state["research_results"] else []
        steps.append({
            "stage": "search",
            "title": f"Vector Retrieval #{react_iterations}",
            "timestamp": time.time(),
            "query": current_q,
            "hits_count": len(latest_hits),
            "hits": latest_hits[:3]  # top 3 snippets
        })

    # Step 5: Answer synthesis
    steps.append({
        "stage": "answer",
        "title": "Report Synthesis & Grounding",
        "timestamp": time.time(),
        "detail": "Synthesizing retrieved passages into citation-grounded scientific brief."
    })

    answer_res = generate_answer(state)
    final_answer = answer_res.get("final_answer", "")

    duration = round(time.time() - start_time, 2)

    # Collect distinct sources and citations
    sources = set()
    total_passages = 0
    for res_group in state.get("research_results", []):
        for hit in res_group.get("results", []):
            total_passages += 1
            src = hit.get("source", "Paper")
            page = hit.get("page", 1)
            sources.add(f"{src} (p.{page})")

    return {
        "question": question,
        "sub_questions": sub_questions,
        "final_answer": final_answer,
        "steps": steps,
        "research_results": state.get("research_results", []),
        "sources": sorted(list(sources)),
        "total_passages": total_passages,
        "duration_seconds": duration,
        "iterations": react_iterations
    }


def compare_papers(papers: List[str], api_key: Optional[str] = None) -> Dict[str, Any]:
    """Generates a structured comparative matrix for selected papers."""
    prompt = f"""
You are a senior academic peer reviewer comparing the following research papers:
{papers}

Generate a comprehensive, structured comparison table and analytical narrative comparing:
1. Core Architectural / Theoretical Paradigm
2. Key Algorithmic Contributions
3. Datasets & Empirical Evaluation Benchmarks
4. Primary Advantages vs Known Limitations
5. Computational Complexity & Scalability

Format clearly in Markdown with headers and a comparison table.
"""

    response_text = invoke_llm_safely(
        prompt=prompt,
        override_key=api_key,
        fallback_type="compare",
        context_data={"papers": papers}
    )

    return {
        "papers": papers,
        "comparison_report": response_text
    }
