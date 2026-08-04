import React, { useState, useEffect } from 'react';
import './ProfileScreen.css';
import type { ConversationSummary } from '../shared/types';

interface ProfileScreenProps {
  userId: string;
  conversations: ConversationSummary[];
  bookmarks: string[];
  recentlyViewed: string[];
  onNavigate: (tab: string) => void;
  onOpenSaved: () => void;
}

const INDIAN_STATES = [
  'Karnataka', 'Maharashtra', 'Delhi (NCR)', 'Tamil Nadu', 'Telangana',
  'Uttar Pradesh', 'West Bengal', 'Gujarat', 'Kerala', 'Punjab', 'Other / Central'
];

const LEGAL_PERSONAS = [
  { id: 'consumer', label: 'Individual Consumer', icon: '🛒' },
  { id: 'employee', label: 'Working Professional / Employee', icon: '💼' },
  { id: 'tenant', label: 'Tenant / Home Renter', icon: '🏠' },
  { id: 'business', label: 'Small Business Owner', icon: '🏪' },
  { id: 'citizen', label: 'General Citizen & Student', icon: '🏛️' },
];

const AVATAR_COLORS = [
  '#4338ca', '#0284c7', '#059669', '#d97706', '#7c3aed', '#db2777'
];

const EMERGENCY_HELPLINES = [
  { name: 'NALSA Free Legal Aid', number: '15100', desc: 'National Legal Services Authority - 24/7 Free Assistance' },
  { name: 'National Consumer Helpline', number: '1915', desc: 'Ministry of Consumer Affairs' },
  { name: 'Cyber Crime Helpline', number: '1930', desc: 'Report financial fraud & online crimes immediately' },
  { name: 'Women Helpline', number: '181', desc: 'Domestic violence & safety emergencies' },
  { name: 'Elder Line (Senior Citizens)', number: '14567', desc: 'Free information & guidance for seniors' },
];

export const ProfileScreen: React.FC<ProfileScreenProps> = ({
  userId,
  conversations,
  bookmarks,
  recentlyViewed,
  onNavigate,
  onOpenSaved,
}) => {
  // Local profile state persisted in localStorage
  const [userName, setUserName] = useState<string>('Legal Ace User');
  const [userEmail, setUserEmail] = useState<string>('user@legalace.in');
  const [avatarColor, setAvatarColor] = useState<string>('#4338ca');
  const [persona, setPersona] = useState<string>('Individual Consumer');
  const [preferredState, setPreferredState] = useState<string>('Karnataka');
  const [notificationsEnabled, setNotificationsEnabled] = useState<boolean>(true);

  // Modal visibility states
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [isHelplineModalOpen, setIsHelplineModalOpen] = useState<boolean>(false);
  const [isAboutModalOpen, setIsAboutModalOpen] = useState<boolean>(false);
  const [copiedNumber, setCopiedNumber] = useState<string | null>(null);

  useEffect(() => {
    const savedName = localStorage.getItem('legalace_user_name');
    if (savedName) setUserName(savedName);

    const savedEmail = localStorage.getItem('legalace_user_email');
    if (savedEmail) setUserEmail(savedEmail);

    const savedColor = localStorage.getItem('legalace_avatar_color');
    if (savedColor) setAvatarColor(savedColor);

    const savedPersona = localStorage.getItem('legalace_persona');
    if (savedPersona) setPersona(savedPersona);

    const savedState = localStorage.getItem('legalace_preferred_state');
    if (savedState) setPreferredState(savedState);
  }, []);

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem('legalace_user_name', userName);
    localStorage.setItem('legalace_user_email', userEmail);
    localStorage.setItem('legalace_avatar_color', avatarColor);
    localStorage.setItem('legalace_persona', persona);
    localStorage.setItem('legalace_preferred_state', preferredState);
    setIsEditModalOpen(false);
  };

  const getInitials = (name: string) => {
    if (!name) return 'LU';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.substring(0, 2).toUpperCase();
  };

  const handleExportData = () => {
    const exportPayload = {
      user_id: userId,
      user_name: userName,
      user_email: userEmail,
      persona,
      preferred_state: preferredState,
      saved_bookmarks: bookmarks,
      recently_viewed: recentlyViewed,
      conversations_count: conversations.length,
      exported_at: new Date().toISOString(),
    };

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportPayload, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `LegalAce_Profile_${userId}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleClearData = () => {
    if (window.confirm("Are you sure you want to clear your local bookmarks and search history?")) {
      localStorage.removeItem('legalace_bookmarks');
      localStorage.removeItem('legalace_recently_viewed');
      window.location.reload();
    }
  };

  const copyHelplineNumber = (num: string) => {
    navigator.clipboard.writeText(num);
    setCopiedNumber(num);
    setTimeout(() => setCopiedNumber(null), 2000);
  };

  // Calculate profile completion percentage
  const completionPercentage = [
    userName !== 'Legal Ace User',
    userEmail !== 'user@legalace.in',
    bookmarks.length > 0,
    conversations.length > 0,
    preferredState !== '',
  ].filter(Boolean).length * 20;

  return (
    <div className="profile-screen animate-fade-in">
      {/* Back Button */}
      <button className="profile-back-btn" onClick={() => onNavigate('home')} title="Back to Home">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="18" height="18">
          <polyline points="15 18 9 12 15 6" />
        </svg>
      </button>

      {/* Edit Profile Header Action */}
      <button className="profile-edit-trigger" onClick={() => setIsEditModalOpen(true)}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
        </svg>
        Edit Profile
      </button>

      {/* Hero Header */}
      <div className="profile-hero-banner">
        <div className="profile-avatar-wrap">
          <div className="profile-avatar-large" style={{ backgroundColor: avatarColor }}>
            {getInitials(userName)}
          </div>
          <div className="avatar-badge-icon" title="Active Member">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" width="12" height="12">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
        </div>

        <h2 className="profile-user-name">{userName}</h2>
        <p className="profile-user-email">{userEmail} • {userId}</p>

        <div className="profile-tags-row">
          <span className="profile-persona-chip">
            ⚖️ {persona}
          </span>
          <span className="profile-state-chip">
            📍 {preferredState}
          </span>
        </div>

        {/* Profile Setup Bar */}
        <div className="profile-completion-box">
          <div className="completion-header">
            <span>Profile Setup Strength</span>
            <span>{completionPercentage}%</span>
          </div>
          <div className="completion-bar-track">
            <div className="completion-bar-fill" style={{ width: `${completionPercentage}%` }}></div>
          </div>
        </div>
      </div>

      {/* Interactive Stats Row */}
      <div className="profile-stats-container">
        <div className="profile-stats-grid">
          <div className="stat-card" onClick={() => onNavigate('chat')}>
            <div className="stat-card-icon" style={{ background: '#eef2ff', color: '#4f46e5' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="22" height="22">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
            </div>
            <div className="stat-card-info">
              <strong>{conversations.length}</strong>
              <span>Consultations</span>
            </div>
          </div>

          <div className="stat-card" onClick={onOpenSaved}>
            <div className="stat-card-icon" style={{ background: '#fef3c7', color: '#d97706' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="22" height="22">
                <path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z" />
              </svg>
            </div>
            <div className="stat-card-info">
              <strong>{bookmarks.length}</strong>
              <span>Saved Laws</span>
            </div>
          </div>

          <div className="stat-card" onClick={() => onNavigate('deadlines')}>
            <div className="stat-card-icon" style={{ background: '#ecfdf5', color: '#059669' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="22" height="22">
                <rect x="3" y="4" width="18" height="18" rx="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
                <path d="m9 16 2 2 4-4" />
              </svg>
            </div>
            <div className="stat-card-info">
              <strong>Legal Health</strong>
              <span>Monitor & Deadlines</span>
            </div>
          </div>

          <div className="stat-card" onClick={() => onNavigate('rights')}>
            <div className="stat-card-icon" style={{ background: '#fce7f3', color: '#db2777' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="22" height="22">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
            </div>
            <div className="stat-card-info">
              <strong>Daily Rights</strong>
              <span>Citizenship Handbook</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Workspace Navigation */}
      <div className="profile-section-group">
        <div className="profile-section-title">Legal Workspace & Tools</div>
        <div className="profile-card-group">
          <div className="profile-action-item" onClick={() => onNavigate('wizard')}>
            <div className="action-item-icon" style={{ background: '#e0e7ff', color: '#4338ca' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
              </svg>
            </div>
            <div className="action-item-content">
              <div className="action-item-title">
                Document & Case Wizard
                <span className="action-item-badge">Interactive</span>
              </div>
              <div className="action-item-desc">Step-by-step guidance to draft notices or file complaints</div>
            </div>
            <div className="action-item-arrow">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </div>
          </div>

          <div className="profile-action-item" onClick={onOpenSaved}>
            <div className="action-item-icon" style={{ background: '#fef3c7', color: '#d97706' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                <path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z" />
              </svg>
            </div>
            <div className="action-item-content">
              <div className="action-item-title">Saved Situations & Laws</div>
              <div className="action-item-desc">{bookmarks.length} statutes bookmarked</div>
            </div>
            <div className="action-item-arrow">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </div>
          </div>

          <div className="profile-action-item" onClick={() => onNavigate('chat')}>
            <div className="action-item-icon" style={{ background: '#e0f2fe', color: '#0284c7' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
            </div>
            <div className="action-item-content">
              <div className="action-item-title">Chat & AI Consultation History</div>
              <div className="action-item-desc">{conversations.length} saved AI legal discussions</div>
            </div>
            <div className="action-item-arrow">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </div>
          </div>

          <div className="profile-action-item" onClick={() => onNavigate('xray')}>
            <div className="action-item-icon" style={{ background: '#eef2ff', color: '#6366f1' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
                <polyline points="10 9 9 9 8 9" />
              </svg>
            </div>
            <div className="action-item-content">
              <div className="action-item-title">
                Document X-Ray
                <span className="action-item-badge" style={{ background: '#eef2ff', color: '#4338ca' }}>New</span>
              </div>
              <div className="action-item-desc">Upload legal documents for AI analysis</div>
            </div>
            <div className="action-item-arrow">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </div>
          </div>

          <div className="profile-action-item" onClick={() => onNavigate('legalaid')}>
            <div className="action-item-icon" style={{ background: '#ecfdf5', color: '#059669' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                <circle cx="12" cy="12" r="10" />
                <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                <path d="M12 17h.01" />
              </svg>
            </div>
            <div className="action-item-content">
              <div className="action-item-title">
                Free Legal Aid Checker
                <span className="action-item-badge" style={{ background: '#ecfdf5', color: '#059669' }}>New</span>
              </div>
              <div className="action-item-desc">Check DLSA eligibility & find nearest authority</div>
            </div>
            <div className="action-item-arrow">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </div>
          </div>
        </div>

        {/* Emergency Assistance Section */}
        <div className="profile-section-title">Support & Emergency Directives</div>
        <div className="profile-card-group">
          <div className="profile-action-item" onClick={() => setIsHelplineModalOpen(true)}>
            <div className="action-item-icon" style={{ background: '#fee2e2', color: '#ef4444' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
              </svg>
            </div>
            <div className="action-item-content">
              <div className="action-item-title" style={{ color: '#dc2626' }}>
                🚨 Emergency Legal Helplines
              </div>
              <div className="action-item-desc">NALSA Free Legal Aid, Consumer, Cyber Crime</div>
            </div>
            <div className="action-item-arrow">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </div>
          </div>
        </div>

        {/* Preferences & System Data */}
        <div className="profile-section-title">Preferences & Data Control</div>
        <div className="profile-card-group">
          <div className="profile-action-item" style={{ cursor: 'default' }}>
            <div className="action-item-icon" style={{ background: '#f3e8ff', color: '#9333ea' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
            </div>
            <div className="action-item-content">
              <div className="action-item-title">Deadline & Legal Tip Alerts</div>
              <div className="action-item-desc">Receive notifications for filing dates</div>
            </div>
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={notificationsEnabled}
                onChange={(e) => setNotificationsEnabled(e.target.checked)}
              />
              <span className="toggle-slider"></span>
            </label>
          </div>

          <div className="profile-action-item" onClick={handleExportData}>
            <div className="action-item-icon" style={{ background: '#f1f5f9', color: '#475569' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
            </div>
            <div className="action-item-content">
              <div className="action-item-title">Export Profile & Legal History</div>
              <div className="action-item-desc">Download bookmarks & consultations as JSON</div>
            </div>
            <div className="action-item-arrow">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </div>
          </div>

          <div className="profile-action-item" onClick={handleClearData}>
            <div className="action-item-icon" style={{ background: '#fef2f2', color: '#b91c1c' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              </svg>
            </div>
            <div className="action-item-content">
              <div className="action-item-title" style={{ color: '#b91c1c' }}>Clear Local Data</div>
              <div className="action-item-desc">Reset bookmarks and recent history</div>
            </div>
          </div>

          <div className="profile-action-item" onClick={() => setIsAboutModalOpen(true)}>
            <div className="action-item-icon" style={{ background: '#f0fdf4', color: '#16a34a' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 16v-4" />
                <path d="M12 8h.01" />
              </svg>
            </div>
            <div className="action-item-content">
              <div className="action-item-title">About LegalAce AI</div>
              <div className="action-item-desc">Version 1.0 — Powered by OpenAI & RAG</div>
            </div>
            <div className="action-item-arrow">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* --- EDIT PROFILE MODAL --- */}
      {isEditModalOpen && (
        <div className="profile-modal-overlay" onClick={() => setIsEditModalOpen(false)}>
          <div className="profile-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header-row">
              <h3>Edit Profile</h3>
              <button className="modal-close-btn" onClick={() => setIsEditModalOpen(false)}>✕</button>
            </div>

            <form onSubmit={handleSaveProfile}>
              <div className="form-field-group">
                <label>Display Name</label>
                <input
                  type="text"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  placeholder="Enter your name"
                  required
                />
              </div>

              <div className="form-field-group">
                <label>Email Address</label>
                <input
                  type="email"
                  value={userEmail}
                  onChange={(e) => setUserEmail(e.target.value)}
                  placeholder="Enter your email"
                  required
                />
              </div>

              <div className="form-field-group">
                <label>Avatar Accent Color</label>
                <div className="color-picker-row">
                  {AVATAR_COLORS.map((c) => (
                    <button
                      type="button"
                      key={c}
                      className={`color-swatch-btn ${avatarColor === c ? 'selected' : ''}`}
                      style={{ backgroundColor: c }}
                      onClick={() => setAvatarColor(c)}
                    />
                  ))}
                </div>
              </div>

              <div className="form-field-group">
                <label>Primary Legal Focus / Persona</label>
                <select value={persona} onChange={(e) => setPersona(e.target.value)}>
                  {LEGAL_PERSONAS.map((p) => (
                    <option key={p.id} value={p.label}>
                      {p.icon} {p.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-field-group">
                <label>State Jurisdiction</label>
                <select value={preferredState} onChange={(e) => setPreferredState(e.target.value)}>
                  {INDIAN_STATES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              <button type="submit" className="modal-action-btn">
                Save Profile Changes
              </button>
            </form>
          </div>
        </div>
      )}

      {/* --- EMERGENCY HELPLINE MODAL --- */}
      {isHelplineModalOpen && (
        <div className="profile-modal-overlay" onClick={() => setIsHelplineModalOpen(false)}>
          <div className="profile-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header-row">
              <h3 style={{ color: '#dc2626', display: 'flex', alignItems: 'center', gap: '8px' }}>
                🚨 Emergency Legal Helplines
              </h3>
              <button className="modal-close-btn" onClick={() => setIsHelplineModalOpen(false)}>✕</button>
            </div>

            <p style={{ fontSize: '12px', color: '#64748b', marginBottom: '16px' }}>
              Free official national legal assistance and helpline numbers in India:
            </p>

            {EMERGENCY_HELPLINES.map((h, i) => (
              <div className="helpline-card" key={i}>
                <div className="helpline-info">
                  <strong>{h.name} ({h.number})</strong>
                  <span>{h.desc}</span>
                </div>
                <button
                  className="helpline-call-btn"
                  onClick={() => copyHelplineNumber(h.number)}
                >
                  {copiedNumber === h.number ? 'Copied!' : 'Copy'}
                </button>
              </div>
            ))}

            <button
              className="modal-action-btn"
              style={{ background: '#64748b' }}
              onClick={() => setIsHelplineModalOpen(false)}
            >
              Close Directory
            </button>
          </div>
        </div>
      )}

      {/* --- ABOUT MODAL --- */}
      {isAboutModalOpen && (
        <div className="profile-modal-overlay" onClick={() => setIsAboutModalOpen(false)}>
          <div className="profile-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header-row">
              <h3>About LegalAce AI</h3>
              <button className="modal-close-btn" onClick={() => setIsAboutModalOpen(false)}>✕</button>
            </div>

            <div style={{ textAlign: 'center', margin: '10px 0 20px' }}>
              <div style={{ fontSize: '40px', marginBottom: '8px' }}>⚖️</div>
              <h2 style={{ fontSize: '20px', fontWeight: '800', color: '#1e1b4b' }}>LegalAce v1.0</h2>
              <p style={{ fontSize: '12px', color: '#6b7280' }}>AI-Powered Indian Law Companion</p>
            </div>

            <div style={{ fontSize: '13px', color: '#374151', lineHeight: '1.6' }}>
              <p style={{ marginBottom: '10px' }}>
                LegalAce simplifies Indian constitutional and statutory law for everyday citizens, employees, consumers, and tenants.
              </p>
              <strong>Core Features:</strong>
              <ul style={{ paddingLeft: '20px', marginTop: '6px', marginBottom: '16px' }}>
                <li>🤖 RAG AI Chatbot with direct statutory section citations</li>
                <li>🎯 Situation Finder for categorized legal issues</li>
                <li>📅 Legal Health Monitor & Filing Deadline tracker</li>
                <li>🧙 Interactive Document & Notice Drafting Wizard</li>
              </ul>
              <p style={{ fontSize: '11px', color: '#9ca3af', fontStyle: 'italic', borderTop: '1px solid #f3f4f6', paddingTop: '10px' }}>
                Disclaimer: LegalAce provides educational legal information and is not a substitute for professional legal representation by an advocate.
              </p>
            </div>

            <button className="modal-action-btn" onClick={() => setIsAboutModalOpen(false)}>
              Got It
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfileScreen;
