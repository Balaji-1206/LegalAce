import React from 'react';

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
}

// Category icon SVG renderer
const CatSVG: React.FC<{ id: string }> = ({ id }) => {
  const iconMap: Record<string, React.ReactNode> = {
    employment: (
      <svg viewBox="0 0 24 24" fill="none" stroke="#4f46e5" strokeWidth="1.8" width="26" height="26">
        <rect x="2" y="7" width="20" height="14" rx="2" />
        <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
        <line x1="12" y1="12" x2="12" y2="16" /><line x1="10" y1="14" x2="14" y2="14" />
      </svg>
    ),
    housing: (
      <svg viewBox="0 0 24 24" fill="none" stroke="#4f46e5" strokeWidth="1.8" width="26" height="26">
        <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    ),
    consumer: (
      <svg viewBox="0 0 24 24" fill="none" stroke="#4f46e5" strokeWidth="1.8" width="26" height="26">
        <circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" />
        <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
      </svg>
    ),
    cyber_crime: (
      <svg viewBox="0 0 24 24" fill="none" stroke="#4f46e5" strokeWidth="1.8" width="26" height="26">
        <rect x="2" y="3" width="20" height="14" rx="2" /><path d="M8 21h8M12 17v4" />
        <path d="M9 8l2 2 4-4" />
      </svg>
    ),
    women_rights: (
      <svg viewBox="0 0 24 24" fill="none" stroke="#4f46e5" strokeWidth="1.8" width="26" height="26">
        <circle cx="12" cy="8" r="4" />
        <path d="M12 12v8M9 18h6" />
      </svg>
    ),
    banking: (
      <svg viewBox="0 0 24 24" fill="none" stroke="#4f46e5" strokeWidth="1.8" width="26" height="26">
        <line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
      </svg>
    ),
    traffic: (
      <svg viewBox="0 0 24 24" fill="none" stroke="#4f46e5" strokeWidth="1.8" width="26" height="26">
        <path d="M5 17H3a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v9a2 2 0 0 1-2 2h-2" />
        <circle cx="9" cy="17" r="2" /><circle cx="17" cy="17" r="2" />
      </svg>
    ),
    education: (
      <svg viewBox="0 0 24 24" fill="none" stroke="#4f46e5" strokeWidth="1.8" width="26" height="26">
        <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
        <path d="M6 12v5c3 3 9 3 12 0v-5" />
      </svg>
    ),
    bookmarks: (
      <svg viewBox="0 0 24 24" fill="none" stroke="#4f46e5" strokeWidth="1.8" width="26" height="26">
        <path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z" />
      </svg>
    ),
  };
  return <>{iconMap[id] || iconMap.bookmarks}</>;
};

const SitItemIcon: React.FC<{ category: string }> = ({ category }) => (
  <div className="sit-item-icon">
    <CatSVG id={category} />
  </div>
);

export const SituationFinderTab: React.FC<SituationFinderTabProps> = ({
  screen,
  setScreen,
  categories,
  situations,
  bookmarks,
  recentlyViewed,
  selectedCategory,
  setSelectedCategory,
  selectedSituation,
  openSituationDetail,
  toggleBookmark,
  getCategoryIcon,
  searchQuery,
  setSearchQuery,
  situationsLoading,
  filteredSituations,
  LAW_DETAILS_MAP,
  onBackHome,
}) => {

  // Common Situations (top 3 for home view)
  const commonSituations = situations.slice(0, 5);

  if (screen === 'detail' && selectedSituation) {
    const isBookmarked = bookmarks.includes(selectedSituation.situation_id);
    return (
      <div className="situation-detail-screen animate-fade-in">
        <div className="sit-detail-header">
          <div className="sit-detail-nav">
            <button className="back-btn" onClick={() => setScreen('list')}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="18" height="18">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
            <button
              className={`bookmark-btn${isBookmarked ? ' bookmarked' : ''}`}
              onClick={() => toggleBookmark(selectedSituation.situation_id)}
            >
              <svg viewBox="0 0 24 24" fill={isBookmarked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" width="18" height="18">
                <path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z" />
              </svg>
            </button>
          </div>

          <div className="sit-detail-cat-tag">
            <CatSVG id={selectedSituation.category} />
            {(selectedSituation.category || '').replace('_', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
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
                <li key={i}>
                  <div className="check-circle">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" width="12" height="12">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </div>
                  {r}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Action Steps */}
        {selectedSituation.action_steps?.length > 0 && (
          <div className="detail-section-card">
            <h3>
              <svg viewBox="0 0 24 24" fill="none" stroke="#4f46e5" strokeWidth="2" width="18" height="18">
                <circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" />
              </svg>
              Action Steps
            </h3>
            <div>
              {selectedSituation.action_steps.map((step: string, i: number) => (
                <div key={i} className="timeline-item">
                  <div className="timeline-dot" />
                  <div className="timeline-content">{step}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Applicable Laws */}
        {selectedSituation.applicable_laws?.length > 0 && (
          <div className="detail-section-card">
            <h3>
              <svg viewBox="0 0 24 24" fill="none" stroke="#4f46e5" strokeWidth="2" width="18" height="18">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
              Applicable Laws
            </h3>
            {selectedSituation.applicable_laws.map((law: any, i: number) => (
              <div key={i} className="law-citation-row">
                <div className="law-icon-badge">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  </svg>
                </div>
                <div className="law-cite-info">
                  <strong>{law.act} — {law.section}</strong>
                  <span>{law.section_title}</span>
                  {LAW_DETAILS_MAP[law.section] && (
                    <p style={{ fontSize: 11.5, color: '#6b7280', marginTop: 4, lineHeight: 1.5 }}>
                      {LAW_DETAILS_MAP[law.section].slice(0, 120)}...
                    </p>
                  )}
                </div>
              </div>
            ))}
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
                    <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
                  </svg>
                </div>
                <span>{d}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (screen === 'list') {
    return (
      <div className="situations-screen animate-fade-in">
        <div className="situations-header">
          <div className="situations-header-nav">
            <button className="situations-back-btn" onClick={() => { setScreen('categories'); setSearchQuery(''); }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="20" height="20">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
            <span style={{ fontSize: 17, fontWeight: 700, color: '#1a1a5e' }}>LegalAce</span>
            <button className="situations-back-btn">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
              </svg>
            </button>
          </div>
        </div>

        <div className="situations-search-wrap">
          <div className="situations-search-box">
            <svg viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" width="18" height="18">
              <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
            </svg>
            <input
              type="text"
              placeholder="What happened? Describe your problem..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div style={{ padding: '8px 16px 0' }}>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: '#1a1a5e', marginBottom: 4 }}>
            {selectedCategory?.name || 'Situations'}
          </h2>
          <p style={{ fontSize: 12.5, color: '#6b7280', marginBottom: 12 }}>
            {filteredSituations.length} situations found
          </p>
        </div>

        {situationsLoading ? (
          <div className="loading-spinner">
            <div className="spinner-ring" />
            Loading situations...
          </div>
        ) : filteredSituations.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '36px 24px', color: '#6b7280' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🔍</div>
            <p>No situations found for this category.</p>
          </div>
        ) : (
          <div style={{ padding: '0 16px' }}>
            {filteredSituations.map(sit => (
              <div
                key={sit.situation_id}
                className="situation-list-item"
                onClick={() => openSituationDetail(sit.situation_id)}
              >
                <SitItemIcon category={sit.category} />
                <div className="sit-item-text">
                  <div className="sit-item-tag">
                    {(sit.category || '').toUpperCase().replace('_', ' ')}
                  </div>
                  <h4>{sit.title}</h4>
                  <p>{sit.description?.slice(0, 75)}...</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Categories screen (default)
  return (
    <div className="situations-screen animate-fade-in">
      <div className="situations-header">
        <div className="situations-header-nav">
          {onBackHome ? (
            <button className="situations-back-btn" onClick={onBackHome} title="Back to Home" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="20" height="20">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
          ) : (
            <div style={{ width: 36 }} />
          )}
          <span style={{ fontSize: 17, fontWeight: 700, color: '#1a1a5e' }}>LegalAce</span>
          <button className="situations-back-btn">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
              <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
            </svg>
          </button>
        </div>
        <div className="situations-title-area">
          <h1>Legal Situations</h1>
          <p className="situations-subtitle">Find clear, actionable legal information tailored to your specific circumstances.</p>
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

      {/* Categories */}
      <div className="categories-section">
        <div className="categories-section-title">Categories</div>
        <div className="categories-grid">
          {categories.slice(0, 8).map(cat => (
            <div
              key={cat.id}
              className="category-card"
              onClick={() => { setSelectedCategory(cat); setScreen('list'); setSearchQuery(''); }}
            >
              <div className="cat-icon-wrap">
                <CatSVG id={cat.id} />
              </div>
              <span>{cat.name}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Common Situations */}
      <div className="common-situations-section">
        <div className="common-situations-header">
          <h3>Common Situations</h3>
          <button className="view-all-text" onClick={() => { setSelectedCategory(null); setSearchQuery(''); setScreen('list'); }}>
            View all
          </button>
        </div>

        {situationsLoading ? (
          <div className="loading-spinner">
            <div className="spinner-ring" />
            Loading...
          </div>
        ) : (
          commonSituations.map(sit => (
            <div
              key={sit.situation_id}
              className="situation-list-item"
              onClick={() => openSituationDetail(sit.situation_id)}
            >
              <SitItemIcon category={sit.category} />
              <div className="sit-item-text">
                <div className="sit-item-tag">
                  {(sit.category || '').toUpperCase().replace('_', ' ')}
                </div>
                <h4>{sit.title}</h4>
                <p>{sit.description?.slice(0, 70)}...</p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default SituationFinderTab;
