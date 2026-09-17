from database.chroma import get_collection


def semantic_search(query: str, n_results: int = 5):
    col = get_collection()
    total_docs = col.count()
    if total_docs == 0:
        return []

    fetch_k = min(n_results, total_docs)

    results = col.query(
        query_texts=[query],
        n_results=fetch_k
    )


    if not results or not results.get("documents") or not results["documents"][0]:
        return []

    documents = results["documents"][0]
    metadatas = results["metadatas"][0] if results.get("metadatas") else [{}] * len(documents)
    distances = results["distances"][0] if results.get("distances") else [0.0] * len(documents)

    return [
        {
            "text": documents[i],
            "source": metadatas[i].get("source", "Unknown Document"),
            "page": metadatas[i].get("page", 1),
            "distance": round(distances[i], 4) if distances else 0.0,
            "similarity": round(max(0.0, min(1.0, 1.0 - (distances[i] if distances else 0.0))), 4)
        }
        for i in range(len(documents))
    ]