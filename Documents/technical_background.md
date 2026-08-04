# LegalAce — Technical Background & Architecture

This document provides a comprehensive deep-dive into the technical specifications, mechanics, database schemas, and algorithms underpinning the **LegalAce** application.

---

## 1. Retrieval-Augmented Generation (RAG) Architecture

LegalAce implements a hybrid local-remote RAG pipeline for highly accurate legal information retrieval under Indian statutory frameworks.

```
+--------------------------------------------------------------------------+
|                               RAG PIPELINE                               |
+--------------------------------------------------------------------------+
|  User Query  ->  Intent Classifier  ->  FAISS Semantic Vector Search    |
|                        |                             |                   |
|                        v                             v                   |
|                Greeting / Out-of-Scope       Context Assembly            |
|                        |                             |                   |
|                        v                             v                   |
|                  Static Response          OpenAI gpt-4 Completion        |
|                                                      |                   |
|                                                      v                   |
|                                            Structured JSON Validation    |
|                                                      | (Failures)        |
|                                                      v                   |
|                                            Statutory Fallback Generator  |
+--------------------------------------------------------------------------+
```

### 1.1 Intent Classification (`app/modules/chatbot/rag/intent.py`)
Queries undergo deterministic keyword-matching classification:
1. **Greetings & Scope Filtering**: Matches query patterns against standard greetings and a blacklist of out-of-scope queries (e.g., programming codes, cooking recipes).
2. **Intent Matching**: Runs scoring regexes mapping to categories: `employment`, `tenancy`, `consumer`, `criminal`, `family`, `property`, `banking`, `cyber_crime`, `traffic`, and `general_legal`.

### 1.2 Vector Database & Embeddings (`app/modules/chatbot/rag/embedder.py` & `faiss_store.py`)
- **Embedding Model**: Local HuggingFace `SentenceTransformers` model (`all-MiniLM-L6-v2`) generating **384-dimensional dense vector embeddings**.
- **Vector Store**: A flat FAISS index (`faiss.IndexFlatIP`) utilizing **Inner Product (Cosine Similarity)** matching on normalized vectors.
- **Index Data**: Built from `data/indian_law_corpus.json` containing 235 parsed statutory sections.

### 1.3 LLM Prompt & Guardrails (`app/modules/chatbot/rag/prompt.py`)
- **Model**: `gpt-4` with temperature set to `0.2` to enforce logical correctness and minimize hallucination.
- **System Instructions**:
  - Enforces structured JSON responses containing `answer`, `rights`, `action_steps`, `law_citations`, and a legal `disclaimer`.
  - Prohibits generating court outcome predictions, fabricating sections, or providing legal advice.

### 1.4 Fail-Safe Fallbacks (`app/modules/chatbot/rag/pipeline.py`)
If the OpenAI API is offline, rate-limited, or outputs corrupted JSON:
1. **Keywords database search**: Queries MongoDB `situations` collection for matches.
2. **Intent-based fallbacks**: Generates template-driven, citation-enriched legal replies using retrieved law sections.

---

## 2. Database Design & Schema Layout

LegalAce utilizes **MongoDB** via the async `motor` driver. The core collections and index structures include:

### 2.1 Collection: `conversations`
Stores chat history for multi-turn contextual conversations.
- **Schema**:
  ```typescript
  {
    conversation_id: string; // Unique UUID
    user_id: string;
    messages: Array<{
      role: "user" | "assistant";
      content: string;
      timestamp: string; // ISO 8601
      intent?: string;
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
- **Indexes**:
  - `conversation_id` (Unique, Hash)
  - `user_id`
  - `updated_at` (Descending, for sorting histories)

### 2.2 Collection: `deadlines`
Tracks time-sensitive legal limitations and notice periods.
- **Schema**:
  ```typescript
  {
    user_id: string;
    source_type: "manual" | "chat" | "document";
    title: string;
    description: string;
    category: "rental" | "employment" | "consumer" | "banking" | "insurance" | "general";
    deadline_date: Date;
    warning_days: number[]; // e.g. [30, 15, 7, 1]
    status: "active" | "completed" | "expired";
    priority: "low" | "medium" | "high";
    related_conversation_id?: string;
    notified_days: number[]; // Tracks warnings already triggered
    completed_at?: Date;
    created_at: Date;
    updated_at: Date;
  }
  ```
- **Indexes**:
  - `user_id`
  - `status`
  - Compound: `(user_id, status, deadline_date)`

### 2.3 Collection: `situations`
Contains pre-compiled scenarios seeded via `seed_situations.py`.
- **Schema**:
  ```typescript
  {
    situation_id: string; // e.g., "emp_wrongful_firing"
    title: string;
    description: string;
    category: string;
    applicable_laws: Array<{ act: string; section: string; section_title: string }>;
    user_rights: string[];
    action_steps: string[];
    important_deadlines: string[];
    related_situations: string[];
  }
  ```

---

## 3. Deadline Engine & Legal Health Score

### 3.1 Deadline Extraction Logic (`app/modules/deadline_engine/extractor.py`)
Extracts deadlines using a dual strategy:
1. **AI Extraction**: Feeds text to `gpt-4` to return structured deadline records with computed absolute dates relative to the execution day.
2. **Regex Fallback**: Uses regex patterns to identify:
   - Days-based periods: `within\s+(\d+)\s+days?`, `(\d+)[- ]day\s+notice`.
   - Date formats: `DD/MM/YYYY`, `YYYY-MM-DD`.

### 3.2 Legal Health Score Calculation (`app/modules/deadline_engine/service.py`)
Computes a dynamic score from `0` to `100` representing user compliance:
- **Base Logic**:
  - **Completed** deadlines = `+100` points
  - **Upcoming Active** deadlines (due in > 30 days) = `+100` points
  - **Imminent Active** (due in <= 30 days) = `+50` points
  - **Overdue Expired** = `0` points
- **Algorithm**:
  $$\text{Legal Health Score} = \frac{\sum(\text{Points of Deadline } i)}{\text{Total Count of Deadlines}}$$
- **Demo Seeding**: If the database finds no items for a new user, it automatically injects standard sample deadlines (e.g. rent renewals, credit card pay-dates) to populate the score gauge.

---

## 4. Wizard & Legal Document Generator

### 4.1 Decision-Tree Scenarios (`app/modules/wizard/scenarios_data.py`)
Uses deterministic decision paths (e.g., checking if the landlord has held security deposit > 21 days, or if employment notice pay was provided) to calculate a user's exact legal posture. Supported in multiple languages:
- **English**
- **Tamil** (`_ta`)
- **Hindi** (`_hi`)

### 4.2 Notice Generator (`app/modules/wizard/service.py`)
Dynamically drafts legal demand notice texts matching specific templates:
- **Financial Calculations**:
  - **Principal**: Extracted from user inputs.
  - **Statutory Interest**: Computes interest rate at **12% per annum** from the incident date under Section 73 of the Indian Contract Act.
  - **Damages**: Set to a standard statutory default of **Rs. 15,000/-** for mental harassment and litigation costs.
- **Verification Affidavit**: Appends a legally structured verification verification statement affirming that the contents are correct.
