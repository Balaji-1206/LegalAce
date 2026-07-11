import React from 'react';

interface HomeScreenProps {
  onNavigate: (tab: string) => void;
  situations: any[];
  recentlyViewed: string[];
  openSituationDetail: (id: string) => void;
}

const TODAYS_RIGHT = {
  title: "Right to Free Legal Aid",
  body: "Section 12 of NALSA ensures free legal services to eligible persons, making justice accessible to all, regardless of financial background.",
};

const DAILY_RIGHTS = [
  { category: "Consumer Rights", title: "Right to Information (RTI) on MRP", body: "Sellers cannot charge more than the Maximum Retail Price (MRP) printed on packaged goods. This includes cooling..." },
  { category: "Women's Rights", title: "Zero FIR Registration", body: "A victim of a cognizable offense (like assault) can file an FIR at any police station, regardless of where the incide..." },
  { category: "Employee Rights", title: "Unpaid Salary Recovery", body: "If an employer refuses to pay your earned wages, you have the right to approach the Labour Commissioner or..." },
  { category: "Civic Rights", title: "Police Arrest Protocol", body: "You have the fundamental right to be informed of the specific grounds for your arrest immediately. Furthermore,..." },
];

const CAT_ICON_COLOR: Record<string, string> = {
  employment: '#3b82f6',
  housing: '#10b981',
  consumer: '#f59e0b',
  cyber_crime: '#ec4899',
  women_rights: '#a855f7',
  banking: '#06b6d4',
  traffic: '#f43f5e',
  education: '#14b8a6',
};

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

  const fallbackRecent = situations.slice(0, 3);

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
        <h1>LegalAce</h1>
        <button className="chat-menu-btn" onClick={() => onNavigate('profile')} title="Profile">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="22" height="22">
            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
          </svg>
        </button>
      </div>

      {/* Search Bar */}
      <div className="home-search-wrap">
        <div className="home-search-box" onClick={() => onNavigate('situations')}>
          <svg className="search-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
          </svg>
          <input type="text" placeholder="Search rights or laws..." readOnly />
        </div>
      </div>

      {/* Today's Right Card */}
      <div className="todays-right-card">
        <div className="todays-right-label">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
          Today's Right
        </div>
        <h2>{TODAYS_RIGHT.title}</h2>
        <p>{TODAYS_RIGHT.body}</p>
        <button className="explore-link" onClick={() => onNavigate('rights')}>
          Explore Details →
        </button>
      </div>

      {/* Quick Actions */}
      <div className="section-title">Quick Actions</div>
      <div className="quick-actions-grid">
        <div className="quick-action-card" onClick={() => onNavigate('chat')}>
          <div className="qa-icon-wrap">
            <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" width="22" height="22">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
          </div>
          <span>Ask AI Assistant</span>
        </div>
        <div className="quick-action-card" onClick={() => onNavigate('situations')}>
          <div className="qa-icon-wrap light">
            <svg viewBox="0 0 24 24" fill="none" stroke="#4f46e5" strokeWidth="1.8" width="22" height="22">
              <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
            </svg>
          </div>
          <span>Situation Finder</span>
        </div>
        <div className="quick-action-card" onClick={() => alert('Scan Document feature coming soon!')}>
          <div className="qa-icon-wrap light">
            <svg viewBox="0 0 24 24" fill="none" stroke="#4f46e5" strokeWidth="1.8" width="22" height="22">
              <rect x="5" y="2" width="14" height="20" rx="2" /><path d="M9 7h6M9 11h6M9 15h4" />
            </svg>
          </div>
          <span>Scan Document</span>
        </div>
        <div className="quick-action-card" onClick={() => alert('Complaint Generator feature coming soon!')}>
          <div className="qa-icon-wrap light">
            <svg viewBox="0 0 24 24" fill="none" stroke="#4f46e5" strokeWidth="1.8" width="22" height="22">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6M12 18v-6M9 15h6" />
            </svg>
          </div>
          <span>Complaint Generator</span>
        </div>
      </div>

      {/* Recent Situations */}
      <div className="recent-section-header">
        <div className="section-title" style={{ padding: 0, marginBottom: 0 }}>Recent Situations</div>
        <button className="view-all-btn" onClick={() => onNavigate('situations')}>View All</button>
      </div>

      <div className="recent-scroll" style={{ marginBottom: 16 }}>
        {displayRecent.map((sit: any, i: number) => (
          <div
            key={sit.situation_id || i}
            className="recent-sit-card"
            onClick={() => openSituationDetail(sit.situation_id)}
          >
            <div className="recent-sit-category">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="12" height="12">
                <rect x="2" y="3" width="20" height="14" rx="2" /><path d="M8 21h8M12 17v4" />
              </svg>
              {(sit.category || '').toUpperCase().replace('_', ' ')}
            </div>
            <h4>{sit.title}</h4>
            <p>{sit.description?.slice(0, 70)}...</p>
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
