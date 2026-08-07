# LegalAce — Feature Capabilities & Architecture Alignment Guide

This document outlines the architecture, feature implementations, and module alignments across the **LegalAce** ecosystem.

---

## 🏛️ Context & System Modules

LegalAce consists of 8 core functional modules:

- **Frontend**: React (TypeScript) + Vite, Vanilla CSS glassmorphism design system.
- **Backend**: Python 3.10+, FastAPI, Uvicorn, Pydantic schemas.
- **AI/LLM**: RAG via FAISS vector search, LangChain ReAct reasoning agent with sync/async execution fallbacks.
- **Database**: MongoDB via Motor (AsyncIOMotorClient).
- **Core Modules**:
  1. `agent` & `chatbot`: AI Legal Companion & Floating Chatbot.
  2. `situation_finder`: 13-category statutory rights blueprint engine with Web Speech Synthesis TTS.
  3. `deadline_engine`: Statutory Limitation Calculator, Legal Health Score, WhatsApp OTP reminders, and ICS Export.
  4. `wizard`: Interactive Decision Tree Wizard (EN/TA/HI) & Vector PDF Notice Generator.
  5. `document_xray`: Contract Clause Risk Analyzer & OCR text extraction.
  6. `legal_aid`: NALSA Act Section 12 Free Legal Aid Eligibility Checker & DLSA Directory.
  7. `profile` & `shared`: User persona customization, state jurisdiction selector, JSON profile export.
  8. `notifications`: WhatsApp & SMS notification provider integrations.

---

## 📦 Key Implemented Capabilities

### 1. Citation Verifier & Source-Linked Answers
- Every legal citation (IPC, CrPC/BNSS, Consumer Protection Act, RERA, Model Tenancy Act) is checked against statutory provisions before being presented to the user.
- Verified citations display green statutory badges with expandable law summaries.

### 2. Multi-Agent Reasoning Trace Pipeline
- The chatbot visualizes real-time reasoning steps (*Deconstructing query -> Searching Indian Statutes -> Building resolution plan*) to ensure complete AI transparency.

### 3. Document X-Ray Clause Analyzer
- Users can upload legal notices, rent agreements, or employment contracts for instant OCR text extraction and clause risk scoring.
- Red flags and key dates are highlighted with one-tap addition to the Deadline Engine.

### 4. Interactive Multilingual Decision Trees & Notice Generator
- Multilingual decision trees guide citizens through legal scenarios in English, Tamil, and Hindi.
- Generates official Indian legal demand notices formatted with advocate, court, or corporate letterhead styling.

### 5. Statutory Deadline Monitor & WhatsApp/SMS Reminders
- Tracks limitation periods under the Indian Limitation Act, 1963.
- Computes real-time Legal Health Scores (0–100) and supports WhatsApp/SMS OTP alert configurations.

### 6. Free Legal Aid Eligibility & DLSA Directory
- Evaluates citizen eligibility under Section 12 of the NALSA Act, 1987.
- Identifies nearest District Legal Services Authority (DLSA) offices across Indian states.

---

## 🛡️ Code Quality & Audit Status

- **TypeScript Compilation (`npx tsc -b`)**: 0 Errors
- **ESLint Code Quality (`npm run lint`)**: 0 Errors, 0 Warnings
- **Python Syntax Compilation (`compileall app`)**: 100% Verified
