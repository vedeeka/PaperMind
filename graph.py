from langgraph.graph import StateGraph, START, END

from state import ResearchState

from nodes.question_breakdown import breakdown_question
from nodes.human_validation import human_validation
from nodes.research_react import (
    research_decision,
    perform_search,
    research_router
)
from nodes.answer_generator import generate_answer


graph = StateGraph(ResearchState)


# -------------------------
# Nodes
# -------------------------

graph.add_node(
    "breakdown",
    breakdown_question
)

graph.add_node(
    "human_validation",
    human_validation
)

graph.add_node(
    "research_decision",
    research_decision
)

graph.add_node(
    "search",
    perform_search
)

graph.add_node(
    "answer",
    generate_answer
)


# -------------------------
# Initial flow
# -------------------------

graph.add_edge(
    START,
    "breakdown"
)

graph.add_edge(
    "breakdown",
    "human_validation"
)


# -------------------------
# Human validation
# -------------------------

def validation_router(state: ResearchState):

    if state["human_approved"]:
        return "research"

    return "breakdown"


graph.add_conditional_edges(
    "human_validation",
    validation_router,
    {
        "research": "research_decision",
        "breakdown": "breakdown"
    }
)


# -------------------------
# ReAct loop
# -------------------------

graph.add_conditional_edges(
    "research_decision",
    research_router,
    {
        "search": "search",
        "done": "answer"
    }
)


graph.add_edge(
    "search",
    "research_decision"
)


# -------------------------
# Final answer
# -------------------------

graph.add_edge(
    "answer",
    END
)


research_agent = graph.compile()