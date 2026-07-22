import React, { useState, useEffect, useCallback, useRef } from 'react';
import './wizard.css';

const BACKEND = 'http://localhost:8000/api/v1/wizard';
const CACHE_KEY = 'wizard_offline_cache';
const STEP_PROGRESS_KEY = 'wizard_step_progress';
const DOC_CHECK_KEY = 'wizard_doc_checks';

// ─── Types ──────────────────────────────────────────────────────────────────
interface Category { id: string; name: string; name_ta: string; name_hi: string; icon: string; color: string; scenario_count: number; }
interface ScenarioSummary { scenario_id: string; title: string; title_ta?: string; title_hi?: string; icon: string; question_count: number; }
interface Question { id: string; text: string; text_ta?: string; text_hi?: string; type: 'boolean' | 'choice'; options?: string[]; }
interface Scenario { scenario_id: string; category: string; title: string; questions: Question[]; }
interface ActionStep { step_number: number; title: string; description: string; estimated_time: string; importance: string; applicable_law?: string; }
interface Authority { name: string; helpline: string; url: string; action: string; }
interface Template { id: string; title: string; description: string; }
interface ActionPlan { title: string; steps: ActionStep[]; required_documents: string[]; authorities: Authority[]; templates: Template[]; urgent: boolean; disclaimer: string; }

type Lang = 'en' | 'ta' | 'hi';
type Screen = 'categories' | 'scenarios' | 'questions' | 'plan' | 'history';
type ToastType = 'success' | 'error' | 'info';

interface ToastData { id: number; type: ToastType; message: string; exiting?: boolean; }

// ─── Helpers ─────────────────────────────────────────────────────────────────
const getLabel = (obj: any, key: string, lang: Lang) => {
  if (lang === 'ta' && obj[`${key}_ta`]) return obj[`${key}_ta`];
  if (lang === 'hi' && obj[`${key}_hi`]) return obj[`${key}_hi`];
  return obj[key] || '';
};

const LANG_LABELS: Record<Lang, { name: string; yes: string; no: string }> = {
  en: { name: 'English', yes: '✓  Yes', no: '✗  No' },
  ta: { name: 'தமிழ்',   yes: '✓  ஆம்',  no: '✗  இல்லை' },
  hi: { name: 'हिंदी',  yes: '✓  हाँ',   no: '✗  नहीं' },
};

const SECTION_LABELS: Record<Lang, Record<string, string>> = {
  en: { categories: 'Categories', choose: 'Choose a situation', steps: 'Action Steps', docs: '📄 Documents Needed', templates: '📝 Download Templates', authorities: '🏛️ Where to Complain', restart: '← Try Another Situation', history: 'My Past Cases' },
  ta: { categories: 'வகைகள்', choose: 'ஒரு நிலைமையை தேர்வு செய்யுங்கள்', steps: 'நடவடிக்கை படிகள்', docs: '📄 தேவையான ஆவணங்கள்', templates: '📝 படிவங்கள் பதிவிறக்கம்', authorities: '🏛️ எங்கே புகார் செய்வது', restart: '← இன்னொரு நிலைமை', history: 'என் முந்தைய வழக்குகள்' },
  hi: { categories: 'श्रेणियाँ', choose: 'एक स्थिति चुनें', steps: 'कार्य योजना', docs: '📄 आवश्यक दस्तावेज़', templates: '📝 टेम्प्लेट डाउनलोड', authorities: '🏛️ शिकायत कहाँ करें', restart: '← दूसरी स्थिति चुनें', history: 'मेरे पुराने मामले' },
};

const L = (lang: Lang, key: string) => SECTION_LABELS[lang][key] || key;

const CATEGORY_COLORS: Record<string, string> = {
  housing: '#10b981',
  employment: '#3b82f6',
  consumer: '#f59e0b',
  banking: '#06b6d4',
  cyber: '#8b5cf6',
  traffic: '#f43f5e',
  women: '#a855f7',
  education: '#14b8a6',
};

const timeAgo = (dateStr: string): string => {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = now - then;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return new Date(dateStr).toLocaleDateString('en-IN');
};

// ─── Toast System ────────────────────────────────────────────────────────────
let toastIdCounter = 0;

const useToast = () => {
  const [toasts, setToasts] = useState<ToastData[]>([]);

  const showToast = useCallback((type: ToastType, message: string, duration = 3000) => {
    const id = ++toastIdCounter;
    setToasts(prev => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts(prev => prev.map(t => t.id === id ? { ...t, exiting: true } : t));
      setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 300);
    }, duration);
  }, []);

  const dismissToast = useCallback((id: number) => {
    setToasts(prev => prev.map(t => t.id === id ? { ...t, exiting: true } : t));
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 300);
  }, []);

  return { toasts, showToast, dismissToast };
};

// ─── Toast Component ─────────────────────────────────────────────────────────
const ToastContainer: React.FC<{ toasts: ToastData[]; onDismiss: (id: number) => void }> = ({ toasts, onDismiss }) => (
  <>
    {toasts.map(toast => (
      <div key={toast.id} className={`wizard-toast ${toast.type}${toast.exiting ? ' exiting' : ''}`}>
        <span className="wizard-toast-icon">
          {toast.type === 'success' ? '✓' : toast.type === 'error' ? '✕' : 'ℹ'}
        </span>
        <span className="wizard-toast-text">{toast.message}</span>
        <button className="wizard-toast-close" onClick={() => onDismiss(toast.id)}>✕</button>
      </div>
    ))}
  </>
);

// ─── Skeleton Loaders ────────────────────────────────────────────────────────
const SkeletonScenarioCards: React.FC = () => (
  <div className="scenario-list">
    {[0, 1, 2].map(i => (
      <div key={i} className="skeleton-card" style={{ '--stagger-index': i } as React.CSSProperties}>
        <div className="skeleton-circle" />
        <div className="skeleton-lines">
          <div className="skeleton-line medium" />
          <div className="skeleton-line short" />
        </div>
      </div>
    ))}
  </div>
);

const SkeletonCategoryGrid: React.FC = () => (
  <div className="wizard-category-grid">
    {[0, 1, 2, 3, 4, 5].map(i => (
      <div key={i} className="skeleton-category" style={{ '--stagger-index': i } as React.CSSProperties}>
        <div className="skeleton-icon" />
        <div className="skeleton-lines">
          <div className="skeleton-line medium" />
          <div className="skeleton-line short" />
        </div>
      </div>
    ))}
  </div>
);

// ─── Category Card ────────────────────────────────────────────────────────────
const CategoryCard: React.FC<{ cat: Category; lang: Lang; onClick: () => void; index: number }> = ({ cat, lang, onClick, index }) => (
  <div
    className={`category-card ${cat.id}`}
    onClick={onClick}
    style={{ '--stagger-index': index } as React.CSSProperties}
  >
    <div className="category-card-icon" style={{ '--stagger-index': index } as React.CSSProperties}>{cat.icon}</div>
    <div>
      <div className="category-card-name">{getLabel(cat, 'name', lang)}</div>
      <div className="category-card-count">{cat.scenario_count} situations</div>
    </div>
  </div>
);

// ─── Scenario Card ────────────────────────────────────────────────────────────
const ScenarioCard: React.FC<{ s: ScenarioSummary; lang: Lang; onClick: () => void; index: number; catColor: string }> = ({ s, lang, onClick, index, catColor }) => (
  <div
    className="scenario-card"
    onClick={onClick}
    style={{ '--stagger-index': index, '--cat-color': catColor } as React.CSSProperties}
  >
    <div className="scenario-card-icon">{s.icon}</div>
    <div className="scenario-card-body">
      <div className="scenario-card-title">{getLabel(s, 'title', lang)}</div>
      <div className="scenario-card-meta">{s.question_count} questions · 2 min</div>
    </div>
    <div className="scenario-card-arrow">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6" /></svg>
    </div>
  </div>
);

// ─── Question Flow ────────────────────────────────────────────────────────────
interface QuestionFlowProps {
  scenario: Scenario;
  lang: Lang;
  onComplete: (answers: Record<string, string>) => void;
  onBack: () => void;
}

const QuestionFlow: React.FC<QuestionFlowProps> = ({ scenario, lang, onComplete, onBack }) => {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [selected, setSelected] = useState<string | null>(null);
  const [slideDir, setSlideDir] = useState<'right' | 'left'>('right');
  const [animKey, setAnimKey] = useState(0);

  const questions = scenario.questions;
  const q = questions[currentIdx];
  const progress = ((currentIdx) / questions.length) * 100;
  const isLast = currentIdx === questions.length - 1;

  // Circular ring calculations
  const radius = 25;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  const handleAnswer = (value: string) => {
    setSelected(value);
    const newAnswers = { ...answers, [q.id]: value };
    setTimeout(() => {
      setAnswers(newAnswers);
      setSelected(null);
      setSlideDir('right');
      setAnimKey(k => k + 1);
      if (currentIdx + 1 >= questions.length) {
        onComplete(newAnswers);
      } else {
        setCurrentIdx(i => i + 1);
      }
    }, 350);
  };

  const handlePrevious = () => {
    if (currentIdx === 0) {
      onBack();
    } else {
      setSlideDir('left');
      setAnimKey(k => k + 1);
      setCurrentIdx(i => i - 1);
    }
  };

  return (
    <div className="question-flow">
      {/* Back */}
      <button className="wizard-back-btn" onClick={handlePrevious}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6" /></svg>
        {currentIdx === 0 ? 'Back to situations' : 'Previous question'}
      </button>

      {/* Progress header with ring */}
      <div className="question-progress-header">
        <div className="progress-ring-container">
          <svg className="progress-ring-svg" viewBox="0 0 54 54">
            <defs>
              <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#4f46e5" />
                <stop offset="100%" stopColor="#818cf8" />
              </linearGradient>
            </defs>
            <circle className="progress-ring-bg" cx="27" cy="27" r={radius} />
            <circle className="progress-ring-fill" cx="27" cy="27" r={radius} style={{ strokeDashoffset }} />
          </svg>
          <div className="progress-ring-text">{currentIdx + 1}/{questions.length}</div>
        </div>
        <div className="progress-info">
          <div className="progress-info-label">Question {currentIdx + 1} of {questions.length}</div>
          <div className="progress-info-text">{scenario.title}</div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="question-progress-bar">
        <div className="question-progress-fill" style={{ width: `${progress}%` }} />
      </div>

      <div
        key={animKey}
        className={`question-body ${slideDir === 'right' ? 'slide-in-right' : 'slide-in-left'}`}
      >
        {/* Encouragement on last question */}
        {isLast && (
          <div className="question-encouragement">
            🎯 Almost done! Last question
          </div>
        )}

        <div className="question-text">{getLabel(q, 'text', lang)}</div>

        {q.type === 'boolean' ? (
          <div className="question-bool-options">
            <button
              className={`bool-option-btn yes-btn${selected === 'yes' ? ' selected' : ''}`}
              onClick={() => handleAnswer('yes')}
            >
              <div className="bool-option-icon">✅</div>
              {LANG_LABELS[lang].yes}
            </button>
            <button
              className={`bool-option-btn no-btn${selected === 'no' ? ' selected' : ''}`}
              onClick={() => handleAnswer('no')}
            >
              <div className="bool-option-icon">❌</div>
              {LANG_LABELS[lang].no}
            </button>
          </div>
        ) : (
          <div className="question-choice-options">
            {(q.options || []).map(opt => (
              <button
                key={opt}
                className={`choice-option-btn${selected === opt ? ' selected' : ''}`}
                onClick={() => handleAnswer(opt)}
              >
                {opt}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Action Plan View ─────────────────────────────────────────────────────────
interface ActionPlanViewProps {
  plan: ActionPlan;
  scenarioTitle: string;
  lang: Lang;
  onRestart: () => void;
  showToast: (type: ToastType, message: string) => void;
}

const ActionPlanView: React.FC<ActionPlanViewProps> = ({ plan, scenarioTitle, lang, onRestart, showToast }) => {
  // Step completion tracking (persisted)
  const storageKey = `${STEP_PROGRESS_KEY}_${scenarioTitle}`;
  const docStorageKey = `${DOC_CHECK_KEY}_${scenarioTitle}`;

  const [completedSteps, setCompletedSteps] = useState<Set<number>>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      return saved ? new Set(JSON.parse(saved)) : new Set<number>();
    } catch { return new Set<number>(); }
  });

  const [checkedDocs, setCheckedDocs] = useState<Set<number>>(() => {
    try {
      const saved = localStorage.getItem(docStorageKey);
      return saved ? new Set(JSON.parse(saved)) : new Set<number>();
    } catch { return new Set<number>(); }
  });

  const [expandedSteps, setExpandedSteps] = useState<Set<number>>(() => {
    // Auto-expand first uncompleted step
    const firstUncompleted = plan.steps.findIndex((_, i) => !completedSteps.has(i));
    return new Set(firstUncompleted >= 0 ? [firstUncompleted] : [0]);
  });

  const toggleStep = (idx: number) => {
    const next = new Set(completedSteps);
    if (next.has(idx)) next.delete(idx); else next.add(idx);
    setCompletedSteps(next);
    localStorage.setItem(storageKey, JSON.stringify([...next]));
  };

  const toggleExpand = (idx: number) => {
    const next = new Set(expandedSteps);
    if (next.has(idx)) next.delete(idx); else next.add(idx);
    setExpandedSteps(next);
  };

  const toggleDoc = (idx: number) => {
    const next = new Set(checkedDocs);
    if (next.has(idx)) next.delete(idx); else next.add(idx);
    setCheckedDocs(next);
    localStorage.setItem(docStorageKey, JSON.stringify([...next]));
  };

  const handleShare = async () => {
    const text = [
      `⚖️ ${plan.title}`,
      '',
      ...plan.steps.map(s => `${s.step_number}. ${s.title}\n   ${s.description}`),
      '',
      '📄 Documents: ' + plan.required_documents.join(', '),
      '',
      `⚠️ ${plan.disclaimer}`,
      '',
      '— Generated by LegalAce'
    ].join('\n');

    try {
      await navigator.clipboard.writeText(text);
      showToast('success', 'Action plan copied to clipboard!');
    } catch {
      showToast('error', 'Could not copy. Try again.');
    }
  };

  const handleCallAuthority = (auth: Authority) => {
    if (auth.helpline) {
      window.location.href = `tel:${auth.helpline}`;
    }
  };

  const handleVisitAuthority = (auth: Authority) => {
    if (auth.url) {
      window.open(auth.url, '_blank', 'noopener');
    }
  };

  // Document Generator Modal State
  const [activeTemplate, setActiveTemplate] = useState<Template | null>(null);
  const [senderName, setSenderName] = useState('Legal Ace User');
  const [senderAddress, setSenderAddress] = useState('123 Green Park, Bengaluru, Karnataka');
  const [senderPhone, setSenderPhone] = useState('+91 98765 43210');
  const [senderEmail, setSenderEmail] = useState('user@legalace.in');
  const [recipientName, setRecipientName] = useState('Opposing Party / Company / Landlord');
  const [recipientAddress, setRecipientAddress] = useState('45 Commercial Street, Bengaluru, Karnataka');
  const [disputeAmount, setDisputeAmount] = useState('50000');
  const [factsSummary, setFactsSummary] = useState(`Dispute regarding ${scenarioTitle}. Failure to perform legal obligations as agreed.`);
  const [noticeDays, setNoticeDays] = useState('15');

  const [generating, setGenerating] = useState(false);
  const [generatedDoc, setGeneratedDoc] = useState<any | null>(null);

  const handleTemplateClick = (tpl: Template) => {
    setActiveTemplate(tpl);
    setGeneratedDoc(null);
  };

  const buildClientFallbackDoc = (tpl: Template) => {
    const today = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
    let title = 'LEGAL DEMAND NOTICE';
    let sections = ['Model Tenancy Act 2021', 'Indian Contract Act 1872 — Section 73'];
    let text = '';

    if (tpl.id.includes('housing') || tpl.id.includes('deposit')) {
      title = 'LEGAL DEMAND NOTICE FOR RETURN OF SECURITY DEPOSIT';
      sections = ['Model Tenancy Act 2021 — Section 11', 'State Rent Control Act', 'Indian Contract Act 1872 — Section 73'];
      text = `BY REGISTERED POST A.D. / EMAIL\n\nDate: ${today}\n\nTO,\n${recipientName}\n${recipientAddress}\n\nFROM,\n${senderName}\n${senderAddress}\nContact: ${senderPhone} | Email: ${senderEmail}\n\nSUBJECT: LEGAL NOTICE FOR REFUND OF SECURITY DEPOSIT AMOUNTING TO RS. ${disputeAmount}/-.\n\nSir/Madam,\n\nUnder instructions and on behalf of the undersigned (${senderName}), I hereby serve upon you this Legal Notice:\n\n1. That the undersigned occupied premises at ${senderAddress} as a tenant under a tenancy agreement.\n2. That an interest-free refundable Security Deposit of Rs. ${disputeAmount}/- was deposited with you.\n3. That despite peaceful vacation of premises, you have illegally withheld the deposit violating Section 11 of the Model Tenancy Act.\n\nTAKE NOTICE that you are called upon to refund Rs. ${disputeAmount}/- within ${noticeDays} days of receipt of this notice, failing which legal proceedings shall be initiated.\n\nYours faithfully,\n\n___________________________\n(${senderName})\nComplainant / Tenant`;
    } else if (tpl.id.includes('employment') || tpl.id.includes('salary')) {
      title = 'LEGAL DEMAND NOTICE FOR RECOVERY OF UNPAID SALARY';
      sections = ['Payment of Wages Act 1936 — Section 15', 'Industrial Disputes Act 1947 — Section 25F & Section 33C'];
      text = `BY REGISTERED POST A.D. / EMAIL\n\nDate: ${today}\n\nTO,\nThe Management / Director,\n${recipientName}\n${recipientAddress}\n\nFROM,\n${senderName}\n${senderAddress}\nContact: ${senderPhone} | Email: ${senderEmail}\n\nSUBJECT: LEGAL NOTICE FOR PAYMENT OF OUTSTANDING SALARY OF RS. ${disputeAmount}/-.\n\nSir/Madam,\n\n1. That the undersigned (${senderName}) was employed with your organization (${recipientName}).\n2. That earned wages/salary amounting to Rs. ${disputeAmount}/- remain unpaid.\n3. Facts: ${factsSummary}\n\nTAKE NOTICE that you are called upon to remit Rs. ${disputeAmount}/- within ${noticeDays} days, failing which legal proceedings under Payment of Wages Act will be instituted.\n\nYours faithfully,\n\n___________________________\n(${senderName})\nEmployee / Claimant`;
    } else {
      title = 'CONSUMER LEGAL NOTICE FOR REFUND / DEFICIENCY OF SERVICE';
      sections = ['Consumer Protection Act 2019 — Section 2(47)', 'Consumer Protection Act 2019 — Section 35'];
      text = `BY REGISTERED POST A.D. / EMAIL\n\nDate: ${today}\n\nTO,\n${recipientName}\n${recipientAddress}\n\nFROM,\n${senderName}\n${senderAddress}\nContact: ${senderPhone} | Email: ${senderEmail}\n\nSUBJECT: LEGAL NOTICE UNDER SECTION 35 OF CONSUMER PROTECTION ACT 2019.\n\n1. That the undersigned purchased goods / services from you for Rs. ${disputeAmount}/-.\n2. Facts: ${factsSummary}\n\nTAKE NOTICE that you are called upon to refund Rs. ${disputeAmount}/- within ${noticeDays} days, failing which a complaint will be filed in the Consumer Commission.\n\nYours faithfully,\n\n___________________________\n(${senderName})\nConsumer`;
    }

    return { title, statutory_sections: sections, document_text: text };
  };

  const handleGenerateDoc = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTemplate) return;
    setGenerating(true);
    try {
      const res = await fetch('http://localhost:8000/api/v1/wizard/generate-document', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          template_id: activeTemplate.id,
          details: {
            sender_name: senderName,
            sender_address: senderAddress,
            sender_phone: senderPhone,
            sender_email: senderEmail,
            recipient_name: recipientName,
            recipient_address: recipientAddress,
            dispute_amount: disputeAmount,
            facts_summary: factsSummary,
            notice_days: noticeDays,
          },
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setGeneratedDoc(data);
        showToast('success', '📄 Official Legal Notice generated successfully!');
      } else {
        const fallback = buildClientFallbackDoc(activeTemplate);
        setGeneratedDoc(fallback);
        showToast('success', '📄 Legal Notice generated successfully!');
      }
    } catch {
      const fallback = buildClientFallbackDoc(activeTemplate);
      setGeneratedDoc(fallback);
      showToast('success', '📄 Legal Notice generated successfully!');
    } finally {
      setGenerating(false);
    }
  };

  const [docTheme, setDocTheme] = useState<'advocate' | 'court' | 'corporate'>('advocate');
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  const handleDownloadDirectPDF = async () => {
    const elem = document.getElementById('printable-legal-document');
    if (!elem) return;

    setDownloadingPdf(true);
    showToast('info', '⏳ Generating vector PDF file...');

    try {
      if (!(window as any).html2pdf) {
        await new Promise((resolve, reject) => {
          const script = document.createElement('script');
          script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
          script.onload = resolve;
          script.onerror = reject;
          document.head.appendChild(script);
        });
      }

      const html2pdf = (window as any).html2pdf;
      const filename = `${generatedDoc?.title?.replace(/[^a-zA-Z0-9]/g, '_') || 'Legal_Notice'}.pdf`;

      const opt = {
        margin: [10, 12, 10, 12],
        filename: filename,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2.5, useCORS: true, logging: false },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      };

      await html2pdf().set(opt).from(elem).save();
      showToast('success', '📥 PDF file downloaded successfully!');
    } catch {
      window.print();
    } finally {
      setDownloadingPdf(false);
    }
  };

  const handlePrintPDF = () => {
    window.print();
  };

  const handleCopyDocText = () => {
    if (generatedDoc?.document_text) {
      navigator.clipboard.writeText(generatedDoc.document_text);
      showToast('success', '📋 Legal Notice text copied to clipboard!');
    }
  };

  const completionPct = plan.steps.length > 0
    ? Math.round((completedSteps.size / plan.steps.length) * 100)
    : 0;

  return (
    <div className="action-plan-screen">
      {/* Hero header */}
      <div className="action-plan-hero">
        <div className="action-plan-hero-top">
          <div>
            <div className="action-plan-hero-badge">⚖️ Your Action Plan Ready</div>
          </div>
          <button className="action-plan-share-btn" onClick={handleShare}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
              <polyline points="16 6 12 2 8 6" />
              <line x1="12" y1="2" x2="12" y2="15" />
            </svg>
            Share
          </button>
        </div>
        <div className="action-plan-title">{plan.title}</div>
        <div className="action-plan-subtitle">
          {completionPct > 0
            ? `${completedSteps.size}/${plan.steps.length} steps completed (${completionPct}%)`
            : `${plan.steps.length} steps to resolve your issue`}
        </div>
      </div>

      {/* Urgent banner */}
      {plan.urgent && (
        <div className="urgent-banner">
          <span className="urgent-banner-icon">⚡</span>
          <span>This situation requires <strong>immediate action</strong>. Do not delay — follow Step 1 right now.</span>
        </div>
      )}

      {/* Steps */}
      <div className="action-steps-section">
        <h3>{L(lang, 'steps')}</h3>
        {plan.steps.map((step, idx) => {
          const isCompleted = completedSteps.has(idx);
          const isExpanded = expandedSteps.has(idx);
          return (
            <div
              key={idx}
              className="action-step-item"
              style={{ '--stagger-index': idx } as React.CSSProperties}
            >
              <div className="step-connector">
                <div
                  className={`step-number-circle ${step.importance}${isCompleted ? ' completed' : ''}`}
                  onClick={() => toggleStep(idx)}
                  title={isCompleted ? 'Mark as incomplete' : 'Mark as complete'}
                >
                  {isCompleted ? '✓' : step.step_number}
                </div>
                {idx < plan.steps.length - 1 && (
                  <div className={`step-line${isCompleted ? ' completed' : ''}`} />
                )}
              </div>
              <div
                className={`action-step-card ${step.importance}${isCompleted ? ' completed' : ''}`}
                onClick={() => toggleExpand(idx)}
              >
                <div className="action-step-header">
                  <div className="action-step-title-row">
                    <button
                      className={`step-checkbox${isCompleted ? ' checked' : ''}`}
                      onClick={(e) => { e.stopPropagation(); toggleStep(idx); }}
                    >
                      {isCompleted && (
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" width="12" height="12">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      )}
                    </button>
                    <span className="action-step-title">{step.title}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span className={`importance-badge ${step.importance}`}>
                      {step.importance === 'high' ? '🔴' : step.importance === 'medium' ? '🟡' : '🟢'}
                      {step.importance}
                    </span>
                    <svg
                      className={`step-collapse-chevron${isExpanded ? ' expanded' : ''}`}
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                    >
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </div>
                </div>

                <div className={`action-step-details${isExpanded ? ' expanded' : ''}`}>
                  <div className="action-step-desc">{step.description}</div>
                  <div className="action-step-meta">
                    {step.estimated_time && (
                      <span className="step-time-chip">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="10" height="10"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
                        {step.estimated_time}
                      </span>
                    )}
                    {step.applicable_law && (
                      <span className="step-law-chip">📜 {step.applicable_law}</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Documents needed — checklist */}
      <div className="docs-section">
        <h3>{L(lang, 'docs')}</h3>
        {plan.required_documents.map((doc, i) => (
          <div key={i} className={`doc-item${checkedDocs.has(i) ? ' checked-doc' : ''}`} onClick={() => toggleDoc(i)}>
            <button
              className={`doc-checkbox${checkedDocs.has(i) ? ' checked' : ''}`}
              onClick={(e) => { e.stopPropagation(); toggleDoc(i); }}
            >
              {checkedDocs.has(i) && (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" width="10" height="10">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              )}
            </button>
            <span className="doc-text">{doc}</span>
          </div>
        ))}
      </div>

      {/* Templates */}
      {plan.templates && plan.templates.length > 0 && (
        <div className="templates-section">
          <h3>{L(lang, 'templates')}</h3>
          {plan.templates.map(tpl => (
            <div key={tpl.id} className="template-card" onClick={() => handleTemplateClick(tpl)}>
              <div className="template-icon">📋</div>
              <div className="template-body">
                <div className="template-title">{tpl.title}</div>
                <div className="template-desc">{tpl.description}</div>
              </div>
              <div className="template-download-btn">
                <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Authorities — with pill buttons */}
      {plan.authorities && plan.authorities.length > 0 && (
        <div className="authorities-section">
          <h3>{L(lang, 'authorities')}</h3>
          {plan.authorities.map((auth, i) => (
            <div key={i} className="authority-card">
              <div className="authority-card-top">
                <div className="authority-icon">🏛️</div>
                <div className="authority-body">
                  <div className="authority-name">{auth.name}</div>
                  <div className="authority-action">{auth.action}</div>
                </div>
              </div>
              <div className="authority-actions">
                {auth.helpline && (
                  <button className="authority-pill call" onClick={() => handleCallAuthority(auth)}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.56 2 2 0 0 1 3.6 1h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.91 8.6a16 16 0 0 0 6.06 6.06l.95-.95a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
                    </svg>
                    {auth.helpline}
                  </button>
                )}
                {auth.url && (
                  <a className="authority-pill visit" href={auth.url} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                      <polyline points="15 3 21 3 21 9"/>
                      <line x1="10" y1="14" x2="21" y2="3"/>
                    </svg>
                    Visit
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Disclaimer */}
      <div className="wizard-disclaimer">
        ⚖️ <strong>Disclaimer:</strong> {plan.disclaimer}
      </div>

      {/* Restart */}
      <button className="wizard-restart-btn" onClick={onRestart}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="16" height="16"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-4.5"/></svg>
        {L(lang, 'restart')}
      </button>

      {/* --- DOCUMENT GENERATOR MODAL --- */}
      {activeTemplate && (
        <div className="wizard-modal-overlay" onClick={() => setActiveTemplate(null)}>
          <div className="wizard-modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header-row">
              <h3>📝 {activeTemplate.title}</h3>
              <button className="modal-close-btn" onClick={() => setActiveTemplate(null)}>✕</button>
            </div>

            <form onSubmit={handleGenerateDoc}>
              <div className="wizard-form-grid">
                <div className="form-field-group">
                  <label>Your Full Name (Sender)</label>
                  <input type="text" value={senderName} onChange={e => setSenderName(e.target.value)} required />
                </div>
                <div className="form-field-group">
                  <label>Your Phone Number</label>
                  <input type="text" value={senderPhone} onChange={e => setSenderPhone(e.target.value)} required />
                </div>
              </div>

              <div className="form-field-group">
                <label>Your Full Postal Address</label>
                <input type="text" value={senderAddress} onChange={e => setSenderAddress(e.target.value)} required />
              </div>

              <div className="wizard-form-grid">
                <div className="form-field-group">
                  <label>Opposing Party / Company / Landlord</label>
                  <input type="text" value={recipientName} onChange={e => setRecipientName(e.target.value)} required />
                </div>
                <div className="form-field-group">
                  <label>Dispute Amount (Rs.)</label>
                  <input type="text" value={disputeAmount} onChange={e => setDisputeAmount(e.target.value)} required />
                </div>
              </div>

              <div className="form-field-group">
                <label>Opposing Party Full Address</label>
                <input type="text" value={recipientAddress} onChange={e => setRecipientAddress(e.target.value)} required />
              </div>

              <div className="form-field-group">
                <label>Dispute Summary & Key Facts</label>
                <textarea value={factsSummary} onChange={e => setFactsSummary(e.target.value)} rows={2} required />
              </div>

              <button type="submit" className="modal-action-btn" disabled={generating}>
                {generating ? 'Generating Statutory Notice...' : '⚡ Generate Official Legal Notice'}
              </button>
            </form>

            {generatedDoc && (
              <div className="generated-doc-preview animate-fade-in">
                <div className="doc-preview-header">
                  <div>
                    <h4>⚖️ Legal Notice Ready</h4>
                    <div className="doc-theme-selector">
                      <span>Theme: </span>
                      <button type="button" className={`theme-chip${docTheme === 'advocate' ? ' active' : ''}`} onClick={() => setDocTheme('advocate')}>
                        ⚖️ Advocate Chamber
                      </button>
                      <button type="button" className={`theme-chip${docTheme === 'court' ? ' active' : ''}`} onClick={() => setDocTheme('court')}>
                        📜 High Court Petition
                      </button>
                      <button type="button" className={`theme-chip${docTheme === 'corporate' ? ' active' : ''}`} onClick={() => setDocTheme('corporate')}>
                        🏢 Corporate Notice
                      </button>
                    </div>
                  </div>
                  <div className="doc-action-btns">
                    <button type="button" className="doc-download-pdf-btn" onClick={handleDownloadDirectPDF} disabled={downloadingPdf}>
                      {downloadingPdf ? '⏳ Downloading PDF...' : '📥 Download PDF File (.pdf)'}
                    </button>
                    <button type="button" className="doc-print-btn" onClick={handlePrintPDF}>
                      🖨️ Print Notice
                    </button>
                    <button type="button" className="doc-copy-btn" onClick={handleCopyDocText}>
                      📋 Copy Text
                    </button>
                  </div>
                </div>

                <div className="doc-statutory-sections">
                  <strong>Statutory Provisions Cited:</strong>
                  <div className="doc-sections-pills">
                    {generatedDoc.statutory_sections?.map((sec: string, si: number) => (
                      <span key={si} className="doc-sec-pill">📜 {sec}</span>
                    ))}
                  </div>
                </div>

                {/* --- ADVOCATE-GRADE PRINTABLE PAPER --- */}
                <div id="printable-legal-document" className={`advocate-legal-paper theme-${docTheme}`}>
                  <div className="paper-header-banner">
                    <div className="paper-emblem-wrap">
                      <span className="emblem-symbol">⚖️</span>
                      <div>
                        <div className="paper-chamber-title">CHAMBERS OF ADVOCATES & LEGAL COUNSEL</div>
                        <div className="paper-chamber-sub">HIGH COURT & SUPREME COURT JURISDICTION</div>
                      </div>
                    </div>
                    <div className="paper-meta">
                      <div><strong>DATE:</strong> {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
                      <div><strong>REF NO:</strong> LA/NOT/{new Date().getFullYear()}/782</div>
                      <div className="paper-mode-pill">REGISTERED LEGAL TRANSMISSION</div>
                    </div>
                  </div>

                  <h2 className="paper-legal-title">{generatedDoc.title}</h2>

                  <div className="paper-statutory-box">
                    <strong>STATUTORY ACTS & SECTIONS CITED:</strong> {generatedDoc.statutory_sections?.join(' • ')}
                  </div>

                  <div className="paper-body-content">
                    {generatedDoc.document_text?.split('\n\n').map((paragraph: string, pi: number) => {
                      const trimmed = paragraph.trim();
                      if (!trimmed) return null;
                      return (
                        <p key={pi} className="paper-paragraph">
                          {trimmed.split('\n').map((line, li) => (
                            <React.Fragment key={li}>
                              {line}
                              {li < trimmed.split('\n').length - 1 && <br />}
                            </React.Fragment>
                          ))}
                        </p>
                      );
                    })}
                  </div>

                  {/* FINANCIAL BREAKDOWN TABLE */}
                  {generatedDoc.financial_breakdown && (
                    <div className="financial-claim-table-wrap">
                      <h4 className="financial-table-heading">ITEMIZED FINANCIAL CLAIM BREAKDOWN</h4>
                      <table className="financial-claim-table">
                        <thead>
                          <tr>
                            <th>Head of Claim / Statutory Remedy</th>
                            <th>Statutory Ground</th>
                            <th className="text-right">Amount (₹)</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td>Principal Dispute Amount / Unpaid Deposit</td>
                            <td>Primary Contractual Obligation</td>
                            <td className="text-right">₹{generatedDoc.financial_breakdown.principal?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                          </tr>
                          <tr>
                            <td>Statutory Interest @ 12% p.a.</td>
                            <td>Section 73, Indian Contract Act</td>
                            <td className="text-right">₹{generatedDoc.financial_breakdown.interest?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                          </tr>
                          <tr>
                            <td>Compensation for Mental Harassment & Legal Notice Charges</td>
                            <td>Tortious Damages & Statutory Costs</td>
                            <td className="text-right">₹{generatedDoc.financial_breakdown.damages?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                          </tr>
                          <tr className="total-row">
                            <td colSpan={2}><strong>TOTAL LEGAL DEMAND AMOUNT PAYABLE</strong></td>
                            <td className="text-right"><strong>₹{generatedDoc.financial_breakdown.total_claim?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong></td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* VERIFICATION AFFIDAVIT STAMP */}
                  <div className="paper-verification-box">
                    <div className="verification-stamp-title">📜 VERIFICATION & AFFIDAVIT</div>
                    <p className="verification-text">
                      {generatedDoc.verification_affidavit || `I, ${senderName}, residing at ${senderAddress}, do hereby verify that the facts stated above are true and correct to the best of my knowledge.`}
                    </p>
                    <div className="verification-footer">
                      <div>
                        <strong>DEPONENT / COMPLAINANT:</strong> ___________________________
                      </div>
                      <div className="seal-placeholder">
                        <span>OFFICIAL LEGAL SEAL</span>
                        <span>BAR REG: D/1829/2018</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Main WizardScreen ────────────────────────────────────────────────────────
interface WizardScreenProps {
  userId: string;
  onBackHome?: () => void;
}

export const WizardScreen: React.FC<WizardScreenProps> = ({ userId, onBackHome }) => {
  const [lang, setLang] = useState<Lang>('en');
  const [screen, setScreen] = useState<Screen>('categories');
  const [prevScreen, setPrevScreen] = useState<Screen>('categories');
  const [categories, setCategories] = useState<Category[]>([]);
  const [scenarios, setScenarios] = useState<ScenarioSummary[]>([]);
  const [selectedCat, setSelectedCat] = useState<Category | null>(null);
  const [currentScenario, setCurrentScenario] = useState<Scenario | null>(null);
  const [currentPlan, setCurrentPlan] = useState<ActionPlan | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [transitionKey, setTransitionKey] = useState(0);

  const { toasts, showToast, dismissToast } = useToast();

  // Determine if navigating "back" for slide direction
  const screenOrder: Screen[] = ['categories', 'scenarios', 'questions', 'plan'];
  const isBack = screenOrder.indexOf(screen) < screenOrder.indexOf(prevScreen);

  const navigateTo = (next: Screen) => {
    setPrevScreen(screen);
    setScreen(next);
    setTransitionKey(k => k + 1);
  };

  // Load categories (with offline fallback)
  useEffect(() => {
    setCategoriesLoading(true);
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      try {
        setCategories(JSON.parse(cached).categories || []);
        setCategoriesLoading(false);
      } catch {}
    }
    fetch(`${BACKEND}/categories`)
      .then(r => r.json())
      .then(d => {
        setCategories(d.categories || []);
        localStorage.setItem(CACHE_KEY, JSON.stringify(d));
      })
      .catch(() => {})
      .finally(() => setCategoriesLoading(false));
  }, []);

  const loadScenarios = async (cat: Category) => {
    setSelectedCat(cat);
    setLoading(true);
    navigateTo('scenarios');
    try {
      const res = await fetch(`${BACKEND}/scenarios/${cat.id}`);
      const d = await res.json();
      setScenarios(d.scenarios || []);
    } catch {
      setScenarios([]);
      showToast('error', 'Could not load scenarios. Check your connection.');
    } finally {
      setLoading(false);
    }
  };

  const loadScenario = async (s: ScenarioSummary) => {
    setLoading(true);
    try {
      const res = await fetch(`${BACKEND}/scenario/${s.scenario_id}`);
      const d = await res.json();
      setCurrentScenario(d);
      navigateTo('questions');
    } catch {
      showToast('error', 'Could not load scenario. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  const handleAnswersComplete = async (answers: Record<string, string>) => {
    if (!currentScenario) return;
    setLoading(true);
    try {
      const res = await fetch(`${BACKEND}/quick-plan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scenario_id: currentScenario.scenario_id, answers }),
      });
      const plan = await res.json();
      setCurrentPlan(plan);
      navigateTo('plan');
    } catch {
      showToast('error', 'Could not generate plan. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const loadHistory = async () => {
    navigateTo('history');
    try {
      const res = await fetch(`${BACKEND}/history/${userId}`);
      const d = await res.json();
      setHistory(d.sessions || []);
    } catch { setHistory([]); }
  };

  const restart = () => {
    navigateTo('categories');
    setCurrentPlan(null);
    setCurrentScenario(null);
    setSelectedCat(null);
  };

  const catColor = selectedCat ? (CATEGORY_COLORS[selectedCat.id] || '#4f46e5') : '#4f46e5';

  return (
    <div className="wizard-screen">
      {/* Toast notifications */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

      {/* ─── CATEGORIES SCREEN ─── */}
      {screen === 'categories' && (
        <div key={`cat-${transitionKey}`} className={`wizard-transition-wrapper${isBack ? ' slide-back' : ''}`}>
          <div className="wizard-header">
            <div className="wizard-header-row">
              <div className="wizard-header-left">
                {onBackHome && (
                  <button onClick={onBackHome} className="wizard-back-icon-btn" title="Back to Home">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="20" height="20">
                      <polyline points="15 18 9 12 15 6" />
                    </svg>
                  </button>
                )}
                <div>
                  <h1>What Should I Do?</h1>
                  <p>Tell us what happened — we'll guide you step by step</p>
                </div>
              </div>
              <button onClick={loadHistory} className="wizard-history-btn">
                📋 History
              </button>
            </div>
          </div>

          {/* Language switcher */}
          <div className="lang-switcher">
            {(['en', 'ta', 'hi'] as Lang[]).map(l => (
              <button key={l} className={`lang-btn${lang === l ? ' active' : ''}`} onClick={() => setLang(l)}>
                {LANG_LABELS[l].name}
              </button>
            ))}
          </div>

          <div className="wizard-section-label">{L(lang, 'categories')}</div>

          {categoriesLoading ? (
            <SkeletonCategoryGrid />
          ) : (
            <div className="wizard-category-grid">
              {categories.map((cat, i) => (
                <CategoryCard key={cat.id} cat={cat} lang={lang} onClick={() => loadScenarios(cat)} index={i} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─── SCENARIOS SCREEN ─── */}
      {screen === 'scenarios' && selectedCat && (
        <div key={`scn-${transitionKey}`} className={`wizard-transition-wrapper${isBack ? ' slide-back' : ''}`}>
          <button className="wizard-back-btn" onClick={() => navigateTo('categories')}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6" /></svg>
            {getLabel(selectedCat, 'name', lang)}
          </button>

          <div className="scenario-list-label">{L(lang, 'choose')}</div>

          {loading ? (
            <SkeletonScenarioCards />
          ) : scenarios.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>
              </div>
              <h3>No situations found</h3>
              <p>No scenarios available for this category yet.</p>
            </div>
          ) : (
            <div className="scenario-list">
              {scenarios.map((s, i) => (
                <ScenarioCard key={s.scenario_id} s={s} lang={lang} onClick={() => loadScenario(s)} index={i} catColor={catColor} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─── QUESTION FLOW SCREEN ─── */}
      {screen === 'questions' && currentScenario && (
        <div key={`q-${transitionKey}`} className="wizard-transition-wrapper">
          {loading ? (
            <div className="loading-spinner"><div className="spinner-ring" /> Generating plan...</div>
          ) : (
            <QuestionFlow
              scenario={currentScenario}
              lang={lang}
              onComplete={handleAnswersComplete}
              onBack={() => navigateTo('scenarios')}
            />
          )}
        </div>
      )}

      {/* ─── ACTION PLAN SCREEN ─── */}
      {screen === 'plan' && currentPlan && (
        <div key={`plan-${transitionKey}`} className="wizard-transition-wrapper">
          <ActionPlanView
            plan={currentPlan}
            scenarioTitle={currentScenario?.title || ''}
            lang={lang}
            onRestart={restart}
            showToast={showToast}
          />
        </div>
      )}

      {/* ─── HISTORY SCREEN ─── */}
      {screen === 'history' && (
        <div key={`hist-${transitionKey}`} className={`wizard-transition-wrapper${isBack ? ' slide-back' : ''}`}>
          <button className="wizard-back-btn" onClick={() => navigateTo('categories')}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6" /></svg>
            Back
          </button>
          <div className="wizard-history-label">{L(lang, 'history')}</div>
          <div className="wizard-history">
            {history.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                </div>
                <h3>No history yet</h3>
                <p>Complete a wizard flow and your cases will appear here.</p>
              </div>
            ) : (
              history.map((session: any, i: number) => (
                <div key={session.id || i} className="history-item" style={{ '--stagger-index': i } as React.CSSProperties}>
                  <div className="history-timeline">
                    <div className="history-dot" />
                    {i < history.length - 1 && <div className="history-line" />}
                  </div>
                  <div className="history-card">
                    <div className="history-icon">⚖️</div>
                    <div className="history-body">
                      <div className="history-title">
                        {session.scenario_id?.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())}
                      </div>
                      <div className="history-meta">
                        {session.created_at ? timeAgo(session.created_at) : 'Unknown date'}
                      </div>
                    </div>
                    <div className="history-badge">Done ✓</div>
                  </div>
                </div>
              ))
            )}
          </div>
          <button className="wizard-restart-btn" onClick={() => navigateTo('categories')}>
            + Start a New Situation
          </button>
        </div>
      )}
    </div>
  );
};

export default WizardScreen;
