import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Linking,
  TextInput,
  Modal,
  Share,
  Alert,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Colors from '../theme/colors';
import { API_BASE_URL } from '../config/api';
import {
  WizardScenario,
  WizardActionPlan,
  WizardQuestion,
} from '../types';

interface WizardScreenProps {
  userId: string;
  onBackHome: () => void;
}

type Lang = 'en' | 'ta' | 'hi';
type Screen = 'categories' | 'scenarios' | 'questions' | 'plan';

interface CategoryItem {
  id: string;
  name: string;
  name_ta?: string;
  name_hi?: string;
  icon: string;
  color: string;
  gradient: [string, string];
  count: number;
}

const WIZARD_CATEGORIES: CategoryItem[] = [
  { id: 'housing', name: 'Housing & Renting', name_ta: 'வாடகை & வீடு', name_hi: 'किराया और आवास', icon: '🏠', color: '#10b981', gradient: ['rgba(16, 185, 129, 0.14)', 'rgba(5, 150, 105, 0.05)'], count: 4 },
  { id: 'employment', name: 'Employment & Labor', name_ta: 'வேலைவாய்ப்பு', name_hi: 'रोजगार और श्रम', icon: '💼', color: '#3b82f6', gradient: ['rgba(59, 130, 246, 0.14)', 'rgba(29, 78, 216, 0.05)'], count: 4 },
  { id: 'consumer', name: 'Consumer Rights', name_ta: 'நுகர்வோர் உரிமைகள்', name_hi: 'उपभोक्ता अधिकार', icon: '🛒', color: '#f59e0b', gradient: ['rgba(245, 158, 11, 0.14)', 'rgba(217, 119, 6, 0.05)'], count: 3 },
  { id: 'banking', name: 'Banking & Fraud', name_ta: 'வங்கி & மோசடி', name_hi: 'बैंकिंग और धोखाधड़ी', icon: '🏦', color: '#06b6d4', gradient: ['rgba(6, 182, 212, 0.14)', 'rgba(8, 145, 178, 0.05)'], count: 3 },
  { id: 'cyber', name: 'Cyber Crime & Threat', name_ta: 'சைபர் குற்றம்', name_hi: 'साइबर अपराध', icon: '🛡️', color: '#8b5cf6', gradient: ['rgba(139, 92, 246, 0.14)', 'rgba(109, 40, 217, 0.05)'], count: 3 },
  { id: 'traffic', name: 'Traffic & Challans', name_ta: 'போக்குவரத்து & சலான்', name_hi: 'यातायात और चालान', icon: '🚗', color: '#f43f5e', gradient: ['rgba(244, 63, 94, 0.14)', 'rgba(225, 29, 72, 0.05)'], count: 2 },
  { id: 'women', name: 'Women Protections', name_ta: 'பெண்கள் பாதுகாப்பு', name_hi: 'महिला अधिकार', icon: '👩', color: '#a855f7', gradient: ['rgba(168, 85, 247, 0.14)', 'rgba(126, 34, 206, 0.05)'], count: 3 },
  { id: 'cheque_debt', name: 'Cheque Bounce & Debt', name_ta: 'காசோலை & கடன்', name_hi: 'चेक बाउंस और ऋण', icon: '💳', color: '#ef4444', gradient: ['rgba(239, 68, 68, 0.14)', 'rgba(220, 38, 38, 0.05)'], count: 2 },
];

const POPULAR_EXAMPLES = [
  '💳 Cheque bounce notice',
  '📜 RTI application file',
  '🏢 RERA possession delay',
  '🏥 Mediclaim rejected',
  '👩 POSH workplace complaint',
];

export const WizardScreen: React.FC<WizardScreenProps> = ({ userId: _userId, onBackHome }) => {
  const [lang, setLang] = useState<Lang>('en');
  const [screen, setScreen] = useState<Screen>('categories');
  const [selectedCat, setSelectedCat] = useState<CategoryItem | null>(null);
  const [scenarios, setScenarios] = useState<WizardScenario[]>([]);
  const [selectedScenario, setSelectedScenario] = useState<WizardScenario | null>(null);
  const [answers, setAnswers] = useState<Record<string, string | boolean>>({});
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [plan, setPlan] = useState<WizardActionPlan | null>(null);
  const [loading, setLoading] = useState(false);
  const [checkedDocs, setCheckedDocs] = useState<Record<string, boolean>>({});

  // Dynamic Custom Scenario Generator State
  const [customQuery, setCustomQuery] = useState('');
  const [generatingDynamic, setGeneratingDynamic] = useState(false);

  // Document Generator Modal State
  const [isDocModalOpen, setIsDocModalOpen] = useState(false);
  const [docGenerating, setDocGenerating] = useState(false);
  const [generatedDocText, setGeneratedDocText] = useState<string | null>(null);
  const [recipientName, setRecipientName] = useState('Opposing Party / Landlord / Company');
  const [senderName, setSenderName] = useState('Aggrieved Citizen');
  const [disputeAmount, setDisputeAmount] = useState('50000');
  const [factsSummary, setFactsSummary] = useState('');

  const handleGenerateCustom = async (queryOverride?: string) => {
    const text = (queryOverride || customQuery).trim();
    if (!text) {
      Alert.alert('Please Describe Your Situation', 'Enter a brief summary of your legal dispute.');
      return;
    }

    setGeneratingDynamic(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/wizard/generate-dynamic-scenario`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_topic: text }),
      });

      if (res.ok) {
        const data = await res.json();
        const questions: WizardQuestion[] = data.questions && data.questions.length > 0
          ? data.questions
          : [
              { id: 'q1', text: 'Have you served formal written notice or demand to the other party?', type: 'boolean' },
              { id: 'q2', text: 'Do you hold transaction receipts, agreements, or signed records?', type: 'boolean' },
              { id: 'q3', text: 'Has more than 30 days elapsed since the disputed event occurred?', type: 'boolean' },
            ];

        setSelectedScenario({
          scenario_id: data.scenario_id || 'custom_dynamic',
          category: data.category || 'custom',
          title: data.title || text,
          questions,
        });

        if (data.default_plan) {
          setPlan(data.default_plan);
        }

        setAnswers({});
        setCurrentQIndex(0);
        setScreen('questions');
      } else {
        throw new Error('Generation failed');
      }
    } catch {
      // Offline fallback custom scenario
      setSelectedScenario({
        scenario_id: 'custom_dynamic_fallback',
        category: 'custom',
        title: `AI Analysis: ${text}`,
        questions: [
          { id: 'q1', text: 'Did you enter into a written contract, lease, or receive receipts?', type: 'boolean' },
          { id: 'q2', text: 'Have you issued a formal demand for resolution or refund in writing?', type: 'boolean' },
          { id: 'q3', text: 'Has the other party failed to respond within 15 days of notice?', type: 'boolean' },
        ],
      });
      setAnswers({});
      setCurrentQIndex(0);
      setScreen('questions');
    } finally {
      setGeneratingDynamic(false);
    }
  };

  const selectCategory = async (cat: CategoryItem) => {
    setSelectedCat(cat);
    setLoading(true);
    setScreen('scenarios');
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/wizard/scenarios/${cat.id}`);
      if (res.ok) {
        const data = await res.json();
        setScenarios(data.scenarios || []);
      } else {
        throw new Error();
      }
    } catch {
      setScenarios([
        {
          scenario_id: `${cat.id}_standard`,
          category: cat.id,
          title: `Resolution for ${cat.name} Dispute`,
          question_count: 3,
          questions: [
            { id: 'q1', text: 'Did you receive a formal written notice or warning?', type: 'boolean' },
            { id: 'q2', text: 'Have more than 30 days elapsed since the disputed event?', type: 'boolean' },
            { id: 'q3', text: 'Do you hold transaction receipts, contracts, or bank statements?', type: 'boolean' },
          ],
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const startScenario = async (sc: WizardScenario) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/wizard/scenario/${sc.scenario_id}`);
      if (res.ok) {
        const fullSc = await res.json();
        const scenarioData = fullSc.scenario || fullSc;
        const questions: WizardQuestion[] = scenarioData.questions && scenarioData.questions.length > 0
          ? scenarioData.questions
          : [
              { id: 'q1', text: 'Have you served formal written notice or communication?', type: 'boolean' },
              { id: 'q2', text: 'Do you hold original transaction receipts, agreements, or bank proofs?', type: 'boolean' },
              { id: 'q3', text: 'Has more than 15 days elapsed since your formal demand?', type: 'boolean' },
            ];
        setSelectedScenario({ ...scenarioData, questions });
      } else {
        const fallbackQs: WizardQuestion[] = sc.questions && sc.questions.length > 0
          ? sc.questions
          : [
              { id: 'q1', text: 'Have you handed over keys or vacated the premises?', type: 'boolean' },
              { id: 'q2', text: 'Has it been more than 21 days since vacating without refund?', type: 'boolean' },
              { id: 'q3', text: 'Did the landlord give any written reason for withholding?', type: 'boolean' },
            ];
        setSelectedScenario({ ...sc, questions: fallbackQs });
      }
    } catch {
      setSelectedScenario({
        ...sc,
        questions: [
          { id: 'q1', text: 'Did you receive a formal notice or written communication?', type: 'boolean' },
          { id: 'q2', text: 'Have more than 21 days elapsed without resolution?', type: 'boolean' },
          { id: 'q3', text: 'Do you hold payment receipts or written correspondence?', type: 'boolean' },
        ],
      });
    } finally {
      setLoading(false);
      setAnswers({});
      setCurrentQIndex(0);
      setScreen('questions');
    }
  };

  const handleAnswer = async (ans: boolean | string) => {
    if (!selectedScenario || !selectedScenario.questions) return;
    const q = selectedScenario.questions[currentQIndex];
    const valStr = typeof ans === 'boolean' ? (ans ? 'yes' : 'no') : String(ans);
    const newAnswers = { ...answers, [q.id]: valStr };
    setAnswers(newAnswers);

    if (currentQIndex + 1 < selectedScenario.questions.length) {
      setCurrentQIndex(prev => prev + 1);
    } else {
      setLoading(true);
      try {
        const res = await fetch(`${API_BASE_URL}/api/v1/wizard/quick-plan`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            scenario_id: selectedScenario.scenario_id,
            answers: newAnswers,
          }),
        });
        if (res.ok) {
          const planData = await res.json();
          if (planData && planData.steps && planData.steps.length > 0) {
            setPlan(planData);
            setScreen('plan');
            return;
          }
        }
        throw new Error();
      } catch {
        setPlan({
          title: `${selectedScenario.title} — Statutory Action Blueprint`,
          urgent: false,
          disclaimer: 'Generated under Indian Law and constitutional guarantees.',
          steps: [
            {
              step_number: 1,
              title: 'Preserve Records & Contemporaneous Evidence',
              description: 'Collate all agreements, email threads, WhatsApp communications, bank statement entries, and transaction receipts.',
              estimated_time: '1-2 days',
              importance: 'Critical Pre-condition',
              applicable_law: 'Bharatiya Sakshya Adhiniyam / Indian Evidence Act',
            },
            {
              step_number: 2,
              title: 'Issue Formal Statutory Legal Demand Notice',
              description: 'Draft and dispatch a 15-day formal legal notice by registered post with acknowledgement due.',
              estimated_time: '15 days',
              importance: 'Mandatory Pre-condition',
              applicable_law: 'Code of Civil Procedure, 1908 / Specific Relief Act',
            },
            {
              step_number: 3,
              title: 'Lodge Grievance with Statutory Authority',
              description: 'In the event of non-compliance, lodge formal petition on the official regulatory portal.',
              estimated_time: '30 days',
              importance: 'Remedy Enforcement',
            },
          ],
          required_documents: [
            'Proof of Identification (Aadhaar / Passport)',
            'Signed Tenancy Agreement / Employment Letter',
            'Bank Transaction Statements / UPI Receipts',
            'Email & WhatsApp Written Communications',
          ],
          authorities: [
            { name: 'National Legal Services Authority (NALSA)', helpline: '15100', url: 'https://nalsa.gov.in', action: 'Free legal aid & advice' },
            { name: 'National Consumer Helpline', helpline: '1915', url: 'https://consumerhelpline.gov.in', action: 'Grievance registration' },
          ],
          templates: [
            { id: 'legal_notice', title: 'Formal Statutory Demand Notice Draft', description: 'Pre-filled 15-day demand notice template' },
          ],
        });
        setScreen('plan');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleGenerateNotice = async () => {
    setDocGenerating(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/wizard/generate-document`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          template_id: 'legal_notice',
          details: {
            sender_name: senderName,
            recipient_name: recipientName,
            dispute_amount: disputeAmount,
            facts_summary: factsSummary || (selectedScenario ? selectedScenario.title : 'Legal dispute matters'),
            notice_days: 15,
          },
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setGeneratedDocText(data.document_text || data.text);
      } else {
        throw new Error();
      }
    } catch {
      const today = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });
      setGeneratedDocText(
`BY REGISTERED POST WITH ACKNOWLEDGEMENT DUE / SPEED POST

Date: ${today}

TO:
${recipientName}

FROM:
${senderName}

SUBJECT: STATUTORY LEGAL DEMAND NOTICE UNDER SECTION 106 TRANSFER OF PROPERTY ACT / SECTION 35 CONSUMER PROTECTION ACT.

Sir/Madam,

Under instructions from and on behalf of my client/myself, you are hereby served with this formal legal notice:

1. That an agreement/transaction was entered into between the parties regarding: ${factsSummary || 'unresolved legal obligations'}.
2. That the sum of ₹${disputeAmount}/- remains wrongfully withheld/due despite repeated oral and written reminders.
3. That your deliberate failure to resolve the grievance constitutes unfair practice and breach of trust.

TAKE NOTICE that you are hereby called upon to pay/refund the sum of ₹${disputeAmount}/- within 15 (fifteen) days from the receipt of this notice, failing which appropriate civil and criminal proceedings will be instituted against you in the competent court at your risk as to costs and consequences.

Yours faithfully,

_____________________________
(${senderName})`
      );
    } finally {
      setDocGenerating(false);
    }
  };

  const handleShareDoc = async () => {
    if (!generatedDocText) return;
    try {
      await Share.share({
        title: 'Statutory Legal Notice',
        message: generatedDocText,
      });
    } catch { /* cancelled */ }
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.contentContainer}>
      {/* ─── Header ───────────────────────────────────────────── */}
      <View style={styles.wizardHeader}>
        <View style={styles.wizardHeaderRow}>
          <View style={styles.wizardHeaderLeft}>
            {onBackHome && (
              <TouchableOpacity style={styles.backBtnCircle} onPress={onBackHome} activeOpacity={0.8}>
                <Ionicons name="arrow-back" size={20} color="#1a1a5e" />
              </TouchableOpacity>
            )}
            <View>
              <Text style={styles.headerTitle}>What Should I Do?</Text>
              <Text style={styles.headerSubtitle}>
                Tell us what happened — we'll guide you step by step
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* ─── Language Switcher ─────────────────────────────────── */}
      <View style={styles.langSwitcher}>
        {(['en', 'ta', 'hi'] as Lang[]).map((l) => (
          <TouchableOpacity
            key={l}
            style={[styles.langBtn, lang === l && styles.langBtnActive]}
            onPress={() => setLang(l)}
            activeOpacity={0.8}
          >
            <Text style={[styles.langBtnText, lang === l && styles.langBtnTextActive]}>
              {l === 'en' ? 'English' : l === 'ta' ? 'தமிழ்' : 'हिंदी'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ─── 1. CATEGORIES SCREEN ──────────────────────────────── */}
      {screen === 'categories' && (
        <View style={styles.categoryScreenWrap}>
          {/* Custom AI Situation Generator Card ("Generate Wizard") */}
          <View style={styles.customAiCard}>
            <View style={styles.customAiHeader}>
              <View style={styles.customAiBadge}>
                <Text style={styles.customAiBadgeText}>🤖 AI CUSTOM GUIDE</Text>
              </View>
              <Text style={styles.customAiTitle}>Don't see your exact situation?</Text>
              <Text style={styles.customAiSub}>
                Type what happened — AI will build a custom decision tree & action plan for you on-the-fly!
              </Text>
            </View>

            <View style={styles.customAiInputGroup}>
              <TextInput
                style={styles.customAiInput}
                placeholder="Describe your legal issue (e.g. Landlord withholding deposit)..."
                placeholderTextColor="#94a3b8"
                value={customQuery}
                onChangeText={setCustomQuery}
                onSubmitEditing={() => handleGenerateCustom()}
              />
              <TouchableOpacity
                onPress={() => handleGenerateCustom()}
                disabled={generatingDynamic}
                activeOpacity={0.8}
                style={styles.customAiSubmitBtnWrap}
              >
                <LinearGradient
                  colors={['#1a1a5e', '#312e81']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.customAiSubmitBtn}
                >
                  {generatingDynamic ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <ActivityIndicator size="small" color="#ffffff" />
                      <Text style={styles.customAiSubmitBtnText}>⚡ Generating Plan...</Text>
                    </View>
                  ) : (
                    <Text style={styles.customAiSubmitBtnText}>✨ Generate AI Action Plan</Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>

            <View style={styles.customAiSuggestions}>
              <Text style={styles.suggestionsLabel}>Popular Examples:</Text>
              <View style={styles.chipsWrap}>
                {POPULAR_EXAMPLES.map((chip, idx) => (
                  <TouchableOpacity
                    key={idx}
                    style={styles.exampleChip}
                    onPress={() => {
                      setCustomQuery(chip);
                      handleGenerateCustom(chip);
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.exampleChipText}>{chip}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>

          <Text style={styles.sectionLabel}>CHOOSE A LEGAL DOMAIN</Text>

          <View style={styles.categoryGrid}>
            {WIZARD_CATEGORIES.map((cat) => (
              <TouchableOpacity
                key={cat.id}
                style={styles.catCardOuter}
                onPress={() => selectCategory(cat)}
                activeOpacity={0.7}
              >
                <LinearGradient
                  colors={cat.gradient}
                  style={styles.catCardInner}
                >
                  <Text style={styles.catEmoji}>{cat.icon}</Text>
                  <Text style={styles.catCardName}>
                    {lang === 'ta' && cat.name_ta ? cat.name_ta : lang === 'hi' && cat.name_hi ? cat.name_hi : cat.name}
                  </Text>
                  <View style={styles.catCardCountBadge}>
                    <Text style={[styles.catCardCountText, { color: cat.color }]}>
                      {cat.count} scenarios
                    </Text>
                  </View>
                </LinearGradient>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* ─── 2. SCENARIOS SCREEN ───────────────────────────────── */}
      {screen === 'scenarios' && (
        <View style={styles.innerScreenWrap}>
          <TouchableOpacity
            style={styles.backLinkRow}
            onPress={() => setScreen('categories')}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={16} color="#4f46e5" />
            <Text style={styles.backLinkText}>Back to Categories</Text>
          </TouchableOpacity>

          <Text style={styles.screenHeading}>
            {selectedCat ? selectedCat.name : 'Select Scenario'}
          </Text>
          <Text style={styles.screenSubText}>Choose the situation that best matches your dispute:</Text>

          {loading ? (
            <ActivityIndicator size="large" color="#4f46e5" style={{ marginTop: 40 }} />
          ) : (
            scenarios.map((sc) => {
              const qCount = sc.question_count ?? sc.questions?.length ?? 3;
              return (
                <TouchableOpacity
                  key={sc.scenario_id}
                  style={styles.scenarioCard}
                  onPress={() => startScenario(sc)}
                  activeOpacity={0.7}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.scenarioTitle}>{sc.title}</Text>
                    <Text style={styles.scenarioMeta}>
                      {qCount} diagnostic questions • ~2 min
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#4f46e5" />
                </TouchableOpacity>
              );
            })
          )}
        </View>
      )}

      {/* ─── 3. QUESTIONS SCREEN ───────────────────────────────── */}
      {screen === 'questions' && selectedScenario && selectedScenario.questions && (
        <View style={styles.innerScreenWrap}>
          {/* Back button */}
          <TouchableOpacity
            style={styles.backLinkRow}
            onPress={() => {
              if (currentQIndex > 0) {
                setCurrentQIndex(prev => prev - 1);
              } else {
                setScreen(selectedCat ? 'scenarios' : 'categories');
              }
            }}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={16} color="#4f46e5" />
            <Text style={styles.backLinkText}>
              {currentQIndex > 0 ? 'Previous Question' : 'Back to Scenarios'}
            </Text>
          </TouchableOpacity>

          {/* Progress Bar */}
          <View style={styles.progressWrap}>
            <View style={styles.progressTrack}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${Math.min(100, Math.round(((currentQIndex + 1) / Math.max(selectedScenario.questions.length, 1)) * 100))}%`,
                  },
                ]}
              />
            </View>
            <Text style={styles.progressLabel}>
              Question {currentQIndex + 1} of {selectedScenario.questions.length}
            </Text>
          </View>

          {/* Question Card */}
          <View style={styles.questionCard}>
            <View style={styles.questionNumBadge}>
              <Text style={styles.questionNumBadgeText}>STEP {currentQIndex + 1}</Text>
            </View>

            <Text style={styles.questionText}>
              {(() => {
                const curQ = selectedScenario.questions[currentQIndex];
                if (!curQ) return 'Review your situation details';
                if (lang === 'ta' && curQ.text_ta) return curQ.text_ta;
                if (lang === 'hi' && curQ.text_hi) return curQ.text_hi;
                return curQ.text;
              })()}
            </Text>

            {loading ? (
              <ActivityIndicator size="large" color="#4f46e5" style={{ marginTop: 20 }} />
            ) : (
              <View style={styles.answerBtnRow}>
                <TouchableOpacity
                  style={[styles.answerBtn, styles.yesBtn]}
                  onPress={() => handleAnswer(true)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="checkmark-circle" size={20} color="#ffffff" />
                  <Text style={styles.answerBtnText}>
                    {lang === 'ta' ? 'ஆம் / ஒப்புக்கொள்கிறேன்' : lang === 'hi' ? 'हाँ / सहमत हूँ' : 'Yes / Agreed'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.answerBtn, styles.noBtn]}
                  onPress={() => handleAnswer(false)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="close-circle" size={20} color="#ffffff" />
                  <Text style={styles.answerBtnText}>
                    {lang === 'ta' ? 'இல்லை / உறுதியில்லை' : lang === 'hi' ? 'नहीं / निश्चित नहीं' : 'No / Not sure'}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      )}

      {/* ─── 4. PLAN SCREEN ────────────────────────────────────── */}
      {screen === 'plan' && plan && (
        <View style={styles.innerScreenWrap}>
          {/* Status Header */}
          <LinearGradient
            colors={['#1a1a5e', '#312e81']}
            style={styles.planHeaderCard}
          >
            <View style={styles.planBadge}>
              <Ionicons name="checkmark-circle" size={14} color="#6ee7b7" />
              <Text style={styles.planBadgeText}>STATUTORY ACTION BLUEPRINT</Text>
            </View>
            <Text style={styles.planTitle}>{plan.title}</Text>
            <Text style={styles.planDisclaimer}>{plan.disclaimer}</Text>
          </LinearGradient>

          {/* Action Steps */}
          <Text style={styles.sectionLabel}>RECOMMENDED ACTION STEPS</Text>
          {plan.steps.map((step) => (
            <View key={step.step_number} style={styles.planStepCard}>
              <View style={styles.planStepHeader}>
                <View style={styles.stepBadge}>
                  <Text style={styles.stepBadgeText}>STEP {step.step_number}</Text>
                </View>
                <Text style={styles.stepTime}>{step.estimated_time}</Text>
              </View>
              <Text style={styles.stepTitle}>{step.title}</Text>
              <Text style={styles.stepDesc}>{step.description}</Text>
              {step.applicable_law ? (
                <Text style={styles.stepLaw}>⚖️ Law: {step.applicable_law}</Text>
              ) : null}
            </View>
          ))}

          {/* Required Documents Checklist */}
          {plan.required_documents.length > 0 && (
            <View style={styles.docsCard}>
              <Text style={styles.cardHeaderTitle}>📄 Required Documents Checklist</Text>
              {plan.required_documents.map((doc, idx) => {
                const isDone = Boolean(checkedDocs[doc]);
                return (
                  <TouchableOpacity
                    key={idx}
                    style={styles.docCheckRow}
                    onPress={() => setCheckedDocs(prev => ({ ...prev, [doc]: !prev[doc] }))}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name={isDone ? 'checkbox' : 'square-outline'}
                      size={20}
                      color={isDone ? Colors.success : Colors.textMuted}
                    />
                    <Text style={[styles.docCheckText, isDone && styles.docCheckDone]}>
                      {doc}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {/* Document Generator Action Card */}
          <View style={styles.generateNoticeCard}>
            <View style={{ flex: 1 }}>
              <Text style={styles.generateNoticeTitle}>📝 Generate Statutory Legal Notice</Text>
              <Text style={styles.generateNoticeSub}>
                Draft and dispatch an official 15-day legal notice with section citations.
              </Text>
            </View>
            <TouchableOpacity
              style={styles.generateNoticeBtn}
              onPress={() => setIsDocModalOpen(true)}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['#1a1a5e', '#312e81']}
                style={styles.generateNoticeGradient}
              >
                <Text style={styles.generateNoticeBtnText}>Draft Notice</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>

          {/* Authorities / Helplines */}
          {plan.authorities.length > 0 && (
            <View style={styles.authCard}>
              <Text style={styles.cardHeaderTitle}>🏛️ Where to Complain / Seek Aid</Text>
              {plan.authorities.map((auth, idx) => (
                <View key={idx} style={styles.authItem}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.authName}>{auth.name}</Text>
                    <Text style={styles.authAction}>{auth.action}</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.callBtn}
                    onPress={() => Linking.openURL(`tel:${auth.helpline}`)}
                  >
                    <Ionicons name="call" size={12} color="#ffffff" />
                    <Text style={styles.callBtnText}>{auth.helpline}</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}

          {/* Restart */}
          <TouchableOpacity
            style={styles.restartBtn}
            onPress={() => {
              setScreen('categories');
              setSelectedCat(null);
              setSelectedScenario(null);
            }}
            activeOpacity={0.7}
          >
            <Ionicons name="refresh" size={18} color="#4f46e5" />
            <Text style={styles.restartBtnText}>Analyze Another Situation</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={{ height: 95 }} />

      {/* --- NOTICE GENERATION MODAL --- */}
      <Modal visible={isDocModalOpen} animationType="slide" transparent>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>Draft Statutory Notice</Text>
              <TouchableOpacity onPress={() => setIsDocModalOpen(false)}>
                <Ionicons name="close" size={24} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {!generatedDocText ? (
                <View>
                  <View style={styles.formGroup}>
                    <Text style={styles.modalLabel}>Your Full Name (Sender)</Text>
                    <TextInput
                      style={styles.modalInput}
                      value={senderName}
                      onChangeText={setSenderName}
                      placeholder="e.g. Rahul Sharma"
                    />
                  </View>

                  <View style={styles.formGroup}>
                    <Text style={styles.modalLabel}>Opposing Party (Recipient / Landlord / Firm)</Text>
                    <TextInput
                      style={styles.modalInput}
                      value={recipientName}
                      onChangeText={setRecipientName}
                      placeholder="e.g. Apex Realty Developers"
                    />
                  </View>

                  <View style={styles.formGroup}>
                    <Text style={styles.modalLabel}>Dispute Amount (₹)</Text>
                    <TextInput
                      style={styles.modalInput}
                      value={disputeAmount}
                      onChangeText={setDisputeAmount}
                      keyboardType="numeric"
                      placeholder="e.g. 50000"
                    />
                  </View>

                  <View style={styles.formGroup}>
                    <Text style={styles.modalLabel}>Brief Summary of Dispute Facts</Text>
                    <TextInput
                      style={[styles.modalInput, { height: 70 }]}
                      value={factsSummary}
                      onChangeText={setFactsSummary}
                      multiline
                      placeholder="e.g. Landlord withholding security deposit without explanation"
                    />
                  </View>

                  <TouchableOpacity
                    style={styles.docActionBtn}
                    onPress={handleGenerateNotice}
                    disabled={docGenerating}
                    activeOpacity={0.8}
                  >
                    <LinearGradient
                      colors={['#059669', '#10b981']}
                      style={styles.docActionGradient}
                    >
                      {docGenerating ? (
                        <ActivityIndicator size="small" color="#ffffff" />
                      ) : (
                        <Text style={styles.docActionBtnText}>📄 Generate Statutory Notice</Text>
                      )}
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              ) : (
                <View>
                  <Text style={styles.previewLabel}>Generated Statutory Notice Text:</Text>
                  <View style={styles.docPreviewBox}>
                    <Text style={styles.docPreviewText}>{generatedDocText}</Text>
                  </View>

                  <View style={styles.docModalActionsRow}>
                    <TouchableOpacity
                      style={[styles.docBtn, { backgroundColor: '#4f46e5' }]}
                      onPress={handleShareDoc}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="share-outline" size={16} color="#ffffff" />
                      <Text style={styles.docBtnText}>Share / Save Notice</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.docBtn, { backgroundColor: '#f1f5f9', borderWidth: 1, borderColor: '#cbd5e1' }]}
                      onPress={() => setGeneratedDocText(null)}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.docBtnText, { color: '#334155' }]}>Edit Details</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#f4f5f9',
  },
  contentContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  wizardHeader: {
    marginBottom: 12,
  },
  wizardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  wizardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backBtnCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1a1a5e',
    letterSpacing: -0.4,
  },
  headerSubtitle: {
    fontSize: 12.5,
    color: '#6b7280',
    marginTop: 2,
  },
  langSwitcher: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 3,
    borderWidth: 1,
    borderColor: '#e8eaf0',
    marginBottom: 16,
    alignSelf: 'flex-start',
  },
  langBtn: {
    paddingVertical: 5,
    paddingHorizontal: 14,
    borderRadius: 16,
  },
  langBtnActive: {
    backgroundColor: '#1a1a5e',
  },
  langBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
  },
  langBtnTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
  categoryScreenWrap: {
    marginTop: 4,
  },
  customAiCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    padding: 18,
    marginBottom: 20,
    shadowColor: '#4f46e5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 3,
    overflow: 'hidden',
  },
  customAiHeader: {
    marginBottom: 14,
  },
  customAiBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#eef2ff',
    paddingVertical: 3,
    paddingHorizontal: 10,
    borderRadius: 20,
    marginBottom: 8,
  },
  customAiBadgeText: {
    color: '#4f46e5',
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  customAiTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#1a1a5e',
    marginBottom: 4,
  },
  customAiSub: {
    fontSize: 12.5,
    color: '#6b7280',
    lineHeight: 18,
  },
  customAiInputGroup: {
    gap: 10,
    marginBottom: 14,
  },
  customAiInput: {
    backgroundColor: '#f8fafc',
    borderWidth: 1.5,
    borderColor: '#cbd5e1',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 13.5,
    color: '#0f172a',
  },
  customAiSubmitBtnWrap: {
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#1a1a5e',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
  },
  customAiSubmitBtn: {
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  customAiSubmitBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
  },
  customAiSuggestions: {
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 10,
  },
  suggestionsLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
    marginBottom: 6,
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  exampleChip: {
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 14,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  exampleChipText: {
    fontSize: 11.5,
    color: '#334155',
    fontWeight: '600',
  },
  sectionLabel: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#64748b',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  catCardOuter: {
    width: '48.5%',
    borderRadius: 18,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  catCardInner: {
    padding: 16,
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#e8eaf0',
    borderRadius: 18,
    alignItems: 'flex-start',
  },
  catEmoji: {
    fontSize: 28,
    marginBottom: 10,
  },
  catCardName: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#1a1a5e',
    marginBottom: 6,
  },
  catCardCountBadge: {
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.85)',
  },
  catCardCountText: {
    fontSize: 10.5,
    fontWeight: '700',
  },
  innerScreenWrap: {
    marginTop: 4,
  },
  backLinkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 14,
  },
  backLinkText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#4f46e5',
  },
  screenHeading: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1a1a5e',
    marginBottom: 4,
  },
  screenSubText: {
    fontSize: 13,
    color: '#6b7280',
    marginBottom: 16,
  },
  scenarioCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#e8eaf0',
    borderRadius: 16,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
  },
  scenarioTitle: {
    fontSize: 14.5,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  scenarioMeta: {
    fontSize: 11.5,
    color: '#6b7280',
  },
  progressWrap: {
    marginBottom: 16,
  },
  progressTrack: {
    height: 6,
    backgroundColor: '#e2e8f0',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 6,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4f46e5',
    borderRadius: 3,
  },
  progressLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4f46e5',
  },
  questionCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#e8eaf0',
    padding: 22,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 3,
  },
  questionNumBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#eef2ff',
    paddingVertical: 3,
    paddingHorizontal: 10,
    borderRadius: 10,
    marginBottom: 12,
  },
  questionNumBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#4f46e5',
  },
  questionText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    lineHeight: 24,
    marginBottom: 24,
  },
  answerBtnRow: {
    gap: 12,
  },
  answerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
  },
  yesBtn: {
    backgroundColor: '#059669',
  },
  noBtn: {
    backgroundColor: '#4b5563',
  },
  answerBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#ffffff',
  },
  planHeaderCard: {
    padding: 18,
    borderRadius: 18,
    marginBottom: 16,
    shadowColor: '#1a1a5e',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 4,
  },
  planBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  planBadgeText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#6ee7b7',
    letterSpacing: 0.5,
  },
  planTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#ffffff',
    marginBottom: 6,
  },
  planDisclaimer: {
    fontSize: 11.5,
    color: 'rgba(255, 255, 255, 0.75)',
  },
  planStepCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#e8eaf0',
    padding: 16,
    marginBottom: 10,
  },
  planStepHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  stepBadge: {
    backgroundColor: '#eef2ff',
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  stepBadgeText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#4f46e5',
  },
  stepTime: {
    fontSize: 11.5,
    color: '#6b7280',
    fontWeight: '600',
  },
  stepTitle: {
    fontSize: 14.5,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  stepDesc: {
    fontSize: 13,
    color: '#4b5563',
    lineHeight: 18,
  },
  stepLaw: {
    fontSize: 12,
    color: '#4f46e5',
    fontWeight: '600',
    marginTop: 6,
  },
  docsCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#e8eaf0',
    padding: 16,
    marginBottom: 12,
  },
  cardHeaderTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 10,
  },
  docCheckRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f8fafc',
  },
  docCheckText: {
    fontSize: 13,
    color: '#374151',
    flex: 1,
  },
  docCheckDone: {
    textDecorationLine: 'line-through',
    color: '#9ca3af',
  },
  generateNoticeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#c7d2fe',
    borderRadius: 16,
    marginBottom: 12,
    gap: 12,
  },
  generateNoticeTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1a1a5e',
    marginBottom: 3,
  },
  generateNoticeSub: {
    fontSize: 11.5,
    color: '#6b7280',
    lineHeight: 15,
  },
  generateNoticeBtn: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  generateNoticeGradient: {
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  generateNoticeBtnText: {
    color: '#ffffff',
    fontSize: 12.5,
    fontWeight: '700',
  },
  authCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#e8eaf0',
    padding: 16,
    marginBottom: 14,
  },
  authItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f8fafc',
    gap: 10,
  },
  authName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#111827',
  },
  authAction: {
    fontSize: 11.5,
    color: '#6b7280',
  },
  callBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#059669',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  callBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#ffffff',
  },
  restartBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 13,
    borderRadius: 14,
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
  },
  restartBtnText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#4f46e5',
  },
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
    marginBottom: 14,
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
    fontSize: 13.5,
    color: '#111827',
    backgroundColor: '#f8fafc',
  },
  docActionBtn: {
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: 8,
  },
  docActionGradient: {
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  docActionBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  previewLabel: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 8,
  },
  docPreviewBox: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 12,
    padding: 14,
    maxHeight: 280,
    marginBottom: 14,
  },
  docPreviewText: {
    fontSize: 12,
    color: '#0f172a',
    lineHeight: 18,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  docModalActionsRow: {
    gap: 10,
  },
  docBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
  },
  docBtnText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#ffffff',
  },
});

export default WizardScreen;
