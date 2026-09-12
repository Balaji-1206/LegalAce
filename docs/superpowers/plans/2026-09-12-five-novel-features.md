# Five Novel LegalTech Innovations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement 5 transformative legaltech capabilities: Citation Grounding & Statute Excerpts, App-Wide Multilingual i18n (Hindi/Tamil/English), Voice Input/Output (STT & TTS), Action Plan Outcome Tracking with Community Success Rates, and Offline-First Local Caching.

**Architecture:** Extend FastAPI backend with statutory excerpt extraction, grounding confidence scoring, and MongoDB outcome telemetry. Introduce an app-wide multilingual translation store (`i18n.ts`), Web Speech API STT/TTS voice bridge, and transparent `AsyncStorage` caching layer for low-connectivity regions.

**Tech Stack:** FastAPI, Python 3.10+, Motor (MongoDB), FAISS, LangChain, React Native (Expo), TypeScript, Web Speech API (`SpeechRecognition` & `SpeechSynthesis`), `AsyncStorage`.

**Spec:** `docs/superpowers/specs/2026-09-12-five-novel-features-design.md`

## Global Constraints
- Python 3.10+ compatible type annotations (`dict[str, Any]`, `X | None`).
- All new Pytest tests must pass without regressions to existing 50 tests.
- React Native TypeScript compilation must remain at 0 errors (`npx tsc --noEmit`).
- No hardcoded API keys; preserve existing multi-tier LLM fallback behavior.
- Clean Code principles (single responsibility, explicit interfaces, no magic numbers).

---

### Task 1: Statutory Citation Grounding & Excerpt Verification

**Files:**
- Modify: `backend/app/modules/chatbot/service.py`
- Modify: `backend/app/modules/chatbot/rag/pipeline.py`
- Create: `backend/tests/test_grounding_citations.py`
- Modify: `exp/src/types/index.ts`
- Modify: `exp/src/components/FloatingChatWidget.tsx`

**Interfaces:**
- `LawCitation`: Add `excerpt: Optional[str] = None` and `grounding_score: Optional[float] = None` (normalized 0-100%).
- `FloatingChatWidget`: Renders `🛡️ Grounding Score: XX% Verified` and an expandable accordion showing the exact legislative excerpt.

- [ ] **Step 1: Write failing backend test for citation excerpt and grounding score**

```python
# backend/tests/test_grounding_citations.py
import pytest
from app.modules.chatbot.service import LawCitation

def test_law_citation_schema_supports_excerpt_and_grounding_score():
    citation = LawCitation(
        act="Transfer of Property Act, 1882",
        section="Section 106",
        section_title="Duration of certain leases in absence of written contract",
        relevance_score=0.92,
        excerpt="In the absence of a contract or local law or usage to the contrary, a lease of immovable property for agricultural or manufacturing purposes shall be deemed to be a lease from year to year...",
        grounding_score=92.0,
    )
    assert citation.excerpt is not None
    assert "Section 106" in citation.section
    assert citation.grounding_score == 92.0
```

- [ ] **Step 2: Run test to verify it fails**
Run: `.\.venv\Scripts\pytest tests/test_grounding_citations.py -v` in `backend`.

- [ ] **Step 3: Update `LawCitation` schema and RAG pipeline**
In `backend/app/modules/chatbot/service.py`, add `excerpt: Optional[str] = None` and `grounding_score: Optional[float] = None`.
In `backend/app/modules/chatbot/rag/pipeline.py`, map `chunk.section_text` into `excerpt` and `min(99.0, max(40.0, round(float(chunk.score) * 100, 1)))` into `grounding_score`.

- [ ] **Step 4: Run test to verify it passes**
Run: `.\.venv\Scripts\pytest tests/test_grounding_citations.py -v` in `backend`.

- [ ] **Step 5: Update Frontend types and `FloatingChatWidget.tsx`**
In `exp/src/types/index.ts`, update `LawCitation` with `excerpt?: string` and `grounding_score?: number`.
In `exp/src/components/FloatingChatWidget.tsx`, render a Grounding Badge with confidence percentage and an expandable accordion showing the excerpt.

- [ ] **Step 6: Verify frontend TypeScript**
Run: `npx tsc --noEmit` in `exp`.

- [ ] **Step 7: Commit**
```bash
git add backend/ exp/
git commit -m "feat: implement citation grounding score and official statute excerpt viewer"
```

---

### Task 2: Action Plan Outcome Tracking & Community Learning Loop

**Files:**
- Create: `backend/app/modules/wizard/outcome_service.py`
- Create: `backend/app/modules/wizard/outcome_api.py`
- Modify: `backend/app/main.py`
- Create: `backend/tests/test_outcomes.py`
- Modify: `exp/src/screens/WizardScreen.tsx`

**Interfaces:**
- `POST /api/v1/wizard/outcome`: Record outcome (`user_id`, `scenario_id`, `plan_title`, `status`, `recovered_amount`, `days_taken`, `rating`, `feedback`).
- `GET /api/v1/wizard/outcomes/stats`: Returns aggregated resolution metrics per `scenario_id`.
- `GET /api/v1/wizard/outcomes/user/{user_id}`: Returns user's saved outcomes.

- [ ] **Step 1: Write failing backend test for outcome recording & aggregation**

```python
# backend/tests/test_outcomes.py
import pytest
from unittest.mock import AsyncMock, MagicMock
from app.modules.wizard.outcome_service import OutcomeService, PlanOutcomeBody

@pytest.mark.asyncio
async def test_record_outcome_and_stats():
    mock_db = MagicMock()
    col = MagicMock()
    mock_db.__getitem__.return_value = col
    service = OutcomeService(mock_db)

    col.update_one = AsyncMock(return_value=MagicMock(upserted_id="123"))
    col.count_documents = AsyncMock(side_effect=[10, 8]) # total=10, resolved=8

    body = PlanOutcomeBody(
        user_id="user_test_1",
        scenario_id="housing_deposit",
        plan_title="Security Deposit Recovery",
        status="resolved",
        recovered_amount=35000,
        days_taken=14,
        rating=5,
        feedback="The 15-day notice worked!"
    )
    res = await service.record_outcome(body)
    assert res["status"] == "recorded"
```

- [ ] **Step 2: Run test to verify it fails**
Run: `.\.venv\Scripts\pytest tests/test_outcomes.py -v` in `backend`.

- [ ] **Step 3: Implement `outcome_service.py` and `outcome_api.py`**
Implement the service with MongoDB `plan_outcomes` collection, register routes in `main.py`.

- [ ] **Step 4: Run test to verify it passes**
Run: `.\.venv\Scripts\pytest tests/test_outcomes.py -v` in `backend`.

- [ ] **Step 5: Add Outcome Tracker UI & Success Badges in `WizardScreen.tsx`**
In `WizardScreen.tsx`, render:
- Community Success Badges on scenarios (`⭐ 82% Resolved`).
- An interactive Outcome Logging card at the end of the Action Plan with status buttons (`In Progress`, `Resolved`, `Escalated`), recovered amount input, star rating, and submit button.

- [ ] **Step 6: Verify frontend TypeScript**
Run: `npx tsc --noEmit` in `exp`.

- [ ] **Step 7: Commit**
```bash
git add backend/ exp/
git commit -m "feat: implement action plan outcome tracking and community success rate feedback loop"
```

---

### Task 3: App-Wide Multilingual Support (Hindi, Tamil, English)

**Files:**
- Create: `exp/src/config/i18n.ts`
- Modify: `exp/App.tsx`
- Modify: `exp/src/components/BottomNav.tsx`
- Modify: `exp/src/screens/HomeScreen.tsx`
- Modify: `exp/src/screens/DailyRightsScreen.tsx`
- Modify: `backend/app/modules/chatbot/rag/prompt.py`

**Interfaces:**
- `i18n.ts`: `SupportedLang = 'en' | 'hi' | 'ta'`, `t(key: string, lang?: SupportedLang): string`.
- Multilingual AI Chat: Prompt passes active language instruction to LLM.

- [ ] **Step 1: Create `exp/src/config/i18n.ts` with comprehensive translations**
Define keys for:
- Navigation tabs: `nav_home`, `nav_wizard`, `nav_situations`, `nav_deadlines`, `nav_rights`, `nav_xray`, `nav_profile`.
- Core headings, buttons, search placeholders, and badges.
- Helper `t(key: TranslationKey, lang: SupportedLang): string`.

- [ ] **Step 2: Connect language state and switcher in `App.tsx`**
Add language switcher in the top bar / profile, persist in `AsyncStorage.getItem('@legalace_lang')`.
Pass `lang` down to components and screens.

- [ ] **Step 3: Update `BottomNav.tsx`, `HomeScreen.tsx`, and `DailyRightsScreen.tsx`**
Use `t(key, lang)` for all labels.

- [ ] **Step 4: Update `backend/app/modules/chatbot/rag/prompt.py` for LLM language instruction**
Add language guidance clause: when `language == 'hi'`, instruct LLM: `"Respond in fluent Hindi (Devanagari script) with accurate Indian statutory references"`.

- [ ] **Step 5: Verify frontend TypeScript**
Run: `npx tsc --noEmit` in `exp`.

- [ ] **Step 6: Commit**
```bash
git add exp/ backend/
git commit -m "feat: add app-wide multilingual i18n support for English, Hindi, and Tamil"
```

---

### Task 4: Voice Input & Output (Speech-to-Text & Text-to-Speech)

**Files:**
- Create: `exp/src/utils/speech.ts`
- Modify: `exp/src/components/FloatingChatWidget.tsx`
- Modify: `exp/src/screens/DailyRightsScreen.tsx`

**Interfaces:**
- `speakText(text: string, lang: SupportedLang): Promise<void>`
- `stopSpeaking(): void`
- `startSpeechRecognition(lang: SupportedLang, onResult: (text: string) => void, onError: () => void): SpeechRecognizer`

- [ ] **Step 1: Implement `exp/src/utils/speech.ts`**
Using `window.speechSynthesis` and `window.webkitSpeechRecognition` / `window.SpeechRecognition` with clean platform guards for web/mobile browsers.

- [ ] **Step 2: Add Voice Output (Read Aloud) in `FloatingChatWidget.tsx` and `DailyRightsScreen.tsx`**
Add speaker button (`🔊 Listen`) on each assistant response and right card with active speaking indicator and stop toggle.

- [ ] **Step 3: Add Voice Input (Microphone Dictation) in `FloatingChatWidget.tsx`**
Add microphone icon (`🎙️`) next to the chat text input. Tapping it activates speech recognition, listening in the active language (`hi-IN` or `en-IN`), streaming the transcript into the input bar.

- [ ] **Step 4: Verify frontend TypeScript**
Run: `npx tsc --noEmit` in `exp`.

- [ ] **Step 5: Commit**
```bash
git add exp/
git commit -m "feat: add voice dictation input and speech read-aloud output in Hindi and English"
```

---

### Task 5: Offline-First Mode for Low-Connectivity Areas

**Files:**
- Create: `exp/src/config/offlineCache.ts`
- Modify: `exp/src/screens/HomeScreen.tsx`
- Modify: `exp/src/screens/DailyRightsScreen.tsx`
- Modify: `exp/src/screens/WizardScreen.tsx`
- Modify: `exp/App.tsx`

**Interfaces:**
- `saveToOfflineCache<T>(key: string, data: T): Promise<void>`
- `loadFromOfflineCache<T>(key: string): Promise<T | null>`
- `isOffline`: Boolean state with header pill `⚡ Offline Mode (Local Cache)`.

- [ ] **Step 1: Implement `exp/src/config/offlineCache.ts`**
Wraps `AsyncStorage` with error-handling, cache expiration, and default fallback datasets.

- [ ] **Step 2: Integrate cache warmup and fallback in `HomeScreen.tsx` and `DailyRightsScreen.tsx`**
When network is active, silently update local cache.
If network fails or is unreachable, load from cache and set `isOffline = true`.

- [ ] **Step 3: Add Offline Mode indicator badge in `App.tsx`**
Renders a discrete `⚡ Offline Mode (Local Cache)` status badge when running disconnected.

- [ ] **Step 4: Verify offline statutory notice generation in `WizardScreen.tsx`**
Ensure pre-filled statutory notice templates generate and share without internet.

- [ ] **Step 5: Verify frontend TypeScript**
Run: `npx tsc --noEmit` in `exp`.

- [ ] **Step 6: Commit**
```bash
git add exp/
git commit -m "feat: implement offline-first caching and disconnected notice generation"
```

---

### Task 6: Full Verification & Final Integration

**Files:**
- `README.md`
- `walkthrough.md`

- [ ] **Step 1: Run full backend test suite**
Run: `.\.venv\Scripts\pytest -v` in `backend` (all tests passing).

- [ ] **Step 2: Run full TypeScript check**
Run: `npx tsc --noEmit` in `exp` (0 errors).

- [ ] **Step 3: Update `README.md` and walkthrough documentation**
Document all 5 novel features, testing instructions, and architecture diagrams.

- [ ] **Step 4: Final commit**
```bash
git add README.md docs/
git commit -m "docs: finalize documentation for 5 novel legaltech features"
```
