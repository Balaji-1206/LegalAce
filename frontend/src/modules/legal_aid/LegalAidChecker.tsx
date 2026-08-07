import React, { useState } from 'react';
import './legal_aid.css';

const BACKEND_URL = 'http://localhost:8000';

interface Authority {
  name: string;
  authority_type: string;
  state: string;
  district: string;
  address: string;
  phone: string;
  email: string;
  website: string;
}

interface EligibilityResult {
  eligible: boolean;
  qualifying_categories: string[];
  reasons: string[];
  suggested_authority: string | null;
  statutory_basis: string;
  disclaimer: string;
}

const CATEGORY_OPTIONS = [
  { id: 'sc_st', label: 'SC / ST', icon: '🏛️' },
  { id: 'woman_child', label: 'Woman / Child', icon: '👩' },
  { id: 'disabled', label: 'Person with Disability', icon: '♿' },
  { id: 'industrial_workman', label: 'Industrial Workman', icon: '🔧' },
  { id: 'custody', label: 'In Custody', icon: '🔒' },
  { id: 'trafficking_victim', label: 'Trafficking Victim', icon: '🛡️' },
  { id: 'mass_disaster', label: 'Disaster / Violence', icon: '🌊' },
  { id: 'income_below', label: 'Low Income (< ₹3L)', icon: '💰' },
];

const INDIAN_STATES = [
  'Karnataka', 'Maharashtra', 'Delhi (NCR)', 'Tamil Nadu', 'Telangana',
  'Uttar Pradesh', 'West Bengal', 'Gujarat', 'Kerala', 'Punjab', 'Other / Central',
];

interface LegalAidCheckerProps {
  onBack: () => void;
}

export const LegalAidChecker: React.FC<LegalAidCheckerProps> = ({ onBack }) => {
  const [annualIncome, setAnnualIncome] = useState<string>('');
  const [state, setState] = useState<string>('Karnataka');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [result, setResult] = useState<EligibilityResult | null>(null);
  const [authorities, setAuthorities] = useState<Authority[]>([]);
  const [showResult, setShowResult] = useState(false);

  const toggleCategory = (id: string) => {
    setSelectedCategories(prev =>
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    );
  };

  const handleCheckEligibility = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/v1/legal-aid/check-eligibility`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          annual_income: parseInt(annualIncome) || 0,
          state,
          category_flags: selectedCategories,
        }),
      });
      if (res.ok) {
        const data: EligibilityResult = await res.json();
        setResult(data);
        setShowResult(true);

        // Fetch authorities for the state
        const authRes = await fetch(
          `${BACKEND_URL}/api/v1/legal-aid/nearest-authority?state=${encodeURIComponent(state)}`
        );
        if (authRes.ok) {
          const authData = await authRes.json();
          setAuthorities(authData.authorities || []);
        }
      }
    } catch {
      setResult({
        eligible: false,
        qualifying_categories: [],
        reasons: ['❌ Could not connect to server. Please try again.'],
        suggested_authority: 'NALSA Helpline: 15100',
        statutory_basis: '',
        disclaimer: '',
      });
      setShowResult(true);
    }
  };

  const resetForm = () => {
    setShowResult(false);
    setResult(null);
    setAuthorities([]);
  };

  return (
    <div className="legalaid-screen">
      <button className="legalaid-back-btn" onClick={onBack}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <polyline points="15 18 9 12 15 6" />
        </svg>
        Back
      </button>

      <div className="legalaid-header">
        <h2>⚖️ Free Legal Aid Checker</h2>
        <p>Check eligibility under Legal Services Authorities Act, 1987</p>
      </div>

      {/* ─── Eligibility Form ─── */}
      {!showResult && (
        <div className="legalaid-form">
          <div className="legalaid-field">
            <label>📍 Your State</label>
            <select value={state} onChange={(e) => setState(e.target.value)}>
              {INDIAN_STATES.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          <div className="legalaid-field">
            <label>💰 Annual Household Income (₹)</label>
            <input
              type="number"
              placeholder="e.g. 200000"
              value={annualIncome}
              onChange={(e) => setAnnualIncome(e.target.value)}
            />
          </div>

          <div className="legalaid-categories-title">
            🏛️ Select applicable categories (if any)
          </div>
          <div className="legalaid-category-grid">
            {CATEGORY_OPTIONS.map(cat => (
              <button
                key={cat.id}
                className={`legalaid-cat-btn${selectedCategories.includes(cat.id) ? ' selected' : ''}`}
                onClick={() => toggleCategory(cat.id)}
              >
                <div className="legalaid-cat-check">
                  {selectedCategories.includes(cat.id) && (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" width="12" height="12">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </div>
                {cat.icon} {cat.label}
              </button>
            ))}
          </div>

          <button className="legalaid-submit-btn" onClick={handleCheckEligibility}>
            🔍 Check Eligibility
          </button>
        </div>
      )}

      {/* ─── Results ─── */}
      {showResult && result && (
        <div className="legalaid-result">
          {/* Banner */}
          <div className={`legalaid-result-banner ${result.eligible ? 'eligible' : 'ineligible'}`}>
            <div className="legalaid-result-emoji">
              {result.eligible ? '✅' : '❌'}
            </div>
            <div className="legalaid-result-title">
              {result.eligible ? 'You May Qualify for Free Legal Aid!' : 'Not Eligible Based on Current Information'}
            </div>
            <div className="legalaid-result-subtitle">
              {result.statutory_basis}
            </div>
          </div>

          {/* Reasons */}
          <div className="legalaid-reasons-card">
            <div className="legalaid-reasons-title">
              {result.eligible ? '✅ Qualifying Criteria' : '📋 Assessment Details'}
            </div>
            {result.reasons.map((r, i) => (
              <div key={i} className="legalaid-reason-item">{r}</div>
            ))}
          </div>

          {/* Authority Directory */}
          {result.eligible && authorities.length > 0 && (
            <>
              <div className="legalaid-reasons-card">
                <div className="legalaid-reasons-title">🏛️ Contact Your Nearest Legal Services Authority</div>

                {authorities.map((auth, i) => (
                  <div key={i} className="legalaid-authority-card">
                    <div className="legalaid-auth-name">{auth.name}</div>
                    <span className="legalaid-auth-type">{auth.authority_type}</span>

                    {auth.address && (
                      <div className="legalaid-auth-detail">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                          <circle cx="12" cy="10" r="3" />
                        </svg>
                        {auth.address}
                      </div>
                    )}

                    {auth.phone && (
                      <div className="legalaid-auth-detail">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.362 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.338 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
                        </svg>
                        {auth.phone}
                      </div>
                    )}

                    {auth.email && (
                      <div className="legalaid-auth-detail">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <rect x="2" y="4" width="20" height="16" rx="2" />
                          <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                        </svg>
                        {auth.email}
                      </div>
                    )}

                    <div className="legalaid-auth-actions">
                      {auth.phone && (
                        <a href={`tel:${auth.phone}`} className="legalaid-call-btn" style={{ textDecoration: 'none' }}>
                          📞 Call Now
                        </a>
                      )}
                      {auth.website && (
                        <a href={auth.website} target="_blank" rel="noopener noreferrer" className="legalaid-web-btn" style={{ textDecoration: 'none' }}>
                          🌐 Website
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          <button className="legalaid-reset-btn" onClick={resetForm}>
            ← Check Again with Different Information
          </button>

          <p className="legalaid-disclaimer">
            {result.disclaimer || 'Eligibility is indicative based on self-reported data. Final determination is made by the Legal Services Authority.'}
          </p>
        </div>
      )}
    </div>
  );
};

export default LegalAidChecker;
