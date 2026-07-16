import React, { useState, useEffect, useRef } from 'react';
import './App.css';
import type { Message, ConversationSummary } from './modules/shared/types';
import HomeScreen from './modules/shared/HomeScreen';
import DailyRightsScreen from './modules/shared/DailyRightsScreen';
import { ChatbotTab } from './modules/chatbot/ChatbotTab';
import { SituationFinderTab } from './modules/situation_finder/SituationFinderTab';
import { DeadlineDashboard } from './modules/deadline_engine/DeadlineDashboard';
import { WizardScreen } from './modules/wizard/WizardScreen';

const BACKEND_URL = 'http://localhost:8000';

const LAW_DETAILS_MAP: Record<string, string> = {
  "Section 2(7)": "Consumer means any person who buys any goods for a consideration which has been paid or promised...",
  "Section 35": "A complaint may be filed by a consumer in District Commission having jurisdiction...",
  "Section 39": "If the District Commission is satisfied that goods suffer from defects... it shall issue an order to remove the defect; replace; refund; pay compensation...",
  "Section 2(47)": "Unfair trade practice means a trade practice which adopts any unfair method or deceptive practice...",
  "Section 106": "A lease of immovable property for agricultural or manufacturing purposes shall be deemed to be a lease from year to year...",
  "Section 108(q)": "The lessor is bound to refund the security deposit to the lessee on vacating, deducting legitimate dues...",
  "Section 25F": "No workman in continuous service for not less than one year shall be retrenched without one month's notice and compensation...",
  "Section 25G": "Ordinarily retrench the workman who was the last person employed in that category.",
  "Section 25N": "Conditions Precedent to Retrenchment of Workmen — Requires prior permission of the appropriate Government.",
  "Section 2(oo) & Section 25": "Termination without prescribed procedure is illegal. Labour Court can award reinstatement, back wages, or compensation.",
  "Section 165": "A police officer may search after recording grounds in writing.",
  "Section 100": "Whenever a place for search is closed, person in charge shall allow ingress. Two witnesses must be present.",
  "Section 66": "Accessing someone's phone without permission is punishable with up to 3 years imprisonment or fine.",
  "Article 21": "Right to Life and Personal Liberty. Privacy is a fundamental right (Puttaswamy 2017).",
  "Section 406": "Punishment for Criminal Breach of Trust — up to 3 years imprisonment or fine or both.",
  "Section 420": "Cheating — imprisonment up to 7 years and fine.",
  "Section 3": "POSH Act — Prevention of Sexual Harassment of Women at Workplace.",
  "Section 12": "DV Act — Magistrate application for protection orders, monetary reliefs. First hearing within 3 days.",
  "Section 498A": "Husband or relative subjecting woman to cruelty — up to 3 years imprisonment.",
  "Section 11": "Model Tenancy Act — Security deposit restricted to 2 months rent (residential).",
  "Section 18": "RERA — Builders must return payment with interest if possession is delayed.",
  "Section 6": "RTI — Citizens can request public documents in writing/online without stating a reason.",
  "Section 134": "Motor Vehicles Act — Driver must secure medical attention for victim and report to police within 24 hours.",
  "Section 46": "CrPC — Restricts arrest of women between sunset and sunrise.",
  "Section 50": "CrPC — Police must inform arrested person of grounds of arrest and right to bail.",
};

const FALLBACK_CATEGORIES = [
  { id: "employment", name: "Employment", icon: "💼", color_gradient: ["#3b82f6", "#1d4ed8"], situation_count: 2 },
  { id: "housing", name: "Housing & Renting", icon: "🏠", color_gradient: ["#10b981", "#047857"], situation_count: 2 },
  { id: "consumer", name: "Consumer Rights", icon: "🛒", color_gradient: ["#f59e0b", "#d97706"], situation_count: 2 },
  { id: "cyber_crime", name: "Cyber Crime", icon: "🛡️", color_gradient: ["#ec4899", "#be185d"], situation_count: 2 },
  { id: "women_rights", name: "Women Rights", icon: "👩", color_gradient: ["#a855f7", "#7e22ce"], situation_count: 2 },
  { id: "banking", name: "Banking & Finance", icon: "🏦", color_gradient: ["#06b6d4", "#0891b2"], situation_count: 2 },
  { id: "traffic", name: "Traffic Rules", icon: "🚗", color_gradient: ["#f43f5e", "#e11d48"], situation_count: 2 },
  { id: "education", name: "Education", icon: "🎓", color_gradient: ["#14b8a6", "#0d9488"], situation_count: 2 },
];

type ActiveTab = 'home' | 'chat' | 'situations' | 'deadlines' | 'wizard' | 'rights' | 'profile';

export default function App() {
  const [userId, setUserId] = useState<string>('');
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [expandedCitation, setExpandedCitation] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<ActiveTab>('home');
  const [sitScreen, setSitScreen] = useState<'categories' | 'list' | 'detail'>('categories');
  const [categories, setCategories] = useState<any[]>([]);
  const [situations, setSituations] = useState<any[]>([]);
  const [bookmarks, setBookmarks] = useState<string[]>([]);
  const [recentlyViewed, setRecentlyViewed] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<any | null>(null);
  const [selectedSituationId, setSelectedSituationId] = useState<string | null>(null);
  const [selectedSituation, setSelectedSituation] = useState<any | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [situationsLoading, setSituationsLoading] = useState<boolean>(false);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let id = localStorage.getItem('legalace_user_id');
    if (!id) {
      id = 'user_' + Math.random().toString(36).substring(2, 11);
      localStorage.setItem('legalace_user_id', id);
    }
    setUserId(id);

    const savedBookmarks = localStorage.getItem('legalace_bookmarks');
    if (savedBookmarks) setBookmarks(JSON.parse(savedBookmarks));

    const savedRecents = localStorage.getItem('legalace_recently_viewed');
    if (savedRecents) setRecentlyViewed(JSON.parse(savedRecents));

    const cachedCats = localStorage.getItem('legalace_cached_categories');
    const cachedSits = localStorage.getItem('legalace_cached_situations');
    if (cachedCats) setCategories(JSON.parse(cachedCats));
    else setCategories(FALLBACK_CATEGORIES);
    if (cachedSits) setSituations(JSON.parse(cachedSits));

    fetchHistory(id);
    fetchSituationsData();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchSituationsData = async () => {
    setSituationsLoading(true);
    try {
      const catRes = await fetch(`${BACKEND_URL}/api/v1/situations/categories`);
      if (catRes.ok) {
        const fetchedCats = await catRes.json();
        setCategories(fetchedCats);
        localStorage.setItem('legalace_cached_categories', JSON.stringify(fetchedCats));
      }
      const sitRes = await fetch(`${BACKEND_URL}/api/v1/situations`);
      if (sitRes.ok) {
        const fetchedSits = await sitRes.json();
        setSituations(fetchedSits);
        localStorage.setItem('legalace_cached_situations', JSON.stringify(fetchedSits));
      }
    } catch {
      const cachedCats = localStorage.getItem('legalace_cached_categories');
      const cachedSits = localStorage.getItem('legalace_cached_situations');
      if (cachedCats) setCategories(JSON.parse(cachedCats));
      else setCategories(FALLBACK_CATEGORIES);
      if (cachedSits) setSituations(JSON.parse(cachedSits));
    } finally {
      setSituationsLoading(false);
    }
  };

  const openSituationDetail = async (situationId: string) => {
    setSelectedSituationId(situationId);
    setSitScreen('detail');

    const filtered = recentlyViewed.filter(id => id !== situationId);
    const updated = [situationId, ...filtered].slice(0, 5);
    setRecentlyViewed(updated);
    localStorage.setItem('legalace_recently_viewed', JSON.stringify(updated));

    const localSit = situations.find(s => s.situation_id === situationId);
    if (localSit) setSelectedSituation(localSit);

    try {
      const res = await fetch(`${BACKEND_URL}/api/v1/situations/${situationId}`);
      if (res.ok) {
        const freshSit = await res.json();
        setSelectedSituation(freshSit);
        setSituations(prev => prev.map(s => s.situation_id === situationId ? freshSit : s));
      }
    } catch { /* use local */ }
  };

  const toggleBookmark = (id: string) => {
    const updated = bookmarks.includes(id)
      ? bookmarks.filter(b => b !== id)
      : [...bookmarks, id];
    setBookmarks(updated);
    localStorage.setItem('legalace_bookmarks', JSON.stringify(updated));
  };

  const getCategoryIcon = (catId: string) => {
    const found = FALLBACK_CATEGORIES.find(c => c.id === catId);
    return found ? found.icon : '🛡️';
  };

  const fetchHistory = async (uid: string) => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/v1/conversation/history/${uid}`);
      if (res.ok) {
        const data = await res.json();
        setConversations(data.conversations || []);
      }
    } catch { /* offline */ }
  };

  const selectConversation = async (conversationId: string) => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const res = await fetch(`${BACKEND_URL}/api/v1/conversation/${conversationId}`);
      if (res.ok) {
        const data = await res.json();
        setCurrentConversationId(data.conversation_id);
        const formattedMessages: Message[] = data.messages.map((m: any) => ({
          role: m.role,
          content: m.content,
          timestamp: m.timestamp,
          citations: m.citations,
          rights: m.rights || [],
          action_steps: m.action_steps || [],
          disclaimer: m.disclaimer || "For educational purposes only.",
        }));
        setMessages(formattedMessages);
      }
    } catch { setErrorMessage('Error connecting to server.'); }
    finally { setLoading(false); }
  };

  const startNewChat = () => {
    setCurrentConversationId(null);
    setMessages([]);
    setErrorMessage(null);
    setExpandedCitation(null);
  };

  const deleteConversation = async (e: React.MouseEvent, conversationId: string) => {
    e.stopPropagation();
    if (!confirm('Delete this chat history?')) return;
    try {
      const res = await fetch(`${BACKEND_URL}/api/v1/conversation/${conversationId}`, { method: 'DELETE' });
      if (res.ok) {
        setConversations(prev => prev.filter(c => c.conversation_id !== conversationId));
        if (currentConversationId === conversationId) startNewChat();
      }
    } catch { alert('Failed to delete.'); }
  };

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputValue).trim();
    if (!text) return;

    const userMsg: Message = { role: 'user', content: text, timestamp: new Date().toISOString() };
    setMessages(prev => [...prev, userMsg]);
    if (!textToSend) setInputValue('');
    setLoading(true);
    setErrorMessage(null);

    try {
      const res = await fetch(`${BACKEND_URL}/api/v1/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, conversation_id: currentConversationId, message: text }),
      });

      if (res.ok) {
        const data = await res.json();
        if (!currentConversationId && data.conversation_id) {
          setCurrentConversationId(data.conversation_id);
          fetchHistory(userId);
        }
        const aiMsg: Message = {
          role: 'assistant',
          content: data.answer,
          timestamp: new Date().toISOString(),
          citations: data.law_citations,
          rights: data.rights || [],
          action_steps: data.action_steps || [],
          disclaimer: data.disclaimer,
        };
        setMessages(prev => [...prev, aiMsg]);
      } else {
        const data = await res.json();
        setErrorMessage(data.detail || 'Failed to generate response.');
      }
    } catch { setErrorMessage('Network error: Cannot reach the backend API.'); }
    finally { setLoading(false); }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); }
  };

  const toggleCitation = (section: string) => {
    setExpandedCitation(prev => prev === section ? null : section);
  };

  const suggestions = [
    { text: "My employer fired me without notice.", label: "Wrongful Firing" },
    { text: "My landlord is not returning my security deposit.", label: "Deposit Dispute" },
    { text: "Can police search my phone without permission?", label: "Police Search" },
    { text: "I received a defective product and the seller refuses a refund.", label: "Defective Product" },
  ];

  const getFilteredSituations = () => {
    if (searchQuery.trim()) {
      return situations.filter(s =>
        s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.category.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    if (selectedCategory?.id === 'bookmarks') return situations.filter(s => bookmarks.includes(s.situation_id));
    return situations.filter(s => s.category === selectedCategory?.id);
  };

  const filteredSituations = getFilteredSituations();

  const handleNavigate = (tab: string) => {
    if (tab === 'chat') { setActiveTab('chat'); }
    else if (tab === 'situations') { setActiveTab('situations'); setSitScreen('categories'); setSearchQuery(''); }
    else if (tab === 'rights') setActiveTab('rights');
    else if (tab === 'deadlines') setActiveTab('deadlines');
    else if (tab === 'wizard') setActiveTab('wizard');
    else if (tab === 'profile') setActiveTab('profile');
    else if (tab === 'home') setActiveTab('home');
  };

  // SVG icons for bottom nav
  const navItems: { key: ActiveTab; label: string; icon: React.ReactNode }[] = [
    {
      key: 'home', label: 'Home',
      icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>
    },
    {
      key: 'chat', label: 'Chat',
      icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
    },
    {
      key: 'wizard', label: 'Wizard',
      icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>
    },
    {
      key: 'situations', label: 'Situations',
      icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
    },
    {
      key: 'deadlines', label: 'Monitor',
      icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /><path d="m9 16 2 2 4-4" /></svg>
    },
    {
      key: 'profile', label: 'Profile',
      icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
    },
  ];

  return (
    <div className="phone-mockup-wrapper">
      <div className="phone-container">
        <main className="chat-workspace">

          {/* === HOME SCREEN === */}
          {activeTab === 'home' && (
            <HomeScreen
              onNavigate={handleNavigate}
              situations={situations}
              recentlyViewed={recentlyViewed}
              openSituationDetail={(id) => { openSituationDetail(id); setActiveTab('situations'); }}
            />
          )}

          {/* === CHAT SCREEN === */}
          {activeTab === 'chat' && (
            <ChatbotTab
              messages={messages}
              inputValue={inputValue}
              setInputValue={setInputValue}
              loading={loading}
              errorMessage={errorMessage}
              expandedCitation={expandedCitation}
              toggleCitation={toggleCitation}
              LAW_DETAILS_MAP={LAW_DETAILS_MAP}
              handleSendMessage={handleSendMessage}
              handleKeyPress={handleKeyPress}
              suggestions={suggestions}
              messagesEndRef={messagesEndRef}
              onBack={() => setActiveTab('home')}
              startNewChat={startNewChat}
              conversations={conversations}
              selectConversation={selectConversation}
              deleteConversation={deleteConversation}
              userId={userId}
              backendUrl={BACKEND_URL}
            />
          )}

          {/* === SITUATION FINDER SCREEN === */}
          {activeTab === 'situations' && (
            <SituationFinderTab
              screen={sitScreen}
              setScreen={setSitScreen}
              categories={categories}
              situations={situations}
              bookmarks={bookmarks}
              recentlyViewed={recentlyViewed}
              selectedCategory={selectedCategory}
              setSelectedCategory={setSelectedCategory}
              selectedSituation={selectedSituation}
              openSituationDetail={openSituationDetail}
              toggleBookmark={toggleBookmark}
              getCategoryIcon={getCategoryIcon}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              situationsLoading={situationsLoading}
              filteredSituations={filteredSituations}
              LAW_DETAILS_MAP={LAW_DETAILS_MAP}
              onBackHome={() => handleNavigate('home')}
              onOpenWizard={() => handleNavigate('wizard')}
            />

          )}

          {/* === DAILY RIGHTS / DOCUMENTS (accessed via Profile) === */}
          {activeTab === 'rights' && (
            <DailyRightsScreen
              bookmarks={bookmarks}
              toggleBookmark={toggleBookmark}
              onBackHome={() => handleNavigate('home')}
            />
          )}

          {/* === MODULE 3: LEGAL HEALTH MONITOR / DEADLINE ENGINE === */}
          {activeTab === 'deadlines' && (
            <DeadlineDashboard userId={userId} onBackHome={() => handleNavigate('home')} />
          )}

          {/* === MODULE 4: WIZARD SCREEN === */}
          {activeTab === 'wizard' && (
            <WizardScreen userId={userId} onBackHome={() => handleNavigate('home')} />
          )}

          {/* === PROFILE SCREEN === */}
          {activeTab === 'profile' && (
            <div className="profile-screen animate-fade-in" style={{ position: 'relative' }}>
              <div className="profile-header">
                <button
                  onClick={() => handleNavigate('home')}
                  style={{
                    position: 'absolute',
                    top: 52,
                    left: 20,
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: 0,
                    display: 'flex',
                    alignItems: 'center',
                    color: '#1a1a5e'
                  }}
                  title="Back to Home"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="20" height="20">
                    <polyline points="15 18 9 12 15 6" />
                  </svg>
                </button>
                <div className="profile-avatar">
                  <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" width="36" height="36">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
                  </svg>
                </div>
                <h2>Legal User</h2>
                <p>{userId || 'LegalAce Member'}</p>
                <div className="profile-stat-row">
                  <div className="profile-stat">
                    <strong>{conversations.length}</strong>
                    <span>Consultations</span>
                  </div>
                  <div className="profile-stat">
                    <strong>{bookmarks.length}</strong>
                    <span>Bookmarks</span>
                  </div>
                  <div className="profile-stat">
                    <strong>{recentlyViewed.length}</strong>
                    <span>Viewed</span>
                  </div>
                </div>
              </div>

              <div className="profile-menu-list">
                {[
                  { label: 'Legal Health Monitor', desc: 'Deadlines & health score', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20"><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /><path d="m9 16 2 2 4-4" /></svg>, action: () => setActiveTab('deadlines') },
                  { label: 'Saved Situations', desc: `${bookmarks.length} bookmarked`, icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20"><path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z" /></svg>, action: () => { setActiveTab('situations'); setSitScreen('categories'); setSelectedCategory({ id: 'bookmarks', name: 'Bookmarks' }); } },
                  { label: 'Chat History', desc: `${conversations.length} conversations`, icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>, action: () => setActiveTab('chat') },
                  { label: 'Daily Rights', desc: 'Know your rights', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>, action: () => setActiveTab('rights') },
                  { label: 'About LegalAce', desc: 'Legal AI Platform v1.0', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20"><circle cx="12" cy="12" r="10" /><path d="M12 8v4l3 3" /></svg>, action: () => alert('LegalAce v1.0 — AI-powered Indian Law Companion.\n\nModules:\n  1. AI Chatbot (RAG + FAISS + OpenAI)\n  2. Situation Finder\n  3. Legal Health Monitor\n\nFor educational use only.') },
                ].map((item, i) => (
                  <div className="profile-menu-item" key={i} onClick={item.action}>
                    <div className="profile-menu-icon">{item.icon}</div>
                    <div className="profile-menu-text">
                      <strong>{item.label}</strong>
                      <span>{item.desc}</span>
                    </div>
                    <div className="chevron-right">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                        <polyline points="9 18 15 12 9 6" />
                      </svg>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* === BOTTOM NAVIGATION BAR === */}
          <div className="bottom-navigation-bar">
            {navItems.map(({ key, label, icon }) => (
              <button
                key={key}
                className={`nav-tab-item${activeTab === key ? ' active' : ''}`}
                onClick={() => handleNavigate(key)}
              >
                <div className="nav-icon-wrap">{icon}</div>
                <span className="tab-item-label">{label}</span>
              </button>
            ))}
          </div>

        </main>
      </div>
    </div>
  );
}
