import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, StatusBar } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';

import Colors from './src/theme/colors';
import { API_BASE_URL } from './src/config/api';
import {
  ActiveTab,
  CategoryItem,
  SituationDetail,
  Message,
  ConversationSummary,
} from './src/types';
import { SupportedLang, getSavedLanguage, saveLanguage } from './src/config/i18n';
import {
  saveToOfflineCache,
  loadFromOfflineCache,
  CACHE_KEYS,
  STATIC_OFFLINE_SITUATIONS,
} from './src/config/offlineCache';

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
  const [activeLang, setActiveLang] = useState<SupportedLang>('en');
  const [isOffline, setIsOffline] = useState(false);

  // Load Initial State from AsyncStorage & Backend API
  useEffect(() => {
    let ignore = false;

    async function init() {
      try {
        // 1. Parallel storage hydration across native bridge in a single batch
        const [storedIdRaw, storedBm, storedRv, savedLang, cachedSits, cachedCats] = await Promise.all([
          AsyncStorage.getItem('legalace_user_id'),
          AsyncStorage.getItem('legalace_bookmarks'),
          AsyncStorage.getItem('legalace_recently_viewed'),
          getSavedLanguage(),
          loadFromOfflineCache<SituationDetail[]>(CACHE_KEYS.SITUATIONS),
          loadFromOfflineCache<CategoryItem[]>(CACHE_KEYS.CATEGORIES),
        ]);

        let storedId = storedIdRaw;
        if (!storedId) {
          storedId = 'user_' + Math.random().toString(36).substring(2, 11);
          AsyncStorage.setItem('legalace_user_id', storedId).catch(() => {});
        }

        if (!ignore) {
          setUserId(storedId);
          if (storedBm) setBookmarks(JSON.parse(storedBm));
          if (storedRv) setRecentlyViewed(JSON.parse(storedRv));
          if (savedLang) setActiveLang(savedLang);

          // Instant UI paint with offline/cached data
          if (cachedSits && cachedSits.length > 0) {
            setSituations(cachedSits);
          } else {
            setSituations(STATIC_OFFLINE_SITUATIONS);
          }

          if (cachedCats && cachedCats.length > 0) {
            setCategories(cachedCats);
          }
        }

        // 2. Non-blocking background network sync with 3.5s timeout (never blocks UI rendering)
        const controller = new AbortController();
        const timerId = setTimeout(() => controller.abort(), 3500);

        Promise.all([
          fetch(`${API_BASE_URL}/api/v1/conversation/history/${storedId}`, { signal: controller.signal })
            .then(res => (res.ok ? res.json() : null))
            .then(convData => {
              if (convData?.conversations && !ignore) setConversations(convData.conversations);
            })
            .catch(() => {}),
          fetch(`${API_BASE_URL}/api/v1/situations/categories`, { signal: controller.signal })
            .then(res => (res.ok ? res.json() : null))
            .catch(() => null),
          fetch(`${API_BASE_URL}/api/v1/situations`, { signal: controller.signal })
            .then(res => (res.ok ? res.json() : null))
            .catch(() => null),
        ])
          .then(([_, fetchedCats, fetchedSits]) => {
            clearTimeout(timerId);
            if (!ignore && fetchedCats && fetchedSits) {
              setCategories(fetchedCats);
              setSituations(fetchedSits);
              setIsOffline(false);
              saveToOfflineCache(CACHE_KEYS.CATEGORIES, fetchedCats);
              saveToOfflineCache(CACHE_KEYS.SITUATIONS, fetchedSits);
            }
          })
          .catch(() => {
            clearTimeout(timerId);
          });
      } catch {
        /* storage offline */
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

  const handleLanguageChange = (lang: SupportedLang) => {
    setActiveLang(lang);
    saveLanguage(lang);
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
          language: activeLang,
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
            language: activeLang,
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

          {/* Offline Mode Status Banner */}
          {isOffline && (
            <View style={styles.offlineBanner}>
              <Ionicons name="cloud-offline" size={14} color="#b45309" />
              <Text style={styles.offlineBannerText}>
                {activeLang === 'hi'
                  ? '⚡ ऑफलाइन मोड सक्रिय — स्थानीय कैश से कानूनी डेटा उपलब्ध है'
                  : activeLang === 'ta'
                  ? '⚡ ஆஃப்லைன் பயன்முறை — உள்ளூர் தற்காலிக நினைவகத்திலிருந்து இயங்குகிறது'
                  : '⚡ Offline Mode Active — Operating from Local Cached Legal Knowledge'}
              </Text>
            </View>
          )}

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
                lang={activeLang}
                onChangeLang={handleLanguageChange}
                isOffline={isOffline}
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
                lang={activeLang}
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
            lang={activeLang}
          />

          {/* Bottom 5-Tab Navigation Bar */}
          <BottomNav activeTab={activeTab} onSelectTab={handleNavigate} lang={activeLang} />

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
  offlineBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef3c7',
    borderBottomWidth: 1,
    borderBottomColor: '#fde68a',
    paddingHorizontal: 16,
    paddingVertical: 6,
    gap: 8,
  },
  offlineBannerText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#92400e',
  },
});
