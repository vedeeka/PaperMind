from state import ResearchState


def human_validation(state: ResearchState):
    # In web/API mode, if human_approved is already set in the state, preserve it
    if "human_approved" in state and state["human_approved"] is not None:
        return {
            "human_approved": bool(state["human_approved"])
        }

    # Default to approved if running non-interactively
    return {
        "human_approved": True
    }