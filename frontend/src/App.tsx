import React, { useState, useEffect, useRef } from 'react';
import './App.css';
import type { Message, ConversationSummary } from './modules/shared/types';
import HomeScreen from './modules/shared/HomeScreen';
import DailyRightsScreen from './modules/shared/DailyRightsScreen';
import { FloatingChatWidget } from './modules/chatbot/FloatingChatWidget';
import { SituationFinderTab } from './modules/situation_finder/SituationFinderTab';
import { DeadlineDashboard } from './modules/deadline_engine/DeadlineDashboard';
import { WizardScreen } from './modules/wizard/WizardScreen';
import ProfileScreen from './modules/profile/ProfileScreen';
import { DocumentXRayTab } from './modules/document_xray/DocumentXRayTab';
import { LegalAidChecker } from './modules/legal_aid/LegalAidChecker';
import { ToastProvider } from './modules/shared/ToastContext';
import { SpotlightSearchModal } from './modules/shared/SpotlightSearchModal';
import { API_BASE_URL } from './config/api';

const BACKEND_URL = API_BASE_URL;

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
  { id: "banking", name: "Banking & Finance", icon: "🏦", color_gradient: ["#06b6d4", "#0891b2"], situation_count: 2 },
  { id: "cyber_crime", name: "Cyber Crime", icon: "🛡️", color_gradient: ["#ec4899", "#be185d"], situation_count: 2 },
  { id: "traffic", name: "Traffic Rules", icon: "🚗", color_gradient: ["#f43f5e", "#e11d48"], situation_count: 2 },
  { id: "women_rights", name: "Women Rights", icon: "👩", color_gradient: ["#a855f7", "#7e22ce"], situation_count: 2 },
  { id: "education", name: "Education", icon: "🎓", color_gradient: ["#14b8a6", "#0d9488"], situation_count: 2 },
  { id: "cheque_debt", name: "Cheque Bounce & Debt", icon: "💳", color_gradient: ["#ef4444", "#b91c1c"], situation_count: 1 },
  { id: "rti", name: "RTI & Public Service", icon: "📜", color_gradient: ["#f97316", "#c2410c"], situation_count: 1 },
  { id: "real_estate", name: "RERA Real Estate", icon: "🏢", color_gradient: ["#6366f1", "#4338ca"], situation_count: 1 },
  { id: "insurance", name: "Insurance & Health", icon: "🏥", color_gradient: ["#ec4899", "#be185d"], situation_count: 1 },
  { id: "family", name: "Family & Support", icon: "👨‍👩‍👧", color_gradient: ["#84cc16", "#4d7c0f"], situation_count: 1 },
];

type ActiveTab = 'home' | 'situations' | 'deadlines' | 'wizard' | 'rights' | 'profile' | 'xray' | 'legalaid';

interface CategoryItem {
  id: string;
  name: string;
  icon: string;
  color_gradient?: string[];
  situation_count?: number;
}

interface SituationData {
  situation_id: string;
  title: string;
  category: string;
  description?: string;
  [key: string]: unknown;
}

interface PendingActionRaw {
  action_id?: string;
  action_type?: string;
  title?: string;
  details?: Record<string, unknown>;
  prompt_text?: string;
}

interface RawMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: string;
  citations?: { act: string; section: string; section_title: string; relevance_score: number }[];
  rights?: string[];
  action_steps?: string[];
  disclaimer?: string;
}

export default function App() {
  const [userId] = useState<string>(() => {
    let id = localStorage.getItem('legalace_user_id');
    if (!id) {
      id = 'user_' + Math.random().toString(36).substring(2, 11);
      localStorage.setItem('legalace_user_id', id);
    }
    return id;
  });

  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [expandedCitation, setExpandedCitation] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<ActiveTab>('home');
  const [sitScreen, setSitScreen] = useState<'categories' | 'list' | 'detail'>('categories');
  const [categories, setCategories] = useState<CategoryItem[]>(() => {
    const cachedCats = localStorage.getItem('legalace_cached_categories');
    return cachedCats ? JSON.parse(cachedCats) : FALLBACK_CATEGORIES;
  });
  const [situations, setSituations] = useState<SituationData[]>(() => {
    const cachedSits = localStorage.getItem('legalace_cached_situations');
    return cachedSits ? JSON.parse(cachedSits) : [];
  });
  const [bookmarks, setBookmarks] = useState<string[]>(() => {
    const savedBookmarks = localStorage.getItem('legalace_bookmarks');
    return savedBookmarks ? JSON.parse(savedBookmarks) : [];
  });
  const [recentlyViewed, setRecentlyViewed] = useState<string[]>(() => {
    const savedRecents = localStorage.getItem('legalace_recently_viewed');
    return savedRecents ? JSON.parse(savedRecents) : [];
  });
  const [isSpotlightOpen, setIsSpotlightOpen] = useState<boolean>(false);
  const [selectedCategory, setSelectedCategory] = useState<CategoryItem | null>(null);
  const [, setSelectedSituationId] = useState<string | null>(null);
  const [selectedSituation, setSelectedSituation] = useState<SituationData | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [situationsLoading, setSituationsLoading] = useState<boolean>(false);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    let ignore = false;

    async function loadInitialData() {
      try {
        const histRes = await fetch(`${BACKEND_URL}/api/v1/conversation/history/${userId}`);
        if (histRes.ok && !ignore) {
          const data = await histRes.json();
          setConversations(data.conversations || []);
        }
      } catch { /* offline */ }

      try {
        setSituationsLoading(true);
        const catRes = await fetch(`${BACKEND_URL}/api/v1/situations/categories`);
        if (catRes.ok && !ignore) {
          const fetchedCats = await catRes.json();
          setCategories(fetchedCats);
          localStorage.setItem('legalace_cached_categories', JSON.stringify(fetchedCats));
        }
        const sitRes = await fetch(`${BACKEND_URL}/api/v1/situations`);
        if (sitRes.ok && !ignore) {
          const fetchedSits = await sitRes.json();
          setSituations(fetchedSits);
          localStorage.setItem('legalace_cached_situations', JSON.stringify(fetchedSits));
        }
      } catch {
        /* fallback handled by lazy initial state */
      } finally {
        if (!ignore) setSituationsLoading(false);
      }
    }

    loadInitialData();
    return () => { ignore = true; };
  }, [userId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

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

  const selectConversation = async (conversationId: string) => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const res = await fetch(`${BACKEND_URL}/api/v1/conversation/${conversationId}`);
      if (res.ok) {
        const data = await res.json();
        setCurrentConversationId(data.conversation_id);
        const formattedMessages: Message[] = (data.messages || []).map((m: RawMessage) => ({
          role: m.role,
          content: m.content,
          timestamp: m.timestamp || new Date().toISOString(),
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

  const handleStopResponse = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setLoading(false);
    setMessages(prev => [
      ...prev,
      {
        role: 'assistant',
        content: '⏹️ *Response generation stopped by user.*',
        timestamp: new Date().toISOString(),
      }
    ]);
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

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputValue).trim();
    if (!text) return;

    const userMsg: Message = { role: 'user', content: text, timestamp: new Date().toISOString() };
    setMessages(prev => [...prev, userMsg]);
    if (!textToSend) setInputValue('');
    setLoading(true);
    setErrorMessage(null);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      let res = await fetch(`${BACKEND_URL}/api/v1/agent/execute-sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({ user_id: userId, conversation_id: currentConversationId, message: text, agent_mode: 'general' }),
      });

      if (res.status === 404) {
        // Server running pre-agent route cache — fallback to /api/v1/chat
        res = await fetch(`${BACKEND_URL}/api/v1/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
          body: JSON.stringify({ user_id: userId, conversation_id: currentConversationId, message: text }),
        });
      }

      if (res.ok) {
        const data = await res.json();
        if (!currentConversationId && data.conversation_id) {
          setCurrentConversationId(data.conversation_id);
          fetchHistory(userId);
        }
        const aiMsg: Message = {
          role: 'assistant',
          content: data.final_answer || data.answer || '',
          timestamp: new Date().toISOString(),
          citations: data.law_citations || [],
          rights: data.rights || [],
          action_steps: data.action_steps || [],
          disclaimer: data.disclaimer || 'For educational purposes under Indian law.',
          reasoning_trace: data.reasoning_trace || [],
          pending_actions: (data.pending_actions || []).map((p: PendingActionRaw) => ({
            action_id: p.action_id || '',
            action_type: p.action_type || '',
            title: p.title || '',
            details: p.details || {},
            prompt_text: p.prompt_text || '',
            status: 'pending' as const,
          })),
          plan_objective: data.objective || '',
        };
        setMessages(prev => [...prev, aiMsg]);
      } else {
        const data = await res.json();
        setErrorMessage(data.detail || 'Failed to generate response.');
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') {
        // Aborted cleanly by stop button
        return;
      }
      setErrorMessage('Network error: Cannot reach the backend API.');
    } finally {
      setLoading(false);
      abortControllerRef.current = null;
    }
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
        (s.description || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.category.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    if (selectedCategory?.id === 'bookmarks') return situations.filter(s => bookmarks.includes(s.situation_id));
    return situations.filter(s => s.category === selectedCategory?.id);
  };

  const filteredSituations = getFilteredSituations();

  const handleNavigate = (tab: string) => {
    if (tab === 'situations') { setActiveTab('situations'); setSitScreen('categories'); setSearchQuery(''); }
    else if (tab === 'rights') setActiveTab('rights');
    else if (tab === 'deadlines') setActiveTab('deadlines');
    else if (tab === 'wizard') setActiveTab('wizard');
    else if (tab === 'profile') setActiveTab('profile');
    else if (tab === 'xray') setActiveTab('xray');
    else if (tab === 'legalaid') setActiveTab('legalaid');
    else if (tab === 'home') setActiveTab('home');
  };

  // SVG icons for bottom nav
  const navItems: { key: ActiveTab; label: string; icon: React.ReactNode }[] = [
    {
      key: 'home', label: 'Home',
      icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>
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

  void selectConversation;
  void deleteConversation;

  return (
    <ToastProvider>
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
                onOpenSpotlight={() => setIsSpotlightOpen(true)}
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
                onOpenSpotlight={() => setIsSpotlightOpen(true)}
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

          {/* === FEATURE 3: DOCUMENT X-RAY === */}
          {activeTab === 'xray' && (
            <DocumentXRayTab
              userId={userId}
              onBackHome={() => handleNavigate('home')}
              onNavigateDeadlines={() => handleNavigate('deadlines')}
              onNavigateWizard={() => handleNavigate('wizard')}
            />
          )}

          {/* === FEATURE 5: LEGAL AID CHECKER === */}
          {activeTab === 'legalaid' && (
            <LegalAidChecker onBack={() => handleNavigate('home')} />
          )}

          {/* === PROFILE SCREEN === */}
          {activeTab === 'profile' && (
            <ProfileScreen
              userId={userId}
              conversations={conversations}
              bookmarks={bookmarks}
              recentlyViewed={recentlyViewed}
              onNavigate={(tab) => handleNavigate(tab as ActiveTab)}
              onOpenSaved={() => {
                setActiveTab('situations');
                setSitScreen('categories');
                setSelectedCategory({ id: 'bookmarks', name: 'Bookmarks', icon: '⭐' });
              }}
            />
          )}

          {/* === FLOATING AGENTIC AI CHATBOT WIDGET === */}
          <FloatingChatWidget
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
            startNewChat={startNewChat}
            userId={userId}
            backendUrl={BACKEND_URL}
            handleStopResponse={handleStopResponse}
          />

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

            {/* === SPOTLIGHT SEARCH MODAL === */}
            <SpotlightSearchModal
              isOpen={isSpotlightOpen}
              onClose={() => setIsSpotlightOpen(false)}
              situations={situations}
              onSelectSituation={(id) => {
                openSituationDetail(id);
                setActiveTab('situations');
              }}
              onNavigateTool={(tab) => handleNavigate(tab as ActiveTab)}
            />

          </main>
        </div>
      </div>
    </ToastProvider>
  );
}
