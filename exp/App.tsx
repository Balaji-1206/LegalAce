import React, { useState, useEffect } from 'react';
import { StyleSheet, View, StatusBar } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';

import Colors from './src/theme/colors';
import { API_BASE_URL } from './src/config/api';
import {
  ActiveTab,
  CategoryItem,
  SituationDetail,
  Message,
  ConversationSummary,
} from './src/types';

import Header from './src/components/Header';
import BottomNav from './src/components/BottomNav';
import ToastProvider from './src/components/Toast';
import SpotlightSearchModal from './src/components/SpotlightSearchModal';
import FloatingChatWidget from './src/components/FloatingChatWidget';

import HomeScreen from './src/screens/HomeScreen';
import SituationFinderScreen from './src/screens/SituationFinderScreen';
import WizardScreen from './src/screens/WizardScreen';
import DeadlineScreen from './src/screens/DeadlineScreen';
import DocumentXRayScreen from './src/screens/DocumentXRayScreen';
import LegalAidScreen from './src/screens/LegalAidScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import DailyRightsScreen from './src/screens/DailyRightsScreen';

const LAW_DETAILS_MAP: Record<string, string> = {
  'Section 2(7)': 'Consumer means any person who buys any goods for a consideration which has been paid or promised...',
  'Section 35': 'A complaint may be filed by a consumer in District Commission having jurisdiction...',
  'Section 39': 'If the District Commission is satisfied that goods suffer from defects... it shall issue an order to replace, refund, or compensate.',
  'Section 2(47)': 'Unfair trade practice means a trade practice adopting deceptive methods.',
  'Section 106': 'A lease of immovable property shall be deemed to be a lease from year to year or month to month.',
  'Section 108(q)': 'The lessor is bound to refund the security deposit to the lessee on vacating, deducting legitimate dues.',
  'Section 25F': 'No workman in continuous service for not less than one year shall be retrenched without one month notice and compensation.',
  'Section 165': 'A police officer may search after recording grounds in writing.',
  'Section 66': 'Accessing someone mobile or computer without permission is punishable with up to 3 years imprisonment or fine.',
  'Article 21': 'Right to Life and Personal Liberty. Privacy is a fundamental constitutional right.',
  'Section 12': 'DV Act — Magistrate application for protection orders. First hearing within 3 days.',
  'Section 11': 'Model Tenancy Act — Security deposit restricted to 2 months rent.',
  'Section 18': 'RERA — Builders must return payment with interest if possession is delayed.',
  'Section 46': 'CrPC — Restricts arrest of women between sunset and sunrise.',
  'Section 50': 'CrPC — Police must inform arrested person of grounds of arrest and right to bail.',
};

const FALLBACK_CATEGORIES: CategoryItem[] = [
  { id: 'employment', name: 'Employment', icon: '💼', situation_count: 2 },
  { id: 'housing', name: 'Housing & Renting', icon: '🏠', situation_count: 2 },
  { id: 'consumer', name: 'Consumer Rights', icon: '🛒', situation_count: 2 },
  { id: 'banking', name: 'Banking & Finance', icon: '🏦', situation_count: 2 },
  { id: 'cyber_crime', name: 'Cyber Crime', icon: '🛡️', situation_count: 2 },
  { id: 'traffic', name: 'Traffic Rules', icon: '🚗', situation_count: 2 },
  { id: 'women_rights', name: 'Women Rights', icon: '👩', situation_count: 2 },
  { id: 'education', name: 'Education', icon: '🎓', situation_count: 2 },
  { id: 'cheque_debt', name: 'Cheque Bounce & Debt', icon: '💳', situation_count: 1 },
  { id: 'rti', name: 'RTI & Public Service', icon: '📜', situation_count: 1 },
  { id: 'real_estate', name: 'RERA Real Estate', icon: '🏢', situation_count: 1 },
  { id: 'insurance', name: 'Insurance & Health', icon: '🏥', situation_count: 1 },
  { id: 'family', name: 'Family & Support', icon: '👨‍👩‍👧', situation_count: 1 },
];

const SUGGESTIONS = [
  { text: 'My employer fired me without notice.', label: 'Wrongful Firing' },
  { text: 'My landlord is not returning my security deposit.', label: 'Deposit Dispute' },
  { text: 'Can police search my phone without permission?', label: 'Police Search' },
  { text: 'I received a defective product and the seller refuses a refund.', label: 'Defective Product' },
];

export default function App() {
  const [userId, setUserId] = useState<string>('user_mobile');
  const [activeTab, setActiveTab] = useState<ActiveTab>('home');
  const [categories, setCategories] = useState<CategoryItem[]>(FALLBACK_CATEGORIES);
  const [situations, setSituations] = useState<SituationDetail[]>([]);
  const [bookmarks, setBookmarks] = useState<string[]>([]);
  const [recentlyViewed, setRecentlyViewed] = useState<string[]>([]);
  const [selectedSituation, setSelectedSituation] = useState<SituationDetail | null>(null);
  const [situationScreen, setSituationScreen] = useState<'categories' | 'list' | 'detail'>('categories');
  const [selectedCategory, setSelectedCategory] = useState<CategoryItem | null>(null);
  const [situationSearchQuery, setSituationSearchQuery] = useState<string>('');

  // Chat State
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [expandedCitation, setExpandedCitation] = useState<string | null>(null);
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [isSpotlightOpen, setIsSpotlightOpen] = useState(false);

  // Load Initial State from AsyncStorage & Backend API
  useEffect(() => {
    let ignore = false;

    async function init() {
      try {
        let storedId = await AsyncStorage.getItem('legalace_user_id');
        if (!storedId) {
          storedId = 'user_' + Math.random().toString(36).substring(2, 11);
          await AsyncStorage.setItem('legalace_user_id', storedId);
        }
        if (!ignore) setUserId(storedId);

        const storedBm = await AsyncStorage.getItem('legalace_bookmarks');
        if (storedBm && !ignore) setBookmarks(JSON.parse(storedBm));

        const storedRv = await AsyncStorage.getItem('legalace_recently_viewed');
        if (storedRv && !ignore) setRecentlyViewed(JSON.parse(storedRv));

        // Fetch user conversation history
        try {
          const convRes = await fetch(`${API_BASE_URL}/api/v1/conversation/history/${storedId}`);
          if (convRes.ok && !ignore) {
            const convData = await convRes.json();
            if (convData.conversations) {
              setConversations(convData.conversations);
            }
          }
        } catch { /* offline */ }
      } catch { /* storage offline */ }

      // Fetch categories & situations from backend
      try {
        const [catRes, sitRes] = await Promise.all([
          fetch(`${API_BASE_URL}/api/v1/situations/categories`),
          fetch(`${API_BASE_URL}/api/v1/situations`),
        ]);

        if (catRes.ok && !ignore) {
          const fetchedCats = await catRes.json();
          setCategories(fetchedCats);
        }
        if (sitRes.ok && !ignore) {
          const fetchedSits = await sitRes.json();
          setSituations(fetchedSits);
        }
      } catch {
        // Fallback demo situations if backend is starting up
        if (!ignore) {
          setSituations([
            {
              situation_id: 'sit_retrenchment',
              title: 'Wrongful Job Termination Without Notice',
              category: 'employment',
              description: 'Employer terminating service immediately without 30 days notice or retrenchment compensation.',
              user_rights: [
                'Right to 30 days written notice or pay in lieu (Sec 25F Industrial Disputes Act).',
                'Right to retrenchment compensation (15 days average pay per completed year).',
                'Protection against arbitrary firing without enquiry.',
              ],
              action_steps: [
                'Collect appointment letter, salary slips, and written email termination order.',
                'Issue a statutory legal demand notice through an advocate or registered speed post.',
                'File a conciliation petition before the Regional Labour Commissioner (ALC).',
              ],
              applicable_laws: [
                { act: 'Industrial Disputes Act, 1947', section: 'Section 25F', section_title: 'Conditions precedent to retrenchment' },
              ],
            },
            {
              situation_id: 'sit_security_deposit',
              title: 'Landlord Withholding Security Deposit',
              category: 'housing',
              description: 'Owner refusing to refund the rental advance after peaceful handover of keys.',
              user_rights: [
                'Mandatory return of deposit within 30 days of vacating under Model Tenancy Act.',
                'Landlord cannot make arbitrary deductions without providing itemized repair bills.',
                'Capped maximum deposit of 2 months rent for residential premises.',
              ],
              action_steps: [
                'Send keys via registered acknowledgement or video record key handover.',
                'Issue a 15-day statutory demand notice seeking refund with 18% interest.',
                'Approach the Rent Authority / Rent Tribunal under Tenancy Act.',
              ],
              applicable_laws: [
                { act: 'Model Tenancy Act, 2021', section: 'Section 11', section_title: 'Security Deposit Rules' },
                { act: 'Transfer of Property Act, 1882', section: 'Section 108(q)', section_title: 'Refund of Lessee Advances' },
              ],
            },
            {
              situation_id: 'sit_phone_search',
              title: 'Police Searching Mobile Device During Check',
              category: 'cyber_crime',
              description: 'Police officer demanding device unlock or checking WhatsApp messages on public road.',
              user_rights: [
                'Police cannot arbitrarily search phone contents without recorded reasonable suspicion (CrPC 165).',
                'Right to privacy is a fundamental constitutional guarantee under Article 21 (Puttaswamy 2017).',
                'Right to remain silent against self-incrimination under Article 20(3).',
              ],
              action_steps: [
                'Politely ask for the officer name, badge number, and legal provision under which search is demanded.',
                'Do not consent to arbitrary copying of private photos or chats.',
                'Complain to the Superintendent of Police (SP) or State Police Complaints Authority if harassed.',
              ],
              applicable_laws: [
                { act: 'Code of Criminal Procedure, 1973', section: 'Section 165', section_title: 'Search by Police Officer' },
                { act: 'Constitution of India', section: 'Article 21', section_title: 'Protection of Life and Personal Liberty' },
              ],
            },
            {
              situation_id: 'sit_defective_product',
              title: 'Defective Product & E-Commerce Refund Denial',
              category: 'consumer',
              description: 'Seller or platform refusing return or replacement of malfunctioning electronics.',
              user_rights: [
                'Right to replacement or 100% refund with interest under Section 39 Consumer Protection Act.',
                'Protection against unfair trade practices and misleading warranty terms.',
                'Right to file e-Daakhil consumer complaint from home without hiring a lawyer.',
              ],
              action_steps: [
                'Preserve purchase invoice, unboxing photos/video, and courier delivery slip.',
                'Lodge grievance on National Consumer Helpline (NCH Portal / 1915).',
                'File complaint before District Consumer Disputes Redressal Commission via e-Daakhil.',
              ],
              applicable_laws: [
                { act: 'Consumer Protection Act, 2019', section: 'Section 35', section_title: 'Manner of Consumer Complaint' },
                { act: 'Consumer Protection Act, 2019', section: 'Section 39', section_title: 'Order by District Commission' },
              ],
            },
          ]);
        }
      }
    }

    init();
    return () => { ignore = true; };
  }, []);

  const toggleBookmark = async (id: string) => {
    const updated = bookmarks.includes(id)
      ? bookmarks.filter(b => b !== id)
      : [...bookmarks, id];
    setBookmarks(updated);
    try {
      await AsyncStorage.setItem('legalace_bookmarks', JSON.stringify(updated));
    } catch { /* offline */ }
  };

  const handleNavigate = (tab: ActiveTab, categoryId?: string) => {
    if (tab === 'situations') {
      setActiveTab('situations');
      setSelectedSituation(null);
      if (categoryId) {
        const cat = categories.find(c => c.id === categoryId) || null;
        setSelectedCategory(cat);
        setSituationScreen('list');
      } else {
        setSelectedCategory(null);
        setSituationScreen('categories');
      }
      setSituationSearchQuery('');
    } else {
      setActiveTab(tab);
    }
  };

  const openSituationDetail = async (situationId: string) => {
    const sit = situations.find(s => s.situation_id === situationId) || null;
    setSelectedSituation(sit);
    setSituationScreen('detail');
    setActiveTab('situations');

    const filtered = recentlyViewed.filter(id => id !== situationId);
    const updated = [situationId, ...filtered].slice(0, 5);
    setRecentlyViewed(updated);
    try {
      await AsyncStorage.setItem('legalace_recently_viewed', JSON.stringify(updated));
    } catch { /* offline */ }

    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/situations/${situationId}`);
      if (res.ok) {
        const freshSit = await res.json();
        setSelectedSituation(freshSit);
        setSituations(prev => prev.map(s => s.situation_id === situationId ? freshSit : s));
      }
    } catch { /* use local */ }
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
      let res = await fetch(`${API_BASE_URL}/api/v1/agent/execute-sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          conversation_id: activeConversationId || undefined,
          message: text,
          agent_mode: 'general',
        }),
      });

      if (res.status === 404) {
        res = await fetch(`${API_BASE_URL}/api/v1/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: userId,
            conversation_id: activeConversationId || undefined,
            message: text,
          }),
        });
      }

      if (res.ok) {
        const data = await res.json();
        if (data.conversation_id) {
          setActiveConversationId(data.conversation_id);
        }
        const aiMsg: Message = {
          role: 'assistant',
          content: data.final_answer || data.answer || '',
          timestamp: new Date().toISOString(),
          citations: data.law_citations || [],
          rights: data.rights || [],
          action_steps: data.action_steps || [],
          disclaimer: data.disclaimer || 'For educational purposes under Indian law.',
        };
        setMessages(prev => [...prev, aiMsg]);
      } else {
        const errData = await res.json().catch(() => ({}));
        setErrorMessage(errData.detail || 'Could not generate legal response.');
      }
    } catch {
      setErrorMessage('Network error: Unable to reach FastAPI backend server.');
    } finally {
      setLoading(false);
    }
  };

  const startNewChat = () => {
    setActiveConversationId(null);
    setMessages([]);
    setErrorMessage(null);
    setExpandedCitation(null);
  };

  return (
    <SafeAreaProvider>
      <ToastProvider>
        <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
          <StatusBar barStyle="dark-content" backgroundColor={Colors.bg} />

          {/* Main Active Screen Area */}
          <View style={styles.screenContainer}>
            {activeTab === 'home' && (
              <HomeScreen
                userId={userId}
                categories={categories}
                onNavigate={handleNavigate}
                situations={situations}
                recentlyViewed={recentlyViewed}
                openSituationDetail={openSituationDetail}
                onOpenSpotlight={() => setIsSpotlightOpen(true)}
              />
            )}

            {activeTab === 'situations' && (
              <SituationFinderScreen
                screen={situationScreen}
                setScreen={setSituationScreen}
                categories={categories}
                situations={situations}
                bookmarks={bookmarks}
                toggleBookmark={toggleBookmark}
                onOpenWizard={() => handleNavigate('wizard')}
                selectedCategory={selectedCategory}
                setSelectedCategory={setSelectedCategory}
                selectedSituation={selectedSituation}
                onSelectSituation={setSelectedSituation}
                searchQuery={situationSearchQuery}
                setSearchQuery={setSituationSearchQuery}
                LAW_DETAILS_MAP={LAW_DETAILS_MAP}
                onBackHome={() => handleNavigate('home')}
              />
            )}

            {activeTab === 'wizard' && (
              <WizardScreen
                userId={userId}
                onBackHome={() => handleNavigate('home')}
              />
            )}

            {activeTab === 'deadlines' && (
              <DeadlineScreen
                userId={userId}
                onBackHome={() => handleNavigate('home')}
              />
            )}

            {activeTab === 'xray' && (
              <DocumentXRayScreen
                userId={userId}
                onBackHome={() => handleNavigate('home')}
                onNavigateDeadlines={() => handleNavigate('deadlines')}
                onNavigateWizard={() => handleNavigate('wizard')}
              />
            )}

            {activeTab === 'legalaid' && (
              <LegalAidScreen
                onBackHome={() => handleNavigate('home')}
              />
            )}

            {activeTab === 'profile' && (
              <ProfileScreen
                userId={userId}
                conversations={conversations}
                bookmarks={bookmarks}
                recentlyViewed={recentlyViewed}
                onNavigate={handleNavigate}
                onOpenSaved={() => {
                  setActiveTab('situations');
                  setSelectedSituation(null);
                  setSelectedCategory({ id: 'bookmarks', name: 'Saved Situations', icon: '⭐' } as any);
                  setSituationScreen('list');
                }}
              />
            )}

            {activeTab === 'rights' && (
              <DailyRightsScreen
                bookmarks={bookmarks}
                toggleBookmark={toggleBookmark}
                onBackHome={() => handleNavigate('home')}
              />
            )}
          </View>

          {/* Floating AI Legal Chatbot Widget */}
          <FloatingChatWidget
            messages={messages}
            inputValue={inputValue}
            setInputValue={setInputValue}
            loading={loading}
            errorMessage={errorMessage}
            expandedCitation={expandedCitation}
            toggleCitation={(sec) => setExpandedCitation(prev => prev === sec ? null : sec)}
            LAW_DETAILS_MAP={LAW_DETAILS_MAP}
            handleSendMessage={handleSendMessage}
            suggestions={SUGGESTIONS}
            startNewChat={startNewChat}
            userId={userId}
            backendUrl={API_BASE_URL}
          />

          {/* Bottom 5-Tab Navigation Bar */}
          <BottomNav activeTab={activeTab} onSelectTab={handleNavigate} />

          {/* Spotlight Search Modal (Cmd+K) */}
          <SpotlightSearchModal
            isOpen={isSpotlightOpen}
            onClose={() => setIsSpotlightOpen(false)}
            situations={situations}
            onSelectSituation={(id) => {
              openSituationDetail(id);
              setIsSpotlightOpen(false);
            }}
            onNavigateTool={(tool) => {
              handleNavigate(tool as ActiveTab);
              setIsSpotlightOpen(false);
            }}
          />
        </SafeAreaView>
      </ToastProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  screenContainer: {
    flex: 1,
  },
});
