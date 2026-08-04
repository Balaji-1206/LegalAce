"""
Seed Situations Database — Populate the MongoDB 'situations' collection.
Run this script from the backend/ folder with the venv activated:
  python scripts/seed_situations.py
"""
import sys
import os
import asyncio

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from dotenv import load_dotenv
load_dotenv()

from app.database.mongodb import connect_to_mongo, get_database, close_mongo_connection
from app.modules.situation_finder.models import SITUATION_COLLECTION

SITUATIONS_DATA = [
    # EMPLOYMENT
    {
        "situation_id": "emp_wrongful_firing",
        "title": "Terminated suddenly without notice or pay",
        "description": "Your employer terminated your services immediately without providing the contractually required notice period or retrenchment compensation.",
        "category": "employment",
        "applicable_laws": [
            {"act": "Industrial Disputes Act, 1947", "section": "Section 25F", "section_title": "Conditions Precedent to Retrenchment"}
        ],
        "user_rights": [
            "Right to 30-90 days notice (or wages in lieu of notice).",
            "Right to retrenchment compensation (15 days average pay per completed year of continuous service).",
            "Right to raise a dispute before the Labour Court."
        ],
        "action_steps": [
            "Check your employment contract terms for the notice period.",
            "Send a written communication to HR/employer demanding notice pay and statutory dues.",
            "File an industrial dispute with the local Labour Conciliation Officer."
        ],
        "important_deadlines": [
            "Industrial dispute filing: Within 3 years from the date of termination."
        ],
        "related_situations": ["emp_salary_withholding"]
    },
    {
        "situation_id": "emp_salary_withholding",
        "title": "Employer withholding monthly salary",
        "description": "Your employer has delayed or completely refused to pay your salary for the past few months without a valid reason.",
        "category": "employment",
        "applicable_laws": [
            {"act": "Payment of Wages Act, 1936", "section": "Section 5", "section_title": "Time of Payment of Wages"},
            {"act": "Minimum Wages Act, 1948", "section": "Section 3", "section_title": "Fixing of Minimum Rates of Wages"}
        ],
        "user_rights": [
            "Right to receive wages within 7 to 10 days of the end of the wage period.",
            "Right to claim up to 10 times the shortfall amount in compensation.",
            "Right to complain to the Labour Commissioner."
        ],
        "action_steps": [
            "Request salary release in writing via email or registered letter.",
            "Send a formal legal notice to the employer if they ignore your request.",
            "File a claim application under Section 15 of the Payment of Wages Act."
        ],
        "important_deadlines": [
            "Payment of Wages claim: Within 12 months from when wages were due."
        ],
        "related_situations": ["emp_wrongful_firing"]
    },
    # HOUSING
    {
        "situation_id": "house_deposit_dispute",
        "title": "Landlord refusing to return security deposit",
        "description": "You are vacating your rented flat, but the landlord is refusing to refund the advance security deposit or is making arbitrary deductions.",
        "category": "housing",
        "applicable_laws": [
            {"act": "Transfer of Property Act, 1882", "section": "Section 108(q)", "section_title": "Refund of Security Deposit"},
            {"act": "Model Tenancy Act, 2021", "section": "Section 11", "section_title": "Security Deposit"}
        ],
        "user_rights": [
            "Right to receive a full refund of deposit upon vacating the premises.",
            "Deductions can only be made for unpaid rent or documented damage beyond normal wear and tear.",
            "Right to seek legal remedy via Rent Controller / Rent Authority."
        ],
        "action_steps": [
            "Take photos of the flat's condition upon vacating.",
            "Send a written demand notice requesting deposit refund within 15 days.",
            "File a petition before the Rent Authority or Rent Court."
        ],
        "important_deadlines": [
            "Civil claims for recovery: Within 3 years from vacating."
        ],
        "related_situations": ["house_illegal_eviction"]
    },
    {
        "situation_id": "house_illegal_eviction",
        "title": "Forced eviction without legal notice",
        "description": "Your landlord is attempting to evict you by force, cutting off water/electricity, or threatening you without a court order.",
        "category": "housing",
        "applicable_laws": [
            {"act": "State Rent Control Acts (General Rules)", "section": "General Provisions", "section_title": "Tenant Protection"},
            {"act": "Transfer of Property Act, 1882", "section": "Section 106", "section_title": "Notice to Terminate Lease"}
        ],
        "user_rights": [
            "Right against arbitrary or forced eviction.",
            "Right to uninterrupted basic services (water/electricity).",
            "Right to notice period (minimum 15 days for month-to-month leases)."
        ],
        "action_steps": [
            "Do not vacate under coercion.",
            "File a police complaint for criminal trespass or harassment.",
            "File a petition for restoration of amenities and protection against eviction before the Rent Controller."
        ],
        "important_deadlines": [
            "Immediate action: Contact Rent Controller within days of utility disconnection."
        ],
        "related_situations": ["house_deposit_dispute"]
    },
    # CONSUMER
    {
        "situation_id": "con_defective_product",
        "title": "Received a defective product and seller refuses refund",
        "description": "You bought a product online or offline that turned out to be defective, but the merchant or brand is refusing to repair, replace, or refund it.",
        "category": "consumer",
        "applicable_laws": [
            {"act": "Consumer Protection Act, 2019", "section": "Section 35", "section_title": "Complaint to District Commission"},
            {"act": "Consumer Protection Act, 2019", "section": "Section 84", "section_title": "Product Liability Actions"}
        ],
        "user_rights": [
            "Right to safety against hazardous products.",
            "Right to seek redressal against unfair trade practices.",
            "Right to replacement, repair, or refund for defective goods."
        ],
        "action_steps": [
            "File a complaint on the National Consumer Helpline (NCH) portal.",
            "Send a formal notice to the seller and manufacturer.",
            "File a formal complaint online via the e-Daakhil portal to the District Consumer Commission."
        ],
        "important_deadlines": [
            "Filing Consumer Complaint: Within 2 years of the cause of action."
        ],
        "related_situations": ["con_ecommerce_fraud"]
    },
    {
        "situation_id": "con_ecommerce_fraud",
        "title": "Unfair cancellation charges or delivery failure online",
        "description": "An e-commerce platform unilaterally cancelled your order, refused a refund, or charged high cancellation fees without refunding.",
        "category": "consumer",
        "applicable_laws": [
            {"act": "Consumer Protection (E-Commerce) Rules, 2020", "section": "Rule 4", "section_title": "Duties and Liabilities of E-Commerce Entities"}
        ],
        "user_rights": [
            "Right against arbitrary cancellation charges.",
            "Right to full refund in case of delivery failure or product return.",
            "Right to clear and transparent information on pricing and returns."
        ],
        "action_steps": [
            "Submit a ticket to the e-commerce support team.",
            "Lodge an online complaint with the National Consumer Helpline.",
            "Escalate to the Consumer Court through e-Daakhil if the merchant fails to resolve."
        ],
        "important_deadlines": [
            "Filing Consumer Complaint: Within 2 years of the transaction date."
        ],
        "related_situations": ["con_defective_product"]
    },
    # CYBER CRIME
    {
        "situation_id": "cyber_financial_fraud",
        "title": "Money stolen through digital phishing or OTP fraud",
        "description": "You fell victim to online banking fraud where money was unauthorizedly debited from your bank account or credit card via phishing or OTP fraud.",
        "category": "cyber_crime",
        "applicable_laws": [
            {"act": "Information Technology Act, 2000", "section": "Section 66", "section_title": "Computer Related Offences"},
            {"act": "RBI Customer Liability Guidelines, 2017", "section": "Zero Liability", "section_title": "Rules for Customers in Fraudulent Transactions"}
        ],
        "user_rights": [
            "Zero liability if unauthorized transaction is reported within 3 working days.",
            "Limited liability if reported within 4-7 working days.",
            "Right to have disputed amount temporarily credited (shadow reversal) within 10 days."
        ],
        "action_steps": [
            "Contact your bank immediately to block the card/account.",
            "File a complaint on the National Cyber Crime portal (cybercrime.gov.in) or call 1930.",
            "Submit the Cyber FIR copy to your bank and request a refund under RBI rules."
        ],
        "important_deadlines": [
            "Reporting to Bank: Within 3 working days of the transaction for zero liability."
        ],
        "related_situations": ["cyber_identity_theft", "bank_unauthorized_charge"]
    },
    {
        "situation_id": "cyber_identity_theft",
        "title": "Social media profile hacked or cyber-stalked",
        "description": "Someone hacked your social media account, created a fake profile using your photos, or is harassing/stalking you online.",
        "category": "cyber_crime",
        "applicable_laws": [
            {"act": "Information Technology Act, 2000", "section": "Section 66C", "section_title": "Identity Theft"},
            {"act": "Information Technology Act, 2000", "section": "Section 66D", "section_title": "Cheating by Impersonation"}
        ],
        "user_rights": [
            "Right to have impersonating profiles removed.",
            "Protection against digital harassment and identity theft.",
            "Right to privacy under Article 21."
        ],
        "action_steps": [
            "Report the profile/post on the social media platform directly.",
            "Take screenshots of the fake profile and offensive chats/messages.",
            "File a cyber crime complaint at cybercrime.gov.in or your local Cyber Police Cell."
        ],
        "important_deadlines": [
            "File the complaint immediately to preserve IP address logs."
        ],
        "related_situations": ["cyber_financial_fraud"]
    },
    # WOMEN RIGHTS
    {
        "situation_id": "women_domestic_violence",
        "title": "Subjected to domestic cruelty or physical abuse",
        "description": "A woman is facing physical, emotional, sexual, or economic abuse from her husband or his family members.",
        "category": "women_rights",
        "applicable_laws": [
            {"act": "Protection of Women from Domestic Violence Act, 2005", "section": "Section 3", "section_title": "Definition of Domestic Violence"},
            {"act": "Indian Penal Code, 1860", "section": "Section 498A", "section_title": "Cruelty by Husband or Relatives"}
        ],
        "user_rights": [
            "Right to a safe shared household/residence order.",
            "Right to claim monetary relief, maintenance, and medical expenses.",
            "Right to protection orders and child custody."
        ],
        "action_steps": [
            "Reach out to a Protection Officer or local NGO/National Commission for Women (NCW).",
            "File an application under Section 12 of the DV Act before a Magistrate.",
            "File a police complaint (FIR) under Section 498A of the IPC if dowry harassment is involved."
        ],
        "important_deadlines": [
            "No deadline: Applications under the DV Act can be filed at any time."
        ],
        "related_situations": ["women_workplace_harassment"]
    },
    {
        "situation_id": "women_workplace_harassment",
        "title": "Facing sexual harassment or hostile work environment",
        "description": "A female employee is facing verbal, non-verbal, or physical sexual harassment, or blackmail regarding her promotion or job security.",
        "category": "women_rights",
        "applicable_laws": [
            {"act": "Sexual Harassment of Women at Workplace Act, 2013", "section": "Section 3", "section_title": "Prevention of Sexual Harassment"},
            {"act": "Sexual Harassment of Women at Workplace Act, 2013", "section": "Section 4", "section_title": "Internal Complaints Committee"}
        ],
        "user_rights": [
            "Right to a safe and harassment-free workplace.",
            "Right to have an active Internal Complaints Committee (ICC) in any workplace with 10+ employees.",
            "Right to confidentiality and protection against victimisation during inquiry."
        ],
        "action_steps": [
            "Submit a written complaint to the ICC within 3 months of the incident.",
            "If ICC does not exist, file a complaint through the government SHe-Box portal.",
            "Request interim reliefs like transfer, paid leave, or change in supervisor."
        ],
        "important_deadlines": [
            "Filing complaint: Within 3 months from the date of the incident."
        ],
        "related_situations": ["women_domestic_violence", "emp_wrongful_firing"]
    },
    # BANKING
    {
        "situation_id": "bank_unauthorized_charge",
        "title": "Fraudulent credit/debit card transactions",
        "description": "Your bank card was charged unauthorizedly without you sharing cards/OTP, or your bank is refusing to refund unauthorized fees.",
        "category": "banking",
        "applicable_laws": [
            {"act": "RBI Customer Liability Guidelines, 2017", "section": "Limited Liability", "section_title": "Guidelines for Card Fraud"},
            {"act": "Consumer Protection Act, 2019", "section": "Section 35", "section_title": "Deficiency of Service"}
        ],
        "user_rights": [
            "Right to safe banking practices.",
            "Zero liability if transaction is due to bank negligence or third-party breach reported within 3 days.",
            "Right to receive a credit reversal within 10 working days of complaint."
        ],
        "action_steps": [
            "Block the card immediately via net banking or customer care.",
            "File a dispute form and request transaction logs from your bank.",
            "If unresolved within 30 days, escalate to the RBI Banking Ombudsman online."
        ],
        "important_deadlines": [
            "Ombudsman escalation: Within 1 year of receiving the bank's rejection or lack of response."
        ],
        "related_situations": ["cyber_financial_fraud", "bank_recovery_harassment"]
    },
    {
        "situation_id": "bank_recovery_harassment",
        "title": "Loan recovery agents threatening or harassing",
        "description": "You missed loan/credit card EMI payments, and bank recovery agents are calling you at odd hours, using abusive language, or visiting your workplace.",
        "category": "banking",
        "applicable_laws": [
            {"act": "RBI Fair Practices Code for Lenders", "section": "Guidelines on Recovery", "section_title": "Fair Debt Collection Rules"},
            {"act": "Indian Penal Code, 1860", "section": "Section 503", "section_title": "Criminal Intimidation"}
        ],
        "user_rights": [
            "Recovery agents can only contact between 8:00 AM and 7:00 PM.",
            "Right to privacy and dignity; agents cannot visit work or threaten/harass.",
            "Bank is liable for any abusive behavior of third-party recovery agents."
        ],
        "action_steps": [
            "Record all calls and take videos of any agent visits.",
            "File a written complaint to the Bank Manager demanding immediate action.",
            "Lodge a complaint with the RBI Banking Ombudsman and file a police FIR for criminal intimidation."
        ],
        "important_deadlines": [
            "File a complaint immediately to halt recovery agent contact."
        ],
        "related_situations": ["bank_unauthorized_charge"]
    },
    # TRAFFIC
    {
        "situation_id": "traffic_stopped_by_police",
        "title": "Stopped by traffic police for checking",
        "description": "Traffic police stopped your vehicle on the road and are demanding original documents, threatening to seize your license, or demanding bribes.",
        "category": "traffic",
        "applicable_laws": [
            {"act": "Motor Vehicles Act, 1988", "section": "Section 130", "section_title": "Duty to Produce License and Certificate of Registration"}
        ],
        "user_rights": [
            "Right to show digital documents via DigiLocker or mParivahan (legally valid).",
            "Only an officer of the rank of Sub-Inspector or above can demand or seize your license.",
            "Right to receive a physical or e-challan specifying the exact traffic rule violated."
        ],
        "action_steps": [
            "Remain polite, switch off the engine, and show digital documents.",
            "Do not pay cash without a proper receipt/challan.",
            "Record the interaction if you suspect extortion, and report to the traffic police vigilance division."
        ],
        "important_deadlines": [
            "Challan payment/contest: Usually within 60 days of issue."
        ],
        "related_situations": ["traffic_accident_liability"]
    },
    {
        "situation_id": "traffic_accident_liability",
        "title": "Involved in a road accident",
        "description": "Your vehicle was involved in a collision resulting in property damage or injury, or you helped an injured victim and police are questioning you.",
        "category": "traffic",
        "applicable_laws": [
            {"act": "Motor Vehicles Act, 1988", "section": "Section 134", "section_title": "Duty of Driver in Case of Accident"},
            {"act": "Good Samaritan Law Guidelines", "section": "Supreme Court Directives", "section_title": "Protection for Helpers"}
        ],
        "user_rights": [
            "Good Samaritans are protected: Police cannot force you to reveal identity or pay medical costs if you help a victim.",
            "Right to claim compensation under no-fault liability for motor accidents.",
            "Right to receive immediate medical aid at any public/private hospital."
        ],
        "action_steps": [
            "Secure medical aid for any injured person immediately (primary duty).",
            "Call the police and vehicle insurance company to report the incident.",
            "Take photos of the accident scene, vehicle damage, and license plates."
        ],
        "important_deadlines": [
            "Report to police: Within 24 hours of the accident."
        ],
        "related_situations": ["traffic_stopped_by_police"]
    },
    # EDUCATION
    {
        "situation_id": "edu_fee_refund_denial",
        "title": "College refusing fee refund after admission withdrawal",
        "description": "You withdrew your admission from a college or school before classes started, but the institution is refusing to refund your fees.",
        "category": "education",
        "applicable_laws": [
            {"act": "UGC Fee Refund Guidelines", "section": "Fee Refund System", "section_title": "Refund Rules for Higher Education"},
            {"act": "Consumer Protection Act, 2019", "section": "Section 2(11)", "section_title": "Deficiency of Service"}
        ],
        "user_rights": [
            "Right to a full refund (minus max Rs. 1000 processing fee) if withdrawn before the last date of admission.",
            "Graduated slab refunds apply if withdrawn after classes start.",
            "Right to file complaints against educational institutes for deficiency of service."
        ],
        "action_steps": [
            "Submit a written withdrawal and refund application with acknowledgment.",
            "File a complaint on the UGC Grievance Portal (samadhaan.ugc.ac.in).",
            "Lodge a complaint in the Consumer Court via e-Daakhil."
        ],
        "important_deadlines": [
            "UGC complaints: Should be filed immediately upon refund rejection."
        ],
        "related_situations": ["edu_bullying_ragging"]
    },
    {
        "situation_id": "edu_bullying_ragging",
        "title": "Harassed or bullied (ragging) in school/college",
        "description": "A student is being subjected to physical, mental, or verbal harassment (ragging) by senior students or classmates.",
        "category": "education",
        "applicable_laws": [
            {"act": "UGC Regulations on Curbing Ragging, 2009", "section": "Regulation 3", "section_title": "Definition and Prohibition of Ragging"},
            {"act": "Indian Penal Code, 1860", "section": "Section 506", "section_title": "Punishment for Criminal Intimidation"}
        ],
        "user_rights": [
            "Right to study in a safe, ragging-free environment.",
            "Every institution must have an Anti-Ragging Committee.",
            "Right to file a criminal complaint if physical harm or severe intimidation is involved."
        ],
        "action_steps": [
            "Report the incident to the college Anti-Ragging Committee immediately.",
            "Call the National Anti-Ragging Helpline (1800-180-5522).",
            "If college fails to act, file a police FIR for criminal intimidation and assault."
        ],
        "important_deadlines": [
            "Report immediately to prevent further harassment."
        ],
        "related_situations": ["edu_fee_refund_denial"]
    },
    # CHEQUE BOUNCE & DEBT
    {
        "situation_id": "cheque_bounce_notice",
        "title": "Cheque dishonoured for insufficient funds (Section 138)",
        "description": "A cheque issued to you was bounced by the bank due to insufficient funds or account closure, and the drawer is refusing to pay.",
        "category": "cheque_debt",
        "applicable_laws": [
            {"act": "Negotiable Instruments Act, 1881", "section": "Section 138", "section_title": "Dishonour of Cheque for Insufficiency of Funds"},
            {"act": "Code of Civil Procedure, 1908", "section": "Order 37", "section_title": "Summary Procedure for Debt Recovery"}
        ],
        "user_rights": [
            "Right to demand payment within 30 days of receiving the Bank Return Memo.",
            "Right to file a criminal complaint under Section 138 of the NI Act.",
            "Drawer can face up to 2 years imprisonment or fine up to double the cheque amount."
        ],
        "action_steps": [
            "Collect original cheque and official Bank Return Memo with reason code.",
            "Send a mandatory 15-day Statutory Demand Notice via Registered Post within 30 days.",
            "File a criminal complaint before Judicial Magistrate within 30 days if unpaid."
        ],
        "important_deadlines": [
            "Send Legal Notice: Within 30 days of bank memo date.",
            "File Court Complaint: Within 30 days after the 15-day notice period expires."
        ],
        "related_situations": ["emp_salary_withholding"]
    },
    # RTI & PUBLIC SERVICE
    {
        "situation_id": "rti_delayed_response",
        "title": "Public Information Officer (PIO) delayed or refused RTI query",
        "description": "You filed an RTI application with a government department, but 30 days have passed with no response or the information was unjustly denied.",
        "category": "rti",
        "applicable_laws": [
            {"act": "Right to Information Act, 2005", "section": "Section 7(1)", "section_title": "Disposal of Request"},
            {"act": "Right to Information Act, 2005", "section": "Section 19(1)", "section_title": "First Appeal"}
        ],
        "user_rights": [
            "Right to receive information within 30 days of application (48 hours for life & liberty).",
            "Right to file First Appeal to Appellate Authority without extra fee.",
            "PIO can face a penalty of Rs. 250 per day up to Rs. 25,000 for unreasonable delay."
        ],
        "action_steps": [
            "Verify date of original RTI application receipt / speed post tracking.",
            "Draft and file First Appeal under Section 19(1) to First Appellate Authority.",
            "Escalate to Central/State Information Commission (Second Appeal) if unanswered."
        ],
        "important_deadlines": [
            "First Appeal: Within 30 days from expiry of the 30-day response deadline."
        ],
        "related_situations": ["house_illegal_eviction"]
    },
    # RERA REAL ESTATE
    {
        "situation_id": "rera_flat_possession_delay",
        "title": "Builder delayed flat possession beyond agreement date",
        "description": "The real estate developer/builder has missed the committed possession deadline given in your Builder-Buyer Agreement without valid force majeure.",
        "category": "real_estate",
        "applicable_laws": [
            {"act": "Real Estate (Regulation and Development) Act, 2016", "section": "Section 18", "section_title": "Return of Amount and Compensation"},
            {"act": "Consumer Protection Act, 2019", "section": "Section 35", "section_title": "Housing Deficiency of Service"}
        ],
        "user_rights": [
            "Right to claim full refund with prescribed interest (SBI MCLR + 2%).",
            "Right to claim monthly interest compensation for every month of delay if staying in project.",
            "Right to file complaint before State RERA Authority or Consumer Forum."
        ],
        "action_steps": [
            "Review Builder-Buyer Agreement for possession date and grace period.",
            "Issue written demand for monthly delay interest compensation.",
            "File online complaint on State RERA portal under Section 31."
        ],
        "important_deadlines": [
            "File RERA complaint: As soon as promised possession date + grace period expires."
        ],
        "related_situations": ["house_deposit_dispute"]
    },
    # INSURANCE & HEALTH
    {
        "situation_id": "insurance_mediclaim_rejected",
        "title": "Health insurance mediclaim rejected by insurer/TPA",
        "description": "Your health insurance company or TPA rejected your hospitalization claim citing pre-existing disease or non-disclosure unjustly.",
        "category": "insurance",
        "applicable_laws": [
            {"act": "IRDAI (Health Insurance) Regulations, 2016", "section": "Regulation 12", "section_title": "Settlement of Claims"},
            {"act": "Redressal of Public Grievances Rules, 1998", "section": "Rule 13", "section_title": "Insurance Ombudsman Jurisdiction"}
        ],
        "user_rights": [
            "Right to clear written reasons for claim rejection.",
            "No pre-existing disease rejection allowed after 8 continuous renewal years (Moratorium Period).",
            "Right to file free complaint before Insurance Ombudsman (Bima Lokpal) for claims up to Rs. 50 Lakhs."
        ],
        "action_steps": [
            "Request formal written rejection letter with exact policy clause.",
            "Submit representation to Insurer's Grievance Redressal Officer (GRO).",
            "File complaint with Insurance Ombudsman (cioins.co.in) if unresolved in 30 days."
        ],
        "important_deadlines": [
            "Ombudsman Complaint: Within 1 year from date of rejection by insurer GRO."
        ],
        "related_situations": ["con_defective_product"]
    },
    # FAMILY & SUPPORT
    {
        "situation_id": "family_maintenance_claim",
        "title": "Spouse or family member refusing financial maintenance",
        "description": "A spouse, child, or parent unable to maintain themselves is denied basic monthly financial support by the primary earner.",
        "category": "family",
        "applicable_laws": [
            {"act": "Code of Criminal Procedure, 1973 / BNSS, 2023", "section": "Section 125", "section_title": "Order for Maintenance of Wives, Children and Parents"},
            {"act": "Protection of Women from Domestic Violence Act, 2005", "section": "Section 20", "section_title": "Monetary Reliefs"}
        ],
        "user_rights": [
            "Right to monthly maintenance allowance based on respondent's income & living standard.",
            "Right to Interim Maintenance during pendency of petition.",
            "Parents have right to claim maintenance under Maintenance and Welfare of Parents Act."
        ],
        "action_steps": [
            "Collect income proof, bank statements, or salary slips of respondent.",
            "File maintenance petition under Section 125 CrPC in Family Court.",
            "Submit application for immediate Interim Maintenance."
        ],
        "important_deadlines": [
            "Interim Maintenance application: Should be filed along with main petition."
        ],
        "related_situations": ["women_domestic_violence"]
    }
]

async def seed_data():
    await connect_to_mongo()
    db = get_database()
    
    print("Deleting old situations...")
    await db[SITUATION_COLLECTION].delete_many({})
    
    print(f"Seeding {len(SITUATIONS_DATA)} situations...")
    await db[SITUATION_COLLECTION].insert_many(SITUATIONS_DATA)
    
    print("Database seeding completed successfully!")
    await close_mongo_connection()

if __name__ == "__main__":
    asyncio.run(seed_data())
