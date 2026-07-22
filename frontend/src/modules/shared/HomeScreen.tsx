import React from 'react';
import './HomeScreen.css';

interface HomeScreenProps {
  onNavigate: (tab: string) => void;
  situations: any[];
  recentlyViewed: string[];
  openSituationDetail: (id: string) => void;
}

const TODAYS_RIGHT = {
  title: "Right to Free Legal Aid",
  act: "NALSA Act 1987 • Section 12",
  body: "Section 12 of NALSA ensures free legal services to eligible persons, making justice accessible to all, regardless of financial background.",
};

const TOP_CATEGORIES = [
  { id: "employment", name: "Employment", icon: "💼", color: "#3b82f6" },
  { id: "housing", name: "Housing & Renting", icon: "🏠", color: "#10b981" },
  { id: "consumer", name: "Consumer Rights", icon: "🛒", color: "#f59e0b" },
  { id: "cyber_crime", name: "Cyber Crime", icon: "🛡️", color: "#ec4899" },
  { id: "women_rights", name: "Women Rights", icon: "👩", color: "#a855f7" },
  { id: "banking", name: "Banking & Finance", icon: "🏦", color: "#06b6d4" },
  { id: "traffic", name: "Traffic Rules", icon: "🚗", color: "#f43f5e" },
];

export const HomeScreen: React.FC<HomeScreenProps> = ({
  onNavigate,
  situations,
  recentlyViewed,
  openSituationDetail,
}) => {
  const recentSituations = recentlyViewed
    .map(id => situations.find(s => s.situation_id === id))
    .filter(Boolean)
    .slice(0, 5);

  const fallbackRecent = situations.slice(0, 4);
  const displayRecent = recentSituations.length > 0 ? recentSituations : fallbackRecent;

  const formatTimeAgo = (id: string) => {
    const idx = recentlyViewed.indexOf(id);
    if (idx === 0) return 'Just now';
    if (idx === 1) return '2d ago';
    return '5d ago';
  };

  return (
    <div className="home-screen animate-fade-in">
      {/* Header */}
      <div className="home-header">
        <div>
          <div className="home-header-badge">
            <span className="live-dot" />
            <span>Indian Law Companion</span>
          </div>
          <h1>LegalAce</h1>
        </div>
        <button className="chat-menu-btn" onClick={() => onNavigate('profile')} title="View Profile">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
          </svg>
        </button>
      </div>

      {/* Search Bar */}
      <div className="home-search-wrap">
        <div className="home-search-box" onClick={() => onNavigate('situations')}>
          <svg className="search-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
          </svg>
          <input type="text" placeholder="Search rights, laws or situations..." readOnly />
          <span className="search-box-tag">Search</span>
        </div>
      </div>

      {/* Quick Category Chips */}
      <div className="home-categories-strip">
        {TOP_CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            className="home-category-chip"
            onClick={() => onNavigate('situations')}
          >
            <span className="chip-icon">{cat.icon}</span>
            <span className="chip-name">{cat.name}</span>
          </button>
        ))}
      </div>

      {/* Today's Right Card */}
      <div className="todays-right-card">
        <div className="todays-right-label">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
          Daily Legal Insight • {TODAYS_RIGHT.act}
        </div>
        <h2>{TODAYS_RIGHT.title}</h2>
        <p>{TODAYS_RIGHT.body}</p>
        <button className="explore-link" onClick={() => onNavigate('rights')}>
          Explore Citizenship Handbook →
        </button>
      </div>

      {/* Quick Actions */}
      <div className="section-title">Legal Ace Features</div>
      <div className="quick-actions-grid">
        <div className="quick-action-card primary" onClick={() => onNavigate('chat')} style={{ '--home-stagger': 0 } as React.CSSProperties}>
          <div className="qa-icon-wrap">
            <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" width="22" height="22">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
          </div>
          <div className="qa-card-info">
            <strong>AI Assistant</strong>
            <span>Instant statutory answers</span>
          </div>
        </div>

        <div className="quick-action-card" onClick={() => onNavigate('situations')} style={{ '--home-stagger': 1 } as React.CSSProperties}>
          <div className="qa-icon-wrap light" style={{ background: '#ecfdf5', color: '#059669' }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="22" height="22">
              <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
            </svg>
          </div>
          <div className="qa-card-info">
            <strong>Situation Finder</strong>
            <span>Browse legal scenarios</span>
          </div>
        </div>

        <div className="quick-action-card" onClick={() => onNavigate('wizard')} style={{ '--home-stagger': 2 } as React.CSSProperties}>
          <div className="qa-icon-wrap light" style={{ background: '#e0e7ff', color: '#4338ca' }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="22" height="22">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
          </div>
          <div className="qa-card-info">
            <strong>Document Wizard</strong>
            <span>Step-by-step notice guide</span>
          </div>
        </div>

        <div className="quick-action-card" onClick={() => onNavigate('deadlines')} style={{ '--home-stagger': 3 } as React.CSSProperties}>
          <div className="qa-icon-wrap light" style={{ background: '#fef3c7', color: '#d97706' }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="22" height="22">
              <rect x="3" y="4" width="18" height="18" rx="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
              <path d="m9 16 2 2 4-4" />
            </svg>
          </div>
          <div className="qa-card-info">
            <strong>Legal Monitor</strong>
            <span>Track notice & filing dates</span>
          </div>
        </div>
      </div>

      {/* Recent Situations */}
      <div className="recent-section-header">
        <div className="section-title" style={{ padding: 0, marginBottom: 0 }}>Recent Legal Scenarios</div>
        <button className="view-all-btn" onClick={() => onNavigate('situations')}>View All →</button>
      </div>

      <div className="recent-scroll" style={{ marginBottom: 16 }}>
        {displayRecent.map((sit: any, i: number) => (
          <div
            key={sit.situation_id || i}
            className="recent-sit-card"
            onClick={() => openSituationDetail(sit.situation_id)}
            style={{ '--home-stagger': i } as React.CSSProperties}
          >
            <div className="recent-sit-category">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="12" height="12">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
              {(sit.category || '').toUpperCase().replace('_', ' ')}
            </div>
            <h4>{sit.title}</h4>
            <p>{sit.description?.slice(0, 75)}...</p>
            <div className="recent-sit-badge">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="11" height="11">
                <circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" />
              </svg>
              {recentlyViewed.includes(sit.situation_id) ? formatTimeAgo(sit.situation_id) : 'Explore'}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default HomeScreen;
