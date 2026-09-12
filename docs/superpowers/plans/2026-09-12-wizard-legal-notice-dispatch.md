# Guided Legal Wizard Notice Generation & 1-Tap Dispatch Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enable citizens completing the Guided Legal Wizard to generate a complete, addressed, ready-to-send statutory legal notice/complaint, review/edit the text in-place, and dispatch it via 1-tap WhatsApp (`wa.me`), Email (`mailto:`), or downloadable PDF with recipient contact capture and explicit pre-send confirmation safeguards.

**Architecture:** Extend FastAPI `wizard` module with `/dispatch-notice` endpoint and pure-Python PDF notice generator. Enrich notice generation with wizard Q&A facts, statutory sections, and Limitation Act deadlines. In the React Native frontend (`WizardScreen.tsx`), provide recipient contact capture (phone & email), an editable notice review box, URL-length-capped WhatsApp `wa.me` links, and mandatory user confirmation before transmission.

**Tech Stack:** FastAPI, Python 3.10+, React Native (Expo), TypeScript, Web Speech / Linking API, pure-Python PDF 1.4 generator.

**Spec:** Step 1 Audit report from current conversation.

## Global Constraints
- Python 3.10+ compatible type annotations (`dict[str, Any]`, `X | None`).
- All existing 54 Pytest tests must pass without regressions.
- React Native TypeScript compilation must remain at 0 errors (`npx tsc --noEmit`).
- No auto-sending without explicit user review and authorization checkbox.
- WhatsApp `wa.me` URLs must be sanitized and character-bounded to prevent browser URL overflow.

---

### Task 1: Backend Notice Dispatch Engine & Validation Schemas

**Files:**
- Modify: `backend/app/modules/wizard/api.py`
- Modify: `backend/app/modules/wizard/service.py`
- Create: `backend/tests/test_wizard_notice_dispatch.py`

**Interfaces:**
- `NoticeDispatchRequest`:
  ```python
  class NoticeDispatchRequest(BaseModel):
      template_id: str
      scenario_id: Optional[str] = None
      sender_name: str
      sender_phone: Optional[str] = None
      sender_email: Optional[str] = None
      sender_address: Optional[str] = None
      recipient_name: str
      recipient_phone: Optional[str] = None
      recipient_email: Optional[str] = None
      recipient_address: Optional[str] = None
      dispute_amount: Optional[str] = "50000"
      facts_summary: Optional[str] = ""
      notice_days: Optional[int] = 15
      custom_text: Optional[str] = None  # If user edited text in review screen
  ```
- `POST /api/v1/wizard/dispatch-notice`:
  Returns:
  ```json
  {
    "title": "LEGAL DEMAND NOTICE FOR REFUND OF SECURITY DEPOSIT",
    "document_text": "...",
    "executive_notice": "...",
    "whatsapp_url": "https://wa.me/919876543210?text=...",
    "mailto_url": "mailto:recipient@example.com?subject=...&body=...",
    "pdf_download_url": "/api/v1/wizard/download-pdf?...",
    "financial_breakdown": { "principal": 50000, "interest": 6000, "damages": 15000, "total_claim": 71000 },
    "statutory_sections": ["Model Tenancy Act 2021 — Section 11"]
  }
  ```

- [ ] **Step 1: Write failing test for notice dispatch endpoint & wa.me URL builder**

```python
# backend/tests/test_wizard_notice_dispatch.py
import pytest
from app.modules.wizard.service import build_dispatch_channels, generate_legal_document

def test_build_dispatch_channels_formats_clean_whatsapp_url():
    recipient_phone = "+91 98765 43210"
    notice_text = "LEGAL NOTICE: Under Section 106 of Transfer of Property Act, refund Rs. 50,000 within 15 days."
    channels = build_dispatch_channels(
        notice_text=notice_text,
        recipient_phone=recipient_phone,
        recipient_email="landlord@example.com",
        subject="Statutory Legal Demand Notice",
    )
    assert channels["whatsapp_url"] is not None
    assert "wa.me/919876543210" in channels["whatsapp_url"]
    assert "Transfer%20of%20Property%20Act" in channels["whatsapp_url"]
    assert "mailto:landlord@example.com" in channels["mailto_url"]

def test_build_dispatch_channels_truncates_long_notice_for_whatsapp():
    recipient_phone = "9876543210"
    long_notice = "A" * 3000
    channels = build_dispatch_channels(
        notice_text=long_notice,
        recipient_phone=recipient_phone,
        recipient_email=None,
        subject="Legal Notice",
        executive_summary="Under Section 35 Consumer Protection Act, claim of Rs. 50,000.",
    )
    # Encoded URL should remain safe (< 2000 chars)
    assert len(channels["whatsapp_url"]) < 2500
    assert "Full%20legal%20notice" in channels["whatsapp_url"] or "Consumer%20Protection%20Act" in channels["whatsapp_url"]
```

- [ ] **Step 2: Run test to verify it fails**
Run: `.\.venv\Scripts\pytest tests/test_wizard_notice_dispatch.py -v` in `backend`.

- [ ] **Step 3: Implement `build_dispatch_channels` and `POST /api/v1/wizard/dispatch-notice`**
In `backend/app/modules/wizard/service.py`:
Implement clean phone normalizer (`re.sub(r'\D', '', phone)` with Indian `91` prefix logic), URL character length cap with concise executive text fallback, and mailto URL generation.
In `backend/app/modules/wizard/api.py`:
Add `POST /api/v1/wizard/dispatch-notice`.

- [ ] **Step 4: Run test to verify it passes**
Run: `.\.venv\Scripts\pytest tests/test_wizard_notice_dispatch.py -v` in `backend`.

- [ ] **Step 5: Commit Task 1**
```bash
git add backend/
git commit -m "feat: implement legal notice dispatch channels engine for WhatsApp and Email"
```

---

### Task 2: Pure-Python Printable PDF Notice Generator

**Files:**
- Modify: `backend/app/modules/wizard/service.py`
- Modify: `backend/app/modules/wizard/api.py`
- Modify: `backend/tests/test_wizard_notice_dispatch.py`

**Interfaces:**
- `generate_notice_pdf(document_text: str, title: str, ref_code: str) -> bytes`:
  Generates binary PDF 1.4 formatted document with legal headers, margins, page breaks, and timestamp.
- `GET /api/v1/wizard/download-pdf`:
  Streams `application/pdf` with `Content-Disposition: attachment; filename=Legal_Notice_<ref>.pdf`.
- `POST /api/v1/wizard/render-pdf`:
  Accepts raw text or notice body and returns base64 or direct PDF bytes for web/mobile saving.

- [ ] **Step 1: Write failing test for PDF generator**

```python
# Add to backend/tests/test_wizard_notice_dispatch.py
from app.modules.wizard.service import generate_notice_pdf

def test_generate_notice_pdf_produces_valid_pdf_bytes():
    pdf_bytes = generate_notice_pdf(
        document_text="LEGAL NOTICE\n\nTo Landlord,\nRefund deposit of Rs. 50,000.",
        title="STATUTORY LEGAL DEMAND NOTICE",
        ref_code="LA-1024",
    )
    assert pdf_bytes.startswith(b"%PDF-1.")
    assert b"%%EOF" in pdf_bytes
    assert len(pdf_bytes) > 500
```

- [ ] **Step 2: Run test to verify it fails**
Run: `.\.venv\Scripts\pytest tests/test_wizard_notice_dispatch.py -v` in `backend`.

- [ ] **Step 3: Implement `generate_notice_pdf` and download endpoint**
Implement valid pure-Python PDF 1.4 page stream emitter (proper xref table, Helvetica text objects, catalog, and trailer) in `service.py`. Add `GET /api/v1/wizard/download-pdf` in `api.py`.

- [ ] **Step 4: Run test to verify it passes**
Run: `.\.venv\Scripts\pytest tests/test_wizard_notice_dispatch.py -v` in `backend`.

- [ ] **Step 5: Commit Task 2**
```bash
git add backend/
git commit -m "feat: implement lightweight pure-Python PDF statutory notice compiler"
```

---

### Task 3: WizardScreen Frontend Notice Review & 1-Tap Dispatch UI

**Files:**
- Modify: `exp/src/screens/WizardScreen.tsx`

**Features:**
- Recipient Contact Form: Captures Recipient Name, Recipient Phone (with WhatsApp icon), Recipient Email, and Dispute Amount.
- Document X-Ray Pre-Fill: If `route` or state has extracted party names from a scanned agreement, automatically pre-fill opposing party name.
- In-Place Editable Notice: Renders generated notice inside an editable `<TextInput multiline>` review box with dark glassmorphic accents, allowing citizens to add specific facts or dates before sending.
- Mandatory Confirmation Gate: Checkbox `[ ] I have reviewed the exact text of this legal notice and authorize sending it.`
- 1-Tap Dispatch Buttons:
  - `📲 Send via WhatsApp` (`Linking.openURL(whatsapp_url)`)
  - `✉️ Send via Email` (`Linking.openURL(mailto_url)`)
  - `📥 Download PDF Notice` (opens download URL or downloads file)
- Safety Modal: Confirms recipient contact and reminds user that a legal notice has statutory consequences under Indian law before external app launch.

- [ ] **Step 1: Update `WizardScreen.tsx` with recipient contacts, editable review, and 1-tap dispatch channels**
- [ ] **Step 2: Verify frontend TypeScript with `npx tsc --noEmit`**
- [ ] **Step 3: Commit Task 3**
```bash
git add exp/
git commit -m "feat: add editable legal notice review, recipient contact capture, and 1-tap dispatch in WizardScreen"
```

---

### Task 4: Full Verification & Documentation

**Files:**
- Modify: `README.md`
- Modify: `walkthrough.md`

- [ ] **Step 1: Run full backend test suite (`pytest -v`)**
- [ ] **Step 2: Run full TypeScript check (`npx tsc --noEmit`)**
- [ ] **Step 3: Update documentation with notice dispatch instructions**
- [ ] **Step 4: Commit and present completion**
```bash
git add README.md docs/
git commit -m "docs: document legal notice 1-tap dispatch capability and safety safeguards"
```
