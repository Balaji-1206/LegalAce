"""
RAG Pipeline — Coordinates:
  1. Intent classification
  2. Legal text retrieval from FAISS
  3. System prompt construction
  4. LLM Chat Completion call (Gemini / OpenAI)
  5. JSON response validation, cleanup, and parsing
  6. Resilient Legal AI Engine fallback
"""
from __future__ import annotations

import json
import re
from openai import AsyncOpenAI

from app.core.config import settings
from app.core.logging import get_logger
from app.modules.chatbot.rag.intent import classify_intent
from app.modules.chatbot.rag.retriever import retrieve_relevant_laws
from app.modules.chatbot.rag.prompt import SYSTEM_PROMPT, build_context_block, build_history_block

logger = get_logger(__name__)

# Initialize OpenAI client
_openai_client: AsyncOpenAI | None = None

def load_openai_client() -> None:
    """Initialize OpenAI AsyncOpenAI client. Call during FastAPI startup."""
    global _openai_client
    if not settings.OPENAI_API_KEY:
        logger.warning("OPENAI_API_KEY is not set in environment configurations.")
    logger.info(f"Initializing AsyncOpenAI client with model: {settings.OPENAI_MODEL}")
    _openai_client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)

def clean_and_parse_json(raw_text: str) -> dict:
    """Helper to clean markdown fences and parse JSON robustly."""
    cleaned = raw_text.strip()
    if cleaned.startswith("```"):
        cleaned = re.sub(r"^```(?:json)?\n?", "", cleaned, flags=re.IGNORECASE)
        cleaned = re.sub(r"\n?```$", "", cleaned)
        cleaned = cleaned.strip()

    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        match = re.search(r"\{[\s\S]*\}", cleaned)
        if match:
            try:
                return json.loads(match.group(0))
            except json.JSONDecodeError:
                pass
        logger.error(f"Could not parse raw LLM output as JSON: {raw_text[:200]}")
        return {}

def generate_smart_fallback(query: str, intent: str, law_chunks: list) -> dict:
    """
    Construct a structured, professional Indian legal response combining
    intent domain rules and FAISS statutory law chunks.
    """
    logger.info(f"Generating smart statutory response for intent '{intent}'...")

    # Build statutory text highlights (only include high-relevance matches)
    law_citations = []
    chunk_highlights = []
    if law_chunks:
        for chunk in law_chunks:
            if getattr(chunk, 'score', 0.0) >= 0.45:
                chunk_highlights.append(f"• **{chunk.act_name} — {chunk.section_number} ({chunk.section_title})**: {chunk.section_text}")
                law_citations.append({
                    "act": chunk.act_name,
                    "section": chunk.section_number,
                    "section_title": chunk.section_title,
                    "relevance_score": float(chunk.score)
                })

    # Domain specific guidance generators
    query_l = query.lower()

    if any(k in query_l for k in ["petition", "court", "summons", "case", "lawsuit", "suit", "hearing", "notice"]):
        answer = (
            f"Under Indian Judicial Procedure (Code of Civil Procedure, 1908 & BNSS / CrPC):\n\n"
            f"1. **Receiving Court Petition / Summons**: If you have received a court petition or summons, inspect the document carefully for the **Court Name**, **Case Number**, **Next Hearing Date**, and the specific **Relief Claimed** by the petitioner.\n\n"
            f"2. **Statutory Timeline (Written Statement)**: Under Order VIII Rule 1 of the Code of Civil Procedure (CPC), a respondent or defendant must file a formal **Written Statement / Reply Affidavit** within 30 days of receiving court notice.\n\n"
            + ("\n\n**Relevant Statutory Provisions**:\n" + "\n".join(chunk_highlights) if chunk_highlights else "")
        )
        rights = [
            "Right to receive a complete copy of the petition along with all annexed documents & affidavits.",
            "Right to 30 days to file a Written Statement / Reply under Order VIII Rule 1 of CPC.",
            "Right to legal representation by an advocate before the Court or Tribunal."
        ]
        action_steps = [
            "Step 1: Check the summons/petition for the Court Name, Case Number, and exact Hearing Date.",
            "Step 2: Engage a licensed advocate immediately to draft a Written Statement / Objections.",
            "Step 3: Appear before the court on the scheduled date or submit an interim application through your advocate."
        ]

    elif "tenancy" in intent or "landlord" in query_l or "deposit" in query_l or "rent" in query_l:
        answer = (
            f"Under Indian Tenancy Law (Model Tenancy Act & State Rent Control Acts):\n\n"
            f"1. **Security Deposit Rights**: Landlords are legally required to refund security deposits upon vacating, deducting only legitimate, documented dues or repair costs. Retaining deposits without itemized proof is illegal.\n\n"
            f"2. **Eviction Protection**: A landlord cannot forcibly evict a tenant or cut off essential services (electricity, water) without a valid legal court order and written notice.\n\n"
            + ("\n\n**Relevant Statutory Provisions**:\n" + "\n".join(chunk_highlights) if chunk_highlights else "")
        )
        rights = [
            "Right to refund of security deposit within agreed timeframe (Section 11, Model Tenancy Act).",
            "Right against arbitrary eviction or disconnection of essential utility services.",
            "Right to written notice prior to lease termination."
        ]
        action_steps = [
            "Step 1: Send a formal written Demand Letter / Email requesting deposit return within 7-14 days.",
            "Step 2: Gather rental agreement, payment receipts, and inspection photographs.",
            "Step 3: Issue a Legal Notice through an advocate or approach the Rent Authority / Small Causes Court."
        ]

    elif "employment" in intent or "fired" in query_l or "salary" in query_l or "job" in query_l:
        answer = (
            f"Under Indian Labour & Industrial Law (Industrial Disputes Act, Section 25F & Shops and Establishment Acts):\n\n"
            f"1. **Notice & Severance Pay**: An employer cannot retrench a permanent employee without 30 days written notice or pay in lieu of notice, plus retrenchment compensation.\n\n"
            f"2. **Earned Salary Recovery**: Withholding earned wages or gratuity upon termination is an offence. Employees have a statutory right to full and final settlement.\n\n"
            + ("\n\n**Relevant Statutory Provisions**:\n" + "\n".join(chunk_highlights) if chunk_highlights else "")
        )
        rights = [
            "Right to 30 days notice or 1 month salary in lieu of notice (Section 25F, Industrial Disputes Act).",
            "Right to full and final wage settlement including earned leave encashment and gratuity.",
            "Right against wrongful termination without procedure established by law."
        ]
        action_steps = [
            "Step 1: Preserve appointment letter, salary slips, termination email, and HR communications.",
            "Step 2: Send a formal letter demanding payment of unpaid wages and statutory dues.",
            "Step 3: File a complaint before the Labour Commissioner under the Payment of Wages Act or Labour Court."
        ]

    elif "consumer" in intent or "product" in query_l or "refund" in query_l or "defective" in query_l:
        answer = (
            f"Under the Consumer Protection Act, 2019 (Section 2(47) & Section 35):\n\n"
            f"1. **Protection Against Defective Goods**: Sellers and e-commerce platforms must refund or replace goods that suffer from manufacturing defects or do not match specifications.\n\n"
            f"2. **Unfair Trade Practices**: Overcharging above MRP or refusing warranty service is an unfair trade practice punishable with compensation and fines.\n\n"
            + ("\n\n**Relevant Statutory Provisions**:\n" + "\n".join(chunk_highlights) if chunk_highlights else "")
        )
        rights = [
            "Right to replacement or full refund for defective goods or deficient services (Section 39, Consumer Protection Act).",
            "Right to be protected against unfair trade practices and misleading advertisements.",
            "Right to file a complaint electronically via NCH (National Consumer Helpline)."
        ]
        action_steps = [
            "Step 1: Keep invoice, serial numbers, photographs of defect, and chat support logs.",
            "Step 2: Log a formal complaint on National Consumer Helpline (1915 or consumerhelpline.gov.in).",
            "Step 3: File a consumer complaint in District Consumer Disputes Redressal Commission."
        ]

    elif "criminal" in intent or "police" in query_l or "fir" in query_l or "arrest" in query_l:
        answer = (
            f"Under Indian Criminal Law (CrPC / BNSS & Constitution of India Article 21):\n\n"
            f"1. **Arrest & Search Rules**: Police officers must state specific grounds for arrest (Section 50 CrPC) and allow contacting a lawyer or family member. Searching a phone without warrant/written grounds violates right to privacy (Puttaswamy 2017).\n\n"
            f"2. **Zero FIR**: A victim of a cognizable offence can register an FIR at any police station regardless of jurisdiction.\n\n"
            + ("\n\n**Relevant Statutory Provisions**:\n" + "\n".join(chunk_highlights) if chunk_highlights else "")
        )
        rights = [
            "Right to be informed of grounds of arrest and right to bail (Section 50 CrPC / Section 47 BNSS).",
            "Right to legal consultation and right against self-incrimination (Article 20(3), Constitution).",
            "Special protection for women: Restriction on arrest between sunset and sunrise (Section 46(4) CrPC)."
        ]
        action_steps = [
            "Step 1: Request police officers to produce official ID and state written grounds for search/arrest.",
            "Step 2: Inform family members or a legal advocate immediately.",
            "Step 3: Submit written complaint to Senior Superintendent of Police (SSP) or Magistrate if police refuse FIR."
        ]

    else:
        # General Legal query
        answer = (
            f"Regarding your query on '{query}':\n\n"
            f"Under Indian statutory laws, citizens are protected against arbitrary actions through clear legal procedures.\n\n"
            + ("**Relevant Statutory Provisions**:\n" + "\n".join(chunk_highlights) if chunk_highlights else "Review applicable state and central statutes to safeguard your interests.")
        )
        rights = [
            "Right to due process and fair treatment under Indian law.",
            "Right to issue formal legal representations and seek judicial remedy.",
            "Right to access legal counsel and statutory authorities."
        ]
        action_steps = [
            "Step 1: Gather all written evidence, contracts, receipts, and communication records.",
            "Step 2: Draft and serve a formal Legal Demand Notice stating specific statutory grounds.",
            "Step 3: Approach the appropriate tribunal, commissioner, or civil court if unaddressed."
        ]

    if not law_citations and law_chunks:
        for chunk in law_chunks[:2]:
            law_citations.append({
                "act": chunk.act_name,
                "section": chunk.section_number,
                "section_title": chunk.section_title,
                "relevance_score": float(chunk.score)
            })

    return {
        "answer": answer,
        "rights": rights,
        "action_steps": action_steps,
        "law_citations": law_citations,
        "disclaimer": "This information is provided for educational purposes under Indian Law."
    }

async def call_gemini_llm(prompt: str) -> dict:
    """Call Google Gemini API with native JSON output mode."""
    import asyncio
    from google import genai
    from google.genai import types

    client = genai.Client(api_key=settings.GEMINI_API_KEY)
    model_name = settings.GEMINI_MODEL or "gemini-2.0-flash"

    loop = asyncio.get_running_loop()
    def _generate():
        return client.models.generate_content(
            model=model_name,
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                temperature=0.2,
            )
        )

    response = await loop.run_in_executor(None, _generate)
    raw_text = response.text or "{}"
    return clean_and_parse_json(raw_text)

async def run_rag_pipeline(
    query: str,
    conversation_history: list[dict],
) -> tuple[dict, str, list]:
    """
    Run the query through RAG pipeline with fail-safe legal fallback execution.
    """
    from app.modules.chatbot.rag import embedder, faiss_store
    if not embedder.is_loaded():
        embedder.load_embedder()

    if not faiss_store.is_loaded():
        faiss_store.load_index()

    if _openai_client is None:
        load_openai_client()

    # 1. Intent Classification
    intent = classify_intent(query)

    if intent == "greeting":
        parsed_greeting = {
            "answer": "Hello! I am LegalAce, your AI legal information assistant for Indian Law. I can help you understand your legal rights, statutory provisions, notice drafting, and action steps. What legal topic or situation can I help you with today?",
            "rights": ["Right to access free legal information and know your statutory protections."],
            "action_steps": ["Ask any legal query regarding Employment, Housing, Consumer Rights, Cyber Crime, Police & FIR, Property, or Banking."],
            "law_citations": [],
            "disclaimer": "This is a greeting response. For formal legal representation, please consult a licensed advocate."
        }
        return parsed_greeting, "greeting", []

    if intent == "out_of_scope":
        parsed_out_of_scope = {
            "answer": "I am LegalAce, an AI assistant dedicated exclusively to Indian Law, statutory rights, and legal guidance. I cannot assist with non-legal topics such as cooking recipes, programming tutorials, or sports scores. Please ask a legal question!",
            "rights": [],
            "action_steps": ["Ask a question related to Indian laws, rights, or disputes."],
            "law_citations": [],
            "disclaimer": "LegalAce is strictly constrained to legal information only."
        }
        return parsed_out_of_scope, "out_of_scope", []

    # 2. FAISS Document Retrieval (strict 0.48 minimum similarity to eliminate noise)
    law_chunks = await retrieve_relevant_laws(query, top_k=5, min_score=0.48)

    # 3. Prompt Construction
    context_block = build_context_block(law_chunks)
    history_block = build_history_block(conversation_history[-8:])

    prompt = SYSTEM_PROMPT.format(
        context=context_block,
        history=history_block,
        question=query,
    )

    logger.info(f"Executing LLM generation for query: '{query[:80]}'")
    parsed = {}
    
    # ── Add-on: Runtime provider override ──
    from app.api.llm_settings import get_active_provider as _get_llm_provider
    _llm_override = _get_llm_provider()  # "auto" | "gemini" | "openai" | "ollama"

    # 1. Primary: Try Gemini API
    if settings.GEMINI_API_KEY and _llm_override in ("auto", "gemini"):
        try:
            logger.info(f"Executing Gemini LLM ({settings.GEMINI_MODEL}) generation [override={_llm_override}]...")
            parsed = await call_gemini_llm(prompt)
        except Exception as e:
            logger.error(f"Gemini LLM API call error: {e}")
            parsed = {}

    # 2. Secondary: OpenAI
    if not parsed and _openai_client and settings.OPENAI_API_KEY and _llm_override in ("auto", "openai"):
        try:
            logger.info(f"Executing OpenAI LLM generation [override={_llm_override}]...")
            response = await _openai_client.chat.completions.create(
                model=settings.OPENAI_MODEL,
                messages=[{"role": "user", "content": prompt}],
                temperature=0.2,
                response_format={"type": "json_object"},
            )
            raw_content = response.choices[0].message.content or "{}"
            parsed = clean_and_parse_json(raw_content)
        except Exception as e:
            logger.error(f"OpenAI LLM API call error: {e}")
            parsed = {}

    # 3. Tier 3: Ollama local LLM — GPU-accelerated on RTX 4060, fully private
    if not parsed and settings.OLLAMA_BASE_URL and _llm_override in ("auto", "ollama"):
        try:
            from openai import AsyncOpenAI as AsyncOpenAIClient
            logger.info(f"Executing Ollama ({settings.OLLAMA_MODEL}) local LLM generation...")
            ollama_client = AsyncOpenAIClient(
                base_url=settings.OLLAMA_BASE_URL,
                api_key="ollama",
            )
            # Trim context block for local model context window safety
            trimmed_context = build_context_block(law_chunks[:3])
            trimmed_history = build_history_block(conversation_history[-4:])
            ollama_prompt = SYSTEM_PROMPT.format(
                context=trimmed_context,
                history=trimmed_history,
                question=query,
            )
            ollama_response = await ollama_client.chat.completions.create(
                model=settings.OLLAMA_MODEL,
                messages=[{"role": "user", "content": ollama_prompt}],
                temperature=0.2,
            )
            raw_ollama = ollama_response.choices[0].message.content or "{}"
            parsed = clean_and_parse_json(raw_ollama)
            if parsed and "answer" in parsed:
                logger.info(f"Ollama ({settings.OLLAMA_MODEL}) generated response successfully.")
            else:
                parsed = {}
                logger.warning("Ollama response could not be parsed as JSON — falling back to rule-based.")
        except Exception as e:
            logger.error(f"Ollama LLM API call error: {e}")
            parsed = {}

    # 4. Fallback Execution if all LLMs unavailable or parsing failed
    if not parsed or "answer" not in parsed:
        GENERIC_WORDS = {

            "without", "notice", "about", "from", "with", "have", "that", "this", 
            "your", "what", "which", "where", "some", "been", "there", "their",
            "them", "they", "will", "would", "could", "should", "does", "done",
            "please", "help", "need", "know", "tell", "received", "receive",
            "getting", "give", "take", "send", "sent", "file", "filed", "case",
            "letter", "petition", "about"
        }
        matched_sit = None
        category_map = {
            "tenancy": "housing",
            "employment": "employment",
            "consumer": "consumer",
            "criminal": "criminal",
            "cyber": "cyber_crime",
            "banking": "banking"
        }
        target_cat = category_map.get(intent)
        
        # Only query situations collection if an explicit category intent was detected
        if target_cat:
            try:
                from app.database.mongodb import get_database
                db = get_database()
                words = [w for w in re.split(r'\W+', query.lower()) if len(w) > 3 and w not in GENERIC_WORDS]
                if words:
                    matched_sit = await db["situations"].find_one({
                        "category": target_cat,
                        "$or": [
                            {"title": {"$regex": "|".join(words), "$options": "i"}},
                            {"description": {"$regex": "|".join(words), "$options": "i"}}
                        ]
                    })
            except Exception as db_err:
                logger.debug(f"Database query skipped in fallback: {db_err}")

        if matched_sit:
            parsed = {
                "answer": (
                    f"Here is relevant statutory guidance regarding '{matched_sit['title']}':\n\n"
                    f"{matched_sit['description']}\n\n"
                    "Under Indian Law, you are protected against arbitrary actions. Ensure you maintain written documentation."
                ),
                "rights": matched_sit.get("user_rights", ["Right to fair process under Indian law."]),
                "action_steps": matched_sit.get("action_steps", [
                    "Document all communications, receipts, and agreements.",
                    "Send a formal written notice detailing your claim.",
                    "File a complaint with the appropriate statutory authority."
                ]),
                "law_citations": [
                    {
                        "act": c.get("act", "Indian Law"),
                        "section": c.get("section", "Section"),
                        "section_title": c.get("section_title", "Statutory Provision"),
                        "relevance_score": 0.95
                    }
                    for c in matched_sit.get("applicable_laws", [])
                ],
                "disclaimer": "This guidance is provided for educational purposes based on standard Indian statutory frameworks."
            }
        else:
            parsed = generate_smart_fallback(query, intent, law_chunks)

    # Ensure law_citations are populated if retrieved law_chunks exist and meet relevance threshold
    if not parsed.get("law_citations") and law_chunks:
        parsed["law_citations"] = [
            {
                "act": chunk.act_name,
                "section": chunk.section_number,
                "section_title": chunk.section_title,
                "relevance_score": float(chunk.score),
            }
            for chunk in law_chunks
            if getattr(chunk, 'score', 0.0) >= 0.45
        ]

    return parsed, intent, law_chunks
