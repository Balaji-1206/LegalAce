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

## 🚀 Key Modules & Novel Features

### 🤖 1. Agentic Legal AI Chatbot (RAG Pipeline & Tool Calling)
- **Vector Retrieval**: Local FAISS vector index built on real Indian statutory acts (Transfer of Property Act, Consumer Protection Act 2019, Industrial Disputes Act, POSH Act, Information Technology Act, CrPC/BNSS, Domestic Violence Act).
- **Agent Tool Registry**: Built-in planner capable of dispatching dynamic tools (such as `legal_aid_lookup`) to synthesize statutory authorities and legal remedies directly into conversation turns.
- **Multi-LLM Fallback & Switcher**: Resilient multi-tier LLM fallback: Google Gemini 2.0 Flash → OpenAI GPT-4o → Ollama (local) → Smart Rule-Based Engine. Switchable on-the-fly from the mobile app.
- **Citations & Guardrails**: Cites exact act names, sections, relevance scores, statutory rights, and action steps with educational disclaimers.
- **Rich Markdown Formatting**: Native mobile parsing and formatted rendering for section headers (`###`), bold highlights (`**text**`), and bullet points.

### 🛡️ 2. Situation Finder
- **13 Specialized Categories**: Housing, Employment, Consumer, Banking, Cyber Crime, Traffic, Women's Rights, Education, Cheque Debt, RTI, Real Estate, Insurance, and Family & Support.
- **Interactive Scenarios**: Instant search, penalty calculators, and key statutory rights cards for everyday citizen disputes.
- **Optimized Performance**: Single-pass MongoDB `$group` aggregation pipeline for real-time category counts without repetitive collection queries.

### ⏳ 3. Legal Health Monitor & Statutory Deadlines (Feature 4)
- **Limitation Act Engine**: Calculates statutory limitation periods under the Limitation Act 1963, Consumer Protection Act, NI Act Section 138, and RTI Act.
- **Health Score Ring**: Real-time legal health score dynamically calculated from active, completed, and expired legal filing deadlines with nested analytics.
- **Multi-Channel Reminders**:
  - 💬 **Direct WhatsApp (`wa.me`)**: 1-tap pre-filled reminder links (100% Free).
  - 🔔 **Native Device Push Alerts**: System notifications with urgency badges.
  - 📲 **Automated SMS via Fast2SMS / Twilio**: Scheduled background reminder jobs via APScheduler with strict OTP phone verification.

### 📝 4. Guided Legal Wizard & AI Scenario Generator
- **Interactive Question Trees**: Step-by-step decision guidance tailored to citizen disputes.
- **AI-Powered Custom Paths**: Dynamic question tree generation using Gemini/GPT for scenarios not in the pre-built library.
- **Action Plans & Document Drafting**: Generates required document checklists, step-by-step procedures, filing authority locations, and downloadable notice drafts.

### 📄 5. Document X-Ray (Feature 3 — Upload & Auto-Extract)
- **AI Document Parser**: Upload legal PDFs or images (rental agreements, cheque bounce notices, FIR copies, termination letters).
- **Structured Extraction**: Extracts document type, party names, key dates timeline, obligations checklist, and red flags (unfavorable/illegal clauses).
- **Cross-Platform Resilience**: Cross-platform Web `Blob` and mobile native `FormData` handling with null-safe defensive rendering.

### ⚖️ 6. Free Legal Aid (DLSA) Checker (Feature 5)
- **Statutory Eligibility**: Evaluates user criteria under **Section 12 of the Legal Services Authorities Act, 1987** (SC/ST, Women/Children, Persons with Disabilities, Industrial Workmen, Under-Trial Prisoners, Annual Income < ₹3,00,000, etc.).
- **Nearest Authority Locator**: Built-in DLSA/SLSA office directory for Indian states + NALSA nationwide helpline (15100) with 1-tap calling.

### 🔒 7. Security & Privacy Hardening
- **IDOR Safeguards**: Scoped multi-tenant queries by `{"conversation_id": conversation_id, "user_id": user_id}` and `{"_id": ObjectId(id), "user_id": user_id}`.
- **Cryptographic OTP Verification**: CSPRNG generation (`secrets.randbelow`), salted SHA-256 hash storage, and constant-time comparison (`hmac.compare_digest`).
- **Prompt Injection Sandboxing**: Isolation of untrusted user queries within `<untrusted_user_request>` XML tags.
- **ReDoS Prevention**: Regex escaping (`re.escape`) for RAG fallback keyword searches.

---

## 🛠️ Technology Stack

| Layer | Technology |
|---|---|
| **Mobile / Frontend** | Expo (~57.0), React Native (0.86), TypeScript, React Native Web, Safe Area Context, Vector Icons |
| **Backend API** | FastAPI, Uvicorn, Python 3.10+ |
| **AI / RAG** | LangChain, FAISS Vector Search, SentenceTransformers (`all-MiniLM-L6-v2`) |
| **LLMs Supported** | Google Gemini 2.0 Flash, OpenAI GPT-4o, Ollama (Qwen 2.5) |
| **Database** | MongoDB (Motor async driver) |
| **PDF & OCR** | `pypdf`, `pytesseract` |
| **Scheduler** | APScheduler (AsyncIOScheduler) |
| **Testing** | Pytest, Pytest-AsyncIO, TypeScript Compiler (`tsc`) |

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
*Current test suite: **50 tests passed**, covering:*
- `test_agent_tools.py`: Tool registry validation and planner dispatching
- `test_conversation_security.py`: Cross-tenant scoping (IDOR) & safe float parsing
- `test_deadlines.py`: Health score nested stats, bounds, and rule-based extraction
- `test_document_upload.py`: 10MB size limits and file extension sanitization
- `test_embedder.py`: Deterministic vector hashing across worker restarts
- `test_legal_aid.py`: Section 12 criteria, income boundaries, and state fallbacks
- `test_notifications.py`: OTP format, hashing, lockout, and 403 verification checks
- `test_wizard.py`: Notice calculation, scenario generation, and dynamic value schemas

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
