from state import ResearchState


def human_validation(state: ResearchState):

    print("\nResearch questions:\n")

    for i, question in enumerate(
        state["sub_questions"],
        1
    ):
        print(f"{i}. {question}")

    decision = input(
        "\nApprove these questions? (yes/no): "
    )

    return {
        "human_approved": decision.lower() == "yes"
    }