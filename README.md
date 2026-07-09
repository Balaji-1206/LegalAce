# LegalAce — AI Legal Chatbot Backend

AI-powered legal rights companion for Indian citizens. Provides legal **information** (not legal advice) with citations to actual Indian laws.

---

## Architecture

```
User Query
    ↓
Intent Classification (keyword-based)
    ↓
Embedding Generation (all-MiniLM-L6-v2, local)
    ↓
Vector Search (FAISS — Indian Law Corpus, 30 sections)
    ↓
Context Construction (top 5 relevant law sections)
    ↓
GPT-4 Response Generation (LangChain + guardrails)
    ↓
Structured JSON Response (answer + rights + action_steps + citations)
    ↓
Persist to MongoDB (multi-turn conversation storage)
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| API | FastAPI + Uvicorn |
| AI / LLM | LangChain + OpenAI GPT-4 |
| Embeddings | SentenceTransformers `all-MiniLM-L6-v2` (local, free) |
| Vector Store | FAISS (local index, no cloud needed) |
| Database | MongoDB (Motor async driver) |

---

## Project Structure

```
backend/
├── app/
│   ├── api/
│   │   ├── chat.py           # POST /chat, POST /conversation/new
│   │   ├── conversation.py   # GET/DELETE conversation endpoints
│   │   └── health.py         # GET /, GET /test-db
│   ├── rag/
│   │   ├── pipeline.py       # Full RAG orchestration
│   │   ├── embedder.py       # SentenceTransformer singleton
│   │   ├── faiss_store.py    # FAISS index build/load/search
│   │   ├── retriever.py      # Intent-aware vector retrieval
│   │   ├── prompt.py         # System prompt + guardrails
│   │   └── intent.py         # Query intent classification
│   ├── models/
│   │   └── conversation.py   # MongoDB document schema
│   ├── schemas/
│   │   ├── chat.py           # ChatRequest / ChatResponse
│   │   └── conversation.py   # Conversation schemas
│   ├── services/
│   │   ├── chat_service.py   # Process message (RAG + persist)
│   │   └── conversation_service.py  # MongoDB CRUD
│   ├── database/
│   │   └── mongodb.py        # Async MongoDB client
│   ├── core/
│   │   ├── config.py         # pydantic-settings
│   │   └── logging.py        # Structured JSON logging
│   └── main.py               # FastAPI app + lifespan
├── data/
│   └── indian_law_corpus.json   # 30 real Indian law sections
├── faiss_index/               # Auto-generated FAISS index
├── scripts/
│   └── build_faiss_index.py   # One-time index build script
├── .env                       # Environment variables
├── .env.example               # Template
└── requirements.txt
```

---

## Setup Instructions

### Prerequisites
- Python 3.10+
- MongoDB running on `localhost:27017`
- OpenAI API key

### 1. Create and activate virtual environment
```bash
# From the project root
python -m venv backend/.venv
.\activate.ps1        # PowerShell
# or
activate.bat          # Command Prompt
```

### 2. Install dependencies
```bash
cd backend
pip install -r requirements.txt
```

### 3. Configure environment
Copy `.env.example` to `.env` and fill in your values:
```env
MONGODB_URL=mongodb://localhost:27017/
DATABASE_NAME=LegalAce
OPENAI_API_KEY=sk-your-key-here
OPENAI_MODEL=gpt-4
EMBEDDING_MODEL=all-MiniLM-L6-v2
FAISS_INDEX_PATH=faiss_index
LAW_CORPUS_PATH=data/indian_law_corpus.json
```

### 4. Build the FAISS index (one-time)
```bash
python scripts/build_faiss_index.py
```
This downloads the embedding model (~90MB) and builds the vector index from the Indian Law Corpus.

### 5. Start the server
```bash
uvicorn app.main:app --reload
```

### 6. Open API docs
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

---

## API Reference

### `POST /api/v1/chat`
Send a legal question and receive a structured AI response.

**Request:**
```json
{
  "user_id": "user_abc123",
  "message": "My landlord is not returning my security deposit.",
  "conversation_id": null
}
```

**Response:**
```json
{
  "conversation_id": "uuid-string",
  "intent": "tenancy",
  "answer": "Under Indian law, your landlord is legally obligated...",
  "rights": [
    "You are entitled to receive your security deposit back upon vacating the premises.",
    "The landlord may only deduct amounts for unpaid rent or documented property damage."
  ],
  "action_steps": [
    "Step 1: Send a written demand notice to your landlord.",
    "Step 2: File a complaint with the Rent Controller if not returned within 15 days.",
    "Step 3: Alternatively, file a case under IPC Section 406 (criminal breach of trust)."
  ],
  "law_citations": [
    {
      "act": "Transfer of Property Act, 1882",
      "section": "Section 108(q)",
      "section_title": "Rights and Liabilities of Lessor — Security Deposit",
      "relevance_score": 0.92
    },
    {
      "act": "Indian Penal Code, 1860",
      "section": "Section 406",
      "section_title": "Punishment for Criminal Breach of Trust",
      "relevance_score": 0.78
    }
  ],
  "disclaimer": "This information is for educational purposes only and does not constitute legal advice. Please consult a qualified advocate for advice specific to your situation."
}
```

### `POST /api/v1/conversation/new?user_id={user_id}`
Create a new empty conversation.

### `GET /api/v1/conversation/{conversation_id}`
Get full conversation with all messages and citations.

### `GET /api/v1/conversation/history/{user_id}`
Get all conversations for a user (summary list).

### `DELETE /api/v1/conversation/{conversation_id}`
Delete a conversation.

### `GET /`
Server health check.

### `GET /test-db`
MongoDB connectivity check.

---

## Indian Law Corpus

The corpus contains **30 real Indian law sections** across 6 categories:

| Category | Acts Covered |
|----------|-------------|
| `consumer` | Consumer Protection Act 2019, IPC |
| `tenancy` | Transfer of Property Act 1882, Rent Control Acts, IPC |
| `employment` | Industrial Disputes Act 1947, Shops & Establishments Acts, POSH Act 2013, Minimum Wages Act 1948, Payment of Wages Act 1936 |
| `criminal` | CrPC 1973, Information Technology Act 2000, Constitution Art. 21, IPC |
| `family` | Protection of Women from Domestic Violence Act 2005, IPC |
| `general` | Right to Information Act 2005, Motor Vehicles Act 1988 |

---

## Guardrails

The AI system is instructed to:
- ✅ Provide legal **information**, not legal **advice**
- ✅ Only cite law sections that were retrieved from the corpus
- ✅ Never predict court outcomes
- ✅ Never fabricate law sections
- ✅ Clearly state uncertainty when relevant laws are not found
- ✅ Always include the disclaimer

---

## Example Queries

| Query | Classified Intent |
|-------|-------------------|
| "My employer fired me without notice" | `employment` |
| "My landlord is not returning my deposit" | `tenancy` |
| "Can police search my phone without permission?" | `criminal` |
| "I received a defective product and the seller refuses a refund" | `consumer` |
| "My husband is threatening me" | `family` |
| "How do I file an RTI?" | `general` |
