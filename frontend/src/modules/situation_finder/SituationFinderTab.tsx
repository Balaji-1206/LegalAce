import React, { useState, useCallback } from 'react';
import './situation_finder.css';

// ─── Props ──────────────────────────────────────────────────────────────────
interface SituationFinderTabProps {
  screen: 'categories' | 'list' | 'detail';
  setScreen: (screen: 'categories' | 'list' | 'detail') => void;
  categories: any[];
  situations: any[];
  bookmarks: string[];
  recentlyViewed: string[];
  selectedCategory: any | null;
  setSelectedCategory: (cat: any | null) => void;
  selectedSituation: any | null;
  openSituationDetail: (id: string) => void;
  toggleBookmark: (id: string) => void;
  getCategoryIcon: (cat: string) => string;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  situationsLoading: boolean;
  filteredSituations: any[];
  LAW_DETAILS_MAP: Record<string, string>;
  onBackHome?: () => void;
  onOpenWizard?: () => void;
}

// ─── Category colors map ────────────────────────────────────────────────────
const CAT_COLORS: Record<string, string> = {
  employment:  '#3b82f6',
  housing:     '#10b981',
  consumer:    '#f59e0b',
  cyber_crime: '#8b5cf6',
  women_rights:'#a855f7',
  banking:     '#06b6d4',
  traffic:     '#f43f5e',
  education:   '#14b8a6',
  cheque_debt: '#ef4444',
  rti:         '#f97316',
  real_estate: '#6366f1',
  insurance:   '#ec4899',
  family:      '#84cc16',
};

// ─── Category SVG icons ─────────────────────────────────────────────────────
const CatSVG: React.FC<{ id: string; color?: string }> = ({ id, color }) => {
  const c = color || CAT_COLORS[id] || '#4f46e5';
  const iconMap: Record<string, React.ReactNode> = {
    employment: (
      <svg viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" width="24" height="24">
        <rect x="2" y="7" width="20" height="14" rx="2" />
        <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
        <line x1="12" y1="12" x2="12" y2="16" /><line x1="10" y1="14" x2="14" y2="14" />
      </svg>
    ),
    housing: (
      <svg viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" width="24" height="24">
        <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    ),
    consumer: (
      <svg viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" width="24" height="24">
        <circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" />
        <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
      </svg>
    ),
    cyber_crime: (
      <svg viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" width="24" height="24">
        <rect x="2" y="3" width="20" height="14" rx="2" /><path d="M8 21h8M12 17v4" />
        <path d="M9 8l2 2 4-4" />
      </svg>
    ),
    women_rights: (
      <svg viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" width="24" height="24">
        <circle cx="12" cy="8" r="4" /><path d="M12 12v8M9 18h6" />
      </svg>
    ),
    banking: (
      <svg viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" width="24" height="24">
        <line x1="12" y1="1" x2="12" y2="23" />
        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
      </svg>
    ),
    traffic: (
      <svg viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" width="24" height="24">
        <path d="M5 17H3a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v9a2 2 0 0 1-2 2h-2" />
        <circle cx="9" cy="17" r="2" /><circle cx="17" cy="17" r="2" />
      </svg>
    ),
    education: (
      <svg viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" width="24" height="24">
        <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
        <path d="M6 12v5c3 3 9 3 12 0v-5" />
      </svg>
    ),
    cheque_debt: (
      <svg viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" width="24" height="24">
        <rect x="2" y="5" width="20" height="14" rx="2" /><line x1="2" y1="10" x2="22" y2="10" />
      </svg>
    ),
    rti: (
      <svg viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" width="24" height="24">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" />
      </svg>
    ),
    real_estate: (
      <svg viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" width="24" height="24">
        <path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18" /><path d="M6 12H4a2 2 0 0 0-2 2v8h20v-8a2 2 0 0 0-2-2h-2" /><line x1="10" y1="6" x2="14" y2="6" /><line x1="10" y1="10" x2="14" y2="10" />
      </svg>
    ),
    insurance: (
      <svg viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" width="24" height="24">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /><line x1="12" y1="8" x2="12" y2="14" /><line x1="9" y1="11" x2="15" y2="11" />
      </svg>
    ),
    family: (
      <svg viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" width="24" height="24">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  };
  return <>{iconMap[id] || (
    <svg viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" width="24" height="24">
      <path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z" />
    </svg>
  )}</>;
};

// ─── Skeleton Loaders ────────────────────────────────────────────────────────
const SkeletonCategories: React.FC = () => (
  <div className="sf-skeleton-grid">
    {[0,1,2,3,4,5].map(i => (
      <div key={i} className="sf-skeleton-cat" style={{ '--sf-stagger': i } as React.CSSProperties}>
        <div className="sf-skeleton-icon" />
        <div className="sf-skeleton-line w85" />
        <div className="sf-skeleton-line w40" />
      </div>
    ))}
  </div>
);

const SkeletonList: React.FC = () => (
  <div className="sf-skeleton-list">
    {[0,1,2,3].map(i => (
      <div key={i} className="sf-skeleton-item" style={{ '--sf-stagger': i } as React.CSSProperties}>
        <div className="sf-skeleton-circle" />
        <div className="sf-skeleton-lines">
          <div className="sf-skeleton-line w85" />
          <div className="sf-skeleton-line w60" />
        </div>
      </div>
    ))}
  </div>
);

// ─── Official Portals & Helplines Mapping ──────────────────────────────────
const AUTHORITY_PORTALS: Record<string, Array<{ name: string; url?: string; phone?: string; desc: string }>> = {
  employment: [
    { name: 'Ministry of Labour & Employment', url: 'https://labour.gov.in', phone: '1800-11-1800', desc: 'Labour Conciliation & Grievance Portal' },
    { name: 'Samadhan Portal', url: 'https://samadhan.labour.gov.in', desc: 'Online Industrial Dispute Filing' },
  ],
  housing: [
    { name: 'State Rent Control Authority', url: 'https://mohua.gov.in', desc: 'Model Tenancy & Rent Authority' },
    { name: 'National Consumer Helpline', url: 'https://consumerhelpline.gov.in', phone: '1915', desc: 'Security Deposit & Lease Grievance' },
  ],
  consumer: [
    { name: 'National Consumer Helpline (NCH)', url: 'https://consumerhelpline.gov.in', phone: '1915', desc: 'Instant Consumer Complaints' },
    { name: 'e-Daakhil Portal', url: 'https://edaakhil.nic.in', desc: 'Online Consumer Court Case Filing' },
  ],
  cyber_crime: [
    { name: 'National Cyber Crime Portal', url: 'https://cybercrime.gov.in', phone: '1930', desc: 'Report Financial Phishing & Cyber Fraud' },
  ],
  women_rights: [
    { name: 'National Commission for Women (NCW)', url: 'http://ncw.nic.in', phone: '7827170170', desc: '24/7 Women Helpline & Abuse Support' },
    { name: 'SHe-Box Portal', url: 'https://shebox.wcd.gov.in', desc: 'Sexual Harassment e-Box' },
  ],
  banking: [
    { name: 'RBI Complaint Management System', url: 'https://cms.rbi.org.in', phone: '14448', desc: 'Banking Ombudsman Online Portal' },
  ],
  traffic: [
    { name: 'mParivahan Portal', url: 'https://parivahan.gov.in', desc: 'Digital Driving License & RC Validity' },
    { name: 'National Highways Helpline', phone: '1033', desc: 'Emergency Road Accident Assistance' },
  ],
  education: [
    { name: 'National Anti-Ragging Helpline', url: 'https://www.antiragging.in', phone: '1800-180-5522', desc: 'UGC 24x7 Anti-Ragging Cell' },
    { name: 'UGC e-Samadhaan Portal', url: 'https://samadhaan.ugc.ac.in', desc: 'Higher Education Fee Refund Grievances' },
  ],
  cheque_debt: [
    { name: 'NALSA Legal Services Authority', url: 'https://nalsa.gov.in', phone: '15100', desc: 'Free Legal Aid & Pre-Litigation Notice' },
  ],
  rti: [
    { name: 'RTI Online Portal', url: 'https://rtionline.gov.in', desc: 'Central & State RTI Online Filing & Appeal' },
    { name: 'Central Information Commission', url: 'https://cic.gov.in', desc: 'Second Appeal & Penalty Tribunal' },
  ],
  real_estate: [
    { name: 'State RERA Portal', url: 'https://rera.mohua.gov.in', desc: 'Register Builder Complaints & Delayed Possession' },
  ],
  insurance: [
    { name: 'Bima Bharosa (IRDAI Portal)', url: 'https://bimabharosa.irdai.gov.in', phone: '155255', desc: 'Insurance Grievance Redressal Portal' },
    { name: 'Council for Insurance Ombudsmen', url: 'https://www.cioins.co.in', desc: 'Free Health Insurance Ombudsman Filing' },
  ],
  family: [
    { name: 'NALSA Legal Aid Helpline', url: 'https://nalsa.gov.in', phone: '15100', desc: 'Free Legal Aid for Maintenance & Family Court' },
  ],
};

// ─── Law Citation Accordion ──────────────────────────────────────────────────
const LawCitationCard: React.FC<{ law: any; LAW_DETAILS_MAP: Record<string, string> }> = ({ law, LAW_DETAILS_MAP }) => {
  const [open, setOpen] = useState(false);
  const detail = LAW_DETAILS_MAP[law.section];

  return (
    <div className="law-citation-row">
      <div className="law-citation-header" onClick={() => setOpen(o => !o)}>
        <div className="law-icon-badge">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
        </div>
        <div className="law-cite-info">
          <div className="law-title-row">
            <strong>{law.act} — {law.section}</strong>
            <span className="statutory-badge">Statutory Protection</span>
          </div>
          <span>{law.section_title}</span>
        </div>
        <svg className={`law-expand-chevron${open ? ' open' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </div>
      <div className={`law-citation-body${open ? ' open' : ''}`}>
        <div className="law-citation-body-inner">
          {detail ? (
            <p>{detail}</p>
          ) : (
            <p>Protected under statutory provisions of {law.act} ({law.section}). Enforceable before competent courts/commissions.</p>
          )}
          <div className="law-remedy-callout">
            ⚖️ <strong>Legal Remedy:</strong> Failure to comply with {law.section} grants affected individuals right to issue statutory notice and file petitions for compensation, reinstatement, or penalty before competent authority.
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Situation List Item ─────────────────────────────────────────────────────
const SituationListItem: React.FC<{
  sit: any;
  index: number;
  isBookmarked: boolean;
  onClick: () => void;
  onBookmark: (e: React.MouseEvent) => void;
}> = ({ sit, index, isBookmarked, onClick, onBookmark }) => {
  const catColor = CAT_COLORS[sit.category] || '#4f46e5';
  return (
    <div
      className="situation-list-item"
      onClick={onClick}
      style={{ '--sf-stagger': index, '--sf-cat-color': catColor } as React.CSSProperties}
    >
      <div className="sit-item-icon">
        <CatSVG id={sit.category} />
      </div>
      <div className="sit-item-body">
        <div className="sit-item-tag">
          {(sit.category || '').toUpperCase().replace(/_/g, ' ')}
        </div>
        <h4>{sit.title}</h4>
        <p>{sit.description?.slice(0, 75)}…</p>
      </div>
      <button
        className={`sit-item-bookmark${isBookmarked ? ' bookmarked' : ''}`}
        onClick={onBookmark}
        title={isBookmarked ? 'Remove bookmark' : 'Bookmark'}
      >
        <svg viewBox="0 0 24 24" fill={isBookmarked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
          <path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z" />
        </svg>
      </button>
    </div>
  );
};

// ─── Main Component ──────────────────────────────────────────────────────────
export const SituationFinderTab: React.FC<SituationFinderTabProps> = ({
  screen, setScreen,
  categories, situations, bookmarks, recentlyViewed,
  selectedCategory, setSelectedCategory,
  selectedSituation, openSituationDetail, toggleBookmark,
  searchQuery, setSearchQuery,
  situationsLoading, filteredSituations,
  LAW_DETAILS_MAP, onBackHome, onOpenWizard,
}) => {
  const [activeFilter, setActiveFilter] = useState<'all' | 'bookmarked' | 'recent'>('all');
  const [isSpeaking, setIsSpeaking] = useState(false);

  const handleToggleBookmark = useCallback((e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    toggleBookmark(id);
  }, [toggleBookmark]);

  // Voice Assist Speech Synthesis — Young Girl Voice Selection
  const handleToggleVoiceAssist = (situation: any) => {
    if (!('speechSynthesis' in window)) {
      alert('Voice assist is not supported on this browser.');
      return;
    }
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }
    const rightsText = (situation.user_rights || []).join('. ');
    const stepsText = (situation.action_steps || []).join('. ');
    const speechText = `${situation.title}. ${situation.description}. Your Rights: ${rightsText}. Action Steps: ${stepsText}.`;
    
    const utterance = new SpeechSynthesisUtterance(speechText);
    utterance.rate = 1.0;
    utterance.pitch = 1.3; // Higher pitch & bright cadence for young girl voice tone

    // Filter available voices for youthful female voice profiles (Jenny, Aria, Samantha, Victoria, Zira, etc.)
    const voices = window.speechSynthesis.getVoices();
    const youngGirlVoice = voices.find(v => 
      /jenny|aria|girl|young|samantha|victoria|zira|sonia|hazel|catherine|karen|eva|natural/i.test(v.name)
    ) || voices.find(v => v.lang.startsWith('en'));

    if (youngGirlVoice) {
      utterance.voice = youngGirlVoice;
    }

    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    
    window.speechSynthesis.speak(utterance);
    setIsSpeaking(true);
  };

  // Printable Summary Card
  const handlePrintSummary = () => {
    window.print();
  };

  const handleShare = async (situation: any) => {
    const text = [
      `⚖️ ${situation.title}`,
      '',
      situation.description,
      '',
      '📋 Your Rights:',
      ...(situation.user_rights || []).map((r: string) => `  • ${r}`),
      '',
      '✅ Action Steps:',
      ...(situation.action_steps || []).map((s: string, i: number) => `  ${i + 1}. ${s}`),
      '',
      '— Shared via LegalAce'
    ].join('\n');
    try {
      await navigator.clipboard.writeText(text);
    } catch {}
  };

  // Compute displayed situations based on active filter
  const getDisplayedSituations = () => {
    if (activeFilter === 'bookmarked') {
      return filteredSituations.filter(s => bookmarks.includes(s.situation_id));
    }
    if (activeFilter === 'recent') {
      const recentIds = new Set(recentlyViewed);
      return filteredSituations.filter(s => recentIds.has(s.situation_id));
    }
    return filteredSituations;
  };

  const displayedSituations = getDisplayedSituations();

  // ── DETAIL SCREEN ────────────────────────────────────────────
  if (screen === 'detail' && selectedSituation) {
    const isBookmarked = bookmarks.includes(selectedSituation.situation_id);
    const portals = AUTHORITY_PORTALS[selectedSituation.category] || [];

    return (
      <div className="situation-detail-screen sf-screen-enter">
        {/* Printable Letterhead Header */}
        <div className="printable-header">
          <h2>⚖️ LegalAce — Know Your Statutory Rights Guide</h2>
          <p>Official Information Reference & Action Blueprint</p>
        </div>

        {/* Dark gradient hero */}
        <div className="sit-detail-hero">
          <div className="sit-detail-hero-nav">
            <button className="sit-detail-back-btn" onClick={() => { window.speechSynthesis?.cancel(); setIsSpeaking(false); setScreen('list'); }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="18" height="18">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <button
                className={`sit-detail-audio-btn${isSpeaking ? ' active' : ''}`}
                onClick={() => handleToggleVoiceAssist(selectedSituation)}
                title={isSpeaking ? 'Stop Voice Assist' : 'Listen to Rights Audio'}
              >
                {isSpeaking ? '⏹️ Stop' : '🔊 Listen'}
              </button>
              <button className="sit-detail-print-btn" onClick={handlePrintSummary} title="Print or Save PDF Summary Card">
                🖨️ Save PDF
              </button>
              <button className="sit-detail-share-btn" onClick={() => handleShare(selectedSituation)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
                  <polyline points="16 6 12 2 8 6" />
                  <line x1="12" y1="2" x2="12" y2="15" />
                </svg>
                Share
              </button>
              <button
                className={`sit-detail-bookmark-btn${isBookmarked ? ' bookmarked' : ''}`}
                onClick={() => toggleBookmark(selectedSituation.situation_id)}
                title={isBookmarked ? 'Remove bookmark' : 'Bookmark'}
              >
                <svg viewBox="0 0 24 24" fill={isBookmarked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" width="18" height="18">
                  <path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z" />
                </svg>
              </button>
            </div>
          </div>

          <div className="sit-detail-cat-tag">
            <CatSVG id={selectedSituation.category} color="rgba(255,255,255,0.9)" />
            {(selectedSituation.category || '').replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
          </div>
          <h1>{selectedSituation.title}</h1>
          <p>{selectedSituation.description}</p>
        </div>

        {/* Your Rights */}
        {selectedSituation.user_rights?.length > 0 && (
          <div className="detail-section-card">
            <h3>
              <svg viewBox="0 0 24 24" fill="none" stroke="#4f46e5" strokeWidth="2" width="18" height="18">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
              Your Rights
            </h3>
            <ul>
              {selectedSituation.user_rights.map((r: string, i: number) => (
                <li key={i} style={{ '--sf-stagger': i } as React.CSSProperties}>
                  <div className="check-circle" style={{ '--sf-stagger': i } as React.CSSProperties}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" width="10" height="10">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </div>
                  {r}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Action Steps — numbered */}
        {selectedSituation.action_steps?.length > 0 && (
          <div className="detail-section-card">
            <h3>
              <svg viewBox="0 0 24 24" fill="none" stroke="#4f46e5" strokeWidth="2" width="18" height="18">
                <circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" />
              </svg>
              Action Steps
            </h3>
            {selectedSituation.action_steps.map((step: string, i: number) => (
              <div key={i} className="sf-step-item" style={{ '--sf-stagger': i } as React.CSSProperties}>
                <div className="sf-step-connector">
                  <div className="sf-step-num">{i + 1}</div>
                  {i < selectedSituation.action_steps.length - 1 && <div className="sf-step-line" />}
                </div>
                <div className="sf-step-body">
                  <div className="sf-step-text">{step}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Applicable Laws — expandable */}
        {selectedSituation.applicable_laws?.length > 0 && (
          <div className="detail-section-card">
            <h3>
              <svg viewBox="0 0 24 24" fill="none" stroke="#4f46e5" strokeWidth="2" width="18" height="18">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
              Applicable Laws & Remedies
            </h3>
            {selectedSituation.applicable_laws.map((law: any, i: number) => (
              <LawCitationCard key={i} law={law} LAW_DETAILS_MAP={LAW_DETAILS_MAP} />
            ))}
          </div>
        )}

        {/* Official Portals & Helplines Hub */}
        {portals.length > 0 && (
          <div className="detail-section-card portals-card">
            <h3>
              <svg viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2" width="18" height="18">
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
              </svg>
              Official Portals & Helplines
            </h3>
            <div className="portals-grid">
              {portals.map((p, idx) => (
                <div key={idx} className="portal-item">
                  <div className="portal-info">
                    <strong>{p.name}</strong>
                    <span>{p.desc}</span>
                  </div>
                  <div className="portal-actions">
                    {p.phone && (
                      <a href={`tel:${p.phone}`} className="portal-btn phone" title={`Call ${p.phone}`}>
                        📞 {p.phone}
                      </a>
                    )}
                    {p.url && (
                      <a href={p.url} target="_blank" rel="noreferrer" className="portal-btn web">
                        🌐 Open Portal ↗
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Important Deadlines */}
        {selectedSituation.important_deadlines?.length > 0 && (
          <div className="detail-section-card">
            <h3>
              <svg viewBox="0 0 24 24" fill="none" stroke="#f97316" strokeWidth="2" width="18" height="18">
                <circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" />
              </svg>
              Important Deadlines
            </h3>
            {selectedSituation.important_deadlines.map((d: string, i: number) => (
              <div key={i} className="deadline-item">
                <div className="deadline-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                    <rect x="3" y="4" width="18" height="18" rx="2" />
                    <line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" />
                    <line x1="3" y1="10" x2="21" y2="10" />
                  </svg>
                </div>
                <span>{d}</span>
              </div>
            ))}
          </div>
        )}

        {/* Try Wizard CTA */}
        {onOpenWizard && (
          <button className="sf-wizard-cta" onClick={onOpenWizard}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="16" height="16">
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
            </svg>
            Get a Personalised Action Plan →
          </button>
        )}

        {/* Back to list */}
        <button className="sf-restart-btn" onClick={() => setScreen('list')}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="14" height="14">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Browse More Situations
        </button>
      </div>
    );
  }

  // ── LIST SCREEN ──────────────────────────────────────────────
  if (screen === 'list') {
    return (
      <div className="situations-screen sf-screen-enter">
        {/* Header nav */}
        <div className="situations-header">
          <div className="situations-header-nav">
            <button className="situations-back-btn" onClick={() => { setScreen('categories'); setSearchQuery(''); setActiveFilter('all'); }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="20" height="20">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
            <span style={{ fontSize: 17, fontWeight: 700, color: '#1a1a5e' }}>
              {selectedCategory?.name || 'All Situations'}
            </span>
            <div style={{ width: 36 }} />
          </div>
        </div>

        {/* Search */}
        <div className="situations-search-wrap">
          <div className="situations-search-box">
            <svg viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" width="18" height="18">
              <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
            </svg>
            <input
              type="text"
              placeholder="Search situations..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', padding: 0 }}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="16" height="16">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Filter chips */}
        <div className="sf-filter-chips">
          <button className={`sf-chip${activeFilter === 'all' ? ' active' : ''}`} onClick={() => setActiveFilter('all')}>
            All
          </button>
          {bookmarks.length > 0 && (
            <button className={`sf-chip${activeFilter === 'bookmarked' ? ' active' : ''}`} onClick={() => setActiveFilter('bookmarked')}>
              🔖 Saved ({bookmarks.length})
            </button>
          )}
          {recentlyViewed.length > 0 && (
            <button className={`sf-chip${activeFilter === 'recent' ? ' active' : ''}`} onClick={() => setActiveFilter('recent')}>
              🕐 Recent
            </button>
          )}
        </div>

        {/* Count + list */}
        <div className="sf-list-header">
          <div className="sf-list-count">
            {displayedSituations.length} situation{displayedSituations.length !== 1 ? 's' : ''} found
          </div>
        </div>

        {situationsLoading ? (
          <SkeletonList />
        ) : displayedSituations.length === 0 ? (
          <div className="sf-empty-state">
            <div className="sf-empty-icon">🔍</div>
            <h3>No situations found</h3>
            <p>
              {activeFilter !== 'all'
                ? 'Try switching to "All" to see everything.'
                : 'Try a different search term or category.'}
            </p>
          </div>
        ) : (
          <div style={{ padding: '0 16px' }}>
            {displayedSituations.map((sit, idx) => (
              <SituationListItem
                key={sit.situation_id}
                sit={sit}
                index={idx}
                isBookmarked={bookmarks.includes(sit.situation_id)}
                onClick={() => openSituationDetail(sit.situation_id)}
                onBookmark={e => handleToggleBookmark(e, sit.situation_id)}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  // ── CATEGORIES SCREEN (default) ──────────────────────────────
  const commonSituations = situations.slice(0, 5);
  const bookmarkedSituations = situations.filter(s => bookmarks.includes(s.situation_id));
  const recentSituations = situations.filter(s => recentlyViewed.includes(s.situation_id)).slice(0, 5);

  return (
    <div className="situations-screen sf-screen-enter">
      {/* Header */}
      <div className="situations-header">
        <div className="situations-header-nav">
          {onBackHome ? (
            <button className="situations-back-btn" onClick={onBackHome} title="Back to Home">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="20" height="20">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
          ) : <div style={{ width: 36 }} />}
          <span style={{ fontSize: 17, fontWeight: 700, color: '#1a1a5e' }}>LegalAce</span>
          <div style={{ width: 36 }} />
        </div>
        <div className="situations-title-area">
          <h1>Legal Situations</h1>
          <p className="situations-subtitle">Find actionable legal information tailored to your circumstances.</p>
        </div>
      </div>

      {/* Search */}
      <div className="situations-search-wrap">
        <div className="situations-search-box">
          <svg viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" width="18" height="18">
            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
          </svg>
          <input
            type="text"
            placeholder="What happened? Describe your problem..."
            value={searchQuery}
            onChange={e => {
              setSearchQuery(e.target.value);
              if (e.target.value.trim()) {
                setSelectedCategory({ id: '__search__', name: 'Search Results' });
                setScreen('list');
              }
            }}
          />
        </div>
      </div>

      {/* Recently Viewed */}
      {recentSituations.length > 0 && (
        <div className="sf-recent-section">
          <div className="sf-recent-label">
            <svg viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2" width="14" height="14">
              <circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" />
            </svg>
            Recently Viewed
          </div>
          <div className="sf-recent-scroll">
            {recentSituations.map(sit => (
              <button key={sit.situation_id} className="sf-recent-chip" onClick={() => openSituationDetail(sit.situation_id)}>
                <CatSVG id={sit.category} color={CAT_COLORS[sit.category] || '#4f46e5'} />
                {sit.title.length > 28 ? sit.title.slice(0, 28) + '…' : sit.title}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Categories */}
      <div className="categories-section">
        <div className="categories-section-title">Categories</div>
        {situationsLoading ? (
          <SkeletonCategories />
        ) : (
          <div className="categories-grid">
            {categories.map((cat, i) => {
              const catSituationCount = situations.filter(s => s.category === cat.id).length;
              return (
                <div
                  key={cat.id}
                  className={`category-card ${cat.id}`}
                  onClick={() => { setSelectedCategory(cat); setScreen('list'); setSearchQuery(''); setActiveFilter('all'); }}
                  style={{ '--sf-stagger': i } as React.CSSProperties}
                >
                  <div className="cat-icon-wrap" style={{ '--sf-stagger': i } as React.CSSProperties}>
                    <CatSVG id={cat.id} />
                  </div>
                  <div className="category-card-name">{cat.name}</div>
                  {catSituationCount > 0 && (
                    <div className="category-card-count">{catSituationCount} situations</div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Bookmarks */}
      {bookmarkedSituations.length > 0 && (
        <div className="sf-bookmarks-section">
          <div className="sf-bookmarks-label">
            <svg viewBox="0 0 24 24" fill="#4f46e5" stroke="#4f46e5" strokeWidth="1.5" width="14" height="14">
              <path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z" />
            </svg>
            Saved Situations
          </div>
          {bookmarkedSituations.slice(0, 3).map((sit, idx) => (
            <SituationListItem
              key={sit.situation_id}
              sit={sit}
              index={idx}
              isBookmarked
              onClick={() => openSituationDetail(sit.situation_id)}
              onBookmark={e => handleToggleBookmark(e, sit.situation_id)}
            />
          ))}
        </div>
      )}

      {/* Common Situations */}
      <div className="common-situations-section">
        <div className="common-situations-header">
          <h3>Common Situations</h3>
          <button className="view-all-text" onClick={() => { setSelectedCategory(null); setSearchQuery(''); setScreen('list'); setActiveFilter('all'); }}>
            View all
          </button>
        </div>

        {situationsLoading ? (
          <SkeletonList />
        ) : (
          commonSituations.map((sit, idx) => (
            <SituationListItem
              key={sit.situation_id}
              sit={sit}
              index={idx}
              isBookmarked={bookmarks.includes(sit.situation_id)}
              onClick={() => openSituationDetail(sit.situation_id)}
              onBookmark={e => handleToggleBookmark(e, sit.situation_id)}
            />
          ))
        )}
      </div>
    </div>
  );
};

export default SituationFinderTab;
