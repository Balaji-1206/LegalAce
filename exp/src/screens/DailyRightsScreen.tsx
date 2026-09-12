import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Share,
  TextInput,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../theme/colors';
import { SupportedLang, t } from '../config/i18n';
import { speakText, stopSpeaking } from '../utils/speech';

interface DailyRightsScreenProps {
  bookmarks: string[];
  toggleBookmark: (id: string) => void;
  onBackHome: () => void;
  lang?: SupportedLang;
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
  onBackHome,
  lang = 'en',
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [speakingRightId, setSpeakingRightId] = useState<string | null>(null);

  const handleToggleSpeak = (id: string, text: string) => {
    if (speakingRightId === id) {
      stopSpeaking();
      setSpeakingRightId(null);
    } else {
      stopSpeaking();
      setSpeakingRightId(id);
      speakText(
        text,
        lang,
        () => setSpeakingRightId(id),
        () => setSpeakingRightId(null)
      );
    }
  };

  const handleShare = async (title: string, body: string) => {
    try {
      await Share.share({
        title: `LegalAce — ${title}`,
        message: `Know your right: ${title}\n\n${body}\n\nShared via LegalAce App`,
      });
    } catch { /* cancelled */ }
  };

  const filteredRights = RIGHTS_DATA.filter((r) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      r.title.toLowerCase().includes(q) ||
      r.category.toLowerCase().includes(q) ||
      r.body.toLowerCase().includes(q)
    );
  });

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1 }}
    >
      <ScrollView style={styles.screen} contentContainerStyle={styles.contentContainer}>
      {/* Top Header */}
      <View style={styles.headerNav}>
        <TouchableOpacity
          style={styles.circularBtn}
          onPress={() => {
            stopSpeaking();
            onBackHome();
          }}
          activeOpacity={0.8}
        >
          <Ionicons name="chevron-back" size={20} color="#1a1a5e" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.circularBtn}
          onPress={() => setIsSearching(!isSearching)}
          activeOpacity={0.8}
        >
          <Ionicons name="search" size={18} color="#1a1a5e" />
        </TouchableOpacity>
      </View>

      {/* Header Titles */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t('rights_title', lang)}</Text>
        <Text style={styles.headerSubtitle}>
          {t('rights_subtitle', lang)}
        </Text>
      </View>

      {/* Search Input Bar (toggleable) */}
      {isSearching && (
        <View style={styles.searchBarWrap}>
          <Ionicons name="search" size={16} color="#6b7280" style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder={t('rights_search_placeholder', lang)}
            placeholderTextColor="#9ca3af"
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoFocus
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={18} color="#9ca3af" />
            </TouchableOpacity>
          ) : null}
        </View>
      )}

      {/* Rights Cards or Empty State */}
      {filteredRights.length === 0 ? (
        <View style={styles.emptyStateContainer}>
          <Ionicons name="search-outline" size={44} color="#94a3b8" />
          <Text style={styles.emptyStateTitle}>{t('rights_no_results', lang)}</Text>
          <Text style={styles.emptyStateSubtitle}>
            {t('rights_no_results_sub', lang)}
          </Text>
          {searchQuery ? (
            <TouchableOpacity
              style={styles.clearSearchBtn}
              onPress={() => setSearchQuery('')}
              activeOpacity={0.8}
            >
              <Text style={styles.clearSearchBtnText}>{t('rights_clear', lang)}</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      ) : (
        filteredRights.map((right) => {
          const isBookmarked = bookmarks.includes(right.id);
          const catColor = CATEGORY_COLORS[right.category] || '#4f46e5';

          return (
            <View key={right.id} style={styles.rightsCard}>
              <View style={[styles.cardTag, { backgroundColor: catColor + '18' }]}>
                <Text style={[styles.cardTagText, { color: catColor }]}>
                  {right.category}
                </Text>
              </View>

              <Text style={styles.cardTitle}>{right.title}</Text>
              <Text style={styles.cardBody}>{right.body}</Text>

              <View style={styles.cardActionsRow}>
                <TouchableOpacity
                  style={[
                    styles.actionIconBtn,
                    speakingRightId === right.id && styles.actionIconBtnSpeaking,
                  ]}
                  onPress={() =>
                    handleToggleSpeak(right.id, `${right.title}. ${right.body}`)
                  }
                  activeOpacity={0.7}
                  accessibilityLabel="Read right aloud"
                >
                  <Ionicons
                    name={speakingRightId === right.id ? 'stop-circle' : 'volume-high-outline'}
                    size={16}
                    color={speakingRightId === right.id ? '#ef4444' : '#6b7280'}
                  />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.actionIconBtn}
                  onPress={() => handleShare(right.title, right.body)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="share-social-outline" size={16} color="#6b7280" />
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionIconBtn, isBookmarked && styles.actionIconBtnBookmarked]}
                  onPress={() => toggleBookmark(right.id)}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={isBookmarked ? 'bookmark' : 'bookmark-outline'}
                    size={16}
                    color={isBookmarked ? '#d97706' : '#6b7280'}
                  />
                </TouchableOpacity>
              </View>
            </View>
          );
        })
      )}

      <View style={{ height: 95 }} />
    </ScrollView>
  </KeyboardAvoidingView>
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
  headerNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  circularBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  header: {
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 34,
    fontWeight: '800',
    color: '#1a1a5e',
    letterSpacing: -1,
    lineHeight: 40,
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 22,
  },
  searchBarWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 14,
  },
  searchInput: {
    flex: 1,
    fontSize: 13.5,
    color: '#111827',
  },
  rightsCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 20,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1.5,
    borderColor: '#e8eaf0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 10,
    elevation: 2,
  },
  cardTag: {
    alignSelf: 'flex-start',
    paddingVertical: 3,
    paddingHorizontal: 10,
    borderRadius: 14,
    marginBottom: 8,
  },
  cardTagText: {
    fontSize: 11,
    fontWeight: '700',
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 6,
    lineHeight: 22,
  },
  cardBody: {
    fontSize: 13.5,
    color: '#4b5563',
    lineHeight: 20,
    marginBottom: 12,
  },
  cardActionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  actionIconBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionIconBtnBookmarked: {
    backgroundColor: '#fef3c7',
  },
  actionIconBtnSpeaking: {
    backgroundColor: '#fee2e2',
  },
  emptyStateContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  emptyStateTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#334155',
    marginTop: 12,
    marginBottom: 6,
  },
  emptyStateSubtitle: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 16,
  },
  clearSearchBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#eff6ff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  clearSearchBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2563eb',
  },
});

export default DailyRightsScreen;
