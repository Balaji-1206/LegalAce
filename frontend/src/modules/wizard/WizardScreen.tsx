import React, { useState, useEffect, useCallback } from 'react';
import './wizard.css';

const BACKEND = 'http://localhost:8000/api/v1/wizard';
const CACHE_KEY = 'wizard_offline_cache';

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

// ─── Category Card ────────────────────────────────────────────────────────────
const CategoryCard: React.FC<{ cat: Category; lang: Lang; onClick: () => void }> = ({ cat, lang, onClick }) => (
  <div className={`category-card ${cat.id}`} onClick={onClick} style={{ borderColor: 'transparent' }}>
    <div className="category-card-icon">{cat.icon}</div>
    <div>
      <div className="category-card-name">{getLabel(cat, 'name', lang)}</div>
      <div className="category-card-count">{cat.scenario_count} situations</div>
    </div>
  </div>
);

// ─── Scenario Card ────────────────────────────────────────────────────────────
const ScenarioCard: React.FC<{ s: ScenarioSummary; lang: Lang; onClick: () => void }> = ({ s, lang, onClick }) => (
  <div className="scenario-card" onClick={onClick}>
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

  const questions = scenario.questions;
  const q = questions[currentIdx];
  const progress = ((currentIdx) / questions.length) * 100;

  const handleAnswer = (value: string) => {
    setSelected(value);
    const newAnswers = { ...answers, [q.id]: value };
    setTimeout(() => {
      setAnswers(newAnswers);
      setSelected(null);
      if (currentIdx + 1 >= questions.length) {
        onComplete(newAnswers);
      } else {
        setCurrentIdx(i => i + 1);
      }
    }, 300);
  };

  return (
    <div className="question-flow">
      {/* Back */}
      <button className="wizard-back-btn" onClick={currentIdx === 0 ? onBack : () => setCurrentIdx(i => i - 1)}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6" /></svg>
        {currentIdx === 0 ? 'Back to situations' : 'Previous question'}
      </button>

      {/* Progress bar */}
      <div className="question-progress-bar">
        <div className="question-progress-fill" style={{ width: `${progress}%` }} />
      </div>

      <div className="question-body">
        <div className="question-step-label">Question {currentIdx + 1} of {questions.length}</div>
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
  onRestart: () => void;
}

const ActionPlanView: React.FC<ActionPlanViewProps> = ({ plan, scenarioTitle, onRestart }) => {
  const handleTemplateClick = (tpl: Template) => {
    alert(`📝 ${tpl.title}\n\n${tpl.description}\n\n(Template generation coming soon — this will generate a PDF download or share via WhatsApp)`);
  };

  const handleCallAuthority = (auth: Authority) => {
    if (auth.helpline) {
      window.location.href = `tel:${auth.helpline}`;
    }
  };

  return (
    <div className="action-plan-screen">
      {/* Hero header */}
      <div className="action-plan-hero">
        <div className="action-plan-hero-badge">⚖️ Your Action Plan Ready</div>
        <div className="action-plan-title">{plan.title}</div>
        <div className="action-plan-subtitle">{plan.steps.length} steps to resolve your issue</div>
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
        <h3>{L('en', 'steps')}</h3>
        {plan.steps.map((step, idx) => (
          <div key={idx} className="action-step-item">
            <div className="step-connector">
              <div className={`step-number-circle ${step.importance}`}>{step.step_number}</div>
              {idx < plan.steps.length - 1 && <div className="step-line" />}
            </div>
            <div className={`action-step-card ${step.importance}`}>
              <div className="action-step-title">{step.title}</div>
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
        ))}
      </div>

      {/* Documents needed */}
      <div className="docs-section">
        <h3>📄 Documents Needed</h3>
        {plan.required_documents.map((doc, i) => (
          <div key={i} className="doc-item">{doc}</div>
        ))}
      </div>

      {/* Templates */}
      {plan.templates && plan.templates.length > 0 && (
        <div className="templates-section" style={{ padding: '0 16px', marginTop: 12 }}>
          <h3>📝 Download Templates</h3>
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

      {/* Authorities */}
      {plan.authorities && plan.authorities.length > 0 && (
        <div className="authorities-section" style={{ padding: '0 16px', marginTop: 12 }}>
          <h3>🏛️ Where to Complain</h3>
          {plan.authorities.map((auth, i) => (
            <div key={i} className="authority-card" onClick={() => handleCallAuthority(auth)} style={{ cursor: auth.helpline ? 'pointer' : 'default' }}>
              <div className="authority-icon">🏛️</div>
              <div className="authority-body">
                <div className="authority-name">{auth.name}</div>
                <div className="authority-action">{auth.action}</div>
                {auth.helpline && (
                  <div className="authority-helpline">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="12" height="12"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.56 2 2 0 0 1 3.6 1h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.91 8.6a16 16 0 0 0 6.06 6.06l.95-.95a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                    {auth.helpline}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Disclaimer */}
      <div className="wizard-disclaimer" style={{ margin: '12px 16px' }}>
        ⚖️ <strong>Disclaimer:</strong> {plan.disclaimer}
      </div>

      {/* Restart */}
      <button className="wizard-restart-btn" onClick={onRestart}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="16" height="16"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-4.5"/></svg>
        Try Another Situation
      </button>
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
  const [categories, setCategories] = useState<Category[]>([]);
  const [scenarios, setScenarios] = useState<ScenarioSummary[]>([]);
  const [selectedCat, setSelectedCat] = useState<Category | null>(null);
  const [currentScenario, setCurrentScenario] = useState<Scenario | null>(null);
  const [currentPlan, setCurrentPlan] = useState<ActionPlan | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Load categories (with offline fallback)
  useEffect(() => {
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      try { setCategories(JSON.parse(cached).categories || []); } catch {}
    }
    fetch(`${BACKEND}/categories`)
      .then(r => r.json())
      .then(d => {
        setCategories(d.categories || []);
        localStorage.setItem(CACHE_KEY, JSON.stringify(d));
      })
      .catch(() => {});
  }, []);

  const loadScenarios = async (cat: Category) => {
    setSelectedCat(cat);
    setLoading(true);
    try {
      const res = await fetch(`${BACKEND}/scenarios/${cat.id}`);
      const d = await res.json();
      setScenarios(d.scenarios || []);
    } catch {
      setScenarios([]);
    } finally {
      setLoading(false);
      setScreen('scenarios');
    }
  };

  const loadScenario = async (s: ScenarioSummary) => {
    setLoading(true);
    try {
      const res = await fetch(`${BACKEND}/scenario/${s.scenario_id}`);
      const d = await res.json();
      setCurrentScenario(d);
      setScreen('questions');
    } catch {
      alert('Could not load scenario. Please check your connection.');
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
      setScreen('plan');
    } catch {
      alert('Could not generate plan. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const loadHistory = async () => {
    setScreen('history');
    try {
      const res = await fetch(`${BACKEND}/history/${userId}`);
      const d = await res.json();
      setHistory(d.sessions || []);
    } catch { setHistory([]); }
  };

  const restart = () => {
    setScreen('categories');
    setCurrentPlan(null);
    setCurrentScenario(null);
    setSelectedCat(null);
  };

  return (
    <div className="wizard-screen animate-fade-in">
      {/* ─── CATEGORIES SCREEN ─── */}
      {screen === 'categories' && (
        <>
          <div className="wizard-header">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                {onBackHome && (
                  <button onClick={onBackHome} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', color: '#1a1a5e', marginTop: 4 }} title="Back to Home">
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
              <button
                onClick={loadHistory}
                style={{ background: 'none', border: '1.5px solid #e8eaf0', borderRadius: 12, padding: '8px 12px', fontSize: 12, fontWeight: 600, color: '#6b7280', cursor: 'pointer', fontFamily: 'inherit' }}
              >
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

          <div style={{ padding: '0 16px 10px', fontSize: 13, fontWeight: 700, color: '#374151' }}>
            {L(lang, 'categories')}
          </div>

          <div className="wizard-category-grid">
            {categories.map(cat => (
              <CategoryCard key={cat.id} cat={cat} lang={lang} onClick={() => loadScenarios(cat)} />
            ))}
          </div>
        </>
      )}

      {/* ─── SCENARIOS SCREEN ─── */}
      {screen === 'scenarios' && selectedCat && (
        <>
          <button className="wizard-back-btn" onClick={() => setScreen('categories')}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6" /></svg>
            {getLabel(selectedCat, 'name', lang)}
          </button>

          <div style={{ padding: '0 16px 14px', fontSize: 14, color: '#6b7280' }}>{L(lang, 'choose')}</div>

          <div className="scenario-list">
            {loading ? (
              <div className="loading-spinner"><div className="spinner-ring" /> Loading...</div>
            ) : scenarios.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>
                </div>
                <h3>No situations found</h3>
                <p>No scenarios available for this category yet.</p>
              </div>
            ) : (
              scenarios.map(s => (
                <ScenarioCard key={s.scenario_id} s={s} lang={lang} onClick={() => loadScenario(s)} />
              ))
            )}
          </div>
        </>
      )}

      {/* ─── QUESTION FLOW SCREEN ─── */}
      {screen === 'questions' && currentScenario && (
        loading ? (
          <div className="loading-spinner"><div className="spinner-ring" /> Generating plan...</div>
        ) : (
          <QuestionFlow
            scenario={currentScenario}
            lang={lang}
            onComplete={handleAnswersComplete}
            onBack={() => setScreen('scenarios')}
          />
        )
      )}

      {/* ─── ACTION PLAN SCREEN ─── */}
      {screen === 'plan' && currentPlan && (
        <ActionPlanView
          plan={currentPlan}
          scenarioTitle={currentScenario?.title || ''}
          onRestart={restart}
        />
      )}

      {/* ─── HISTORY SCREEN ─── */}
      {screen === 'history' && (
        <>
          <button className="wizard-back-btn" onClick={() => setScreen('categories')}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6" /></svg>
            Back
          </button>
          <div style={{ padding: '0 16px 14px', fontSize: 18, fontWeight: 700, color: '#111827' }}>My Past Cases</div>
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
              history.map((session: any) => (
                <div key={session.id} className="history-item">
                  <div className="history-icon">⚖️</div>
                  <div className="history-body">
                    <div className="history-title">{session.scenario_id?.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())}</div>
                    <div className="history-meta">{new Date(session.created_at).toLocaleDateString('en-IN')}</div>
                  </div>
                  <div className="history-badge">Done ✓</div>
                </div>
              ))
            )}
          </div>
          <button className="wizard-restart-btn" onClick={() => setScreen('categories')}>
            + Start a New Situation
          </button>
        </>
      )}
    </div>
  );
};

export default WizardScreen;
