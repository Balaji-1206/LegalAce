"""
Law Corpus Expander Script — Enriches Indian Law Corpus with Landmark SC Precedents,
2023 New Criminal Codes (BNSS, BSA, BNS), DPDP Act 2023, and Commercial Statutes (NI Act Sec 138, IBC, Arbitration).
"""
import json
from pathlib import Path

LAW_CORPUS_FILE = Path("data/indian_law_corpus.json")

NEW_EXPANSIONS = [
    # ─── 1. LANDMARK SUPREME COURT COURT PRECEDENTS ──────────────────────────────
    {
        "law_id": "SC_PRECEDENT_PUTTASWAMY_2017",
        "act_name": "Landmark SC Judgment — Justice K.S. Puttaswamy v. Union of India (2017)",
        "section_number": "9-Judge Bench (2017) 10 SCC 1",
        "section_title": "Fundamental Right to Privacy & Phone/Digital Search Restrictions",
        "section_text": "The Supreme Court of India unanimously declared the Right to Privacy as a fundamental right guaranteed under Article 21 of the Constitution of India. Police or investigating agencies cannot arbitrarily seize, search, or inspect personal digital devices (phones, laptops) without a specific judicial warrant or legally recorded grounds of suspicion under CrPC/BNSS.",
        "category": "cyber_crime",
        "keywords": ["privacy", "phone search", "device seizure", "fundamental right", "puttaswamy", "article 21", "warrant"]
    },
    {
        "law_id": "SC_PRECEDENT_ARNESH_KUMAR_2014",
        "act_name": "Landmark SC Judgment — Arnesh Kumar v. State of Bihar (2014)",
        "section_number": "(2014) 8 SCC 273",
        "section_title": "Mandatory Arrest Guidelines for Offenses Punishable Under 7 Years",
        "section_text": "The Supreme Court issued strict mandatory guidelines prohibiting automatic arrests by police officers in offenses punishable with imprisonment up to 7 years (including 498A IPC/BNS). Police must issue a formal Notice of Appearance under Section 41A CrPC (Section 35 BNSS) before making an arrest, recording reasons in writing. Magistrate must satisfy necessity before authorizing remand.",
        "category": "women_rights",
        "keywords": ["arnesh kumar", "arrest guidelines", "notice of appearance", "498a", "dowry harassment", "section 41a", "remand"]
    },
    {
        "law_id": "SC_PRECEDENT_DK_BASU_1997",
        "act_name": "Landmark SC Judgment — D.K. Basu v. State of West Bengal (1997)",
        "section_number": "(1997) 1 SCC 416",
        "section_title": "Custodial Death & Fundamental Rights of Arrested Persons",
        "section_text": "The Supreme Court laid down 11 mandatory procedures to be followed during every arrest and interrogation: 1) Arresting officer must wear clear identification badges; 2) A Memo of Arrest must be prepared with witness signature; 3) Arrested person has right to inform a relative/friend within 8-12 hours; 4) Right to meet an advocate during interrogation; 5) Mandatory medical examination every 48 hours.",
        "category": "criminal",
        "keywords": ["dk basu", "arrest rights", "memo of arrest", "custodial violence", "medical examination", "lawyer present"]
    },
    {
        "law_id": "SC_PRECEDENT_LALITA_KUMARI_2014",
        "act_name": "Landmark SC Judgment — Lalita Kumari v. Govt. of U.P. (2014)",
        "section_number": "(2014) 2 SCC 1",
        "section_title": "Mandatory Registration of FIR in Cognizable Offenses",
        "section_text": "Constitution Bench of the Supreme Court held that registration of an FIR is mandatory under Section 154 CrPC (Section 173 BNSS) if the information disclosed indicates the commission of a cognizable offense. Preliminary inquiry is permitted only in medical negligence, matrimonial disputes, commercial fraud, or corruption matters, and must complete within 7 days.",
        "category": "criminal",
        "keywords": ["lalita kumari", "mandatory fir", "cognizable offense", "police refusal", "preliminary inquiry", "zero fir"]
    },
    {
        "law_id": "SC_PRECEDENT_SHREYA_SINGHAL_2015",
        "act_name": "Landmark SC Judgment — Shreya Singhal v. Union of India (2015)",
        "section_number": "(2015) 5 SCC 1",
        "section_title": "Freedom of Speech Online & Struck Down Section 66A IT Act",
        "section_text": "The Supreme Court struck down Section 66A of the Information Technology Act, 2000 as unconstitutional for violating Freedom of Speech under Article 19(1)(a). Online social media posts, criticism, or comments cannot be penalized unless they directly incite violence or clear public disorder.",
        "category": "cyber_crime",
        "keywords": ["shreya singhal", "section 66a", "social media", "freedom of speech", "online post", "it act", "unconstitutional"]
    },
    {
        "law_id": "SC_PRECEDENT_VISHAKA_1997",
        "act_name": "Landmark SC Judgment — Vishaka v. State of Rajasthan (1997)",
        "section_number": "(1997) 6 SCC 241",
        "section_title": "Workplace Sexual Harassment Guidelines (Precursor to POSH Act)",
        "section_text": "The Supreme Court laid down binding guidelines enforcing fundamental rights under Articles 14, 19, and 21 for women at workplaces. Mandated the creation of Internal Complaints Committees (ICC) in all workplaces with 10+ employees, header by a senior woman employee, for time-bound inquiry into harassment complaints.",
        "category": "women_rights",
        "keywords": ["vishaka guidelines", "workplace harassment", "posh", "internal complaints committee", "icc", "female safety"]
    },

    # ─── 2. NEW CRIMINAL CODES 2023 (BNSS, BSA, BNS) ───────────────────────────
    {
        "law_id": "BNSS_2023_S173",
        "act_name": "Bharatiya Nagarik Suraksha Sanhita, 2023 (BNSS)",
        "section_number": "Section 173",
        "section_title": "Information in Cognizable Cases — Zero FIR & Electronic FIR",
        "section_text": "Replaced Section 154 CrPC. Introduces statutory right to file a 'Zero FIR' at any police station irrespective of territorial jurisdiction. Allows filing of information electronically (e-FIR), which must be signed by the informant within 3 days. Mandatory forensic investigation by mobile crime team for offenses punishable with 7+ years.",
        "category": "criminal",
        "keywords": ["bnss", "zero fir", "efir", "electronic fir", "section 173", "police station", "jurisdiction", "crpc replacement"]
    },
    {
        "law_id": "BNSS_2023_S35",
        "act_name": "Bharatiya Nagarik Suraksha Sanhita, 2023 (BNSS)",
        "section_number": "Section 35",
        "section_title": "Arrest Procedure & Notice of Appearance",
        "section_text": "Replaced Section 41 CrPC. Police officer must issue a Notice of Appearance to persons accused of offenses carrying up to 7 years imprisonment. Arrest cannot be made routinely unless person fails to comply with notice or police records written justification of necessity for arrest to prevent tampering with evidence.",
        "category": "criminal",
        "keywords": ["bnss section 35", "notice of appearance", "arrest guidelines", "crpc 41a", "police powers", "bail rights"]
    },
    {
        "law_id": "BSA_2023_S61_63",
        "act_name": "Bharatiya Sakshya Adhiniyam, 2023 (BSA)",
        "section_number": "Section 61 & 63",
        "section_title": "Admissibility of Electronic Records & Digital Evidence",
        "section_text": "Replaced Section 65B of Indian Evidence Act 1872. Electronic records (WhatsApp chats, emails, CCTV footage, call recordings, digital documents) are fully admissible as primary evidence in courts, provided accompanied by a Certificate under Section 63 signed by a person managing the device/system.",
        "category": "cyber_crime",
        "keywords": ["bsa 2023", "electronic evidence", "whatsapp chat court", "cctv footage", "digital record", "section 65b", "certificate"]
    },
    {
        "law_id": "BNS_2023_S69",
        "act_name": "Bharatiya Nyaya Sanhita, 2023 (BNS)",
        "section_number": "Section 69",
        "section_title": "Sexual Intercourse by Deceitful Means or False Promise of Marriage",
        "section_text": "Replaced relevant provisions of IPC. Whoever by deceitful means or by making a false promise of marriage without intention of fulfilling it, or by promising employment/promotion, engages in sexual intercourse, shall be punished with imprisonment up to 10 years and fine.",
        "category": "women_rights",
        "keywords": ["bns section 69", "false promise of marriage", "deceitful means", "cheating", "ipc replacement", "women safety"]
    },
    {
        "law_id": "DPDP_2023_S6_12",
        "act_name": "Digital Personal Data Protection Act, 2023 (DPDP)",
        "section_number": "Section 6 & Section 12",
        "section_title": "Notice, Consent & Citizen Right to Erasure & Redressal",
        "section_text": "Data Fiduciaries (companies/apps) must obtain explicit, informed consent in plain language before collecting personal data. Citizens have statutory right to withdraw consent, demand erasure of personal data, and access details of third parties with whom data was shared. Breach penalties up to Rs. 250 Crores.",
        "category": "cyber_crime",
        "keywords": ["dpdp act 2023", "data privacy", "consent manager", "right to erasure", "data breach", "penalty 250 crore", "personal data"]
    },

    # ─── 3. COMMERCIAL & FINANCIAL STATUTES ──────────────────────────────────
    {
        "law_id": "NI_ACT_1881_S138",
        "act_name": "Negotiable Instruments Act, 1881",
        "section_number": "Section 138",
        "section_title": "Dishonour of Cheque for Insufficiency of Funds & Demand Notice",
        "section_text": "Where any cheque drawn by a person is returned unpaid by the bank due to insufficient funds or exceeding account limits, it constitutes a criminal offense. Payee must issue a formal Statutory Legal Demand Notice within 30 days of receiving bank memo. If drawer fails to pay within 15 days of notice receipt, a criminal complaint can be filed punishable with up to 2 years imprisonment or double cheque amount fine.",
        "category": "banking",
        "keywords": ["section 138", "cheque bounce", "legal notice", "15 days notice", "dishonoured cheque", "negotiable instruments", "bank memo"]
    },
    {
        "law_id": "IBC_2016_S8",
        "act_name": "Insolvency and Bankruptcy Code, 2016 (IBC)",
        "section_number": "Section 8",
        "section_title": "Insolvency Demand Notice by Operational Creditor",
        "section_text": "An operational creditor (supplier, contractor, service provider) may deliver a 10-day Demand Notice demanding payment of an unpaid operational debt exceeding Rs. 1 Crore. If corporate debtor fails to pay or show existence of a pre-existing legal dispute within 10 days, creditor can file NCLT petition for corporate insolvency resolution.",
        "category": "employment",
        "keywords": ["ibc 2016", "demand notice", "operational creditor", "nclt complaint", "company debt", "corporate insolvency", "section 8"]
    },
    {
        "law_id": "ARBITRATION_1996_S21",
        "act_name": "Arbitration and Conciliation Act, 1996",
        "section_number": "Section 21",
        "section_title": "Commencement of Arbitral Proceedings & Invocation Notice",
        "section_text": "Unless otherwise agreed by parties, arbitral proceedings in respect of a dispute commence on the date on which a formal request/notice for that dispute to be referred to arbitration is received by the respondent. Notice must specify claims and nominate proposed arbitrator.",
        "category": "housing",
        "keywords": ["arbitration act", "invocation notice", "section 21", "arbitrator appointment", "commercial dispute", "out of court settlement"]
    },
    {
        "law_id": "RERA_2016_S18",
        "act_name": "Real Estate (Regulation and Development) Act, 2016 (RERA)",
        "section_number": "Section 18",
        "section_title": "Return of Amount & Interest for Delay in Handover of Possession",
        "section_text": "If promoter/builder fails to complete or give possession of an apartment/flat in accordance with the agreement for sale by the specified date, builder is liable to refund the full amount received with interest at prescribed state rates (MCLR + 2%) and legal compensation. Allottee can also choose to stay in project and claim monthly delay interest.",
        "category": "housing",
        "keywords": ["rera section 18", "builder delay", "flat possession", "refund interest", "housing complaint", "real estate authority"]
    }
]


def expand_corpus():
    if not LAW_CORPUS_FILE.exists():
        print(f"Error: {LAW_CORPUS_FILE} not found!")
        return

    with open(LAW_CORPUS_FILE, "r", encoding="utf-8") as f:
        existing = json.load(f)

    existing_ids = {item["law_id"] for item in existing}
    added_count = 0

    for item in NEW_EXPANSIONS:
        if item["law_id"] not in existing_ids:
            existing.append(item)
            added_count += 1

    with open(LAW_CORPUS_FILE, "w", encoding="utf-8") as f:
        json.dump(existing, f, indent=2, ensure_ascii=False)

    print(f"Successfully added {added_count} new high-priority legal sections and SC precedents!")
    print(f"Total law sections in corpus now: {len(existing)}")


if __name__ == "__main__":
    expand_corpus()
