from state import ResearchState
from llm_helper import invoke_llm_safely


def generate_answer(state: ResearchState):
    question = state.get("question", "")
    sub_questions = state.get("sub_questions", [])
    research_results = state.get("research_results", [])
    api_key = state.get("api_key", None)
    steps = list(state.get("steps", []))

    prompt = f"""
You are an expert academic research assistant synthesizing findings from scientific literature.

Original Research Question:
{question}

Target Sub-Questions:
{sub_questions}

Retrieved Scientific Excerpts and Citations:
{research_results}

Synthesis Guidelines:
1. Synthesize the findings into a clear, structured Markdown report.
2. Group insights by sub-question or key thematic areas.
3. Every factual assertion MUST include exact citations referencing the source paper and page number (e.g., `[paper1.pdf, p.3]`).
4. Include quantitative benchmark numbers, algorithmic specifics, and architectural details if mentioned in the context.
5. Highlight key strengths, limitations, and trade-offs.
6. Do not fabricate or invent facts outside the retrieved research context.
"""

    context_data = {
        "question": question,
        "sub_questions": sub_questions,
        "research_results": research_results
    }

    final_answer = invoke_llm_safely(
        prompt=prompt,
        override_key=api_key,
        fallback_type="answer",
        context_data=context_data
    )

    steps.append({
        "step": "Final Report Synthesis",
        "type": "answer",
        "action": "GENERATED_REPORT",
        "thought": "Synthesized comprehensive multi-paper report with grounded citations."
    })

    return {
        "final_answer": final_answer,
        "steps": steps
    }