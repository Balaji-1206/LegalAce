import React, { useState, useEffect, useRef } from 'react';
import './SpotlightSearchModal.css';

interface SituationItem {
  situation_id: string;
  title: string;
  category: string;
  description?: string;
  [key: string]: unknown;
}

interface SpotlightSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  situations: SituationItem[];
  onSelectSituation: (id: string) => void;
  onNavigateTool: (tab: string) => void;
}

const TRENDING_TOPICS = [
  { label: 'Salary Not Paid', query: 'salary', icon: '💼' },
  { label: 'Tenant Security Deposit', query: 'deposit', icon: '🏠' },
  { label: 'Cheque Bounce Sec 138', query: 'cheque', icon: '💳' },
  { label: 'Cyber Fraud Helpline 1930', query: 'cyber', icon: '🛡️' },
  { label: 'Defective Product Return', query: 'consumer', icon: '🛒' },
  { label: 'Police FIR & Arrest Rights', query: 'police', icon: '🚓' },
  { label: 'RERA Builder Delay', query: 'builder', icon: '🏢' },
];

export const SpotlightSearchModal: React.FC<SpotlightSearchModalProps> = ({
  isOpen,
  onClose,
  situations,
  onSelectSituation,
  onNavigateTool,
}) => {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 80);
    } else {
      setQuery('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const normalizedQuery = query.trim().toLowerCase();

  const filteredSituations = normalizedQuery
    ? situations.filter(s =>
        s.title.toLowerCase().includes(normalizedQuery) ||
        (s.description && s.description.toLowerCase().includes(normalizedQuery)) ||
        s.category.toLowerCase().includes(normalizedQuery)
      )
    : [];

  return (
    <div className="spotlight-overlay" onClick={onClose}>
      <div className="spotlight-card" onClick={e => e.stopPropagation()}>
        {/* Search Input Bar */}
        <div className="spotlight-input-bar">
          <div className="spotlight-search-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="20" height="20">
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
          </div>
          <input
            ref={inputRef}
            type="text"
            className="spotlight-input"
            placeholder="Search situations, laws, or topics..."
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
          {query && (
            <button className="spotlight-clear-btn" onClick={() => setQuery('')} title="Clear search">
              ×
            </button>
          )}
          <button className="spotlight-close-btn" onClick={onClose}>
            Cancel
          </button>
        </div>

        {/* Spotlight Body */}
        <div className="spotlight-body">
          {/* Results List */}
          {normalizedQuery ? (
            <div>
              <div className="spotlight-section-title">
                <span>Matching Legal Situations ({filteredSituations.length})</span>
              </div>
              {filteredSituations.length > 0 ? (
                <div className="spotlight-results-list">
                  {filteredSituations.map(sit => (
                    <div
                      key={sit.situation_id}
                      className="spotlight-result-row"
                      onClick={() => {
                        onSelectSituation(sit.situation_id);
                        onClose();
                      }}
                    >
                      <div className="spotlight-result-main">
                        <span className={`spotlight-result-tag ${sit.category || 'general'}`}>
                          {sit.category || 'General'}
                        </span>
                        <div className="spotlight-result-title">{sit.title}</div>
                        {sit.description && (
                          <div className="spotlight-result-desc">{sit.description}</div>
                        )}
                      </div>
                      <div className="spotlight-result-arrow">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="16" height="16">
                          <polyline points="9 18 15 12 9 6" />
                        </svg>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="spotlight-empty-state">
                  <div className="icon">🔍</div>
                  <h4>No matching situations found</h4>
                  <p>Try searching for a different keyword or browse trending legal topics below.</p>
                </div>
              )}
            </div>
          ) : (
            <>
              {/* Trending Topics */}
              <div className="spotlight-section-title">
                <span>🔥 Trending Legal Inquiries</span>
              </div>
              <div className="spotlight-trending-grid">
                {TRENDING_TOPICS.map(item => (
                  <button
                    key={item.label}
                    className="spotlight-trend-chip"
                    onClick={() => setQuery(item.query)}
                  >
                    <span>{item.icon}</span>
                    <span>{item.label}</span>
                  </button>
                ))}
              </div>

              {/* Quick AI Tools */}
              <div className="spotlight-section-title">
                <span>⚡ Quick Legal Tools</span>
              </div>
              <div className="spotlight-tools-grid">
                <div
                  className="spotlight-tool-card"
                  onClick={() => { onNavigateTool('xray'); onClose(); }}
                >
                  <div className="spotlight-tool-icon" style={{ background: '#eef2ff', color: '#4f46e5' }}>
                    📄
                  </div>
                  <div className="spotlight-tool-info">
                    <strong>Document X-Ray</strong>
                    <span>AI doc analysis</span>
                  </div>
                </div>

                <div
                  className="spotlight-tool-card"
                  onClick={() => { onNavigateTool('legalaid'); onClose(); }}
                >
                  <div className="spotlight-tool-icon" style={{ background: '#ecfdf5', color: '#059669' }}>
                    🏛️
                  </div>
                  <div className="spotlight-tool-info">
                    <strong>Free Legal Aid</strong>
                    <span>DLSA eligibility</span>
                  </div>
                </div>

                <div
                  className="spotlight-tool-card"
                  onClick={() => { onNavigateTool('wizard'); onClose(); }}
                >
                  <div className="spotlight-tool-icon" style={{ background: '#f5f3ff', color: '#7c3aed' }}>
                    ⚡
                  </div>
                  <div className="spotlight-tool-info">
                    <strong>Notice Wizard</strong>
                    <span>Draft legal notices</span>
                  </div>
                </div>

                <div
                  className="spotlight-tool-card"
                  onClick={() => { onNavigateTool('deadlines'); onClose(); }}
                >
                  <div className="spotlight-tool-icon" style={{ background: '#fffbeb', color: '#d97706' }}>
                    📅
                  </div>
                  <div className="spotlight-tool-info">
                    <strong>Legal Monitor</strong>
                    <span>Deadlines & alerts</span>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
