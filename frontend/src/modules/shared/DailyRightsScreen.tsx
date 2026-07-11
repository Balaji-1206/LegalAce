import React from 'react';

interface DailyRightsScreenProps {
  bookmarks: string[];
  toggleBookmark: (id: string) => void;
}

const RIGHTS_DATA = [
  {
    id: 'mrp_right',
    category: 'Consumer Rights',
    title: 'Right to Information (RTI) on MRP',
    body: 'Sellers cannot charge more than the Maximum Retail Price (MRP) printed on packaged goods. This includes cooling beverages, packaged food, medicines and electronics. You can complain to Consumer Forum or call 1800-11-4000.',
  },
  {
    id: 'zero_fir',
    category: "Women's Rights",
    title: 'Zero FIR Registration',
    body: 'A victim of a cognizable offense (like assault, rape, kidnapping) can file an FIR at any police station, regardless of where the incident occurred. The police cannot refuse. The FIR is then transferred to the appropriate station.',
  },
  {
    id: 'salary_recovery',
    category: 'Employee Rights',
    title: 'Unpaid Salary Recovery',
    body: 'If an employer refuses to pay your earned wages, you have the right to approach the Labour Commissioner or file a claim under the Payment of Wages Act before the Authority. Claims must be filed within 12 months.',
  },
  {
    id: 'arrest_protocol',
    category: 'Civic Rights',
    title: 'Police Arrest Protocol',
    body: 'You have the fundamental right to be informed of the specific grounds for your arrest immediately. Furthermore, police cannot detain you for more than 24 hours without producing you before a Magistrate (Art. 22).',
  },
  {
    id: 'right_education',
    category: 'Education Rights',
    title: 'Free & Compulsory Education',
    body: 'Every child aged 6 to 14 years has the fundamental right to free and compulsory education under Article 21A of the Constitution and the Right to Education Act 2009.',
  },
  {
    id: 'eviction_notice',
    category: 'Housing Rights',
    title: 'Protection Against Illegal Eviction',
    body: 'A landlord cannot forcibly evict a tenant without following due process of law. A proper legal notice must be served and the matter must go through the Rent Control Courts.',
  },
];

const CATEGORY_COLORS: Record<string, string> = {
  'Consumer Rights': '#f59e0b',
  "Women's Rights": '#a855f7',
  'Employee Rights': '#3b82f6',
  'Civic Rights': '#6b7280',
  'Education Rights': '#14b8a6',
  'Housing Rights': '#10b981',
};

export const DailyRightsScreen: React.FC<DailyRightsScreenProps> = ({
  bookmarks,
  toggleBookmark,
}) => {
  const handleShare = (title: string) => {
    if (navigator.share) {
      navigator.share({ title: `LegalAce — ${title}`, text: `Know your right: ${title}`, url: window.location.href });
    } else {
      navigator.clipboard?.writeText(`Know your right: ${title} — LegalAce`);
    }
  };

  return (
    <div className="rights-screen animate-fade-in">
      <div className="rights-header">
        <div className="rights-header-nav">
          <div style={{ width: 36 }} />
          <button className="chat-menu-btn" title="Search">
            <svg viewBox="0 0 24 24" fill="none" stroke="#1a1a5e" strokeWidth="2" width="20" height="20">
              <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
            </svg>
          </button>
        </div>
        <h1>Daily Rights.</h1>
        <p>Bite-sized, practical legal knowledge to empower your everyday life. Know what you're entitled to.</p>
      </div>

      {RIGHTS_DATA.map(right => {
        const isBookmarked = bookmarks.includes(right.id);
        const catColor = CATEGORY_COLORS[right.category] || '#4f46e5';
        return (
          <div key={right.id} className="rights-card">
            <div
              className="rights-card-tag"
              style={{ background: catColor + '18', color: catColor }}
            >
              {right.category}
            </div>
            <h3>{right.title}</h3>
            <p>{right.body}</p>
            <div className="rights-card-actions">
              <button
                className="rights-action-btn"
                onClick={() => handleShare(right.title)}
                title="Share"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                  <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
                  <path d="m8.59 13.51 6.83 3.98M15.41 6.51l-6.82 3.98" />
                </svg>
              </button>
              <button
                className={`rights-action-btn${isBookmarked ? ' bookmarked' : ''}`}
                onClick={() => toggleBookmark(right.id)}
                title="Bookmark"
              >
                <svg viewBox="0 0 24 24" fill={isBookmarked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" width="16" height="16">
                  <path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z" />
                </svg>
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default DailyRightsScreen;
