import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Linking,
  Alert,
  Switch,
  Modal,
  Share,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Clipboard from 'expo-clipboard';
import { API_BASE_URL } from '../config/api';
import { ConversationSummary, ActiveTab, UserProfile } from '../types';

interface ProfileScreenProps {
  userId: string;
  conversations: ConversationSummary[];
  bookmarks: string[];
  recentlyViewed: string[];
  onNavigate: (tab: ActiveTab) => void;
  onOpenSaved: () => void;
  currentUser?: UserProfile | null;
  isGuest?: boolean;
  onSignOut?: () => void;
}

export interface SavedDocItem {
  id: string;
  title: string;
  document_type: string;
  content: string;
  created_at: string;
}

const INDIAN_STATES = [
  'Karnataka', 'Maharashtra', 'Delhi (NCR)', 'Tamil Nadu', 'Telangana',
  'Uttar Pradesh', 'West Bengal', 'Gujarat', 'Kerala', 'Punjab', 'Other / Central',
];

const LEGAL_PERSONAS = [
  { id: 'consumer', label: 'Individual Consumer', icon: '🛒', desc: 'Consumer Protection Act, 2019 • Defective Goods & Services' },
  { id: 'employee', label: 'Working Professional / Employee', icon: '💼', desc: 'Industrial Disputes Act • Employment Contracts & Firing' },
  { id: 'tenant', label: 'Tenant / Home Renter', icon: '🏠', desc: 'Model Tenancy Act • Rent Disputes & Security Deposit Refund' },
  { id: 'business', label: 'Small Business Owner', icon: '🏪', desc: 'MSME Act • Commercial Contracts & Cheque Bounce Sec 138' },
  { id: 'citizen', label: 'General Citizen & Student', icon: '🏛️', desc: 'Constitutional Rights • Police Encounters & Public Service RTI' },
];

const AVATAR_COLORS = [
  '#4338ca', '#0284c7', '#059669', '#d97706', '#7c3aed', '#db2777',
];

const EMERGENCY_HELPLINES = [
  { name: 'NALSA Free Legal Aid', number: '15100', desc: 'National Legal Services Authority • 24/7 Free Assistance', tag: '24/7 FREE', color: '#059669' },
  { name: 'National Consumer Helpline', number: '1915', desc: 'Ministry of Consumer Affairs • E-Commerce Grievances', tag: 'OFFICIAL', color: '#d97706' },
  { name: 'Cyber Crime Helpline', number: '1930', desc: 'Immediate Financial Fraud & Online Harassment Reporting', tag: 'IMMEDIATE', color: '#dc2626' },
  { name: 'Women Helpline', number: '181', desc: 'Domestic Violence, Harassment & Immediate Police Support', tag: 'EMERGENCY', color: '#db2777' },
  { name: 'Elder Line (Senior Citizens)', number: '14567', desc: 'Free Information, Legal Guidance & Support for Seniors', tag: 'SENIORS', color: '#4338ca' },
];

type LLMProvider = 'auto' | 'gemini' | 'openai' | 'ollama';

const MODEL_META: Record<LLMProvider, { label: string; desc: string; icon: string }> = {
  auto:   { label: 'Auto (Recommended)', desc: 'Smart routing for optimal speed & legal precision', icon: '⚡' },
  gemini: { label: 'Gemini 1.5 Flash',   desc: 'Cloud — High speed statutory retrieval & citations', icon: '✨' },
  openai: { label: 'GPT-4 (OpenAI)',     desc: 'Cloud — Deep legal reasoning & multi-party analysis', icon: '🧠' },
  ollama: { label: 'Ollama (Local GPU)', desc: '100% Private on-device zero-data-leak processing', icon: '🦙' },
};

const INITIAL_DEMO_DOCUMENTS: SavedDocItem[] = [
  {
    id: 'doc_sec_deposit',
    title: 'Statutory Demand Notice — Rental Security Deposit Refund',
    document_type: 'Legal Notice',
    content: `LEGAL NOTICE UNDER SECTION 106 & 108(q) OF TRANSFER OF PROPERTY ACT, 1882

To:
The Landlord / Property Owner
Flat No. 402, Greenview Apartments,
Bengaluru, Karnataka - 560034

Sir / Madam,

Under instructions and on behalf of my client / tenant, I hereby serve you this formal Statutory Notice of Demand:

1. That my client occupied the subject premises as a lawful tenant on a monthly rental basis pursuant to the Lease Agreement.
2. That my client vacated the premises peacefully after giving due 30 days written notice and handed over physical vacant possession along with all keys on 15th August 2024.
3. That despite repeated amicable reminders, you have wrongfully withheld the security deposit sum of Rs. 1,20,000/- (Rupees One Lakh Twenty Thousand Only) without providing any itemized invoices for damage or statutory justification.
4. Under Section 108(q) of the Transfer of Property Act, 1882 and Section 11 of the Model Tenancy Act, the lessor is statutorily bound to refund the advance security deposit within 30 days of peaceful handover.

YOU ARE HEREBY CALLED UPON to refund the entire deposit of Rs. 1,20,000/- together with statutory interest @ 18% per annum within 15 (fifteen) days from the receipt of this notice, failing which my client shall initiate legal proceedings before the competent Rent Authority / Civil Court holding you liable for all consequential damages, interest and full costs of litigation.

Date: 10th September 2024
Place: Bengaluru, Karnataka`,
    created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
  },
  {
    id: 'doc_consumer_refund',
    title: 'Pre-Litigation Consumer Notice — Defective Electronic Goods',
    document_type: 'Legal Notice',
    content: `FORMAL PRE-LITIGATION DEMAND NOTICE UNDER SECTION 35 OF CONSUMER PROTECTION ACT, 2019

To:
M/s TechStore Retail & Customer Services Pvt Ltd
Ground Floor, Commercial Hub,
MG Road, Bengaluru - 560001

Subject: Notice for replacement / 100% refund of defective Laptop (Invoice #INV-2024-8841)

Sir / Madam,

1. That the Complainant purchased one SmartBook Pro laptop on 20th July 2024 for a consideration of Rs. 68,990/- with a 1-year comprehensive manufacturer warranty.
2. That within 14 days of normal usage, the motherboard suffered catastrophic failure and stopped booting.
3. That your authorized service center refused replacement citing arbitrary policy, which constitutes gross Deficiency in Service and Unfair Trade Practice under Section 2(47) of the Consumer Protection Act, 2019.
4. Under Section 39 of the Consumer Protection Act, 2019, a consumer is entitled to either immediate replacement or 100% refund with interest.

YOU ARE HEREBY CALLED UPON to either replace the defective unit with a brand new sealed unit or refund the full consideration of Rs. 68,990/- with 12% interest within 15 days, failing which an e-Daakhil consumer complaint will be registered before the District Consumer Commission seeking punitive compensation of Rs. 50,000/-.

Issued on behalf of Consumer.`,
    created_at: new Date(Date.now() - 86400000 * 5).toISOString(),
  },
];

export const ProfileScreen: React.FC<ProfileScreenProps> = ({
  userId,
  conversations,
  bookmarks,
  recentlyViewed,
  onNavigate,
  onOpenSaved,
  currentUser,
  isGuest,
  onSignOut,
}) => {
  // Segmented Navigation: 'profile' | 'vault' | 'helplines'
  const [activeSegment, setActiveSegment] = useState<'profile' | 'vault' | 'helplines'>('profile');
  const [activeReadingDoc, setActiveReadingDoc] = useState<SavedDocItem | null>(null);

  // Profile data
  const [userName, setUserName] = useState(currentUser?.name || 'LegalAce Citizen');
  const [userEmail, setUserEmail] = useState(currentUser?.email || 'citizen@legalace.in');
  const [avatarColor, setAvatarColor] = useState('#4338ca');
  const [persona, setPersona] = useState('Individual Consumer');
  const [preferredState, setPreferredState] = useState('Karnataka');
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [llmProvider, setLlmProvider] = useState<LLMProvider>('auto');

  // Vault state
  const [savedDocs, setSavedDocs] = useState<SavedDocItem[]>(INITIAL_DEMO_DOCUMENTS);
  const [vaultSearchQuery, setVaultSearchQuery] = useState('');
  const [vaultFilterCategory, setVaultFilterCategory] = useState('all');
  const [copiedDocId, setCopiedDocId] = useState<string | null>(null);
  const [copiedUserId, setCopiedUserId] = useState(false);

  // Modals
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isModelModalOpen, setIsModelModalOpen] = useState(false);
  const [isAboutModalOpen, setIsAboutModalOpen] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        const storedName = await AsyncStorage.getItem('legalace_user_name');
        if (storedName) setUserName(storedName);
        const storedEmail = await AsyncStorage.getItem('legalace_user_email');
        if (storedEmail) setUserEmail(storedEmail);
        const storedColor = await AsyncStorage.getItem('legalace_avatar_color');
        if (storedColor) setAvatarColor(storedColor);
        const storedPersona = await AsyncStorage.getItem('legalace_persona');
        if (storedPersona) setPersona(storedPersona);
        const storedState = await AsyncStorage.getItem('legalace_preferred_state');
        if (storedState) setPreferredState(storedState);
        const storedModel = await AsyncStorage.getItem('legalace_llm_provider');
        if (storedModel) setLlmProvider(storedModel as LLMProvider);

        const storedDocs = await AsyncStorage.getItem('legalace_generated_documents');
        if (storedDocs) {
          const parsed = JSON.parse(storedDocs);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setSavedDocs(parsed);
          }
        }
      } catch { /* offline */ }
    }
    loadData();
  }, []);

  useEffect(() => {
    if (currentUser) {
      if (currentUser.name) setUserName(currentUser.name);
      if (currentUser.email) setUserEmail(currentUser.email);
      if (currentUser.persona) {
        const found = LEGAL_PERSONAS.find(p => p.id === currentUser.persona);
        if (found) setPersona(found.label);
      }
      if (currentUser.state) setPreferredState(currentUser.state);
    } else if (isGuest) {
      setUserName('Guest Citizen');
      setUserEmail('guest@legalace.local');
    }
  }, [currentUser, isGuest]);

  const handleSaveProfile = async () => {
    try {
      await AsyncStorage.setItem('legalace_user_name', userName);
      await AsyncStorage.setItem('legalace_user_email', userEmail);
      await AsyncStorage.setItem('legalace_avatar_color', avatarColor);
      await AsyncStorage.setItem('legalace_persona', persona);
      await AsyncStorage.setItem('legalace_preferred_state', preferredState);
    } catch { /* storage */ }
    setIsEditModalOpen(false);
  };

  const handleSelectModel = async (provider: LLMProvider) => {
    setLlmProvider(provider);
    await AsyncStorage.setItem('legalace_llm_provider', provider);
    try {
      await fetch(`${API_BASE_URL}/api/v1/llm-settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider }),
      });
    } catch { /* offline fallback */ }
    setIsModelModalOpen(false);
  };

  const handleCopyUserId = async () => {
    setCopiedUserId(true);
    try {
      await Clipboard.setStringAsync(userId);
    } catch {}
    setTimeout(() => setCopiedUserId(false), 2000);
  };

  const handleCopyDocText = async (doc: SavedDocItem) => {
    setCopiedDocId(doc.id);
    try {
      await Clipboard.setStringAsync(doc.content);
    } catch {}
    setTimeout(() => setCopiedDocId(null), 2000);
  };

  const handleShareDoc = async (doc: SavedDocItem) => {
    try {
      await Share.share({
        title: doc.title,
        message: `${doc.title}\n\n${doc.content}\n\nGenerated via LegalAce AI Companion`,
      });
    } catch {}
  };

  const handleDeleteDoc = (docId: string) => {
    Alert.alert(
      'Delete Document',
      'Are you sure you want to remove this document from your vault?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const updated = savedDocs.filter((d) => d.id !== docId);
            setSavedDocs(updated);
            try {
              await AsyncStorage.setItem('legalace_generated_documents', JSON.stringify(updated));
            } catch {}
            if (activeReadingDoc?.id === docId) {
              setActiveReadingDoc(null);
            }
          },
        },
      ]
    );
  };

  const handleExportData = async () => {
    const exportPayload = {
      user_id: userId,
      user_name: userName,
      user_email: userEmail,
      persona,
      preferred_state: preferredState,
      saved_bookmarks: bookmarks,
      recently_viewed: recentlyViewed,
      saved_documents_count: savedDocs.length,
      conversations_count: conversations.length,
      exported_at: new Date().toISOString(),
    };
    try {
      await Share.share({
        title: `LegalAce Profile Data (${userId})`,
        message: JSON.stringify(exportPayload, null, 2),
      });
    } catch {}
  };

  const handleClearData = () => {
    Alert.alert(
      'Clear Local Data',
      'Are you sure you want to reset your local bookmarks and search history?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            await AsyncStorage.removeItem('legalace_bookmarks');
            await AsyncStorage.removeItem('legalace_recently_viewed');
            Alert.alert('Reset Complete', 'Local history and bookmarks have been cleared.');
          },
        },
      ]
    );
  };

  const getInitials = (name: string) => {
    if (!name) return 'LC';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.substring(0, 2).toUpperCase();
  };

  const filteredDocs = savedDocs.filter((doc) => {
    const matchesSearch = !vaultSearchQuery ||
      doc.title.toLowerCase().includes(vaultSearchQuery.toLowerCase()) ||
      doc.content.toLowerCase().includes(vaultSearchQuery.toLowerCase());
    const matchesCat = vaultFilterCategory === 'all' ||
      doc.document_type.toLowerCase().includes(vaultFilterCategory.toLowerCase());
    return matchesSearch && matchesCat;
  });

  const selectedPersonaObj = LEGAL_PERSONAS.find(p => p.label === persona) || LEGAL_PERSONAS[0];

  // ═════════════════════════════════════════════════════════════════════════
  // 1. FULL FORMAL LEGAL PAPER READER VIEW
  // ═════════════════════════════════════════════════════════════════════════
  if (activeReadingDoc) {
    return (
      <View style={styles.screen}>
        {/* Sticky Formal Reader Top Header */}
        <View style={styles.readerTopBar}>
          <TouchableOpacity
            style={styles.readerBackBtn}
            onPress={() => setActiveReadingDoc(null)}
            activeOpacity={0.8}
          >
            <Ionicons name="chevron-back" size={18} color="#0f172a" />
            <Text style={styles.readerBackBtnText}>Back</Text>
          </TouchableOpacity>

          <View style={styles.readerActionsRow}>
            <TouchableOpacity
              style={styles.readerActionChip}
              onPress={() => handleShareDoc(activeReadingDoc)}
              activeOpacity={0.8}
            >
              <Ionicons name="share-outline" size={15} color="#4338ca" />
              <Text style={styles.readerActionChipText}>Share</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.readerActionChip, copiedDocId === activeReadingDoc.id && styles.readerActionChipSuccess]}
              onPress={() => handleCopyDocText(activeReadingDoc)}
              activeOpacity={0.8}
            >
              <Ionicons
                name={copiedDocId === activeReadingDoc.id ? 'checkmark-circle' : 'copy-outline'}
                size={15}
                color={copiedDocId === activeReadingDoc.id ? '#15803d' : '#4338ca'}
              />
              <Text style={[styles.readerActionChipText, copiedDocId === activeReadingDoc.id && { color: '#15803d' }]}>
                {copiedDocId === activeReadingDoc.id ? 'Copied!' : 'Copy'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Realistic Legal Paper Surface */}
        <ScrollView style={styles.readerScroll} contentContainerStyle={styles.readerScrollContent}>
          <View style={styles.formalLegalPaper}>
            <View style={styles.formalLetterhead}>
              <View style={styles.letterheadBadge}>
                <Ionicons name="shield-checkmark" size={14} color="#4338ca" />
                <Text style={styles.letterheadBadgeText}>STATUTORY RECORD</Text>
              </View>
              <Text style={styles.letterheadTitle}>{activeReadingDoc.title.toUpperCase()}</Text>
              <Text style={styles.letterheadSubtitle}>
                Generated via LegalAce AI Rights Companion • Under Indian Jurisprudence
              </Text>
              <View style={styles.letterheadRule} />
            </View>

            <Text style={styles.formalLegalText}>{activeReadingDoc.content}</Text>

            <View style={styles.formalPaperFooter}>
              <View style={styles.paperFooterRule} />
              <View style={styles.paperFooterMetaRow}>
                <Text style={styles.paperFooterDate}>
                  Dated: {new Date(activeReadingDoc.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}
                </Text>
                <Text style={styles.paperFooterStamp}>CONFIDENTIAL LEGAL NOTICE</Text>
              </View>
              <Text style={styles.paperFooterDisclaimer}>
                This statutory draft was compiled from citizen instructions. Consult an enrolled advocate before formal court submission.
              </Text>
            </View>
          </View>
          <View style={{ height: 40 }} />
        </ScrollView>
      </View>
    );
  }

  // ═════════════════════════════════════════════════════════════════════════
  // 2. MAIN PROFILE SCREEN WITH SPACIOUS NON-OVERLAPPING HEADER & CARD
  // ═════════════════════════════════════════════════════════════════════════
  return (
    <View style={styles.screen}>
      {/* ─── Non-Overlapping Spacious Top Header ─────────────────────── */}
      <View style={styles.topHeader}>
        <View style={styles.topHeaderTitleWrap}>
          <View style={styles.headerTag}>
            <View style={styles.liveDot} />
            <Text style={styles.headerTagText}>CITIZEN COMPANION</Text>
          </View>
          <Text style={styles.headerTitleText}>Profile & Hub</Text>
        </View>

        <TouchableOpacity
          style={styles.editBtn}
          onPress={() => setIsEditModalOpen(true)}
          activeOpacity={0.8}
        >
          <Ionicons name="pencil" size={12} color="#4f46e5" />
          <Text style={styles.editBtnText}>Edit Profile</Text>
        </TouchableOpacity>
      </View>

      {/* ─── Compact 3-Tab Segmented Control (Zero Clipping) ─────────── */}
      <View style={styles.segmentContainer}>
        <TouchableOpacity
          style={[styles.segmentTab, activeSegment === 'profile' && styles.segmentTabActive]}
          onPress={() => setActiveSegment('profile')}
          activeOpacity={0.8}
        >
          <Ionicons
            name={activeSegment === 'profile' ? 'person' : 'person-outline'}
            size={13}
            color={activeSegment === 'profile' ? '#ffffff' : '#64748b'}
          />
          <Text style={[styles.segmentTabText, activeSegment === 'profile' && styles.segmentTabTextActive]}>
            Overview
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.segmentTab, activeSegment === 'vault' && styles.segmentTabActive]}
          onPress={() => setActiveSegment('vault')}
          activeOpacity={0.8}
        >
          <Ionicons
            name={activeSegment === 'vault' ? 'folder' : 'folder-outline'}
            size={13}
            color={activeSegment === 'vault' ? '#ffffff' : '#64748b'}
          />
          <Text style={[styles.segmentTabText, activeSegment === 'vault' && styles.segmentTabTextActive]}>
            Doc Vault
          </Text>
          <View style={[styles.tabBadge, activeSegment === 'vault' && styles.tabBadgeActive]}>
            <Text style={[styles.tabBadgeText, activeSegment === 'vault' && styles.tabBadgeTextActive]}>
              {savedDocs.length}
            </Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.segmentTab, activeSegment === 'helplines' && styles.segmentTabActive]}
          onPress={() => setActiveSegment('helplines')}
          activeOpacity={0.8}
        >
          <Ionicons
            name={activeSegment === 'helplines' ? 'call' : 'call-outline'}
            size={13}
            color={activeSegment === 'helplines' ? '#ffffff' : '#64748b'}
          />
          <Text style={[styles.segmentTabText, activeSegment === 'helplines' && styles.segmentTabTextActive]}>
            Helplines
          </Text>
        </TouchableOpacity>
      </View>

      {/* ─── TAB 1: CITIZEN PROFILE & LEGAL WORKSPACE ─────────────────── */}
      {activeSegment === 'profile' && (
        <ScrollView style={styles.scrollBody} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* ─── Reimagined Luxury Executive Citizen Card ─────────────── */}
          <View style={styles.citizenCard}>
            {/* Top Identity Row: Avatar + Name + Subtitle */}
            <View style={styles.citizenIdentityRow}>
              <View style={[styles.avatarBox, { backgroundColor: avatarColor }]}>
                <Text style={styles.avatarText}>{getInitials(userName)}</Text>
                <View style={styles.onlineBadge} />
              </View>

              <View style={styles.citizenInfoCol}>
                <View style={styles.nameBadgeRow}>
                  <Text style={styles.citizenNameText} numberOfLines={1}>
                    {userName}
                  </Text>
                  <View style={[styles.verifiedTag, isGuest && { backgroundColor: '#fef3c7' }]}>
                    <Ionicons
                      name={isGuest ? 'person-outline' : 'checkmark-circle'}
                      size={13}
                      color={isGuest ? '#d97706' : '#10b981'}
                    />
                    <Text style={[styles.verifiedTagText, isGuest && { color: '#b45309' }]}>
                      {isGuest ? 'GUEST' : 'VERIFIED'}
                    </Text>
                  </View>
                </View>

                <Text style={styles.citizenEmailText} numberOfLines={1}>
                  {userEmail}
                </Text>

                <TouchableOpacity
                  style={styles.idChipBtn}
                  onPress={handleCopyUserId}
                  activeOpacity={0.7}
                >
                  <Ionicons name={copiedUserId ? 'checkmark' : 'copy-outline'} size={11} color="#4f46e5" />
                  <Text style={styles.idChipText}>
                    {copiedUserId ? 'Copied to Clipboard' : `Citizen ID: #${userId.replace(/^user_/, '')}`}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Separator Divider */}
            <View style={styles.cardDivider} />

            {/* Full-Width Citizen Preferences Block: Location & Persona */}
            <View style={styles.preferencesSection}>
              {/* Location & Jurisdiction Row */}
              <TouchableOpacity
                style={styles.prefRowCard}
                onPress={() => setIsEditModalOpen(true)}
                activeOpacity={0.8}
              >
                <View style={[styles.prefIconWrap, { backgroundColor: '#ecfdf5' }]}>
                  <Ionicons name="location" size={18} color="#059669" />
                </View>

                <View style={styles.prefTextWrap}>
                  <Text style={[styles.prefCategoryLabel, { color: '#059669' }]}>
                    STATE JURISDICTION
                  </Text>
                  <Text style={styles.prefValueText}>
                    {preferredState}, India
                  </Text>
                  <Text style={styles.prefSubDetailText} numberOfLines={1}>
                    High Court of {preferredState} • State Consumer Commission
                  </Text>
                </View>

                <View style={styles.prefActionPill}>
                  <Text style={styles.prefActionPillText}>Change</Text>
                  <Ionicons name="chevron-forward" size={12} color="#059669" />
                </View>
              </TouchableOpacity>

              {/* Legal Persona Row */}
              <TouchableOpacity
                style={styles.prefRowCard}
                onPress={() => setIsEditModalOpen(true)}
                activeOpacity={0.8}
              >
                <View style={[styles.prefIconWrap, { backgroundColor: '#eef2ff' }]}>
                  <Text style={{ fontSize: 16 }}>{selectedPersonaObj.icon}</Text>
                </View>

                <View style={styles.prefTextWrap}>
                  <Text style={[styles.prefCategoryLabel, { color: '#4338ca' }]}>
                    LEGAL PERSONA
                  </Text>
                  <Text style={styles.prefValueText}>
                    {persona}
                  </Text>
                  <Text style={styles.prefSubDetailText} numberOfLines={1}>
                    {selectedPersonaObj.desc}
                  </Text>
                </View>

                <View style={[styles.prefActionPill, { backgroundColor: '#eef2ff', borderColor: '#c7d2fe' }]}>
                  <Text style={[styles.prefActionPillText, { color: '#4338ca' }]}>Switch</Text>
                  <Ionicons name="chevron-forward" size={12} color="#4338ca" />
                </View>
              </TouchableOpacity>
            </View>
          </View>

          {/* ─── Legal Workspace & Tools ──────────────────────────────── */}
          <View style={{ marginTop: 16 }}>
            <Text style={styles.sectionGroupTitle}>Legal Workspace & Tools</Text>
            <View style={styles.cardGroup}>
              {/* Document Storage Vault */}
              <TouchableOpacity
                style={styles.actionItem}
                onPress={() => setActiveSegment('vault')}
                activeOpacity={0.7}
              >
                <View style={[styles.actionIcon, { backgroundColor: '#ecfdf5' }]}>
                  <Ionicons name="folder-open-outline" size={20} color="#059669" />
                </View>
                <View style={styles.actionContent}>
                  <View style={styles.actionTitleRow}>
                    <Text style={styles.actionTitle}>Document Storage Vault</Text>
                    <View style={[styles.actionBadge, { backgroundColor: '#ecfdf5' }]}>
                      <Text style={[styles.actionBadgeText, { color: '#059669' }]}>
                        {savedDocs.length} Documents
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.actionDesc}>
                    Stored legal demand notices, action plans & statutory drafts
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color="#9ca3af" />
              </TouchableOpacity>

              {/* Legal Health Monitor */}
              <TouchableOpacity
                style={styles.actionItem}
                onPress={() => onNavigate('deadlines')}
                activeOpacity={0.7}
              >
                <View style={[styles.actionIcon, { backgroundColor: '#eef2ff' }]}>
                  <Ionicons name="calendar-outline" size={20} color="#4338ca" />
                </View>
                <View style={styles.actionContent}>
                  <View style={styles.actionTitleRow}>
                    <Text style={styles.actionTitle}>Legal Health Monitor</Text>
                    <View style={[styles.actionBadge, { backgroundColor: '#eef2ff' }]}>
                      <Text style={[styles.actionBadgeText, { color: '#4338ca' }]}>Tracker</Text>
                    </View>
                  </View>
                  <Text style={styles.actionDesc}>
                    Track filing dates, limitation periods & statutory deadlines
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color="#9ca3af" />
              </TouchableOpacity>

              {/* Daily Rights Handbook */}
              <TouchableOpacity
                style={styles.actionItem}
                onPress={() => onNavigate('rights')}
                activeOpacity={0.7}
              >
                <View style={[styles.actionIcon, { backgroundColor: '#fdf2f8' }]}>
                  <Ionicons name="shield-outline" size={20} color="#db2777" />
                </View>
                <View style={styles.actionContent}>
                  <View style={styles.actionTitleRow}>
                    <Text style={styles.actionTitle}>Daily Rights Handbook</Text>
                    <View style={[styles.actionBadge, { backgroundColor: '#fdf2f8' }]}>
                      <Text style={[styles.actionBadgeText, { color: '#db2777' }]}>Handbook</Text>
                    </View>
                  </View>
                  <Text style={styles.actionDesc}>
                    Constitutional rights, citizen protections & everyday legal tips
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color="#9ca3af" />
              </TouchableOpacity>

              {/* Case & Notice Wizard */}
              <TouchableOpacity
                style={styles.actionItem}
                onPress={() => onNavigate('wizard')}
                activeOpacity={0.7}
              >
                <View style={[styles.actionIcon, { backgroundColor: '#e0e7ff' }]}>
                  <Ionicons name="flash-outline" size={20} color="#4338ca" />
                </View>
                <View style={styles.actionContent}>
                  <View style={styles.actionTitleRow}>
                    <Text style={styles.actionTitle}>Document & Case Wizard</Text>
                    <View style={[styles.actionBadge, { backgroundColor: '#e0e7ff' }]}>
                      <Text style={[styles.actionBadgeText, { color: '#4338ca' }]}>Interactive</Text>
                    </View>
                  </View>
                  <Text style={styles.actionDesc}>
                    Step-by-step guidance to draft notices or file complaints
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color="#9ca3af" />
              </TouchableOpacity>

              {/* Document X-Ray */}
              <TouchableOpacity
                style={styles.actionItem}
                onPress={() => onNavigate('xray')}
                activeOpacity={0.7}
              >
                <View style={[styles.actionIcon, { backgroundColor: '#f5f3ff' }]}>
                  <Ionicons name="scan-outline" size={20} color="#7c3aed" />
                </View>
                <View style={styles.actionContent}>
                  <View style={styles.actionTitleRow}>
                    <Text style={styles.actionTitle}>Document X-Ray</Text>
                    <View style={[styles.actionBadge, { backgroundColor: '#f5f3ff' }]}>
                      <Text style={[styles.actionBadgeText, { color: '#7c3aed' }]}>AI Scan</Text>
                    </View>
                  </View>
                  <Text style={styles.actionDesc}>
                    Upload legal documents for AI analysis & red flag detection
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color="#9ca3af" />
              </TouchableOpacity>

              {/* Free Legal Aid Checker */}
              <TouchableOpacity
                style={styles.actionItem}
                onPress={() => onNavigate('legalaid')}
                activeOpacity={0.7}
              >
                <View style={[styles.actionIcon, { backgroundColor: '#ecfdf5' }]}>
                  <Ionicons name="scale-outline" size={20} color="#059669" />
                </View>
                <View style={styles.actionContent}>
                  <View style={styles.actionTitleRow}>
                    <Text style={styles.actionTitle}>Free Legal Aid Checker</Text>
                    <View style={[styles.actionBadge, { backgroundColor: '#ecfdf5' }]}>
                      <Text style={[styles.actionBadgeText, { color: '#059669' }]}>DLSA</Text>
                    </View>
                  </View>
                  <Text style={styles.actionDesc}>
                    Check DLSA eligibility & find nearest legal aid authority
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color="#9ca3af" />
              </TouchableOpacity>

              {/* Saved Situations */}
              <TouchableOpacity
                style={styles.actionItem}
                onPress={onOpenSaved}
                activeOpacity={0.7}
              >
                <View style={[styles.actionIcon, { backgroundColor: '#fef3c7' }]}>
                  <Ionicons name="bookmark-outline" size={20} color="#d97706" />
                </View>
                <View style={styles.actionContent}>
                  <Text style={styles.actionTitle}>Saved Situations & Laws</Text>
                  <Text style={styles.actionDesc}>{bookmarks.length} statutes bookmarked</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color="#9ca3af" />
              </TouchableOpacity>
            </View>
          </View>

          {/* ─── AI Preferences & Controls ────────────────────────────── */}
          <View style={{ marginTop: 18 }}>
            <Text style={styles.sectionGroupTitle}>AI Preferences</Text>
            <View style={styles.cardGroup}>
              <TouchableOpacity
                style={styles.actionItem}
                onPress={() => setIsModelModalOpen(true)}
                activeOpacity={0.7}
              >
                <View style={[styles.actionIcon, { backgroundColor: '#eef2ff' }]}>
                  <Ionicons name="hardware-chip-outline" size={20} color="#4f46e5" />
                </View>
                <View style={styles.actionContent}>
                  <View style={styles.actionTitleRow}>
                    <Text style={styles.actionTitle}>AI Model Routing</Text>
                    <View style={[styles.actionBadge, { backgroundColor: '#eef2ff' }]}>
                      <Text style={[styles.actionBadgeText, { color: '#4f46e5' }]}>
                        {MODEL_META[llmProvider].icon} {MODEL_META[llmProvider].label}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.actionDesc}>{MODEL_META[llmProvider].desc}</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color="#9ca3af" />
              </TouchableOpacity>
            </View>
          </View>

          {/* ─── Preferences & Data Controls ──────────────────────────── */}
          <View style={{ marginTop: 18 }}>
            <Text style={styles.sectionGroupTitle}>Preferences & Data Control</Text>
            <View style={styles.cardGroup}>
              <View style={styles.actionItem}>
                <View style={[styles.actionIcon, { backgroundColor: '#f3e8ff' }]}>
                  <Ionicons name="notifications-outline" size={20} color="#9333ea" />
                </View>
                <View style={styles.actionContent}>
                  <Text style={styles.actionTitle}>Deadline & Legal Tip Alerts</Text>
                  <Text style={styles.actionDesc}>Receive notifications for filing dates</Text>
                </View>
                <Switch
                  value={notificationsEnabled}
                  onValueChange={setNotificationsEnabled}
                  trackColor={{ false: '#cbd5e1', true: '#4f46e5' }}
                  thumbColor="#ffffff"
                />
              </View>

              <TouchableOpacity
                style={styles.actionItem}
                onPress={handleExportData}
                activeOpacity={0.7}
              >
                <View style={[styles.actionIcon, { backgroundColor: '#f1f5f9' }]}>
                  <Ionicons name="download-outline" size={20} color="#475569" />
                </View>
                <View style={styles.actionContent}>
                  <Text style={styles.actionTitle}>Export Profile & Legal History</Text>
                  <Text style={styles.actionDesc}>Share bookmarks & consultations data</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color="#9ca3af" />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionItem}
                onPress={handleClearData}
                activeOpacity={0.7}
              >
                <View style={[styles.actionIcon, { backgroundColor: '#fef2f2' }]}>
                  <Ionicons name="trash-outline" size={20} color="#b91c1c" />
                </View>
                <View style={styles.actionContent}>
                  <Text style={[styles.actionTitle, { color: '#b91c1c' }]}>Clear Local Data</Text>
                  <Text style={styles.actionDesc}>Reset bookmarks and recent history</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color="#9ca3af" />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionItem}
                onPress={() => setIsAboutModalOpen(true)}
                activeOpacity={0.7}
              >
                <View style={[styles.actionIcon, { backgroundColor: '#f0fdf4' }]}>
                  <Ionicons name="information-circle-outline" size={20} color="#16a34a" />
                </View>
                <View style={styles.actionContent}>
                  <Text style={styles.actionTitle}>About LegalAce AI</Text>
                  <Text style={styles.actionDesc}>Version 1.0 • Powered by FastAPI & RAG</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color="#9ca3af" />
              </TouchableOpacity>

              {onSignOut && (
                <TouchableOpacity
                  style={[styles.actionItem, { marginTop: 4, borderTopWidth: 1, borderTopColor: '#f1f5f9' }]}
                  onPress={onSignOut}
                  activeOpacity={0.7}
                >
                  <View style={[styles.actionIcon, { backgroundColor: '#fee2e2' }]}>
                    <Ionicons name="log-out-outline" size={20} color="#dc2626" />
                  </View>
                  <View style={styles.actionContent}>
                    <Text style={[styles.actionTitle, { color: '#dc2626', fontWeight: '700' }]}>
                      {isGuest ? 'Sign In / Register' : 'Log Out / Switch Account'}
                    </Text>
                    <Text style={styles.actionDesc}>
                      {isGuest
                        ? 'Leave guest mode and log into an account'
                        : `Signed in as ${currentUser?.email || userEmail}`}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color="#dc2626" />
                </TouchableOpacity>
              )}
            </View>
          </View>

          <View style={{ height: 110 }} />
        </ScrollView>
      )}

      {/* ─── TAB 2: DOCUMENT STORAGE VAULT ────────────────────────────── */}
      {activeSegment === 'vault' && (
        <ScrollView style={styles.scrollBody} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.vaultHeaderBanner}>
            <View style={styles.vaultBannerIconBox}>
              <Ionicons name="shield-checkmark" size={24} color="#059669" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.vaultBannerTitle}>Document Storage Vault</Text>
              <Text style={styles.vaultBannerDesc}>
                Encrypted repository of your generated statutory notices, demand letters and legal records.
              </Text>
            </View>
            <TouchableOpacity
              style={styles.vaultDraftBtn}
              onPress={() => onNavigate('wizard')}
              activeOpacity={0.8}
            >
              <Ionicons name="add" size={16} color="#ffffff" />
              <Text style={styles.vaultDraftBtnText}>Draft</Text>
            </TouchableOpacity>
          </View>

          {/* Search Box */}
          <View style={styles.vaultSearchContainer}>
            <Ionicons name="search" size={18} color="#64748b" style={{ marginLeft: 10 }} />
            <TextInput
              style={styles.vaultSearchInput}
              placeholder="Search saved notices, acts, or keywords..."
              placeholderTextColor="#94a3b8"
              value={vaultSearchQuery}
              onChangeText={setVaultSearchQuery}
            />
            {vaultSearchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setVaultSearchQuery('')} style={{ padding: 8 }}>
                <Ionicons name="close-circle" size={16} color="#94a3b8" />
              </TouchableOpacity>
            )}
          </View>

          {/* Category Filter Pills */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.vaultFilterStrip}>
            {['all', 'Legal Notice', 'Action Plan', 'Contract'].map((cat) => (
              <TouchableOpacity
                key={cat}
                style={[styles.vaultFilterPill, vaultFilterCategory === cat && styles.vaultFilterPillActive]}
                onPress={() => setVaultFilterCategory(cat)}
                activeOpacity={0.8}
              >
                <Text style={[styles.vaultFilterPillText, vaultFilterCategory === cat && styles.vaultFilterPillTextActive]}>
                  {cat === 'all' ? '📁 All Documents' : cat}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Document Cards List */}
          {filteredDocs.length === 0 ? (
            <View style={styles.vaultEmptyState}>
              <View style={styles.vaultEmptyIconBox}>
                <Ionicons name="folder-open-outline" size={40} color="#94a3b8" />
              </View>
              <Text style={styles.vaultEmptyTitle}>No Documents Found</Text>
              <Text style={styles.vaultEmptySubtitle}>
                {savedDocs.length === 0
                  ? 'Use the Case Wizard or Chatbot to generate a legal notice and store it automatically in your vault.'
                  : 'No documents match your current filter query.'}
              </Text>
              <TouchableOpacity
                style={styles.vaultEmptyActionBtn}
                onPress={() => onNavigate('wizard')}
                activeOpacity={0.8}
              >
                <Text style={styles.vaultEmptyActionBtnText}>⚡ Draft Notice in Wizard</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.vaultCardsList}>
              {filteredDocs.map((doc) => (
                <View key={doc.id} style={styles.vaultDocCard}>
                  <View style={styles.vaultDocCardHeader}>
                    <View style={styles.vaultDocIcon}>
                      <Ionicons name="document-text" size={22} color="#4338ca" />
                    </View>
                    <View style={styles.vaultDocMeta}>
                      <Text style={styles.vaultDocTitle}>{doc.title}</Text>
                      <View style={styles.vaultDocSubRow}>
                        <View style={styles.docTypeBadge}>
                          <Text style={styles.docTypeBadgeText}>{doc.document_type || 'Legal Notice'}</Text>
                        </View>
                        <Text style={styles.vaultDocDate}>
                          {new Date(doc.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </Text>
                      </View>
                    </View>
                    <TouchableOpacity
                      style={styles.vaultDocDeleteBtn}
                      onPress={() => handleDeleteDoc(doc.id)}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="trash-outline" size={16} color="#ef4444" />
                    </TouchableOpacity>
                  </View>

                  <Text style={styles.vaultDocSnippet} numberOfLines={3}>
                    {doc.content.replace(/\n+/g, ' ')}
                  </Text>

                  <View style={styles.vaultDocActionsBar}>
                    <TouchableOpacity
                      style={[styles.vaultDocBtn, styles.vaultDocBtnPrimary]}
                      onPress={() => setActiveReadingDoc(doc)}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="book-outline" size={14} color="#ffffff" />
                      <Text style={[styles.vaultDocBtnText, { color: '#ffffff' }]}>Full Reader</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.vaultDocBtn}
                      onPress={() => handleShareDoc(doc)}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="share-outline" size={14} color="#4338ca" />
                      <Text style={styles.vaultDocBtnText}>Share</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.vaultDocBtn, copiedDocId === doc.id && { borderColor: '#10b981', backgroundColor: '#f0fdf4' }]}
                      onPress={() => handleCopyDocText(doc)}
                      activeOpacity={0.8}
                    >
                      <Ionicons
                        name={copiedDocId === doc.id ? 'checkmark' : 'copy-outline'}
                        size={14}
                        color={copiedDocId === doc.id ? '#15803d' : '#4338ca'}
                      />
                      <Text style={[styles.vaultDocBtnText, copiedDocId === doc.id && { color: '#15803d' }]}>
                        {copiedDocId === doc.id ? 'Copied' : 'Copy'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          )}

          <View style={{ height: 110 }} />
        </ScrollView>
      )}

      {/* ─── TAB 3: EMERGENCY LEGAL HELPLINES ─────────────────────────── */}
      {activeSegment === 'helplines' && (
        <ScrollView style={styles.scrollBody} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.helplineBanner}>
            <View style={[styles.vaultBannerIconBox, { backgroundColor: '#fee2e2' }]}>
              <Ionicons name="warning" size={24} color="#dc2626" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.vaultBannerTitle, { color: '#991b1b' }]}>Official Citizen Helplines</Text>
              <Text style={styles.vaultBannerDesc}>
                Direct toll-free national helplines for urgent legal aid, cyber crime, and consumer redressal across India.
              </Text>
            </View>
          </View>

          <View style={{ gap: 10, marginTop: 12 }}>
            {EMERGENCY_HELPLINES.map((hl, idx) => (
              <View key={idx} style={styles.helplineCardBox}>
                <View style={styles.helplineCardTop}>
                  <View style={{ flex: 1 }}>
                    <View style={styles.helplineTitleRow}>
                      <Text style={styles.helplineName}>{hl.name}</Text>
                      <View style={[styles.helplineTag, { backgroundColor: `${hl.color}15` }]}>
                        <Text style={[styles.helplineTagText, { color: hl.color }]}>{hl.tag}</Text>
                      </View>
                    </View>
                    <Text style={styles.helplineDesc}>{hl.desc}</Text>
                  </View>
                </View>

                <View style={styles.helplineActionRow}>
                  <View style={styles.helplineNumberBox}>
                    <Ionicons name="call" size={15} color="#4338ca" />
                    <Text style={styles.helplineNumberText}>{hl.number}</Text>
                  </View>

                  <TouchableOpacity
                    style={styles.helplineDialBtn}
                    onPress={() => Linking.openURL(`tel:${hl.number}`)}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="call" size={13} color="#ffffff" />
                    <Text style={styles.helplineDialBtnText}>Call Now</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>

          <View style={{ height: 110 }} />
        </ScrollView>
      )}

      {/* ─── EDIT PROFILE MODAL ────────────────────────────────────────── */}
      <Modal visible={isEditModalOpen} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>Edit Citizen Profile</Text>
              <TouchableOpacity onPress={() => setIsEditModalOpen(false)}>
                <Ionicons name="close" size={24} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.formGroup}>
                <Text style={styles.modalLabel}>Display Name</Text>
                <TextInput
                  style={styles.modalInput}
                  value={userName}
                  onChangeText={setUserName}
                  placeholder="Enter your name"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.modalLabel}>Email Address</Text>
                <TextInput
                  style={styles.modalInput}
                  value={userEmail}
                  onChangeText={setUserEmail}
                  placeholder="Enter your email"
                  keyboardType="email-address"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.modalLabel}>Avatar Color</Text>
                <View style={styles.colorRow}>
                  {AVATAR_COLORS.map((c) => (
                    <TouchableOpacity
                      key={c}
                      style={[
                        styles.colorCircle,
                        { backgroundColor: c },
                        avatarColor === c && styles.colorCircleActive,
                      ]}
                      onPress={() => setAvatarColor(c)}
                    />
                  ))}
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.modalLabel}>Legal Persona</Text>
                <View style={styles.personaGrid}>
                  {LEGAL_PERSONAS.map((p) => (
                    <TouchableOpacity
                      key={p.id}
                      style={[
                        styles.personaOptionBtn,
                        persona === p.label && styles.personaOptionBtnActive,
                      ]}
                      onPress={() => setPersona(p.label)}
                    >
                      <Text style={styles.personaOptionIcon}>{p.icon}</Text>
                      <View style={{ flex: 1 }}>
                        <Text
                          style={[
                            styles.personaOptionText,
                            persona === p.label && styles.personaOptionTextActive,
                          ]}
                        >
                          {p.label}
                        </Text>
                        <Text style={styles.personaOptionDesc} numberOfLines={1}>
                          {p.desc}
                        </Text>
                      </View>
                      {persona === p.label && (
                        <Ionicons name="checkmark-circle" size={18} color="#4f46e5" />
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.modalLabel}>State Jurisdiction</Text>
                <View style={styles.stateSelectGrid}>
                  {INDIAN_STATES.map((s) => (
                    <TouchableOpacity
                      key={s}
                      style={[
                        styles.statePill,
                        preferredState === s && styles.statePillActive,
                      ]}
                      onPress={() => setPreferredState(s)}
                    >
                      <Text
                        style={[
                          styles.statePillText,
                          preferredState === s && styles.statePillTextActive,
                        ]}
                      >
                        {s}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <TouchableOpacity
                style={styles.modalActionBtn}
                onPress={handleSaveProfile}
                activeOpacity={0.8}
              >
                <Text style={styles.modalActionBtnText}>Save Profile Changes</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ─── AI MODEL SELECTION MODAL ─────────────────────────────────── */}
      <Modal visible={isModelModalOpen} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>AI Intelligence Engine</Text>
              <TouchableOpacity onPress={() => setIsModelModalOpen(false)}>
                <Ionicons name="close" size={24} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {(['auto', 'gemini', 'openai', 'ollama'] as LLMProvider[]).map((prov) => {
                const meta = MODEL_META[prov];
                const isSelected = llmProvider === prov;
                return (
                  <TouchableOpacity
                    key={prov}
                    style={[styles.modelOptionCard, isSelected && styles.modelOptionCardActive]}
                    onPress={() => handleSelectModel(prov)}
                    activeOpacity={0.8}
                  >
                    <Text style={{ fontSize: 24 }}>{meta.icon}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.modelOptionName, isSelected && { color: '#4f46e5' }]}>
                        {meta.label}
                      </Text>
                      <Text style={styles.modelOptionDesc}>{meta.desc}</Text>
                    </View>
                    {isSelected && (
                      <Ionicons name="checkmark-circle" size={20} color="#4f46e5" />
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ─── ABOUT MODAL ──────────────────────────────────────────────── */}
      <Modal visible={isAboutModalOpen} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: 380, alignItems: 'center' }]}>
            <Text style={{ fontSize: 44, marginVertical: 8 }}>⚖️</Text>
            <Text style={{ fontSize: 20, fontWeight: '800', color: '#1a1a5e', marginBottom: 4 }}>
              LegalAce AI v1.0
            </Text>
            <Text style={{ fontSize: 13, color: '#64748b', textAlign: 'center', lineHeight: 18, marginBottom: 16 }}>
              AI Rights & Legal Companion for Indian Citizens, Tenants, Consumers and Employees. Built with Retrieval-Augmented Generation (RAG) & Statutory Intelligence.
            </Text>
            <TouchableOpacity
              style={[styles.modalActionBtn, { width: '100%' }]}
              onPress={() => setIsAboutModalOpen(false)}
            >
              <Text style={styles.modalActionBtnText}>Got It</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scrollBody: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 14,
    paddingTop: 8,
  },

  // ─── 1. Spacious Non-Overlapping Top Header ───────────────────────
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 8,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  topHeaderTitleWrap: {
    flex: 1,
  },
  headerTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 2,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10b981',
  },
  headerTagText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#059669',
    letterSpacing: 0.6,
  },
  headerTitleText: {
    fontSize: 19,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: -0.3,
  },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 18,
    backgroundColor: '#eef2ff',
    borderWidth: 1,
    borderColor: '#c7d2fe',
  },
  editBtnText: {
    color: '#4f46e5',
    fontSize: 12,
    fontWeight: '700',
  },

  // ─── 2. Compact 3-Tab Segmented Selector ──────────────────────────
  segmentContainer: {
    flexDirection: 'row',
    backgroundColor: '#e2e8f0',
    marginHorizontal: 14,
    marginVertical: 10,
    borderRadius: 11,
    padding: 3,
    gap: 4,
  },
  segmentTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
  },
  segmentTabActive: {
    backgroundColor: '#1e1b4b',
    shadowColor: '#1e1b4b',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  segmentTabText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  segmentTabTextActive: {
    color: '#ffffff',
  },
  tabBadge: {
    backgroundColor: '#cbd5e1',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 8,
    marginLeft: 2,
  },
  tabBadgeActive: {
    backgroundColor: '#4338ca',
  },
  tabBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#334155',
  },
  tabBadgeTextActive: {
    color: '#ffffff',
  },

  // ─── 3. Reimagined Executive Citizen Card ─────────────────────────
  citizenCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#e8eaf0',
    padding: 16,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 14,
    elevation: 3,
  },
  citizenIdentityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  avatarBox: {
    width: 58,
    height: 58,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    shadowColor: '#4338ca',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  avatarText: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  onlineBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#10b981',
    borderWidth: 2.5,
    borderColor: '#ffffff',
  },
  citizenInfoCol: {
    flex: 1,
    minWidth: 0,
  },
  nameBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'nowrap',
  },
  citizenNameText: {
    fontSize: 17.5,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: -0.2,
    flexShrink: 1,
  },
  verifiedTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ecfdf5',
    borderWidth: 1,
    borderColor: '#a7f3d0',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    gap: 3,
    flexShrink: 0,
  },
  verifiedTagText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#065f46',
    letterSpacing: 0.4,
  },
  citizenEmailText: {
    fontSize: 12.5,
    color: '#64748b',
    marginTop: 2,
  },
  idChipBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#f5f7ff',
    borderWidth: 1,
    borderColor: '#dbeafe',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 6,
    gap: 4,
    marginTop: 5,
  },
  idChipText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#4f46e5',
  },
  cardDivider: {
    height: 1,
    backgroundColor: '#f1f5f9',
    marginVertical: 14,
  },

  // ─── 4. Full-Width Citizen Preferences Block ──────────────────────
  preferencesSection: {
    gap: 9,
  },
  prefRowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#e8eaf0',
    padding: 11,
    gap: 12,
  },
  prefIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  prefTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  prefCategoryLabel: {
    fontSize: 9.5,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 1,
  },
  prefValueText: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#0f172a',
  },
  prefSubDetailText: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  prefActionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ecfdf5',
    borderWidth: 1,
    borderColor: '#a7f3d0',
    paddingVertical: 5,
    paddingHorizontal: 9,
    borderRadius: 8,
    gap: 3,
    flexShrink: 0,
  },
  prefActionPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#059669',
  },

  // ─── 5. Setup Progress Strip ──────────────────────────────────────
  progressContainer: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e8eaf0',
    padding: 11,
  },
  progressTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 7,
  },
  progressTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0f172a',
  },
  progressPercentText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#059669',
  },
  progressBarTrack: {
    height: 6,
    width: '100%',
    backgroundColor: '#e2e8f0',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressFootnote: {
    fontSize: 10.5,
    color: '#64748b',
    marginTop: 6,
    fontStyle: 'italic',
  },

  // ─── 6. Section Group & Metrics ───────────────────────────────────
  sectionGroupTitle: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#475569',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
    marginLeft: 2,
  },
  metricsStrip: {
    flexDirection: 'row',
    gap: 8,
  },
  metricPillCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#e8eaf0',
    borderRadius: 14,
    padding: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 5,
    elevation: 2,
  },
  metricIconBubble: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricData: {
    flex: 1,
  },
  metricNumber: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
  },
  metricLabel: {
    fontSize: 10,
    color: '#64748b',
    fontWeight: '600',
  },

  // ─── 7. Card Group & Actions ──────────────────────────────────────
  cardGroup: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#e8eaf0',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 13,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f8fafc',
  },
  actionIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionContent: {
    flex: 1,
  },
  actionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionTitle: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#111827',
  },
  actionBadge: {
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 10,
  },
  actionBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  actionDesc: {
    fontSize: 11.5,
    color: '#64748b',
    marginTop: 2,
    lineHeight: 15,
  },

  // ─── 8. Document Vault Styles ─────────────────────────────────────
  vaultHeaderBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ecfdf5',
    borderWidth: 1.5,
    borderColor: '#bbf7d0',
    borderRadius: 16,
    padding: 14,
    gap: 12,
    marginBottom: 12,
  },
  vaultBannerIconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#d1fae5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  vaultBannerTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#064e3b',
  },
  vaultBannerDesc: {
    fontSize: 11,
    color: '#047857',
    marginTop: 2,
    lineHeight: 15,
  },
  vaultDraftBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#059669',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    gap: 4,
  },
  vaultDraftBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ffffff',
  },
  vaultSearchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    marginBottom: 10,
  },
  vaultSearchInput: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 10,
    fontSize: 13,
    color: '#0f172a',
  },
  vaultFilterStrip: {
    flexDirection: 'row',
    marginBottom: 14,
  },
  vaultFilterPill: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    marginRight: 8,
  },
  vaultFilterPillActive: {
    backgroundColor: '#1e1b4b',
    borderColor: '#1e1b4b',
  },
  vaultFilterPillText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#64748b',
  },
  vaultFilterPillTextActive: {
    color: '#ffffff',
  },
  vaultCardsList: {
    gap: 12,
  },
  vaultDocCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    padding: 14,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  vaultDocCardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  vaultDocIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#eef2ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  vaultDocMeta: {
    flex: 1,
  },
  vaultDocTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
    lineHeight: 19,
  },
  vaultDocSubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  docTypeBadge: {
    backgroundColor: '#e0e7ff',
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 6,
  },
  docTypeBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#4338ca',
  },
  vaultDocDate: {
    fontSize: 11,
    color: '#94a3b8',
  },
  vaultDocDeleteBtn: {
    padding: 6,
  },
  vaultDocSnippet: {
    fontSize: 12,
    color: '#64748b',
    lineHeight: 17,
    marginTop: 8,
    paddingLeft: 4,
  },
  vaultDocActionsBar: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  vaultDocBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 9,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 5,
  },
  vaultDocBtnPrimary: {
    backgroundColor: '#1e1b4b',
    borderColor: '#1e1b4b',
  },
  vaultDocBtnText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#4338ca',
  },
  vaultEmptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
  },
  vaultEmptyIconBox: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  vaultEmptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
  },
  vaultEmptySubtitle: {
    fontSize: 12.5,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 18,
    marginTop: 6,
    marginBottom: 16,
  },
  vaultEmptyActionBtn: {
    backgroundColor: '#4338ca',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
  },
  vaultEmptyActionBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },

  // ─── 9. Formal Legal Paper Reader ─────────────────────────────────
  readerTopBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  readerBackBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
  },
  readerBackBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
  },
  readerActionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  readerActionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#eef2ff',
    borderWidth: 1,
    borderColor: '#c7d2fe',
  },
  readerActionChipSuccess: {
    backgroundColor: '#dcfce7',
    borderColor: '#86efac',
  },
  readerActionChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4338ca',
  },
  readerScroll: {
    flex: 1,
    backgroundColor: '#f1f5f9',
  },
  readerScrollContent: {
    padding: 14,
  },
  formalLegalPaper: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  formalLetterhead: {
    alignItems: 'center',
    marginBottom: 20,
  },
  letterheadBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#eef2ff',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 12,
    marginBottom: 8,
  },
  letterheadBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#4338ca',
    letterSpacing: 0.5,
  },
  letterheadTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
    textAlign: 'center',
    letterSpacing: 0.2,
  },
  letterheadSubtitle: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 4,
    textAlign: 'center',
  },
  letterheadRule: {
    height: 2,
    width: '100%',
    backgroundColor: '#0f172a',
    marginTop: 14,
  },
  formalLegalText: {
    fontSize: 13.5,
    lineHeight: 22,
    color: '#1e293b',
    textAlign: 'justify',
  },
  formalPaperFooter: {
    marginTop: 30,
  },
  paperFooterRule: {
    height: 1,
    width: '100%',
    backgroundColor: '#e2e8f0',
    marginBottom: 12,
  },
  paperFooterMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  paperFooterDate: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '600',
  },
  paperFooterStamp: {
    fontSize: 10,
    fontWeight: '800',
    color: '#dc2626',
    letterSpacing: 0.5,
  },
  paperFooterDisclaimer: {
    fontSize: 10,
    color: '#94a3b8',
    marginTop: 8,
    textAlign: 'center',
    fontStyle: 'italic',
  },

  // ─── 10. Emergency Helpline Styles ────────────────────────────────
  helplineBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff1f2',
    borderWidth: 1.5,
    borderColor: '#fecdd3',
    borderRadius: 16,
    padding: 14,
    gap: 12,
  },
  helplineCardBox: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#fecaca',
    padding: 14,
    gap: 10,
  },
  helplineCardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  helplineTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  helplineName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#991b1b',
  },
  helplineTag: {
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 6,
  },
  helplineTagText: {
    fontSize: 9.5,
    fontWeight: '800',
  },
  helplineDesc: {
    fontSize: 11.5,
    color: '#7f1d1d',
    marginTop: 3,
    lineHeight: 16,
  },
  helplineActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#fee2e2',
  },
  helplineNumberBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#f1f5f9',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  helplineNumberText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1e1b4b',
  },
  helplineDialBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#dc2626',
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: 8,
  },
  helplineDialBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },

  // ─── 11. Modals ───────────────────────────────────────────────────
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'center',
    padding: 16,
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 20,
    maxHeight: '85%',
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#1e1b4b',
  },
  formGroup: {
    marginBottom: 16,
  },
  modalLabel: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 6,
  },
  modalInput: {
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#111827',
    backgroundColor: '#f8fafc',
  },
  colorRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  colorCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  colorCircleActive: {
    borderWidth: 3,
    borderColor: '#0f172a',
  },
  personaGrid: {
    gap: 8,
    marginTop: 4,
  },
  personaOptionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
  },
  personaOptionBtnActive: {
    borderColor: '#4f46e5',
    backgroundColor: '#eef2ff',
  },
  personaOptionIcon: {
    fontSize: 18,
  },
  personaOptionText: {
    fontSize: 13,
    color: '#334155',
    fontWeight: '700',
  },
  personaOptionTextActive: {
    color: '#4f46e5',
  },
  personaOptionDesc: {
    fontSize: 10.5,
    color: '#64748b',
    marginTop: 2,
  },
  stateSelectGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
  },
  statePill: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
  },
  statePillActive: {
    borderColor: '#059669',
    backgroundColor: '#ecfdf5',
  },
  statePillText: {
    fontSize: 12,
    color: '#475569',
  },
  statePillTextActive: {
    color: '#064e3b',
    fontWeight: '700',
  },
  modalActionBtn: {
    backgroundColor: '#4f46e5',
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10,
  },
  modalActionBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  modelOptionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    marginBottom: 10,
    backgroundColor: '#ffffff',
  },
  modelOptionCardActive: {
    borderColor: '#4f46e5',
    backgroundColor: '#f5f7ff',
  },
  modelOptionName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },
  modelOptionDesc: {
    fontSize: 11.5,
    color: '#64748b',
    marginTop: 2,
  },
});

export default ProfileScreen;
