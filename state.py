from typing import TypedDict


class ResearchState(TypedDict):

    question: str

    sub_questions: list

    research_results: list

    final_answer: str

    human_approved: bool

    current_question: str

    search_count: int