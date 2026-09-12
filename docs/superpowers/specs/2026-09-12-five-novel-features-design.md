# Design Specification: Five Novel LegalTech Innovations for LegalAce

**Date**: 2026-09-12  
**Status**: Approved in Brainstorming / Grill-Me  
**Path**: Architectural Subsystem Expansion  

---

## 1. Executive Summary

LegalAce is being expanded with 5 novel capabilities to maximize real-world access to justice across India:
1. **Statutory Citation Grounding & Excerpt Verification**: Real-time confidence score (0-100%) and expandable official statutory text excerpts behind every claim.
2. **App-Wide Multilingual Support (Hindi, Tamil, English)**: Complete UI localization across all 8 screens and language-aware AI chat synthesis.
3. **Voice Input & Output for Low-Literacy Users**: Microphone speech-to-text dictation and text-to-speech reading in Hindi, Tamil, and English.
4. **Outcome Tracking & Community Success Loop**: Action plan outcome recording (recovered amounts, time to resolution, ratings) feeding live community success rate badges on Wizard scenarios.
5. **Offline-First Resilience**: Automatic local caching of situations, daily rights, and notice templates with an offline mode indicator for low-connectivity regions.

---

## 2. Architecture & Data Flow

```
                               ┌────────────────────────────────────────────────┐
                               │        LegalAce Multilingual App (Expo)        │
                               │    Languages: English (en) | Hindi (hi) | Tamil│
                               └───────┬──────────────────────────────┬─────────┘
                                       │                              │
                    ┌──────────────────▼───────────────┐     ┌────────▼─────────────────────────┐
                    │ Voice & Offline Subsystem        │     │ AI Grounding & Citation Engine   │
                    │ - Web Speech API (STT / TTS)     │     │ - Normalized Hybrid Score (0-100)│
                    │ - AsyncStorage Offline Cache     │     │ - Verbatim Statute Excerpts      │
                    │ - Local Notice Template Drafting │     │ - Expandable Legal Evidence Accord│
                    └──────────────────┬───────────────┘     └────────┬─────────────────────────┘
                                       │                              │
                                       └───────────────┬──────────────┘
                                                       │
                                       ┌───────────────▼────────────────┐
                                       │      FastAPI Backend Engine    │
                                       ├────────────────────────────────┤
                                       │ - RAG Pipeline (BM25 + FAISS)  │
                                       │ - /api/v1/wizard/outcome APIs  │
                                       │ - MongoDB `plan_outcomes` Coll │
                                       └────────────────────────────────┘
```

---

## 3. Subsystem Breakdown

### Subsystem 1: Statutory Citation Grounding & Verification
- **Backend**:
  - Extend `LawCitation` schema in `backend/app/modules/chatbot/service.py` with:
    - `excerpt: Optional[str] = None`
    - `grounding_score: Optional[float] = None`
  - In `backend/app/modules/chatbot/rag/pipeline.py` and `retriever.py`, map `section_text` directly to `excerpt`, and normalize BM25 / vector retrieval similarity into an integer percentage (`grounding_score = int(chunk.score * 100)` clamped to 40-99%).
- **Frontend**:
  - In `exp/src/types/index.ts`, add `excerpt?: string` and `grounding_score?: number` to `LawCitation`.
  - In `exp/src/components/FloatingChatWidget.tsx`, render:
    - High-visibility Grounding Score badge (`🛡️ 94% Verified Statutory Grounding`).
    - Expandable accordion toggle (`📜 View Statute Excerpt: Section 106`) revealing the verbatim legislative text.

### Subsystem 2: App-Wide Multilingual Support (Hindi, Tamil, English)
- **Frontend Localization Store**:
  - Create `exp/src/config/i18n.ts` defining structured translation dictionaries for `en`, `hi`, `ta`.
  - Translations cover:
    - Navigation tabs (`Home / मुख्य पृष्ठ / முகப்பு`, `Wizard / सहायक / வழிகாட்டி`, `Rights / अधिकार / உரிமைகள்`, etc.)
    - Screen headers, buttons, labels, and placeholders.
  - Global `useLanguage` / language hook or state managed in `App.tsx` and persisted in `AsyncStorage.setItem('@legalace_lang')`.
- **Backend Multilingual Prompting**:
  - Accept `language: str = "en"` in chat and wizard endpoints.
  - In `backend/app/modules/chatbot/rag/prompt.py`, inject explicit localization instruction:
    `"Respond fluently in Hindi (Devanagari script) with accurate Indian legal terminology"` when `language == 'hi'`, or Tamil when `language == 'ta'`.

### Subsystem 3: Voice Input & Output (STT & TTS)
- **Voice Output (Speech-to-Text Read Aloud)**:
  - Add speaker icon button (`🔊`) to AI chat messages and Daily Rights cards.
  - Implements browser-native `window.speechSynthesis` on Web with speech synthesis voices mapped to `hi-IN`, `ta-IN`, and `en-IN`, with clean state management (`speaking`, `stop`).
- **Voice Input (Speech Dictation)**:
  - Add microphone toggle button (`🎙️`) to the chat input bar in `FloatingChatWidget.tsx`.
  - Uses `webkitSpeechRecognition` / `SpeechRecognition` configured with the active app language (`hi-IN` or `en-IN`), automatically transcribing voice directly into the text input.

### Subsystem 4: Action Plan Outcome Tracking & Learning Feedback Loop
- **Backend**:
  - Create MongoDB collection `plan_outcomes` and Pydantic schemas:
    ```python
    class PlanOutcomeBody(BaseModel):
        user_id: str
        scenario_id: str
        plan_title: str
        status: Literal["in_progress", "resolved", "partially_resolved", "escalated"]
        recovered_amount: Optional[int] = None
        days_taken: Optional[int] = None
        rating: Optional[int] = Field(None, ge=1, le=5)
        feedback: Optional[str] = None
    ```
  - Endpoints:
    - `POST /api/v1/wizard/outcome`: Record or update plan outcome.
    - `GET /api/v1/wizard/outcomes/stats`: Aggregate success rates by `scenario_id` (e.g. `{"housing_deposit": {"total": 45, "resolved_rate": 82, "avg_days": 18}}`).
    - `GET /api/v1/wizard/outcomes/user/{user_id}`: Retrieve user's tracked plans.
- **Frontend**:
  - In `WizardScreen.tsx`, show an "Outcome Feedback & Case Tracker" section on completed plans with status buttons (`In Progress`, `Resolved`, `Escalated`), a recovered amount field, and star rating.
  - Display community success rate badges (`⭐ 82% Resolved`) on scenario cards.

### Subsystem 5: Offline-First Mode for Low-Connectivity Areas
- **Storage Layer**:
  - In `exp/src/config/offlineCache.ts`, build an offline storage manager wrapping `AsyncStorage`.
  - Keys:
    - `@legalace_cached_situations`
    - `@legalace_cached_rights`
    - `@legalace_cached_templates`
    - `@legalace_offline_outcomes`
- **Network Fallback**:
  - Silently warm up cache upon network success.
  - If network fetch fails (`!res.ok` or network error):
    - Fallback seamlessly to cached data.
    - Render a sleek `⚡ Offline Mode (Cached)` pill indicator in the header.
  - Notice generation in `WizardScreen.tsx` functions 100% offline via local statutory template interpolation.

---

## 4. Verification Plan

### Automated Backend Tests
- Pytest test cases in `backend/tests/test_grounding_citations.py`:
  - Verify `LawCitation` serializes `excerpt` and `grounding_score`.
  - Verify RAG retriever populates `excerpt` from statutory `section_text`.
- Pytest test cases in `backend/tests/test_outcomes.py`:
  - Verify outcome logging endpoint (`POST /api/v1/wizard/outcome`).
  - Verify outcome stats aggregation (`GET /api/v1/wizard/outcomes/stats`).

### Frontend Compilation & Functional Verification
- Run `npx tsc --noEmit` in `c:\Projects\LegalAce\exp` to verify zero TypeScript errors across all screens, components, and i18n dictionaries.
- Verify voice dictation, speech synthesis, language switching, and offline cache fallback.
