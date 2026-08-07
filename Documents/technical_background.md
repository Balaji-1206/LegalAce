# LegalAce — Technical Background & Architecture Specification

This document provides a comprehensive deep-dive into the technical specifications, data schemas, background job schedulers, and execution algorithms underpinning the **LegalAce** platform.

---

## 1. RAG & Agentic AI Engine Pipeline

LegalAce implements a hybrid local-remote RAG pipeline combined with an Agentic AI engine for accurate legal guidance under Indian statutory frameworks.

```
+--------------------------------------------------------------------------+
|                        AGENTIC & RAG PIPELINE                            |
+--------------------------------------------------------------------------+
|  User Query  ->  Intent Classifier  ->  FAISS Semantic Vector Search    |
|                        |                             |                   |
|                        v                             v                   |
|                Greeting / Out-of-Scope       Context Assembly            |
|                        |                             |                   |
|                        v                             v                   |
|                  Static Response          LLM Synthesis (OpenAI/Gemini)  |
|                                                      |                   |
|                                                      v                   |
|                                            Structured JSON Output        |
|                                                      |                   |
|                                                      v                   |
|                                            Reasoning Trace & Actions     |
+--------------------------------------------------------------------------+
```

### 1.1 Intent Classification (`app/modules/chatbot/rag/intent.py`)
Queries undergo classification before execution:
1. **Greetings & Out-of-Scope Filtering**: Matches query patterns against standard greetings and out-of-scope topics.
2. **Category Intent Matching**: Maps user queries to legal categories: `employment`, `tenancy`, `consumer`, `criminal`, `family`, `property`, `banking`, `cyber_crime`, `traffic`, and `general_legal`.

### 1.2 Vector Index & Dense Embeddings (`app/modules/chatbot/rag/embedder.py` & `faiss_store.py`)
- **Embedding Model**: Local HuggingFace `SentenceTransformers` model (`all-MiniLM-L6-v2`) generating **384-dimensional dense vector embeddings**.
- **Vector Search**: A flat FAISS index (`faiss.IndexFlatIP`) utilizing **Inner Product (Cosine Similarity)** matching on normalized vectors.
- **Law Corpus**: Built from statutory provisions covering Indian Penal Code, Bharatiya Nyaya Sanhita (BNS), Consumer Protection Act, RERA, Model Tenancy Act, NI Act, and Labour Codes.

---

## 2. Database Design & MongoDB Schema Layout

LegalAce utilizes **MongoDB** via the async `motor` driver. The core collections and index structures include:

### 2.1 Collection: `conversations`
Stores multi-turn chat history.
```typescript
{
  conversation_id: string; // Unique UUID
  user_id: string;
  messages: Array<{
    role: "user" | "assistant";
    content: string;
    timestamp: string; // ISO 8601
    citations?: Array<{
      act: string;
      section: string;
      section_title: string;
      relevance_score: number;
    }>;
    rights?: string[];
    action_steps?: string[];
    disclaimer?: string;
  }>;
  created_at: Date;
  updated_at: Date;
}
```

### 2.2 Collection: `deadlines`
Tracks time-sensitive legal limitations and notice periods.
```typescript
{
  id: string;
  user_id: string;
  source_type: "manual" | "chat" | "document";
  title: string;
  description?: string;
  category: "rental" | "employment" | "consumer" | "banking" | "insurance" | "general";
  deadline_date: Date;
  priority: "high" | "medium" | "low";
  status: "active" | "completed" | "expired";
  notification_preferences?: {
    phone_number?: string;
    channel?: "whatsapp" | "sms" | "push";
    verified?: boolean;
  };
  created_at: Date;
}
```

### 2.3 Collection: `situations`
Stores pre-compiled 4-pillar legal situation blueprints across 13 legal categories.
```typescript
{
  situation_id: string;
  category: string;
  title: string;
  description: string;
  user_rights: string[];
  action_steps: string[];
  applicable_laws: Array<{
    act: string;
    section: string;
    section_title: string;
  }>;
  important_deadlines?: string[];
  official_portals?: Array<{
    name: string;
    url?: string;
    phone?: string;
    desc?: string;
  }>;
}
```

### 2.4 Collection: `legal_aid_authorities`
Stores NALSA/SLSA/DLSA district authority contact details for free legal aid services.

---

## 3. Background Job Schedulers (`app/modules/deadline_engine/scheduler.py`)

LegalAce uses `APScheduler` (AsyncIOScheduler) to perform background automated tasks:
1. **`_job_expire_deadlines`**: Runs every 6 hours to mark overdue active deadlines as `"expired"`.
2. **`_job_log_health_summary`**: Runs daily to compute system-wide diagnostic statistics and log health metrics.

---

## 4. Code Quality & Verification Matrix

| Component | Status | Verification Tool | Result |
|---|---|---|---|
| **Frontend Types** | 100% Type-Safe | `npx tsc -b` | 0 Errors |
| **Frontend Code Style** | 100% Lint Compliant | `npm run lint` | 0 Errors, 0 Warnings |
| **Backend Code Syntax** | 100% Validated | `python -m compileall app` | 0 Errors |
