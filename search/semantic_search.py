from database.chroma import collection


def semantic_search(query: str):

    results = collection.query(
        query_texts=[query],
        n_results=5
    )

    documents = results["documents"][0]
    metadatas = results["metadatas"][0]
    distances = results["distances"][0]

    return [
        {
            "text": documents[i],
            "source": metadatas[i]["source"],
            "page": metadatas[i]["page"],
            "distance": distances[i]
        }
        for i in range(len(documents))
    ]