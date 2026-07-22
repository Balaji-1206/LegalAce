"""
Wizard Service — Module 4

Deterministic action plan generator based on user's decision-tree answers.
No AI needed — all plans are rule-based and fully explainable.
"""
from __future__ import annotations

import hashlib
import json
from datetime import datetime, timezone
from typing import Optional

from app.core.logging import get_logger
from app.database.mongodb import get_database
from app.modules.wizard.scenarios_data import get_scenario

logger = get_logger(__name__)
COLLECTION = "wizard_sessions"


# ---------------------------------------------------------------------------
# Local Authority Contacts (per category)
# ---------------------------------------------------------------------------
LOCAL_AUTHORITIES: dict[str, list[dict]] = {
    "housing": [
        {"name": "Rent Control Authority", "helpline": "1800-XXX-XXXX", "url": "https://tnrb.gov.in", "action": "File rent dispute / eviction complaint"},
        {"name": "District Collector Office", "helpline": "1800-425-5544", "url": "https://tndistricts.tn.gov.in", "action": "Escalation for illegal eviction"},
    ],
    "employment": [
        {"name": "Labour Commissioner Office", "helpline": "1800-425-3242", "url": "https://labour.tn.gov.in", "action": "File salary recovery or wrongful termination complaint"},
        {"name": "EPFO (PF Office)", "helpline": "1800-118-005", "url": "https://epfindia.gov.in", "action": "File PF grievance"},
    ],
    "consumer": [
        {"name": "National Consumer Helpline", "helpline": "1800-11-4000", "url": "https://consumerhelpline.gov.in", "action": "Register consumer complaint"},
        {"name": "District Consumer Forum", "helpline": "1800-XXX-XXXX", "url": "https://edaakhil.nic.in", "action": "File formal consumer complaint"},
        {"name": "RERA Authority (for real estate)", "helpline": "1800-XXX-XXXX", "url": "https://rera.tn.gov.in", "action": "File housing/builder complaint"},
    ],
    "banking": [
        {"name": "RBI Banking Ombudsman", "helpline": "14448", "url": "https://cms.rbi.org.in", "action": "File bank complaint / UPI fraud"},
        {"name": "Cyber Crime Portal", "helpline": "1930", "url": "https://cybercrime.gov.in", "action": "Report UPI/online financial fraud"},
        {"name": "National Payments Corporation (NPCI)", "helpline": "1800-120-1740", "url": "https://www.npci.org.in", "action": "UPI dispute resolution"},
    ],
    "cyber": [
        {"name": "Cyber Crime Portal", "helpline": "1930", "url": "https://cybercrime.gov.in", "action": "Report all cyber crimes"},
        {"name": "CERT-In", "helpline": "", "url": "https://cert-in.org.in", "action": "Report critical cyber incidents"},
        {"name": "Local Cyber Crime Police Station", "helpline": "100", "url": "", "action": "File FIR for cyber crime"},
    ],
    "traffic": [
        {"name": "Motor Accident Claims Tribunal (MACT)", "helpline": "", "url": "https://districts.ecourts.gov.in", "action": "File accident compensation claim"},
        {"name": "Traffic Police Headquarters", "helpline": "103", "url": "", "action": "E-challan dispute / verification"},
        {"name": "National Insurance Ombudsman", "helpline": "155255", "url": "https://cioins.co.in", "action": "Insurance claim dispute"},
    ],
    "women": [
        {"name": "Women Helpline", "helpline": "181", "url": "", "action": "Immediate help / counselling"},
        {"name": "National Commission for Women", "helpline": "7827170170", "url": "https://ncw.nic.in", "action": "File harassment / DV complaint"},
        {"name": "Mahila Thana / Women Police", "helpline": "100", "url": "", "action": "File FIR for domestic violence / harassment"},
        {"name": "One Stop Centre (Sakhi)", "helpline": "181", "url": "https://wcd.nic.in", "action": "Free legal, medical & counselling support"},
    ],
    "education": [
        {"name": "UGC Grievance Portal", "helpline": "011-23604446", "url": "https://pgms.ugc.ac.in", "action": "College / university complaint"},
        {"name": "National Commission for Protection of Child Rights", "helpline": "1800-121-2830", "url": "https://ncpcr.gov.in", "action": "RTE / school complaint"},
        {"name": "State Education Department", "helpline": "", "url": "https://tnschools.gov.in", "action": "Fee refund / admission dispute"},
    ],
}

# ---------------------------------------------------------------------------
# Letter templates (metadata only — content generated on request)
# ---------------------------------------------------------------------------
TEMPLATES: dict[str, list[dict]] = {
    "housing": [
        {"id": "housing_legal_notice", "title": "Security Deposit Recovery Notice", "description": "Formal notice to landlord demanding return of security deposit within 15 days"},
        {"id": "housing_rent_authority_complaint", "title": "Rent Authority Complaint Letter", "description": "Official complaint to Rent Control Authority for illegal eviction or excess rent"},
    ],
    "employment": [
        {"id": "employment_legal_notice", "title": "Employer Legal Notice — Salary Recovery", "description": "Formal notice demanding unpaid salary within 7 days under Payment of Wages Act"},
        {"id": "employment_labour_complaint", "title": "Labour Commissioner Complaint", "description": "Complaint letter to Labour Commissioner for wrongful termination"},
        {"id": "employment_pf_complaint", "title": "EPFO PF Grievance Letter", "description": "Complaint to EPFO for non-deposit of PF contributions"},
    ],
    "consumer": [
        {"id": "consumer_legal_notice", "title": "Consumer Legal Notice", "description": "Demand notice to seller/company for defective product or denied refund"},
        {"id": "consumer_forum_complaint", "title": "Consumer Forum Complaint", "description": "Formal complaint to District Consumer Forum (e-Daakhil format)"},
    ],
    "banking": [
        {"id": "banking_fraud_report", "title": "Bank Fraud Report Letter", "description": "Report to bank for unauthorized UPI/card transaction with chargeback request"},
        {"id": "banking_ombudsman", "title": "RBI Ombudsman Complaint", "description": "Escalation to Banking Ombudsman if bank does not resolve within 30 days"},
    ],
    "cyber": [
        {"id": "cyber_fir_draft", "title": "Cyber Crime FIR Draft", "description": "Draft FIR for filing at cyber crime police station or portal"},
        {"id": "cyber_platform_report", "title": "Platform Takedown Request", "description": "Formal notice to platform (Facebook/Instagram/Google) for content removal"},
    ],
    "traffic": [
        {"id": "traffic_mact_claim", "title": "MACT Compensation Claim", "description": "Claim petition for Motor Accident Claims Tribunal"},
        {"id": "traffic_challan_objection", "title": "E-Challan Objection Letter", "description": "Formal objection to traffic police for disputed e-challan"},
    ],
    "women": [
        {"id": "women_dv_application", "title": "Domestic Violence Protection Order Application", "description": "Application under Domestic Violence Act Section 12 for protection order"},
        {"id": "women_icc_complaint", "title": "ICC Workplace Harassment Complaint", "description": "Formal complaint to Internal Complaints Committee under POSH Act"},
        {"id": "women_ncw_complaint", "title": "NCW Online Complaint", "description": "Complaint to National Commission for Women"},
    ],
    "education": [
        {"id": "education_rte_complaint", "title": "RTE Admission Complaint", "description": "Complaint to District Education Officer for denial of RTE admission"},
        {"id": "education_fee_refund_notice", "title": "Fee Refund Demand Notice", "description": "Legal notice to institution for unlawful retention of fees (UGC guidelines)"},
    ],
}


# ---------------------------------------------------------------------------
# Action Plan Generator — deterministic rule-based engine
# ---------------------------------------------------------------------------

def generate_action_plan(scenario_id: str, answers: dict[str, str]) -> dict:
    """
    Generate a deterministic action plan based on scenario + answers.
    Returns structured plan with steps, documents, templates, and authorities.
    """
    generators = {
        "housing_deposit": _plan_housing_deposit,
        "housing_eviction": _plan_housing_eviction,
        "housing_rent_hike": _plan_housing_rent_hike,
        "employment_salary": _plan_employment_salary,
        "employment_termination": _plan_employment_termination,
        "employment_pf": _plan_employment_pf,
        "consumer_defective": _plan_consumer_defective,
        "consumer_refund": _plan_consumer_refund,
        "consumer_overcharge": _plan_consumer_overcharge,
        "banking_upi_fraud": _plan_banking_upi,
        "banking_loan": _plan_banking_loan,
        "cyber_fraud": _plan_cyber_fraud,
        "cyber_harassment": _plan_cyber_harassment,
        "cyber_identity": _plan_cyber_identity,
        "traffic_accident": _plan_traffic_accident,
        "traffic_challan": _plan_traffic_challan,
        "women_dv": _plan_women_dv,
        "women_workplace": _plan_women_workplace,
        "education_admission": _plan_education_admission,
        "education_fee": _plan_education_fee,
    }
    fn = generators.get(scenario_id)
    if fn:
        plan = fn(answers)
    else:
        plan = _generic_plan(scenario_id, answers)

    scenario = get_scenario(scenario_id)
    category = scenario["category"] if scenario else "general"
    plan["authorities"] = LOCAL_AUTHORITIES.get(category, [])
    plan["templates"] = TEMPLATES.get(category, [])
    plan["scenario_id"] = scenario_id
    plan["disclaimer"] = (
        "This action plan is for educational guidance only and does not constitute legal advice. "
        "For serious legal matters, please consult a qualified advocate."
    )
    return plan


def _step(num, title, desc, time="", importance="medium", law=""):
    return {"step_number": num, "title": title, "description": desc,
            "estimated_time": time, "importance": importance, "applicable_law": law}


# ─── Housing ────────────────────────────────────────────────────────────────

def _plan_housing_deposit(a: dict) -> dict:
    vacated = a.get("q1") == "yes"
    over21 = a.get("q2") == "yes"
    has_reason = a.get("q3") == "yes"
    has_agreement = a.get("q4") == "yes"

    steps = []
    if not vacated:
        steps.append(_step(1, "Complete proper handover", "Hand over property keys in writing. Get acknowledgement from landlord with date.", "1 day", "high"))
    steps.append(_step(len(steps)+1, "Send formal written demand notice", "Write to landlord demanding full security deposit refund within 15 days. Send via Registered Post (speed post) or WhatsApp with read receipt.", "1-2 days", "high", "Transfer of Property Act, Section 108(q)"))
    if not has_agreement:
        steps.append(_step(len(steps)+1, "Gather evidence", "Collect any bank transfer records, rent receipts, and messages about the deposit. Even screenshots of WhatsApp messages confirming deposit amount count.", "1 day", "high"))
    if has_reason:
        steps.append(_step(len(steps)+1, "Counter the deduction claim", "Request itemized written deduction list. Normal wear and tear cannot be deducted. Take photos of the property condition.", "3 days", "medium"))
    if over21:
        steps.append(_step(len(steps)+1, "File complaint with Rent Authority", "If no response in 15 days, file complaint before District Rent Authority. Submit the demand notice, agreement, and proof.", "15 days after notice", "high", "Model Tenancy Act, Section 11"))
    steps.append(_step(len(steps)+1, "File consumer/civil case if needed", "For amounts above ₹1 lakh, file in District Consumer Forum. Below ₹1 lakh, Small Causes Court is an option. Filing fee is minimal.", "1-2 months", "medium", "Consumer Protection Act 2019"))

    docs = ["Original rent agreement", "Security deposit payment proof (bank transfer / receipt)", "Vacating date proof / key handover letter", "Demand notice copy + postal receipt", "Photos of property condition at vacating"]
    return {"title": "Security Deposit Recovery Plan", "steps": steps, "required_documents": docs, "urgent": over21}


def _plan_housing_eviction(a: dict) -> dict:
    has_notice = a.get("q1") == "yes"
    rent_paid = a.get("q2") == "yes"
    forceful = a.get("q3") == "yes"

    steps = []
    if forceful:
        steps.append(_step(1, "Call police immediately", "If landlord changed locks or removed your belongings without a court order, this is illegal. Call 100 or visit nearest police station immediately.", "Immediate", "high", "CrPC Section 441 — Criminal trespass"))
    if not has_notice:
        steps.append(_step(len(steps)+1, "Know your rights", "A landlord CANNOT evict you without: (1) Written notice, (2) Valid legal reason, (3) Court order. Simply asking you to leave has no legal force.", "Immediate", "high"))
    if rent_paid:
        steps.append(_step(len(steps)+1, "Document your rent payment history", "Collect all rent receipts, bank transfer records, or UPI payment screenshots proving rent is paid. This is your strongest defense.", "1 day", "high"))
    steps.append(_step(len(steps)+1, "Send a legal reply notice", "Reply to eviction notice stating you will not vacate without a valid court order and that you are a lawful tenant.", "2-3 days", "high"))
    steps.append(_step(len(steps)+1, "File application in Rent Court", "Apply to Rent Control Court for Protection Order stopping illegal eviction. Court can restore your possession.", "1 week", "high", "Rent Control Act (State specific)"))

    docs = ["Rent agreement", "Rent payment receipts / bank statements", "Eviction notice received (if any)", "Photographs of changed locks / removed belongings"]
    return {"title": "Illegal Eviction Defense Plan", "steps": steps, "required_documents": docs, "urgent": forceful}


def _plan_housing_rent_hike(a: dict) -> dict:
    excess = a.get("q1") == "yes"
    has_agreement = a.get("q2") == "yes"
    notice_given = a.get("q3") == "yes"

    steps = []
    steps.append(_step(1, "Check your rent agreement", "Your agreement specifies the rent amount and any escalation clause. If escalation is more than agreed, it is legally invalid.", "1 day", "high"))
    if not notice_given:
        steps.append(_step(2, "Reject the hike in writing", "Send written message/letter to landlord stating that no proper notice was given and you will not pay the excess amount.", "2 days", "high"))
    if excess:
        steps.append(_step(len(steps)+1, "Know legal rent increase limits", "Under most State Rent Acts, annual increase is capped (typically 5-10%). Check your state's Rent Control Act for specific limits.", "1 day", "medium", "State Rent Control Acts"))
    steps.append(_step(len(steps)+1, "Attempt negotiation", "Propose a reasonable increase in line with the agreement. Keep all communication in writing.", "1 week", "medium"))
    steps.append(_step(len(steps)+1, "Approach Rent Authority", "If landlord continues demanding excess rent, file complaint with District Rent Authority. Include agreement, payment history, and correspondence.", "15 days", "medium"))

    docs = ["Rent agreement (showing escalation clause)", "All rent payment receipts", "Written communication about rent hike", "Comparison of demanded vs. agreed rent"]
    return {"title": "Rent Hike Dispute Plan", "steps": steps, "required_documents": docs, "urgent": False}


# ─── Employment ─────────────────────────────────────────────────────────────

def _plan_employment_salary(a: dict) -> dict:
    months = a.get("q1", "1 month")
    has_contract = a.get("q2") == "yes"
    complained = a.get("q3") == "yes"
    still_employed = a.get("q4") == "yes"

    urgency = months != "1 month"
    steps = []
    if not complained:
        steps.append(_step(1, "Send written complaint to HR/Management", "Email or letter to HR clearly stating months and amount due. Keep the email sent/received record. This creates a paper trail.", "1 day", "high"))
    steps.append(_step(len(steps)+1, "Send formal legal notice to employer", "Have an advocate or use a template to send Registered Post legal notice demanding salary payment within 7 days.", "3-5 days", "high", "Payment of Wages Act Section 5"))
    steps.append(_step(len(steps)+1, "File complaint with Labour Commissioner", "Submit Form under Payment of Wages Act. Bring: pay slips, appointment letter, bank statements, and HR complaint copy.", "7-15 days", "high", "Payment of Wages Act 1936"))
    if still_employed:
        steps.append(_step(len(steps)+1, "Do not resign under pressure", "Employer may pressure you to resign. Resignation voids your salary claim rights. Continue working and document everything.", "", "high"))
    steps.append(_step(len(steps)+1, "Labour Court claim if unresolved", "If Labour Commissioner does not resolve within 30 days, file claim in Labour Court. Courts typically resolve salary disputes in 3-6 months.", "30-60 days", "medium", "Industrial Disputes Act 1947"))

    docs = ["Employment contract / appointment letter", "Salary slips for past months", "Bank account statements showing missing credits", "HR complaint email / letter copy", "Form 16 / Income Tax records"]
    return {"title": "Unpaid Salary Recovery Plan", "steps": steps, "required_documents": docs, "urgent": urgency}


def _plan_employment_termination(a: dict) -> dict:
    has_letter = a.get("q1") == "yes"
    over_1year = a.get("q2") == "yes"
    notice_given = a.get("q3") == "yes"
    comp_paid = a.get("q4") == "yes"

    steps = []
    if not has_letter:
        steps.append(_step(1, "Demand termination letter in writing", "Immediately email HR/management requesting written termination order with stated reason. Verbal termination has no legal standing.", "1 day", "high"))
    if over_1year and not notice_given:
        steps.append(_step(len(steps)+1, "Claim 1 month salary in lieu of notice", "Under Section 25F of Industrial Disputes Act, you are entitled to 1 month notice or equivalent pay. Send formal demand.", "3-5 days", "high", "Industrial Disputes Act Section 25F"))
    if over_1year and not comp_paid:
        steps.append(_step(len(steps)+1, "Claim retrenchment compensation", "You are legally entitled to 15 days' wages for every completed year of service. Calculate and demand this amount.", "5-7 days", "high", "Industrial Disputes Act Section 25F"))
    steps.append(_step(len(steps)+1, "File complaint with Labour Commissioner", "Bring termination letter, service record, and salary history. Labour office can order reinstatement or compensation.", "7-15 days", "high"))
    steps.append(_step(len(steps)+1, "File case in Labour Court for reinstatement", "If you believe termination was unjust, Labour Court can order reinstatement with back wages.", "30 days from termination", "medium", "Industrial Disputes Act Section 25G"))

    docs = ["Termination letter (if received)", "Appointment/employment contract", "Service record / experience certificate", "Salary slips for last 6 months", "Any show cause notices received"]
    return {"title": "Wrongful Termination Action Plan", "steps": steps, "required_documents": docs, "urgent": not notice_given and over_1year}


def _plan_employment_pf(a: dict) -> dict:
    steps = [
        _step(1, "Check UAN passbook", "Log in to EPFO Member Portal (epfindia.gov.in) with your UAN and verify if contributions are being deposited monthly.", "1 day", "high"),
        _step(2, "Raise grievance on EPFO portal", "Go to epfigms.gov.in → Lodge Grievance → Select 'Employer not depositing PF'. Upload salary slips as proof.", "2 days", "high", "EPF Act 1952"),
        _step(3, "Complain to Regional PF Commissioner", "If online grievance is not resolved in 30 days, visit the nearest EPFO regional office with salary slips and UAN passbook.", "30 days", "medium"),
        _step(4, "File complaint against employer", "EPFO can levy penalty on employer and recover dues. Criminal prosecution is also possible under Section 14 of EPF Act.", "45 days", "medium", "EPF Act Section 14"),
    ]
    docs = ["UAN number and passbook screenshot", "Salary slips showing PF deduction", "Employment contract", "Bank statements showing salary credits"]
    return {"title": "PF/EPF Non-Deposit Action Plan", "steps": steps, "required_documents": docs, "urgent": False}


# ─── Consumer ────────────────────────────────────────────────────────────────

def _plan_consumer_defective(a: dict) -> dict:
    purchase_age = a.get("q1", "Within 30 days")
    contacted = a.get("q2") == "yes"
    has_bill = a.get("q3") == "yes"
    under_warranty = a.get("q4") == "yes"

    expired = purchase_age == "More than 2 years ago"
    steps = []
    if expired:
        steps.append(_step(1, "⚠ Limitation warning", "Consumer complaints must be filed within 2 years of purchase. If more than 2 years have passed, your complaint may not be admissible. Act immediately.", "Urgent", "high", "Consumer Protection Act 2019 Section 35"))
        return {"title": "Consumer Complaint — Urgent Action Needed", "steps": steps, "required_documents": ["Bill/receipt", "Warranty card"], "urgent": True}

    if not contacted:
        steps.append(_step(1, "Contact seller / company in writing", "Email or WhatsApp the seller stating the defect clearly. Request replacement, repair, or refund within 7 days. Keep screenshots.", "1-2 days", "high"))
    if under_warranty:
        steps.append(_step(len(steps)+1, "Invoke warranty claim", "Contact manufacturer's authorized service center with warranty card. They must repair/replace at no cost.", "3-7 days", "high"))
    steps.append(_step(len(steps)+1, "Send legal notice to seller/company", "Send Registered Post notice demanding redressal within 15 days. Mention Consumer Protection Act rights.", "5-7 days", "high", "Consumer Protection Act 2019"))
    steps.append(_step(len(steps)+1, "File complaint on National Consumer Helpline", "Call 1800-11-4000 or visit consumerhelpline.gov.in. This is free and often results in quick resolution.", "7-10 days", "medium"))
    steps.append(_step(len(steps)+1, "File in Consumer Forum (e-Daakhil)", "Go to edaakhil.nic.in to file online complaint. No advocate needed for claims under ₹50 lakhs.", "15-30 days", "medium", "Consumer Protection Act 2019 Section 35"))

    docs = ["Original bill / invoice / order confirmation", "Warranty card (if applicable)", "Photos / videos of defect", "Communication with seller (emails / screenshots)", "Legal notice copy and postal receipt"]
    return {"title": "Defective Product / Service Action Plan", "steps": steps, "required_documents": docs, "urgent": purchase_age == "Within 30 days" and not contacted}


def _plan_consumer_refund(a: dict) -> dict:
    platform = a.get("q1", "Online")
    complained = a.get("q2") == "yes"
    has_rejection = a.get("q3") == "yes"

    steps = []
    if not complained:
        steps.append(_step(1, "Raise complaint on platform", "Use the app/website's complaint section. Note the complaint/ticket number. Most platforms must respond within 48 hours under Consumer E-Commerce Rules 2020.", "1 day", "high", "Consumer E-Commerce Rules 2020"))
    steps.append(_step(len(steps)+1, "Escalate to Consumer Helpline", "Call NCH at 1800-11-4000. They can mediate with the company and often resolve within 5-7 days.", "5 days", "medium"))
    if has_rejection:
        steps.append(_step(len(steps)+1, "Send legal notice to platform/company", "A formal Registered Post notice changes the urgency for companies. Mention Consumer Protection Act 2019 and intent to file in Consumer Forum.", "5-7 days", "high"))
    steps.append(_step(len(steps)+1, "File consumer complaint (e-Daakhil)", "For online platforms, you can file in Consumer Forum where YOU are located (not where company is based).", "30 days", "medium", "Consumer Protection Act Section 34(2)(c)"))
    if "Online" in platform:
        steps.append(_step(len(steps)+1, "Chargeback via credit/debit card", "If paid by card, contact your bank for chargeback request (within 60 days of transaction). Banks are obligated to investigate.", "5-10 days", "medium"))

    docs = ["Order confirmation / purchase receipt", "Correspondence with platform (screenshot)", "Complaint reference number from platform", "Written rejection (if received)", "Payment proof (bank statement / UPI screenshot)"]
    return {"title": "Refund Recovery Action Plan", "steps": steps, "required_documents": docs, "urgent": False}


def _plan_consumer_overcharge(a: dict) -> dict:
    steps = [
        _step(1, "Photograph the MRP label", "Take a clear photo of the MRP printed on the product packaging. This is your key evidence.", "Immediate", "high"),
        _step(2, "Demand written receipt", "Ask the seller for an itemized receipt. If they refuse, this itself is a violation.", "Immediate", "high"),
        _step(3, "Report to Legal Metrology Department", "File complaint at your district's Legal Metrology Office (under State Weights & Measures) — they handle MRP violations and can penalize sellers.", "1-2 days", "high", "Legal Metrology Act 2009"),
        _step(4, "File on Consumer Helpline", "Call 1800-11-4000 or consumerhelpline.gov.in. MRP overcharge complaints are taken very seriously.", "1 day", "medium", "Consumer Protection Act 2019"),
    ]
    docs = ["Product with MRP label (do not return)", "Bill / receipt showing overcharge", "Photograph of MRP vs. charged amount", "Seller's contact details"]
    return {"title": "MRP Overcharge Action Plan", "steps": steps, "required_documents": docs, "urgent": False}


# ─── Banking ─────────────────────────────────────────────────────────────────

def _plan_banking_upi(a: dict) -> dict:
    when = a.get("q1", "Within 3 days")
    shared_otp = a.get("q2") == "yes"
    blocked = a.get("q3") == "yes"
    reported_bank = a.get("q4") == "yes"

    steps = []
    if not blocked:
        steps.append(_step(1, "⚡ IMMEDIATELY block your account / card", "Call your bank's 24-hour helpline RIGHT NOW. Freeze your account or block UPI to prevent further loss. Every minute matters.", "Immediate", "high"))
    steps.append(_step(len(steps)+1, "Report to Cyber Crime Portal (1930)", "Call helpline 1930 or visit cybercrime.gov.in. Report UPI fraud within 3 days for highest chance of recovery.", "Immediate / same day", "high"))
    if not reported_bank:
        steps.append(_step(len(steps)+1, "File complaint with your bank", "Visit bank branch or use banking app to file fraud complaint. Note the complaint reference number. Banks must respond in 30 days.", "1 day", "high", "RBI Circular on Unauthorized Transactions"))
    steps.append(_step(len(steps)+1, "RBI Banking Ombudsman (if bank refuses)", "If bank rejects your claim within 30 days, escalate to Banking Ombudsman at cms.rbi.org.in. Free and effective.", "30 days after bank complaint", "medium"))
    if shared_otp:
        steps.append(_step(len(steps)+1, "Note: OTP sharing affects liability", "Since OTP was shared, bank may claim reduced liability. However, if you were deceived (phishing), you still have rights. Explain this clearly to bank.", "", "medium"))

    docs = ["Transaction screenshot / UPI ID of fraudster", "Bank statement showing fraudulent transaction", "Complaint reference from 1930 / cybercrime portal", "Bank complaint acknowledgement", "Any messages received from fraudsters"]
    urgent = when in ["Today", "Within 3 days"]
    return {"title": "UPI Fraud Recovery Plan", "steps": steps, "required_documents": docs, "urgent": urgent}


def _plan_banking_loan(a: dict) -> dict:
    harassment = a.get("q1") == "yes"
    calling_hours = a.get("q2") == "yes"
    has_docs = a.get("q3") == "yes"

    steps = []
    if harassment:
        steps.append(_step(1, "Document harassment with evidence", "Record calls, photograph agents visiting your home, and note times and dates. Recovery agents cannot use abusive language or intimidate.", "Ongoing", "high", "RBI Fair Practices Code for Recovery Agents"))
        if not calling_hours:
            steps.append(_step(2, "Report illegal calling hours", "Recovery agents can only contact between 7 AM and 7 PM. Calls outside this are illegal. File complaint with RBI Consumer Education.", "1 day", "high"))
    steps.append(_step(len(steps)+1, "Request complete loan statement", "Write to bank requesting full loan account statement, sanction letter, and repayment schedule under RTI / bank's disclosure policy.", "3-5 days", "medium"))
    steps.append(_step(len(steps)+1, "File complaint with Banking Ombudsman", "cms.rbi.org.in — Covers unfair loan practices, excessive interest, and harassment by recovery agents.", "7 days", "high", "RBI Banking Ombudsman Scheme 2006"))
    steps.append(_step(len(steps)+1, "Approach NBFC Ombudsman (if applicable)", "For NBFCs (Bajaj Finance, Muthoot etc.), use the RBI Integrated Ombudsman Scheme.", "7 days", "medium"))

    docs = ["Loan sanction letter and agreement", "All repayment receipts / EMI records", "Bank statements", "Call recordings / evidence of harassment", "Complaint filed with bank"]
    return {"title": "Loan Harassment Action Plan", "steps": steps, "required_documents": docs, "urgent": harassment}


# ─── Cyber ───────────────────────────────────────────────────────────────────

def _plan_cyber_fraud(a: dict) -> dict:
    clicked_link = a.get("q1") == "yes"
    money_lost = a.get("q2") == "yes"
    has_evidence = a.get("q3") == "yes"

    steps = []
    steps.append(_step(1, "Report immediately to 1930", "Call 1930 (National Cyber Crime Helpline) immediately. The faster you report, the higher chance of fund freeze and recovery.", "Immediate", "high"))
    if clicked_link:
        steps.append(_step(2, "Secure your device NOW", "Uninstall any suspicious app. Change passwords for banking, email, and social media from a DIFFERENT device.", "Immediate", "high"))
    if money_lost:
        steps.append(_step(len(steps)+1, "Contact your bank for reversal", "Call bank helpline to freeze or recall the fraudulent transaction. Early action can recover funds.", "Same day", "high", "RBI Unauthorized Transaction Guidelines"))
    steps.append(_step(len(steps)+1, "File online complaint at cybercrime.gov.in", "Register complaint with UPI/bank transaction ID, fraudster's contact, and screenshots as proof.", "1 day", "high", "IT Act 2000 Section 66C/66D"))
    if has_evidence:
        steps.append(_step(len(steps)+1, "File FIR at Cyber Police Station", "Take your evidence (screenshots, transaction IDs, messages) to the nearest Cyber Crime Police Station or use Zero FIR.", "2-3 days", "medium"))
    steps.append(_step(len(steps)+1, "Monitor your credit report", "Check your CIBIL credit report for unauthorized loans opened in your name. File dispute if found.", "7-15 days", "medium"))

    docs = ["Screenshots of fraudulent messages/website", "Bank transaction ID / UPI reference", "Fraudster's phone number / email / account", "Your complaint reference from 1930"]
    return {"title": "Cyber Fraud Action Plan", "steps": steps, "required_documents": docs, "urgent": money_lost}


def _plan_cyber_harassment(a: dict) -> dict:
    known = a.get("q1") == "yes"
    intimate_content = a.get("q2") == "yes"
    has_evidence = a.get("q3") == "yes"

    steps = []
    if intimate_content:
        steps.append(_step(1, "Report content on the platform immediately", "Use the 'Report' button on the platform (Facebook, Instagram etc.) to report the content as non-consensual intimate images. Platforms must remove within 24 hours under IT Rules 2021.", "Immediate", "high", "IT (Intermediary Guidelines) Rules 2021"))
    if not has_evidence:
        steps.append(_step(len(steps)+1, "Document evidence before reporting", "Take screenshots of all abusive messages, comments, and posts BEFORE reporting (reporting may remove the content from your view).", "Immediate", "high"))
    steps.append(_step(len(steps)+1, "File complaint at cybercrime.gov.in", "Use 'Report Cyber Crime' → 'Women / Child Related Crime'. Attach all screenshots as evidence.", "1-2 days", "high", "IT Act Section 66E, IPC Section 354D"))
    if known:
        steps.append(_step(len(steps)+1, "Apply for restraining order", "If harasser is known, approach local magistrate for a restraining order under CrPC Section 144.", "3-7 days", "medium"))
    steps.append(_step(len(steps)+1, "File FIR at Cyber Police Station", "For serious cases (stalking, threats, identity theft), file FIR. Women can file at any police station using Zero FIR.", "2-3 days", "high", "IT Act Section 66A, IPC Section 509"))

    docs = ["Screenshots of harassment (with date/time visible)", "Platform URL / account ID of harasser", "Any communication received from harasser", "Your police complaint / cybercrime portal reference"]
    return {"title": "Online Harassment Action Plan", "steps": steps, "required_documents": docs, "urgent": intimate_content}


def _plan_cyber_identity(a: dict) -> dict:
    steps = [
        _step(1, "Report fake profile to platform", "Use the 'Report impersonation' feature on the platform. Platforms must act within 72 hours under IT Rules 2021.", "Immediate", "high", "IT (Intermediary Guidelines) Rules 2021"),
        _step(2, "File complaint at cybercrime.gov.in", "Report under 'Online Financial Fraud' or 'Cyber Blackmailing' category with screenshots.", "1 day", "high", "IT Act 2000 Section 66C, 66D"),
        _step(3, "Alert your bank and check credit report", "Inform bank that your identity may be compromised. Request a free credit report from CIBIL to check unauthorized loans.", "1-2 days", "high"),
        _step(4, "File FIR at Cyber Crime Police Station", "Bring evidence of the fake profile/account. This creates an official record and enables investigation.", "3-5 days", "medium", "IPC Section 419 — Cheating by personation"),
        _step(5, "Apply for Aadhaar lock if biometrics are compromised", "Visit UIDAI portal (uidai.gov.in) to lock your Aadhaar biometrics temporarily.", "1 day", "medium"),
    ]
    docs = ["Screenshot of fake profile / account", "Evidence of misuse (transactions, messages sent from fake account)", "Your original ID proof", "Platform complaint reference number"]
    return {"title": "Identity Theft Action Plan", "steps": steps, "required_documents": docs, "urgent": True}


# ─── Traffic ─────────────────────────────────────────────────────────────────

def _plan_traffic_accident(a: dict) -> dict:
    fir_filed = a.get("q1") == "yes"
    has_reg = a.get("q2") == "yes"
    medical = a.get("q3") == "yes"
    negligence = a.get("q4") == "yes"

    steps = []
    if not fir_filed:
        steps.append(_step(1, "File FIR immediately", "Visit nearest police station or call 100. Under Motor Vehicles Act, accident must be reported within 24 hours.", "24 hours", "high", "Motor Vehicles Act Section 134"))
    if not medical:
        steps.append(_step(len(steps)+1, "Get medical treatment and document injuries", "Visit hospital and get written medical report. Even minor injuries should be documented — they form the basis of your compensation claim.", "Immediate", "high"))
    steps.append(_step(len(steps)+1, "Collect evidence from accident scene", "Photograph vehicle damage, road condition, skid marks, signals, and witness details. Request police panchanama copy.", "1-2 days", "high"))
    steps.append(_step(len(steps)+1, "Inform your insurance company", "File motor accident claim with your insurer within 7 days. Also check if other vehicle has valid third-party insurance.", "3-7 days", "high"))
    if negligence:
        steps.append(_step(len(steps)+1, "File claim before MACT", "Motor Accident Claims Tribunal (MACT) handles compensation claims. No need for advocate — you can file yourself. Tribunal operates under 'no fault liability' principle.", "30-60 days", "medium", "Motor Vehicles Act Section 163A"))

    docs = ["FIR copy", "Medical treatment bills and reports", "Vehicle insurance documents", "Photograph of accident scene and damages", "Witness names and contact numbers", "Panchanama copy from police"]
    return {"title": "Road Accident Compensation Plan", "steps": steps, "required_documents": docs, "urgent": not fir_filed}


def _plan_traffic_challan(a: dict) -> dict:
    steps = [
        _step(1, "Verify the challan details online", "Visit echallan.parivahan.gov.in or your state traffic portal. Enter vehicle number to see challan details and evidence image.", "Immediate", "high"),
        _step(2, "Collect evidence of your defense", "If you have a dashcam recording, GPS data, or witnesses, preserve this immediately as it gets overwritten.", "Immediate", "high"),
        _step(3, "File online objection / contest the challan", "On echallan portal, there is an option to contest/dispute. Submit your evidence online.", "3-5 days", "medium"),
        _step(4, "Appear before Traffic Magistrate", "If disputing in person, appear before the Traffic Magistrate on the hearing date. Bring all evidence and your driving license / RC.", "On hearing date", "medium"),
        _step(5, "Do not ignore the challan", "Ignoring challan results in increased penalties and can affect vehicle registration renewal. Resolve within the notice period.", "", "high"),
    ]
    docs = ["Challan reference number", "Driving license", "Vehicle RC / Insurance", "Dashcam footage / photographs (if available)", "Witnesses details"]
    return {"title": "Traffic Challan Dispute Plan", "steps": steps, "required_documents": docs, "urgent": False}


# ─── Women ───────────────────────────────────────────────────────────────────

def _plan_women_dv(a: dict) -> dict:
    safe = a.get("q1") == "yes"
    has_evidence = a.get("q4") == "yes"

    steps = []
    if not safe:
        steps.append(_step(1, "⚡ Get to a safe place IMMEDIATELY", "Call Women Helpline 181, or go to the nearest police station, hospital, or trusted person's home. Your physical safety comes FIRST.", "Immediate", "high"))
    steps.append(_step(len(steps)+1, "Call helpline 181 or 100", "Women's helpline 181 is free, 24×7. Police (100) must respond and take action under DV Act — refusing to act is an offense.", "Immediate", "high"))
    steps.append(_step(len(steps)+1, "Visit One Stop Centre (Sakhi)", "Government-run centers provide free shelter, legal aid, medical help, and counselling under one roof. Completely confidential.", "1 day", "high"))
    if has_evidence:
        steps.append(_step(len(steps)+1, "Preserve medical evidence", "Get medical examination done and obtain written report mentioning injuries. This is crucial legal evidence.", "1-2 days", "high"))
    steps.append(_step(len(steps)+1, "Apply for Protection Order under DV Act", "Approach a Magistrate (you can go alone without an advocate) for Protection Order, Residence Order, or Monetary Relief.", "3-7 days", "high", "Protection of Women from DV Act 2005, Section 12"))
    steps.append(_step(len(steps)+1, "File FIR if physical assault occurred", "Physical violence is a criminal offense. File FIR under IPC 498A (cruelty) and Domestic Violence Act.", "1-3 days", "high", "IPC Section 498A"))

    docs = ["Medical examination report", "Photographs of injuries", "Any previous police complaints", "Marriage certificate", "Proof of shared household (utility bills, rental agreement)"]
    return {"title": "Domestic Violence Protection Plan", "steps": steps, "required_documents": docs, "urgent": not safe}


def _plan_women_workplace(a: dict) -> dict:
    has_icc = a.get("q1") == "yes"
    filed_icc = a.get("q2") == "yes"
    recent = a.get("q3") == "yes"
    has_evidence = a.get("q4") == "yes"

    steps = []
    if not has_evidence:
        steps.append(_step(1, "Document all evidence now", "Save all messages, emails, and note dates/times of incidents. If deleted, IT department may recover messages. Act before evidence is lost.", "Immediate", "high"))
    if has_icc and not filed_icc:
        steps.append(_step(len(steps)+1, "File complaint with ICC within 3 months", "POSH Act mandates ICC must investigate and submit report within 60 days. File a written complaint to ICC immediately.", "Within 3 months of incident", "high", "POSH Act 2013, Section 9"))
    if not has_icc:
        steps.append(_step(len(steps)+1, "Complaint to Local Complaints Committee (LCC)", "If employer has no ICC (violation in itself for 10+ employee companies), approach District Officer's Local Complaints Committee.", "As soon as possible", "high", "POSH Act 2013, Section 7"))
    steps.append(_step(len(steps)+1, "File complaint with NCW", "National Commission for Women accepts online complaints at ncw.nic.in. They can mediate and intervene.", "3-5 days", "medium"))
    if not recent:
        steps.append(_step(len(steps)+1, "Note: Time limit may apply", "ICC complaints should be filed within 3 months of the incident. If more than 3 months have passed, explain reasons for delay — ICC can grant extension.", "", "medium"))
    steps.append(_step(len(steps)+1, "File criminal complaint (if appropriate)", "Sexual harassment is also a criminal offense under IPC Section 354A. You can file an FIR at any police station.", "3-7 days", "medium", "IPC Section 354A"))

    docs = ["Written complaint detailing incidents with dates", "Messages/emails as evidence", "Witness names and contact details", "Employment contract showing workplace relationship", "Any previous HR complaints or rejections"]
    return {"title": "Workplace Harassment Action Plan", "steps": steps, "required_documents": docs, "urgent": not recent}


# ─── Education ───────────────────────────────────────────────────────────────

def _plan_education_admission(a: dict) -> dict:
    level = a.get("q1", "College / University")
    has_rejection = a.get("q2") == "yes"
    reserved = a.get("q3") == "yes"

    steps = []
    if not has_rejection:
        steps.append(_step(1, "Request written rejection", "Email or write to the institution's registrar requesting a written explanation for denial of admission with specific grounds.", "1-2 days", "high"))
    if "School" in level:
        steps.append(_step(len(steps)+1, "File RTE complaint to DEO", "Under Right to Education Act, private schools must allocate 25% seats to economically weaker students. File complaint with District Education Officer.", "3-5 days", "high", "Right to Education Act 2009, Section 12"))
    steps.append(_step(len(steps)+1, "File complaint with State Education Department", "Submit written complaint with all documents. Include the rejection letter, merit certificates, and category certificate if applicable.", "5-7 days", "medium"))
    if reserved:
        steps.append(_step(len(steps)+1, "Contact SC/ST/OBC Commission", "If you belong to a reserved category and quota was not respected, file complaint with the relevant State Commission.", "3-5 days", "high"))
    steps.append(_step(len(steps)+1, "File complaint with UGC (for colleges)", "UGC portal (pgms.ugc.ac.in) accepts admission-related grievances against affiliated colleges.", "5-7 days", "medium"))
    steps.append(_step(len(steps)+1, "Approach High Court (if urgent)", "If admission is time-sensitive (academic year starts soon), file Writ Petition in High Court. Courts have given quick relief in RTE cases.", "10-15 days", "medium"))

    docs = ["Application form and documents submitted", "Written rejection letter", "Merit rank / marks certificate", "Category certificate (SC/ST/OBC if applicable)", "Proof of school's 25% unfilled seats (for RTE)"]
    return {"title": "Admission Denial Action Plan", "steps": steps, "required_documents": docs, "urgent": True}


def _plan_education_fee(a: dict) -> dict:
    before_year = a.get("q1") == "yes"
    has_receipt = a.get("q2") == "yes"
    approved = a.get("q3") == "yes"

    steps = []
    steps.append(_step(1, "Send written refund demand to institution", "Email / Registered letter to the principal/registrar demanding full refund within 15 days. Mention UGC guidelines on fee refund.", "1-2 days", "high", "UGC Guidelines on Refund of Fees 2018"))
    if before_year:
        steps.append(_step(2, "Know your entitlement", "UGC guidelines state: If withdrawal before start of academic year → full refund (minus processing fee of ₹1000 max). This is binding on all UGC-recognized colleges.", "", "high", "UGC Fee Refund Circular 2018"))
    if approved:
        steps.append(_step(len(steps)+1, "File complaint with UGC", "Visit pgms.ugc.ac.in → Student Grievances. Mention that institution is violating UGC fee refund guidelines.", "5-7 days", "medium"))
    steps.append(_step(len(steps)+1, "File consumer complaint", "Educational services are 'services' under Consumer Protection Act. File complaint in Consumer Forum — many students have won fee refund cases.", "15-30 days", "medium", "Consumer Protection Act 2019"))
    if not has_receipt:
        steps.append(_step(len(steps)+1, "Obtain fee receipt from institution", "RTI application can be used to compel the institution to provide records of fees paid.", "10-15 days", "medium", "RTI Act 2005"))

    docs = ["Fee payment receipt / bank transfer proof", "Cancellation / withdrawal letter (with date)", "Institution's rejection / no-response", "Admission letter", "UGC recognition / affiliation proof"]
    return {"title": "Education Fee Refund Plan", "steps": steps, "required_documents": docs, "urgent": False}


def _generic_plan(scenario_id: str, answers: dict) -> dict:
    steps = [
        _step(1, "Document everything", "Collect all relevant documents, receipts, and communications related to your issue. Written evidence is crucial.", "1-2 days", "high"),
        _step(2, "Send formal written notice", "Write a formal notice to the other party explaining the issue and requesting resolution within 15 days. Send via Registered Post.", "3-5 days", "high"),
        _step(3, "Contact relevant authority", "Identify the relevant government authority or regulatory body for your specific issue and file a formal complaint.", "7-15 days", "medium"),
        _step(4, "Seek legal assistance if needed", "For complex matters, consult a Legal Aid clinic (free for eligible citizens) or an advocate.", "As needed", "medium"),
    ]
    return {"title": "General Legal Action Plan", "steps": steps, "required_documents": ["All relevant documents", "ID proof", "Written correspondence"], "urgent": False}


# ---------------------------------------------------------------------------
# Session Management
# ---------------------------------------------------------------------------

async def create_session(user_id: str, scenario_id: str) -> dict:
    db = get_database()
    session = {
        "user_id": user_id,
        "scenario_id": scenario_id,
        "answers": {},
        "result": None,
        "current_question": 0,
        "status": "in_progress",
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc),
    }
    result = await db["wizard_sessions"].insert_one(session)
    session["_id"] = result.inserted_id
    session["id"] = str(result.inserted_id)
    return session


async def submit_answers(session_id: str, user_id: str, answers: dict) -> dict:
    from bson import ObjectId
    db = get_database()

    session = await db["wizard_sessions"].find_one({"_id": ObjectId(session_id), "user_id": user_id})
    if not session:
        return None

    scenario_id = session["scenario_id"]
    action_plan = generate_action_plan(scenario_id, answers)

    await db["wizard_sessions"].update_one(
        {"_id": ObjectId(session_id)},
        {"$set": {"answers": answers, "result": action_plan, "status": "completed", "updated_at": datetime.now(timezone.utc)}},
    )
    action_plan["session_id"] = session_id
    return action_plan


async def get_user_sessions(user_id: str) -> list[dict]:
    db = get_database()
    sessions = []
    async for doc in db["wizard_sessions"].find({"user_id": user_id}).sort("created_at", -1).limit(20):
        doc["id"] = str(doc.pop("_id"))
        sessions.append(doc)
    return sessions


def generate_legal_document(template_id: str, details: dict) -> dict:
    """
    Generate official, formatted Indian Legal Notice or Complaint Document
    based on template_id and user details with financial claim itemization.
    """
    sender_name = details.get("sender_name", "[SENDER FULL NAME]")
    sender_address = details.get("sender_address", "[SENDER FULL ADDRESS]")
    sender_phone = details.get("sender_phone", "[SENDER CONTACT NUMBER]")
    sender_email = details.get("sender_email", "[SENDER EMAIL ADDRESS]")

    recipient_name = details.get("recipient_name", "[RECIPIENT NAME / COMPANY / LANDLORD]")
    recipient_address = details.get("recipient_address", "[RECIPIENT FULL ADDRESS]")

    raw_amount = details.get("dispute_amount", "50000").replace(",", "").replace("Rs.", "").strip()
    try:
        principal = float(raw_amount)
    except ValueError:
        principal = 50000.0

    interest = round(principal * 0.12, 2)  # 12% p.a. statutory interest
    damages = 15000.0                       # Legal costs & mental agony compensation
    total_claim = principal + interest + damages

    incident_date = details.get("incident_date", datetime.now().strftime("%d %B %Y"))
    facts_summary = details.get("facts_summary", "Dispute arising out of failure to comply with statutory legal obligations.")
    notice_days = details.get("notice_days", "15")
    today_str = datetime.now().strftime("%d %B %Y")

    if "housing" in template_id or "deposit" in template_id:
        title = "LEGAL DEMAND NOTICE FOR REFUND OF SECURITY DEPOSIT"
        doc_text = f"""BY REGISTERED POST A.D. / EMAIL / LEGAL TRANSMISSION

Date: {today_str}
Ref No: LA/NOT/{datetime.now().year}/{(hash(sender_name) % 8999 + 1000)}

TO,
{recipient_name}
{recipient_address}

FROM,
{sender_name}
{sender_address}
Contact: {sender_phone} | Email: {sender_email}

SUBJECT: LEGAL DEMAND NOTICE FOR IMMEDIATE REFUND OF SECURITY DEPOSIT OF RS. {principal:,.2f}/- ALONG WITH STATUTORY INTEREST AND LEGAL DAMAGES UNDER THE MODEL TENANCY ACT, 2021 AND APPLICABLE RENT CONTROL STATUTES.

Sir/Madam,

Under instructions and on behalf of the undersigned Complainant ({sender_name}), I hereby issue upon you this Formal Legal Notice:

1. OCCUPANCY & TENANCY OBLIGATIONS: That the Complainant ({sender_name}) occupied the residential premises situated at {sender_address} as a bonafide and lawful tenant under a valid Tenancy Agreement executed with you.

2. REFUNDABLE DEPOSIT DEPOSITED: That at the commencement of the tenancy, the Complainant deposited an interest-free refundable Security Deposit of Rs. {principal:,.2f}/- ({principal:,.2f} Indian Rupees) with you, which was strictly agreed to be refunded in full upon peaceful vacation of premises.

3. PEACEFUL VACATION & HANDOVER: That the Complainant vacated the aforesaid premises on {incident_date} after delivering vacant, clean, and peaceful physical possession to you, along with all keys and clearance of all utility dues.

4. UNLAWFUL WITHHOLDING & STATUTORY BREACH: That despite peaceful vacation and repeated follow-up demands, you have illegally, arbitrarily, and unjustifiably withheld the security deposit amount of Rs. {principal:,.2f}/- without providing any itemized list of lawful deductions or repairs, constituting a direct violation of Section 11 of the Model Tenancy Act, 2021 and Section 73 of the Indian Contract Act, 1872.

5. ITEMIZED FINANCIAL DEMAND & CLAIM:
   a) Refund of Principal Security Deposit: Rs. {principal:,.2f}/-
   b) Statutory Interest @ 12% p.a. from {incident_date}: Rs. {interest:,.2f}/-
   c) Compensation for Mental Agony & Legal Notice Charges: Rs. {damages:,.2f}/-
   TOTAL AMOUNT DEMANDED & PAYABLE: RS. {total_claim:,.2f}/-

TAKE NOTICE that you are hereby called upon to pay/refund the total demand amount of Rs. {total_claim:,.2f}/- into the bank account of the Complainant within {notice_days} days of receipt of this notice.

FAILING WHICH, formal legal proceedings shall be instituted against you in the Rent Authority / Rent Tribunal and competent Civil Court for recovery of money, attachment of property, and full legal costs at your sole risk and consequences.

Yours faithfully,

____________________________________
({sender_name})
Complainant / Issuing Party
Place: Bengaluru, India"""

        sections = ["Model Tenancy Act 2021 — Section 11", "State Rent Control Act", "Indian Contract Act 1872 — Section 73"]

    elif "employment" in template_id or "salary" in template_id:
        title = "LEGAL DEMAND NOTICE FOR RECOVERY OF UNPAID SALARY & DUES"
        doc_text = f"""BY REGISTERED POST A.D. / EMAIL / LEGAL TRANSMISSION

Date: {today_str}
Ref No: LA/EMP/{datetime.now().year}/{(hash(sender_name) % 8999 + 1000)}

TO,
The Management / Board of Directors,
{recipient_name}
{recipient_address}

FROM,
{sender_name}
{sender_address}
Contact: {sender_phone} | Email: {sender_email}

SUBJECT: LEGAL NOTICE UNDER PAYMENT OF WAGES ACT, 1936 & INDUSTRIAL DISPUTES ACT, 1947 FOR RECOVERY OF UNPAID SALARY AND EARNED DUES AMOUNTING TO RS. {principal:,.2f}/-.

Sir/Madam,

Under instructions and on behalf of the undersigned Employee ({sender_name}), I hereby issue upon you this Formal Legal Notice:

1. EMPLOYMENT STANDING: That the Employee ({sender_name}) was employed with your organization ({recipient_name}) as a permanent employee and rendered loyal and diligent service.

2. UNPAID WAGES & DISPUTE SUMMARY: That during employment, your organization failed to disburse earned wages, outstanding salary, and full & final settlement dues amounting to Rs. {principal:,.2f}/- due for the period ending {incident_date}. Summary: {facts_summary}

3. VIOLATION OF STATUTORY RIGHTS: That non-payment of earned wages and failure to issue full & final settlement within statutory time limits violates Section 15 of the Payment of Wages Act, 1936, Section 25F of the Industrial Disputes Act, 1947, and principles of natural justice.

4. ITEMIZED FINANCIAL DEMAND & CLAIM:
   a) Outstanding Principal Wages / Salary: Rs. {principal:,.2f}/-
   b) Statutory Interest @ 12% p.a.: Rs. {interest:,.2f}/-
   c) Compensation for Mental Harassment & Legal Notice Fee: Rs. {damages:,.2f}/-
   TOTAL AMOUNT DEMANDED & PAYABLE: RS. {total_claim:,.2f}/-

TAKE NOTICE that you are hereby called upon to remit the total amount of Rs. {total_claim:,.2f}/- into the bank account of the undersigned within {notice_days} days of receipt of this notice.

FAILING WHICH, legal proceedings shall be filed before the Labour Commissioner, Labour Court under Section 33C of the Industrial Disputes Act, and NCLT under Insolvency and Bankruptcy Code (IBC) for operational debt recovery.

Yours faithfully,

____________________________________
({sender_name})
Employee / Claimant
Place: Bengaluru, India"""

        sections = ["Payment of Wages Act 1936 — Section 15", "Industrial Disputes Act 1947 — Section 25F & Section 33C"]

    elif "consumer" in template_id or "refund" in template_id:
        title = "CONSUMER LEGAL DEMAND NOTICE FOR REFUND & COMPENSATION"
        doc_text = f"""BY REGISTERED POST A.D. / EMAIL / LEGAL TRANSMISSION

Date: {today_str}
Ref No: LA/CON/{datetime.now().year}/{(hash(sender_name) % 8999 + 1000)}

TO,
{recipient_name}
{recipient_address}

FROM,
{sender_name}
{sender_address}
Contact: {sender_phone} | Email: {sender_email}

SUBJECT: LEGAL NOTICE UNDER SECTION 35 OF THE CONSUMER PROTECTION ACT, 2019 FOR DEFICIENCY OF SERVICE AND UNFAIR TRADE PRACTICE.

Sir/Madam,

1. CONSUMER TRANSACTION: That the Complainant ({sender_name}) purchased goods / availed services from your establishment on {incident_date} for a consideration of Rs. {principal:,.2f}/-.

2. DEFICIENCY IN SERVICE & FACTS: That the product/service supplied by you suffers from severe inherent defects and deficiency of service as defined under Section 2(11) of the Consumer Protection Act, 2019. Facts: {facts_summary}

3. REFUSAL OF REFUND: That despite repeated complaints, you failed to repair, replace, or issue a full refund, constituting an Unfair Trade Practice under Section 2(47) of the Act.

4. ITEMIZED FINANCIAL DEMAND & CLAIM:
   a) Refund of Product/Service Purchase Price: Rs. {principal:,.2f}/-
   b) Statutory Interest @ 12% p.a.: Rs. {interest:,.2f}/-
   c) Damages for Mental Agony & Litigation Costs: Rs. {damages:,.2f}/-
   TOTAL AMOUNT DEMANDED & PAYABLE: RS. {total_claim:,.2f}/-

TAKE NOTICE that you are hereby called upon to refund Rs. {total_claim:,.2f}/- within {notice_days} days of receipt of this notice, failing which a formal Consumer Complaint shall be filed before the District Consumer Disputes Redressal Commission via the e-Daakhil portal.

Yours faithfully,

____________________________________
({sender_name})
Consumer / Complainant
Place: Bengaluru, India"""

        sections = ["Consumer Protection Act 2019 — Section 2(47)", "Consumer Protection Act 2019 — Section 35"]

    else:
        title = "LEGAL DEMAND NOTICE & REPRESENTATION"
        doc_text = f"""BY REGISTERED POST A.D. / EMAIL / LEGAL TRANSMISSION

Date: {today_str}
Ref No: LA/GEN/{datetime.now().year}/{(hash(sender_name) % 8999 + 1000)}

TO,
{recipient_name}
{recipient_address}

FROM,
{sender_name}
{sender_address}
Contact: {sender_phone} | Email: {sender_email}

SUBJECT: LEGAL NOTICE FOR SETTLEMENT OF FINANCIAL DISPUTE & DEMAND OF RS. {principal:,.2f}/-.

Sir/Madam,

1. FACTS OF THE CASE: That the undersigned ({sender_name}) serves this Legal Notice regarding: {facts_summary}

2. STATUTORY VIOLATION: That on {incident_date}, your failure to perform statutory obligations resulted in severe financial loss amounting to Rs. {principal:,.2f}/-.

3. ITEMIZED FINANCIAL DEMAND & CLAIM:
   a) Principal Financial Claim: Rs. {principal:,.2f}/-
   b) Interest & Administrative Damages: Rs. {interest + damages:,.2f}/-
   TOTAL DEMAND PAYABLE: RS. {total_claim:,.2f}/-

TAKE NOTICE that you are called upon to resolve this matter and remit Rs. {total_claim:,.2f}/- within {notice_days} days of receipt of this notice, failing which civil and criminal legal action will be initiated in the competent Court of Law.

Yours faithfully,

____________________________________
({sender_name})
Complainant / Issuing Party
Place: Bengaluru, India"""

        sections = ["Indian Contract Act 1872", "Code of Civil Procedure 1908"]

    affidavit = f"VERIFICATION AFFIDAVIT: I, {sender_name}, residing at {sender_address}, do hereby solemnly verify and state that the contents of paragraphs 1 to 5 above are true and correct to the best of my knowledge, and nothing material has been concealed therefrom."

    return {
        "template_id": template_id,
        "title": title,
        "document_text": doc_text.strip(),
        "statutory_sections": sections,
        "financial_breakdown": {
            "principal": principal,
            "interest": interest,
            "damages": damages,
            "total_claim": total_claim,
        },
        "verification_affidavit": affidavit,
        "notice_days": notice_days,
        "generated_at": datetime.now(timezone.utc).isoformat(),
    }


