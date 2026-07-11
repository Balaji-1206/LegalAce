"""
Scratch script to check FAISS retrieval scores for different queries.
"""
from app.modules.chatbot.rag import embedder, faiss_store

def test():
    embedder.load_embedder()
    faiss_store.load_index()
    
    queries = [
        "what is cancer?",
        "how to bake a chocolate cake",
        "i have beaten an officer",
        "my loan due date is finished",
        "my loan date is finished, so the officers have taken my home",
        "tell me about POCSO",
        "tell me about POSCo",
        "who won the cricket match?"
    ]
    
    for q in queries:
        vec = embedder.embed(q)
        results = faiss_store.search(vec, top_k=3)
        print(f"\nQuery: {q}")
        for i, res in enumerate(results, 1):
            print(f"  [{i}] {res.act_name} - {res.section_number} ({res.section_title}) -> Score: {res.score:.4f}")

if __name__ == "__main__":
    test()
