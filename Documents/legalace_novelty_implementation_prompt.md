# LegalAce — Novelty Features Implementation Prompt

**Paste this whole document into Claude Code (or your coding assistant of choice) inside the LegalAce repo root. It has full context of your existing architecture and won't conflict with it.**

---

## Context (do not skip)

You are working inside an existing full-stack project called **LegalAce**:

- **Frontend**: React (TypeScript) + Vite, Vanilla CSS, no UI libraries
- **Backend**: Python 3.10+, FastAPI, Uvicorn, Pydantic
- **AI/LLM**: LangChain, LangGraph, OpenAI/Gemini, RAG via FAISS/Chroma
- **DB**: MongoDB via Motor (AsyncIOMotorClient)
- **Existing modules**: `agent` (chatbot), `situation_finder`, `deadline_engine`, `wizard`, `daily_rights` — each with its own `api.py`, `service.py`, and frontend tab

Before writing any code:
1. Read `backend/app/modules/agent/agent.py`, `tools.py`, and `api.py` to understand the current LangChain ReAct agent setup.
2. Read `backend/app/modules/deadline_engine/limitation_calculator.py` and `wizard/service.py` to understand existing data flow.
3. Read `frontend/src/modules/chatbot/ChatbotTab.tsx` and `wizard/WizardScreen.tsx` to match existing component/state patterns and CSS conventions (no UI libraries — hand-rolled glassmorphism design system).

Implement the six features below **incrementally, one at a time, in the order given**, since later features depend on earlier ones (e.g., Document X-Ray feeds Deadline Engine; Citation Verifier is used by the multi-agent pipeline). After each feature, run existing tests/typecheck before moving to the next. Do not refactor unrelated code.

---

## Feature 1 — Citation Verifier & Source-Linked Answers

**Goal**: Every legal citation (IPC/CrPC/BNSS/Act section) the AI outputs must be checked against a verified statute database before being shown, and every chatbot answer must display the actual source clause it was grounded on.

### Backend
1. Create `backend/app/modules/statute_kb/` with:
   - `models.py` — Pydantic model `StatuteSection` (act_name, section_number, section_title, full_text, act_year, source_url)
   - `service.py` — `verify_citation(act: str, section: str) -> StatuteSection | None` that queries MongoDB collection `statute_sections`
   - `seed_statute_sections.py` — seed script populating `statute_sections` with the core acts already referenced across Modules 2 & 4 (IPC, CrPC/BNSS, Consumer Protection Act, RERA, NI Act, Model Tenancy Act, key Labour Acts). Structure each entry with section number, plain-English title, and the verbatim (public-domain, government-published) section text.
2. In `backend/app/modules/agent/tools.py`, add a new LangChain tool `verify_citation_tool` that the agent must call whenever it is about to output a section reference. The tool returns either the verified section text (to be quoted/summarized) or a `"UNVERIFIED"` flag.
3. Modify `backend/app/modules/agent/agent.py` system prompt so the agent is **required** to:
   - Call `verify_citation_tool` for every statute reference before including it in a response.
   - If verification fails, prefix that specific citation with `⚠️ AI-suggested — please confirm with an advocate` instead of stating it as fact.
   - Return citations as structured JSON fields (not just inline text) so the frontend can render them as expandable cards: `{ "text": "...", "citations": [{ "act": "...", "section": "...", "verified": true, "source_excerpt": "...", "source_url": "..." }] }`.
4. Update `POST /api/v1/agent/chat` response schema to include this `citations` array.

### Frontend
1. In `ChatbotTab.tsx`, render each citation as an expandable "Source" chip below the AI message bubble — tapping it reveals the verified source excerpt and a link to the original act text.
2. Verified citations get a green checkmark badge; unverified ones get an amber warning badge with the disclaimer text.
3. Apply the same citation-chip component to Module 2 (Situation Finder) law citations and Module 4 (Wizard) generated notices, reusing one shared `<CitationChip>` component.

**Acceptance criteria**: No section number appears anywhere in the app without either a verified-source chip or an unverified-warning chip attached to it.

---

## Feature 2 — Multi-Agent LangGraph Pipeline (replaces single ReAct agent)

**Goal**: Replace the single-agent chatbot with a LangGraph state machine of specialized agents, improving answer quality and adding a self-critique step.

### Backend
1. In `backend/app/modules/agent/`, create `graph.py` implementing a LangGraph `StateGraph` with these nodes:
   - **Issue Spotter**: classifies the user's query into one of the 13 legal categories from Module 2 and extracts key facts (dates, amounts, parties involved).
   - **Statute Retriever**: runs RAG search over the FAISS/Chroma vector index scoped to the identified category, retrieves top-k relevant clauses.
   - **Drafter**: generates the plain-English answer using retrieved clauses, calling `verify_citation_tool` from Feature 1 for every citation used.
   - **Self-Critique/Reviewer**: re-reads the drafted answer against the retrieved source clauses and flags (a) any unsupported claims, (b) any high-stakes situations (arrest, eviction, domestic violence, POSH) that should carry an "escalate to human advocate" banner, (c) tone/clarity issues. Reviewer can send the draft back to the Drafter node once for revision.
2. Define shared state as a `TypedDict`: `{ query, category, facts, retrieved_clauses, draft_answer, citations, needs_escalation, revision_count }`.
3. Wire `POST /api/v1/agent/chat` to invoke this graph instead of the old single ReAct agent. Keep `tools.py` functions reusable as node-level tool calls.
4. Add `needs_escalation: bool` and `escalation_reason: str | None` to the chat response schema.

### Frontend
1. When `needs_escalation` is true, render a distinct banner above the AI's answer: "⚖️ This situation may need a licensed advocate — here's why: {reason}" with a CTA linking to Module 2's advocate/authority directory or DLSA info (see Feature 3).
2. Optionally show a subtle "AI reasoning steps" collapsible (Issue Spotted → Statutes Retrieved → Reviewed) for transparency — this is also a strong demo/evaluation talking point.

**Acceptance criteria**: Chat responses for high-stakes categories (arrest, eviction, domestic violence, POSH) always carry the escalation banner; responses show at least one retrieved+verified clause where relevant.

---

## Feature 3 — Document X-Ray (Upload & Auto-Extract)

**Goal**: Users upload a legal document (notice, FIR copy, rent agreement, insurance rejection letter) and the system extracts obligations, deadlines, and red flags — auto-populating Module 3 (Deadline Engine) and Module 4 (Wizard).

### Backend
1. Create `backend/app/modules/document_xray/` with `api.py`, `service.py`, `models.py`.
2. Endpoint `POST /api/v1/document-xray/analyze`:
   - Accepts a PDF/image upload (multipart).
   - If image or scanned PDF: run OCR (e.g., `pytesseract` or a cloud OCR API — check what's already available in the environment/allowed dependencies before choosing).
   - If digital PDF: extract text directly (e.g., `pypdf`/`pdfplumber`).
   - Pass extracted text to an LLM extraction chain (LangChain) with a structured output schema:
     ```python
     class DocumentXRayResult(BaseModel):
         document_type: str  # e.g. "Rent Agreement", "Insurance Rejection Letter", "Cheque Bounce Notice"
         parties: list[str]
         key_dates: list[dict]       # {label, date, iso_date}
         obligations: list[str]      # what the user must do
         red_flags: list[str]        # unusual/unfavorable clauses
         suggested_limitation_rule_id: str | None  # maps to Module 3 rules
         suggested_wizard_scenario_id: str | None  # maps to Module 4 scenarios
     ```
   - Every extracted date and claim must go through the same verification/confidence pattern as Feature 1 — do not let the model silently hallucinate a deadline.
3. Store uploaded documents + extraction results in a new `document_xray_uploads` MongoDB collection, scoped to the user's profile (encrypted at rest — see Feature 6).

### Frontend
1. New component `DocumentXRayUpload.tsx`, accessible from Module 5 (Profile) and as a quick-action chip inside Module 1 (Chatbot) and Module 4 (Wizard entry screen).
2. After analysis, show a results card: document type, extracted parties, a timeline of key dates, obligations checklist, and red flags — each with a confidence indicator.
3. Add one-tap buttons: **"Add these deadlines to Monitor"** (pre-fills Module 3 via `suggested_limitation_rule_id` + `key_dates`) and **"Start Action Plan from this document"** (pre-fills Module 4 wizard via `suggested_wizard_scenario_id`).

**Acceptance criteria**: Uploading a sample rent agreement or cheque-bounce notice produces at least one correctly identified deadline that can be pushed into Module 3 with one tap.

---

## Feature 4 — WhatsApp / SMS Deadline Reminders

**Goal**: Reliable, low-bandwidth-friendly reminders for tracked deadlines, since push notifications are unreliable for the target demographic.

### Backend
1. Add a `notifications` module: `backend/app/modules/notifications/` with `api.py`, `service.py`, `providers.py`.
2. Integrate a WhatsApp Business API / Twilio provider behind an interface `NotificationProvider` (abstract base) so the concrete provider can be swapped without touching business logic. Support SMS as a fallback if WhatsApp opt-in isn't available.
3. Extend Module 3's `limitation_rules`/user-deadline documents with `notification_preferences: { channel: "whatsapp"|"sms"|"none", phone_number, reminder_offsets_days: [7,3,1] }`.
4. Add a scheduled job (APScheduler or a simple cron-triggered endpoint, matching whatever job-running pattern already exists in the repo — check first) that runs daily, finds deadlines crossing a reminder offset, and sends templated reminder messages via the provider.
5. Endpoint `POST /api/v1/deadlines/{id}/notification-preferences` to let the user set channel + phone number, with OTP verification before enabling.

### Frontend
1. In `DeadlineDashboard.tsx`, add a "Remind me via WhatsApp/SMS" toggle per tracked deadline, with a phone-number + OTP verification flow.
2. Show a small status indicator ("Reminders on via WhatsApp") on each deadline card.

**Acceptance criteria**: A test deadline with a reminder offset of "0 days" (today) triggers a real outbound WhatsApp/SMS message via the provider sandbox/test credentials.

---

## Feature 5 — Free Legal Aid (DLSA) Eligibility Checker + Nearest Authority Locator

**Goal**: Help users determine if they qualify for free legal aid under the Legal Services Authorities Act, and route them to the correct nearest authority (DLSA, consumer forum, RERA authority, police station) based on location.

### Backend
1. Create `backend/app/modules/legal_aid/` with `api.py`, `service.py`, `models.py`.
2. Seed a `legal_aid_eligibility_rules` MongoDB collection encoding the Legal Services Authorities Act eligibility categories (income threshold, SC/ST, women, children, disabled persons, industrial workmen, disaster/trafficking victims, etc. — use the actual statutory categories, don't invent thresholds; source them into the statute KB from Feature 1 too).
3. Endpoint `POST /api/v1/legal-aid/check-eligibility` — takes a simple form (income, state, category flags) and returns eligibility result + which DLSA/SLSA to contact.
4. Create a `location_directory` collection (or integrate a maps/places lookup) mapping state/district → nearest DLSA office, consumer forum, RERA authority, and relevant police station category, with contact details. Reuse the existing "Official Portals & Helplines Hub" data structure from Module 2 as the base.
5. Endpoint `GET /api/v1/legal-aid/nearest-authority?lat=&lng=&type=` returning nearest matching authority with address/phone.

### Frontend
1. New section within Module 5 (Profile) or as a step at the end of Module 4 (Wizard) results: "Check if you qualify for free legal aid" — short form, instant eligibility result.
2. If eligible, show the matched DLSA contact info directly, plus a "why you qualify" explanation citing the specific statutory category.
3. Add a "Nearest Authority" map/list view (reuse Module 2's portal/helpline UI patterns) that geolocates the user (with permission) and shows the nearest relevant office for their situation.

**Acceptance criteria**: Given a sample low-income user profile, the checker correctly identifies DLSA eligibility and surfaces a real contact for their state.

---

## Feature 6 — DPDP Act 2023 Compliance Layer

**Goal**: Since LegalAce handles sensitive personal legal data, implement baseline compliance so this can be credibly presented as production-ready, not just a prototype.

### Backend
1. **Encryption at rest**: Encrypt sensitive fields (chat history content, uploaded documents from Feature 3, phone numbers from Feature 4, income data from Feature 5) using field-level encryption (e.g., `cryptography` Fernet, key from environment secret) before writing to MongoDB. Add a `backend/app/core/encryption.py` utility used consistently across modules.
2. **Consent flow**: Add a `user_consents` collection tracking what the user has consented to (chat storage, document upload storage, WhatsApp notifications, location use) with timestamps. Add middleware/dependency that checks consent before those features activate.
3. **Data retention policy**: Add a scheduled cleanup job that purges chat history, uploaded documents, and OTP records older than a configurable retention window (default e.g. 180 days), configurable per data category.
4. **Data export & deletion endpoints** (DPDP data-principal rights): `GET /api/v1/profile/export-data` (returns all stored user data as JSON) and `DELETE /api/v1/profile/delete-account` (cascading delete across all collections touched by Features 1–5).
5. Add an audit log (`audit_log` collection) recording access to sensitive endpoints (document analysis, legal aid eligibility, chat) with user id, timestamp, and action — no content, just metadata.

### Frontend
1. Add a first-run consent screen (before Module 1/3/4 features that store data are usable) with granular toggles matching the `user_consents` categories, in plain language, in the user's selected language (English/Tamil/Hindi).
2. Add a "Privacy & Data" section in Module 5 (Profile) with: view consent status, "Download my data" button, "Delete my account" button (with confirmation), and a plain-English summary of the retention policy.

**Acceptance criteria**: No document, chat message, or phone number is written to MongoDB without a corresponding consent record; export and delete endpoints work end-to-end.

---

## Build Order Summary

| Order | Feature | Depends on |
|---|---|---|
| 1 | Citation Verifier & Source-Linked Answers | — |
| 2 | Multi-Agent LangGraph Pipeline | Feature 1 |
| 3 | Document X-Ray | Feature 1 |
| 4 | WhatsApp/SMS Reminders | Module 3 (existing) |
| 5 | DLSA Eligibility + Nearest Authority | Feature 1 (statute KB) |
| 6 | DPDP Compliance Layer | Wraps Features 1, 3, 4, 5 (implement last, but design encryption utility early if easier) |

For each feature: implement backend first, verify with a quick manual `curl`/Postman test or a pytest, then implement frontend, then confirm end-to-end before moving to the next feature. Keep commits scoped per feature. Match existing code style, folder conventions, and the glassmorphism/vanilla-CSS design system already used in the other modules — do not introduce a UI library.
