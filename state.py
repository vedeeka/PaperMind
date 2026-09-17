from typing import TypedDict, Optional, List, Dict, Any


class ResearchState(TypedDict, total=False):
    question: str
    sub_questions: List[str]
    research_results: List[Dict[str, Any]]
    final_answer: str
    human_approved: bool
    current_question: str
    search_count: int
    api_key: Optional[str]
    thoughts: List[str]
    steps: List[Dict[str, Any]]