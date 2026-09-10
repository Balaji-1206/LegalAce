import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Colors from '../theme/colors';
import { SituationDetail, ActiveTab, CategoryItem } from '../types';

interface HomeScreenProps {
  userId: string;
  categories: CategoryItem[];
  onNavigate: (tab: ActiveTab, categoryId?: string) => void;
  situations: SituationDetail[];
  recentlyViewed: string[];
  openSituationDetail: (id: string) => void;
  onOpenSpotlight: () => void;
}

const TOP_CATEGORIES = [
  { id: 'employment', name: 'Employment', icon: '💼', color: '#3b82f6' },
  { id: 'housing', name: 'Housing & Renting', icon: '🏠', color: '#10b981' },
  { id: 'consumer', name: 'Consumer Rights', icon: '🛒', color: '#f59e0b' },
  { id: 'cyber_crime', name: 'Cyber Crime', icon: '🛡️', color: '#ec4899' },
  { id: 'women_rights', name: 'Women Rights', icon: '👩', color: '#a855f7' },
  { id: 'banking', name: 'Banking & Finance', icon: '🏦', color: '#06b6d4' },
  { id: 'traffic', name: 'Traffic Rules', icon: '🚗', color: '#f43f5e' },
];

export const HomeScreen: React.FC<HomeScreenProps> = ({
  onNavigate,
  situations,
  recentlyViewed,
  openSituationDetail,
  onOpenSpotlight,
}) => {
  const recentSituations = recentlyViewed
    .map(id => situations.find(s => s.situation_id === id))
    .filter((s): s is SituationDetail => Boolean(s))
    .slice(0, 5);

  const fallbackRecent = situations.slice(0, 4);
  const displayRecent = recentSituations.length > 0 ? recentSituations : fallbackRecent;

  const formatTimeAgo = (id: string) => {
    const idx = recentlyViewed.indexOf(id);
    if (idx === 0) return 'Just now';
    if (idx === 1) return '2d ago';
    return '5d ago';
  };

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      {/* ─── Sticky Header ───────────────────────────────────── */}
      <View style={styles.homeHeader}>
        <View>
          <View style={styles.headerBadge}>
            <View style={styles.liveDot} />
            <Text style={styles.headerBadgeText}>Indian Law Companion</Text>
          </View>
          <Text style={styles.headerTitle}>LegalAce</Text>
        </View>
        <TouchableOpacity
          style={styles.profileBtn}
          onPress={() => onNavigate('profile')}
          activeOpacity={0.7}
        >
          <Ionicons name="person-outline" size={20} color={Colors.textNavy} />
        </TouchableOpacity>
      </View>

      {/* ─── Search Bar ───────────────────────────────────────── */}
      <View style={styles.searchWrap}>
        <TouchableOpacity
          style={styles.searchBox}
          onPress={onOpenSpotlight}
          activeOpacity={0.8}
        >
          <Ionicons name="search" size={18} color="#6366f1" />
          <Text style={styles.searchInputPlaceholder}>
            Search rights, laws or situations...
          </Text>
          <View style={styles.searchTag}>
            <Text style={styles.searchTagText}>Search</Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* ─── Horizontal Category Chips ────────────────────────── */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoryStrip}
      >
        {TOP_CATEGORIES.map((cat) => (
          <TouchableOpacity
            key={cat.id}
            style={styles.categoryChip}
            onPress={() => onNavigate('situations', cat.id)}
            activeOpacity={0.7}
          >
            <Text style={styles.chipIcon}>{cat.icon}</Text>
            <Text style={styles.chipName}>{cat.name}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* ─── Today's Right Hero Card ──────────────────────────── */}
      <View style={styles.heroCardContainer}>
        <LinearGradient
          colors={['#1a1a5e', '#312e81', '#1e1b4b']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.todaysRightCard}
        >
          <View style={styles.todaysRightWatermark}>
            <Ionicons name="shield-outline" size={120} color="rgba(255, 255, 255, 0.05)" />
          </View>

          <View style={styles.todaysRightLabel}>
            <Ionicons name="shield" size={14} color="#67e8f9" />
            <Text style={styles.todaysRightLabelText}>
              DAILY LEGAL INSIGHT • NALSA ACT 1987 • SEC 12
            </Text>
          </View>

          <Text style={styles.todaysRightTitle}>Right to Free Legal Aid</Text>
          <Text style={styles.todaysRightBody}>
            Section 12 of NALSA ensures free legal services to eligible persons, making justice accessible to all, regardless of financial background.
          </Text>

          <TouchableOpacity
            style={styles.exploreLink}
            onPress={() => onNavigate('rights')}
            activeOpacity={0.7}
          >
            <Text style={styles.exploreLinkText}>Explore Citizenship Handbook</Text>
            <Text style={styles.exploreLinkArrow}>→</Text>
          </TouchableOpacity>
        </LinearGradient>
      </View>

      {/* ─── LegalAce Features Grid ───────────────────────────── */}
      <Text style={styles.sectionTitle}>Legal Ace Features</Text>
      <View style={styles.quickActionsGrid}>
        {/* Document X-Ray */}
        <TouchableOpacity
          style={styles.quickActionCard}
          onPress={() => onNavigate('xray')}
          activeOpacity={0.7}
        >
          <View style={[styles.qaBadgePill, { backgroundColor: '#e0e7ff' }]}>
            <Text style={[styles.qaBadgePillText, { color: '#4338ca' }]}>AI SCAN</Text>
          </View>
          <View style={[styles.qaIconWrap, { backgroundColor: '#eef2ff', borderColor: '#c7d2fe' }]}>
            <Ionicons name="document-text-outline" size={22} color="#4f46e5" />
          </View>
          <View style={styles.qaCardInfo}>
            <Text style={styles.qaCardInfoTitle}>Document X-Ray</Text>
            <Text style={styles.qaCardInfoSub}>AI legal document analysis</Text>
          </View>
        </TouchableOpacity>

        {/* Free Legal Aid */}
        <TouchableOpacity
          style={styles.quickActionCard}
          onPress={() => onNavigate('legalaid')}
          activeOpacity={0.7}
        >
          <View style={[styles.qaBadgePill, { backgroundColor: '#dcfce7' }]}>
            <Text style={[styles.qaBadgePillText, { color: '#15803d' }]}>DLSA</Text>
          </View>
          <View style={[styles.qaIconWrap, { backgroundColor: '#ecfdf5', borderColor: '#a7f3d0' }]}>
            <Ionicons name="ribbon-outline" size={22} color="#059669" />
          </View>
          <View style={styles.qaCardInfo}>
            <Text style={styles.qaCardInfoTitle}>Free Legal Aid</Text>
            <Text style={styles.qaCardInfoSub}>DLSA eligibility & helplines</Text>
          </View>
        </TouchableOpacity>

        {/* Situation Finder */}
        <TouchableOpacity
          style={styles.quickActionCard}
          onPress={() => onNavigate('situations')}
          activeOpacity={0.7}
        >
          <View style={[styles.qaBadgePill, { backgroundColor: '#fef3c7' }]}>
            <Text style={[styles.qaBadgePillText, { color: '#b45309' }]}>SCENARIOS</Text>
          </View>
          <View style={[styles.qaIconWrap, { backgroundColor: '#fffbeb', borderColor: '#fde68a' }]}>
            <Ionicons name="search-outline" size={22} color="#d97706" />
          </View>
          <View style={styles.qaCardInfo}>
            <Text style={styles.qaCardInfoTitle}>Situation Finder</Text>
            <Text style={styles.qaCardInfoSub}>Browse legal scenarios</Text>
          </View>
        </TouchableOpacity>

        {/* Document Wizard */}
        <TouchableOpacity
          style={styles.quickActionCard}
          onPress={() => onNavigate('wizard')}
          activeOpacity={0.7}
        >
          <View style={[styles.qaBadgePill, { backgroundColor: '#e0e7ff' }]}>
            <Text style={[styles.qaBadgePillText, { color: '#3730a3' }]}>NOTICE</Text>
          </View>
          <View style={[styles.qaIconWrap, { backgroundColor: '#eef2ff', borderColor: '#c7d2fe' }]}>
            <Ionicons name="flash-outline" size={22} color="#4338ca" />
          </View>
          <View style={styles.qaCardInfo}>
            <Text style={styles.qaCardInfoTitle}>Document Wizard</Text>
            <Text style={styles.qaCardInfoSub}>Step-by-step notice guide</Text>
          </View>
        </TouchableOpacity>

        {/* Legal Monitor */}
        <TouchableOpacity
          style={[styles.quickActionCard, { width: '100%' }]}
          onPress={() => onNavigate('deadlines')}
          activeOpacity={0.7}
        >
          <View style={[styles.qaBadgePill, { backgroundColor: '#f3e8ff' }]}>
            <Text style={[styles.qaBadgePillText, { color: '#7e22ce' }]}>TRACKER</Text>
          </View>
          <View style={[styles.qaIconWrap, { backgroundColor: '#faf5ff', borderColor: '#e9d5ff' }]}>
            <Ionicons name="calendar-outline" size={22} color="#7e22ce" />
          </View>
          <View style={styles.qaCardInfo}>
            <Text style={styles.qaCardInfoTitle}>Legal Monitor</Text>
            <Text style={styles.qaCardInfoSub}>Track notice & filing dates</Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* ─── Recent Legal Scenarios Carousel ──────────────────── */}
      <View style={styles.recentSectionHeader}>
        <Text style={styles.sectionTitleNoMargin}>Recent Legal Scenarios</Text>
        <TouchableOpacity onPress={() => onNavigate('situations')}>
          <Text style={styles.viewAllBtn}>View All →</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.recentScroll}
      >
        {displayRecent.map((sit, i) => (
          <TouchableOpacity
            key={sit.situation_id || i}
            style={styles.recentSitCard}
            onPress={() => openSituationDetail(sit.situation_id)}
            activeOpacity={0.7}
          >
            <View style={styles.recentSitCategory}>
              <Ionicons name="shield" size={11} color="#4f46e5" />
              <Text style={styles.recentSitCategoryText}>
                {(sit.category || '').toUpperCase().replace('_', ' ')}
              </Text>
            </View>
            <Text style={styles.recentSitTitle} numberOfLines={2}>
              {sit.title}
            </Text>
            <Text style={styles.recentSitDesc} numberOfLines={2}>
              {sit.description || 'Explore statutory rights, procedures and guidelines.'}
            </Text>
            <View style={styles.recentSitBadge}>
              <Ionicons name="time-outline" size={11} color="#15803d" />
              <Text style={styles.recentSitBadgeText}>
                {recentlyViewed.includes(sit.situation_id) ? formatTimeAgo(sit.situation_id) : 'Explore'}
              </Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <View style={{ height: 95 }} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#f4f5f9',
  },
  contentContainer: {
    paddingBottom: 20,
  },
  homeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 8,
    backgroundColor: '#f4f5f9',
    borderBottomWidth: 1,
    borderBottomColor: '#e8eaf0',
  },
  headerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#eef0ff',
    borderWidth: 1,
    borderColor: '#c7d2fe',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
    marginBottom: 4,
    alignSelf: 'flex-start',
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10b981',
  },
  headerBadgeText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#4f46e5',
    letterSpacing: 0.3,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1a1a5e',
    letterSpacing: -0.5,
  },
  profileBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#e8eaf0',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  searchWrap: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 12,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#e8eaf0',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
  },
  searchInputPlaceholder: {
    flex: 1,
    fontSize: 13.5,
    fontWeight: '500',
    color: '#9ca3af',
  },
  searchTag: {
    backgroundColor: '#1a1a5e',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 10,
  },
  searchTagText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#ffffff',
  },
  categoryStrip: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingBottom: 14,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 18,
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#e8eaf0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  chipIcon: {
    fontSize: 13.5,
  },
  chipName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
  },
  heroCardContainer: {
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  todaysRightCard: {
    borderRadius: 22,
    paddingHorizontal: 18,
    paddingVertical: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    overflow: 'hidden',
    shadowColor: '#1a1a5e',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 28,
    elevation: 6,
  },
  todaysRightWatermark: {
    position: 'absolute',
    right: -20,
    bottom: -20,
    opacity: 0.6,
  },
  todaysRightLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  todaysRightLabelText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#67e8f9',
    letterSpacing: 0.5,
  },
  todaysRightTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#ffffff',
    marginBottom: 6,
    letterSpacing: -0.2,
  },
  todaysRightBody: {
    fontSize: 12.5,
    color: 'rgba(255, 255, 255, 0.85)',
    lineHeight: 18,
    marginBottom: 14,
  },
  exploreLink: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  exploreLinkText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ffffff',
  },
  exploreLinkArrow: {
    fontSize: 14,
    color: '#ffffff',
    fontWeight: '700',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111827',
    paddingHorizontal: 18,
    marginBottom: 10,
    letterSpacing: -0.2,
  },
  sectionTitleNoMargin: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111827',
    letterSpacing: -0.2,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    paddingHorizontal: 16,
    marginBottom: 22,
  },
  quickActionCard: {
    width: '48.5%',
    position: 'relative',
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1.5,
    borderColor: '#f0f1f5',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  qaBadgePill: {
    position: 'absolute',
    top: 6,
    right: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  qaBadgePillText: {
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  qaIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  qaCardInfo: {
    flex: 1,
  },
  qaCardInfoTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#111827',
    lineHeight: 17,
  },
  qaCardInfoSub: {
    fontSize: 11,
    color: '#6b7280',
    marginTop: 2,
  },
  recentSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 18,
    marginBottom: 10,
  },
  viewAllBtn: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#4f46e5',
  },
  recentScroll: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  recentSitCard: {
    width: 230,
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1.5,
    borderColor: '#f0f1f5',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  recentSitCategory: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  recentSitCategoryText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#4f46e5',
    letterSpacing: 0.5,
  },
  recentSitTitle: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#111827',
    lineHeight: 18,
    marginBottom: 4,
  },
  recentSitDesc: {
    fontSize: 11.5,
    color: '#6b7280',
    lineHeight: 16,
    marginBottom: 10,
  },
  recentSitBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    backgroundColor: '#dcfce7',
    borderWidth: 1,
    borderColor: '#bbf7d0',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  recentSitBadgeText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#15803d',
  },
});

export default HomeScreen;
