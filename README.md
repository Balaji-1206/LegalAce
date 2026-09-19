# ⚖️ LegalAce — AI Legal Companion & Rights Engine for India

**LegalAce** is an enterprise-grade AI legal companion and statutory rights engine engineered specifically for Indian citizens. It provides structured statutory guidance, conversational multi-agent assistance, interactive dispute resolution, deadline monitoring under the Limitation Act, AI document X-Ray analysis, and automated legal aid eligibility determination under Indian law.

---

## 🌟 Architecture & System Overview

```
                          ┌─────────────────────────────────────────┐
                          │       LegalAce Cross-Platform App       │
                          │   (Expo React Native TSX + Dark Theme)  │
                          └────────────────────┬────────────────────┘
                                               │
             ┌─────────────────────────────────┼─────────────────────────────────┐
             │                                 │                                 │
  ┌──────────▼──────────┐           ┌──────────▼──────────┐           ┌──────────▼──────────┐
  │ Module 1: AI Chatbot│           │Module 2: Situation  │           │ Module 3: Deadline  │
  │ RAG Vector Search   │           │       Finder        │           │     Monitor         │
  │ FAISS + Multi-Agent │           │ 13 Legal Categories │           │ Health Score + APSched│
  └──────────┬──────────┘           └──────────┬──────────┘           └──────────┬──────────┘
             │                                 │                                 │
             └─────────────────────────────────┼─────────────────────────────────┘
                                               │
             ┌─────────────────────────────────┼─────────────────────────────────┐
             │                                 │                                 │
  ┌──────────▼──────────┐           ┌──────────▼──────────┐           ┌──────────▼──────────┐
  │  Module 4: Guided   │           │ Feature 3: Document │           │Feature 5: Free Legal│
  │    Legal Wizard     │           │       X-Ray         │           │    Aid (DLSA)       │
  │ Action Plans & Docs │           │ Upload & AI Extract │           │ Sec 12 LSA Act 1987 │
  └─────────────────────┘           └─────────────────────┘           └─────────────────────┘
```

---

## 🚀 Key Modules & Novel LegalTech Innovations

### 🛡️ 1. Statutory Citation Grounding & Legislative Excerpt Viewer (Novel Feature #1)
- **Trust & Hallucination Elimination**: Unlike generic legal chatbots that output unverified citations, LegalAce computes a **grounding confidence score** (`🛡️ XX% Grounding Confidence`) for every retrieved citation.
- **Verbatim Statute Excerpts**: Users can expand any citation accordion to view the **exact, authentic legislative text** extracted directly from official Indian statutory chunks (e.g., *Section 106 Transfer of Property Act 1882*, *Section 35 Consumer Protection Act 2019*).

### 🌐 2. App-Wide Multilingual Support: Hindi, Tamil, English (Novel Feature #2)
- **True Vernacular Access to Justice**: Instant, synchronous language toggle between **English**, **Hindi (हिंदी)**, and **Tamil (தமிழ்)** across all 8 screens, navigation tabs, search bars, and action checklists.
- **Multilingual AI Prompt Synthesis**: Chat prompts pass active language directives (`hi-IN`, `ta-IN`) instructing the LLM to formulate legal guidance directly in fluent vernacular Devanagari or Tamil script with accurate statutory references.
- **Persistent Localization**: Retains language preference in local storage (`AsyncStorage`) across device sessions.

### 🎙️ 3. Voice Input Dictation & Native Cross-Platform Read-Aloud (Novel Feature #3)
- **Low-Literacy Empowerment**: Eliminates text typing barriers for marginalized citizens with a 1-tap microphone button (`🎙️`) streaming speech-to-text dictation in Hindi, Tamil, or Indian English via the native Web Speech API.
- **Cross-Platform Text-to-Speech (TTS) Narration**: Built with `expo-speech`, assistant responses, legislative excerpts, and Daily Rights cards feature a dedicated `🔊 Listen Aloud` button with playback controls, reading statutory explanations aloud natively across **Android, iOS, and Web** with natural Indian English, Hindi, and Tamil voices.

### 📊 4. Action Plan Outcome Tracking & Community Learning Loop (Novel Feature #4)
- **From Static Answers to a Learning System**: After executing a wizard-generated action plan, citizens log real-world dispute outcomes: status (`Resolved`, `Partially Resolved`, `In Progress`, `Escalated`), monetary amounts recovered (₹), days taken, and ratings.
- **Crowdsourced Resolution Telemetry**: Aggregates community success metrics via a MongoDB `$group` aggregation pipeline, displaying live resolution badges on scenario cards (e.g., `⭐ 84% Resolved • ₹35,000 Avg Recovered`).

### ⚡ 5. Offline-First Resilience & Deterministic Intent Router (Novel Feature #5)
- **Sub-Millisecond Intent Routing**: Built-in deterministic router (`intent_router.py`) classifies citizen disputes across 9 statutory categories (Housing, Consumer, Debt, Employment, etc.) and detects police/arrest emergencies in **< 1ms** with $0 token cost.
- **Zero-Latency Local Hydration**: Transparent `AsyncStorage` cache pre-hydrates legal categories and common citizen dispute scenarios immediately on app launch.
- **Offline Notice Drafting**: Citizens in low-connectivity areas can draft, customize, and share pre-filled statutory legal demand notices completely disconnected from the internet.
- **Dynamic Offline Badge**: Displays an amber `⚡ OFFLINE MODE (CACHED)` status indicator when running disconnected.

### 📲 6. Statutory Legal Notice Generation & 1-Tap Multi-Channel Dispatch
- **Pre-Filled Statutory Demand Drafting**: Synthesizes ready-to-serve statutory legal notices (under the Model Tenancy Act 2021, Indian Contract Act 1872, Payment of Wages Act 1936, or Consumer Protection Act 2019) pre-filled with dispute facts, 15-day statutory deadlines, and itemized financial claim breakdowns (principal, 12% statutory interest, damages).
- **In-Place Editable Review Hub**: Allows citizens to review and fine-tune exact paragraphs, dates, or claim amounts directly in the mobile app prior to dispatch.
- **1-Tap WhatsApp Service (`wa.me`)**: Formats clean E.164 numbers (e.g. `919876543210`) and generates character-safe executive summaries for instant WhatsApp service directly from the citizen's own account.
- **1-Tap Formal Email Service (`mailto:`)**: Builds pre-filled email transmission links directed to landlords, HR departments, or corporate grievance redressal desks.
- **Pure-Python Printable PDF Generator**: Fast, zero-dependency PDF 1.4 binary engine emitting certified A4 printable legal notice documents (`/api/v1/wizard/download-pdf`) complete with reference codes, statutory tags, and signature blocks.
- **Mandatory Authorization Gate**: Enforces explicit citizen verification checkbox (*"I certify that I have reviewed the exact text and financial claim of this statutory legal demand notice..."*) before activating external dispatch channels.

### 🤖 7. Unified LLM Gateway & Local-First AI Hierarchy
- **Single Unified Gateway (`llm_gateway.py`)**: Centralizes multi-tier model calls into an in-memory MD5 cached pipeline with automatic failover:
  1. **In-Memory Cache ($0 cost, 0ms)**: Instant exact-match lookup for repeated queries.
  2. **Tier 1 — Local GPU Ollama (`qwen3:8b`, $0 cost)**: Native `/api/chat` with `num_ctx: 4096` and `keep_alive: 60m`, running 100% inside GPU VRAM without CPU spillage.
  3. **Tier 2 — Google Gemini 3.6 Flash**: High-speed cloud fallback and multimodal OCR engine.
  4. **Tier 3 — OpenAI GPT-4o**: Cloud emergency backup.
- **Reasoning Tag Sanitizer**: Automatic detection and stripping of `<think>...</think>` internal monologue blocks from modern reasoning models before JSON parsing.
- **Vector Retrieval**: Local FAISS vector index built on real Indian statutory acts (Transfer of Property Act, Consumer Protection Act 2019, Industrial Disputes Act, POSH Act, IT Act, CrPC/BNSS, Domestic Violence Act).

### 🛡️ 8. Situation Finder & 13 Legal Categories
- **13 Specialized Categories**: Housing, Employment, Consumer, Banking, Cyber Crime, Traffic, Women's Rights, Education, Cheque Debt, RTI, Real Estate, Insurance, and Family & Support.
- **Interactive Scenarios**: Instant search, penalty calculators, and key statutory rights cards for everyday citizen disputes.

### ⏳ 9. Legal Health Monitor & Statutory Deadlines
- **Limitation Act Engine**: Calculates statutory limitation periods under the Limitation Act 1963, Consumer Protection Act, NI Act Section 138, and RTI Act.
- **Health Score Ring**: Real-time legal health score dynamically calculated from active, completed, and expired legal filing deadlines with nested analytics.
- **Multi-Channel Reminders**: Direct WhatsApp (`wa.me`) 1-tap reminders, native push alerts, and automated SMS via Fast2SMS with OTP verification.

### 📄 10. Document X-Ray (Upload & Auto-Extract)
- **AI Document Parser**: Upload legal PDFs or images (rental agreements, cheque bounce notices, FIR copies, termination letters).
- **Dual-Mode Upload Resiliency**: Automatic failover between standard multipart form-data and Base64 JSON (`/api/v1/document-xray/analyze-base64`), completely bypassing mobile React Native C++ fetch implementation limitations.
- **Structured Extraction**: Extracts document type, party names, key dates timeline, obligations checklist, and red flags (unfavorable/illegal clauses) with robust dict-to-list normalization.

### ⚖️ 11. Free Legal Aid (DLSA) Checker
- **Statutory Eligibility**: Evaluates user criteria under **Section 12 of the Legal Services Authorities Act, 1987** (SC/ST, Women/Children, Persons with Disabilities, Industrial Workmen, Under-Trial Prisoners, Annual Income < ₹3,00,000, etc.).
- **Nearest Authority Locator**: Built-in DLSA/SLSA office directory for Indian states + NALSA nationwide helpline (15100) with 1-tap calling.

---

## 🛠️ Technology Stack

| Layer | Technology |
|---|---|
| **Mobile / Frontend** | Expo (~57.0), React Native (0.86), TypeScript, `expo-speech` (Cross-platform TTS), React Native Web, Safe Area Context, Vector Icons |
| **Backend API** | FastAPI, Uvicorn, Python 3.10+, HTTPX |
| **AI / RAG** | LangChain, FAISS Vector Search, BM25 Keyword Search, SentenceTransformers (`all-MiniLM-L6-v2`) |
| **LLMs Supported** | Ollama Local GPU (`qwen3:8b`), Google Gemini 3.6 Flash, OpenAI GPT-4o |
| **Database** | MongoDB (Motor async driver) |
| **PDF & OCR** | `pypdf`, `pytesseract` |
| **Scheduler** | APScheduler (AsyncIOScheduler) |
| **Testing** | Pytest, AnyIO, TypeScript Compiler (`tsc`) |

---

## 📁 Project Structure

```
LegalAce/
├── backend/
│   ├── app/
│   │   ├── api/                     # LLM settings & Health endpoints
│   │   ├── core/                    # Config & Logging
│   │   ├── database/                # Async MongoDB connection
│   │   └── modules/
│   │       ├── agent/               # Agentic planner, tools & synthesizer
│   │       ├── chatbot/             # RAG pipeline, retriever & conversation API
│   │       ├── deadline_engine/     # Health score & APScheduler jobs
│   │       ├── document_xray/       # Feature 3: Upload & AI PDF extraction
│   │       ├── legal_aid/           # Feature 5: Section 12 LSA eligibility
│   │       ├── notifications/       # Feature 4: WhatsApp/SMS notification providers
│   │       ├── situation_finder/    # 13 Category situation data & search
│   │       └── wizard/              # Guided legal questionnaires & notice drafting
│   ├── data/                        # Indian Law Corpus (FAISS source)
│   ├── faiss_index/                 # Pre-built vector index
│   ├── tests/                       # 50 Automated Unit & Integration Tests
│   ├── requirements.txt
│   └── .env
└── exp/                             # Unified Cross-Platform React Native App (Expo)
    ├── assets/                      # App icons, splash screens & adaptive graphics
    ├── src/
    │   ├── components/              # BottomNav (sliding glass bar), FloatingChatWidget, Spotlight
    │   ├── config/                  # API client & multi-platform LAN URL auto-resolver
    │   ├── screens/                 # All 8 core screens:
    │   │   ├── HomeScreen.tsx       # Citizen Dashboard & quick actions
    │   │   ├── WizardScreen.tsx     # Guided Legal Wizard & AI tree generator
    │   │   ├── SituationFinderScreen.tsx # 13 Legal categories & search
    │   │   ├── DocumentXRayScreen.tsx    # Contract/Notice AI X-Ray parser
    │   │   ├── DeadlineScreen.tsx   # Statutory Deadlines & Health Score
    │   │   ├── LegalAidScreen.tsx   # Section 12 LSA Eligibility & DLSA Directory
    │   │   ├── DailyRightsScreen.tsx # Daily legal rights & awareness
    │   │   └── ProfileScreen.tsx    # Profile, Vault, Helplines & LLM Switcher
    │   ├── theme/                   # Curated dark glassmorphic palette
    │   └── types/                   # TypeScript interfaces & domain models
    ├── App.tsx                      # Root component with dynamic screen router
    ├── app.json                     # Expo manifest & native app config
    └── package.json
```

---

## ⚡ Quick Start Guide

### 1. Prerequisites
- Python 3.10+
- Node.js 18+
- MongoDB running on `localhost:27017`

### 2. Backend Setup
```bash
cd backend
python -m venv .venv

# PowerShell:
.\.venv\Scripts\Activate.ps1

# Install dependencies:
pip install -r requirements.txt

# Start FastAPI server listening on 0.0.0.0 (allows LAN & localhost access):
python run.py
# Or directly via Uvicorn:
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```
- Local Web URL: `http://localhost:8000` (Interactive Swagger docs: `http://localhost:8000/docs`)
- Network LAN URL: `http://<COMPUTER_LAN_IP>:8000` (e.g. `http://172.16.10.168:8000/docs`)

### 3. Mobile / Frontend Setup (`exp/`)
```bash
cd exp
npm install

# Start the Expo development server:
npm start
# or: npx expo start
```

From the interactive terminal prompt, you can press:
- `a` — Open on connected **Android device / Emulator**
- `i` — Open on **iOS Simulator**
- `w` — Open in **Web Browser** (`http://localhost:8081`)
- **Scan QR Code** — Open in the **Expo Go** app on your physical smartphone!

---

## 🧪 Testing & Verification

LegalAce includes a comprehensive automated test suite enforcing clean code standards, boundary conditions, and contract alignment.

### Running Backend Tests
```bash
cd backend
.\.venv\Scripts\pytest -v
```
*Current test suite: **78 tests passed** (100% green in ~34s), covering:*
- `test_llm_gateway.py`: In-memory cache hit (0ms), reasoning `<think>` tag stripping, JSON parser fences
- `test_intent_router.py`: Sub-millisecond (< 1ms) statutory category routing and emergency police detection
- `test_grounding_citations.py`: Statutory excerpt extraction, normalized grounding confidence scoring (0-100%)
- `test_document_xray.py`: Multi-format parsing, ISO date conversion, dict-to-list normalization, and Base64 JSON API
- `test_outcomes.py`: Action plan outcome recording and MongoDB aggregation resolution telemetry
- `test_agent_tools.py`: Tool registry validation and planner dispatching
- `test_conversation_security.py`: Cross-tenant scoping (IDOR) & safe float parsing
- `test_deadlines.py`: Health score nested stats, bounds, and rule-based extraction
- `test_document_upload.py`: 10MB size limits and file extension sanitization
- `test_embedder.py`: Deterministic vector hashing across worker restarts
- `test_legal_aid.py`: Section 12 criteria, income boundaries, and state fallbacks
- `test_notifications.py`: OTP format, hashing, lockout, and 403 verification checks
- `test_wizard.py`: Notice calculation, scenario generation, and dynamic value schemas
- `test_wizard_notice_dispatch.py`: WhatsApp/Email formatting and PDF generation

### Running Frontend Type Checks
```bash
cd exp
npx tsc --noEmit
```
*Current typecheck: **0 errors** across all TSX screens, components, and types.*

---

## 🌐 Multi-Platform Development Networking (Physical Phone + Expo Go)

The application uses a **single backend server** (`0.0.0.0:8000`) and a **single MongoDB connection** that serves both Web and physical Expo Go mobile clients simultaneously.

### 1. Automatic LAN IP Detection
The app in `exp/src/config/api.ts` **automatically detects your development machine's LAN IP** directly from the Expo dev server handshake (`Constants.expoConfig?.hostUri`). You do not need to manually configure IP addresses in most cases!

### 2. Manual Environment Variable Override (Optional)
If you wish to set an explicit backend URL, create `exp/.env`:
```env
EXPO_PUBLIC_API_URL=http://<YOUR_COMPUTER_LAN_IP>:8000
```
*To find your computer's LAN IP:*
- **Windows (PowerShell)**: Run `ipconfig` and look for `IPv4 Address` under your active Wi-Fi adapter (e.g., `172.16.10.168` or `192.168.1.100`).
- **macOS / Linux**: Run `ifconfig` or `ip a` (under `en0` or `wlan0`).

### 3. Mobile Connection Troubleshooting Checklist
If Expo Go on your physical phone cannot connect to the backend:
1. **Same Wi-Fi Network**: Ensure your phone and development computer are connected to the same Wi-Fi router (avoid mobile cellular data or isolated guest networks).
2. **Backend Host Binding**: Ensure the backend was started with `--host 0.0.0.0` (or `python run.py`), NOT `127.0.0.1`.
3. **Firewall Rules**: Verify Windows Defender Firewall allows incoming connections on port `8000`. You can test this by navigating to `http://<COMPUTER_LAN_IP>:8000/docs` in your phone's mobile browser.
4. **CORS Configuration**: The backend CORS middleware already permits local subnet IPs (`192.168.*`, `172.*`, `10.*`).

---

## 📜 Disclaimer

*LegalAce is an artificial intelligence legal information system designed for educational and informational purposes under Indian Law. It does not constitute legal advice or formal attorney-client representation. Users should consult a qualified advocate for advice on specific legal matters.*
