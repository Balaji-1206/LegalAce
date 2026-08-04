# ⚖️ LegalAce — AI Legal Companion & Rights Engine for India

**LegalAce** is an AI-powered legal rights companion designed specifically for Indian citizens. It provides structured statutory information, interactive legal scenario resolution, deadline tracking, legal document analysis, and free legal aid eligibility checking under Indian Law.

---

## 🌟 Architecture & System Overview

```
                          ┌─────────────────────────────────────────┐
                          │            LegalAce App UI             │
                          │   (React TSX + Vanilla CSS System)    │
                          └────────────────────┬────────────────────┘
                                               │
             ┌─────────────────────────────────┼─────────────────────────────────┐
             │                                 │                                 │
  ┌──────────▼──────────┐           ┌──────────▼──────────┐           ┌──────────▼──────────┐
  │ Module 1: AI Chatbot│           │Module 2: Situation  │           │ Module 3: Deadline  │
  │ RAG Vector Search   │           │       Finder        │           │     Monitor         │
  │ FAISS + LLM Chain   │           │ 13 Legal Categories │           │ Health Score + APSched│
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

### 🤖 1. Agentic Legal AI Chatbot (RAG Pipeline)
- **Vector Retrieval**: Local FAISS vector index built on real Indian Acts (Transfer of Property Act, Consumer Protection Act 2019, Industrial Disputes Act, POSH Act, IT Act, CrPC, Domestic Violence Act).
- **Multi-LLM Fallback**: Resilient LLM chain supporting Google Gemini 2.0 Flash → OpenAI GPT-4o → Ollama (local) → Smart Rule-Based Engine.
- **Citations & Guardrails**: Cites exact act names, sections, relevance scores, statutory rights, and action steps with educational disclaimers.

### 🛡️ 2. Situation Finder
- **13 Specialized Categories**: Housing, Employment, Consumer, Banking, Cyber Crime, Traffic, Women Rights, Education, Cheque Debt, RTI, Real Estate, Insurance, Family & Support.
- **PDF Print Engine**: Clean multi-page PDF generation for legal notices and summaries with print-media layout rules.

### ⏳ 3. Legal Health Monitor & Reminders (Feature 4)
- **Health Score Ring**: Real-time legal safety score calculation based on active, completed, and expired filing deadlines.
- **Automated Reminders**:
  - 💬 **Direct WhatsApp (`wa.me`)**: 1-tap pre-filled reminder links (100% Free).
  - 🔔 **Browser System Push Alerts**: Native device alert banners with sound.
  - 📲 **Automated SMS via Fast2SMS / Twilio**: Scheduled APScheduler background jobs.

### 📝 4. Guided Legal Wizard
- **Interactive Question Trees**: Step-by-step guidance tailored to user scenarios.
- **Action Plans**: Generates required document checklists, step-by-step procedures, authority complaint locations, and downloadable notice templates.

### 📄 5. Document X-Ray (Feature 3 — Upload & Auto-Extract)
- **AI Document Parser**: Upload legal PDFs or images (rent agreements, cheque bounce notices, FIR copies, termination letters).
- **Structured Extraction**: Extracts document type, party names, key dates timeline, obligations checklist, and red flags (unfavorable/illegal clauses).
- **Cross-Module Integration**: 1-tap push to Deadline Monitor and Wizard.

### ⚖️ 6. Free Legal Aid (DLSA) Checker (Feature 5)
- **Statutory Eligibility**: Evaluates user criteria under **Section 12 of the Legal Services Authorities Act, 1987** (SC/ST, Women/Children, Disabled Persons, Industrial Workmen, Income < ₹3,00,000, etc.).
- **Nearest Authority Locator**: Built-in DLSA/SLSA office directory for 10 major Indian states + NALSA helpline (15100) with 1-tap calling.

---

## 🛠️ Technology Stack

| Layer | Technology |
|---|---|
| **Frontend** | React, TypeScript, Vanilla CSS Design System |
| **Backend API** | FastAPI, Uvicorn, Python 3.10+ |
| **AI / RAG** | LangChain, FAISS Vector Search, SentenceTransformers (`all-MiniLM-L6-v2`) |
| **LLMs Supported** | Google Gemini 2.0 Flash, OpenAI GPT-4o, Ollama (Qwen 2.5) |
| **Database** | MongoDB (Motor async driver) |
| **PDF & OCR** | `pypdf`, `pytesseract` |
| **Scheduler** | APScheduler (AsyncIOScheduler) |

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
│   │       ├── agent/               # Agentic planner & workflow engine
│   │       ├── chatbot/             # RAG pipeline, retriever & prompt
│   │       ├── deadline_engine/     # Health score & APScheduler jobs
│   │       ├── document_xray/       # Feature 3: Upload & AI PDF extraction
│   │       ├── legal_aid/           # Feature 5: Section 12 LSA eligibility
│   │       ├── notifications/       # Feature 4: WhatsApp/SMS notification providers
│   │       ├── situation_finder/    # 13 Category situation data & search
│   │       └── wizard/              # Guided legal questionnaires & templates
│   ├── data/                        # Indian Law Corpus (FAISS source)
│   ├── faiss_index/                 # Pre-built vector index
│   ├── requirements.txt
│   └── .env
└── frontend/
    ├── src/
    │   ├── modules/
    │   │   ├── chatbot/             # Floating AI Chat Widget
    │   │   ├── deadline_engine/     # Deadline Dashboard & Reminders
    │   │   ├── document_xray/       # Feature 3 Document X-Ray UI
    │   │   ├── legal_aid/           # Feature 5 DLSA Legal Aid Checker UI
    │   │   ├── profile/             # User Profile Hub
    │   │   ├── situation_finder/    # Interactive Situation Cards
    │   │   └── wizard/              # Guided Legal Wizard UI
    │   ├── App.tsx                  # Tab navigation & layout
    │   └── App.css                  # Core CSS design system
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

# Start FastAPI server:
python -m uvicorn app.main:app --reload
```
Backend server will run at: `http://localhost:8000` (Swagger docs: `http://localhost:8000/docs`).

### 3. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
Frontend Web App will run at: `http://localhost:5173`.

---

## 📜 Disclaimer

*LegalAce is an artificial intelligence legal information system designed for educational and informational purposes under Indian Law. It does not constitute legal advice or formal attorney-client representation. Users should consult a qualified advocate for advice on specific legal matters.*
