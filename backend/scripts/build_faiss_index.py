"""
Build FAISS Index — One-time setup script.

Run this from the backend/ directory with the venv activated:
  python scripts/build_faiss_index.py

This script:
  1. Loads the Indian Law Corpus from data/indian_law_corpus.json
  2. Generates embeddings using SentenceTransformer (all-MiniLM-L6-v2)
  3. Builds a FAISS IndexFlatIP (cosine similarity)
  4. Saves the index to faiss_index/index.faiss and faiss_index/index.pkl

After running this script, the index will be loaded automatically on server startup.
"""
import sys
import os

# Add the backend directory to sys.path so app imports work
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from dotenv import load_dotenv
load_dotenv()

from app.rag import embedder, faiss_store


def main():
    print("=" * 60)
    print("  LegalAce -- Building FAISS Index")
    print("=" * 60)

    print("\n[1/3] Loading embedding model...")
    embedder.load_embedder()
    print("      [OK] Embedding model loaded")

    print("\n[2/3] Building FAISS index from Indian Law Corpus...")
    faiss_store.build_and_save_index()
    print("      [OK] FAISS index built and saved")

    print("\n[3/3] Verifying index...")
    faiss_store.load_index()

    # Quick test search
    test_query = "landlord not returning security deposit"
    test_vector = embedder.embed(test_query)
    results = faiss_store.search(test_vector, top_k=3)

    print(f"\n  Test query: '{test_query}'")
    print("  Top 3 results:")
    for i, r in enumerate(results, 1):
        print(f"    [{i}] {r.act_name} — {r.section_number}")
        print(f"         Score: {r.score:.4f} | Category: {r.category}")

    print("\n" + "=" * 60)
    print("  [DONE] FAISS index ready! You can now start the server:")
    print("     uvicorn app.main:app --reload")
    print("=" * 60)


if __name__ == "__main__":
    main()
