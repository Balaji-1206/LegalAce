import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Linking,
  Share,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Colors from '../theme/colors';
import { CategoryItem, SituationDetail } from '../types';

interface SituationFinderScreenProps {
  screen?: 'categories' | 'list' | 'detail';
  setScreen?: (screen: 'categories' | 'list' | 'detail') => void;
  categories: CategoryItem[];
  situations: SituationDetail[];
  bookmarks: string[];
  toggleBookmark: (id: string) => void;
  onOpenWizard: () => void;
  selectedCategory?: CategoryItem | null;
  setSelectedCategory?: (cat: CategoryItem | null) => void;
  selectedSituation: SituationDetail | null;
  onSelectSituation: (sit: SituationDetail | null) => void;
  searchQuery?: string;
  setSearchQuery?: (q: string) => void;
  LAW_DETAILS_MAP: Record<string, string>;
  onBackHome?: () => void;
}

const CAT_COLORS: Record<string, string> = {
  employment: '#4f46e5',
  housing: '#059669',
  consumer: '#d97706',
  cyber_crime: '#7e22ce',
  women_rights: '#be185d',
  banking: '#0e7490',
  traffic: '#dc2626',
  education: '#0d9488',
  cheque_debt: '#b91c1c',
  rti: '#c2410c',
  real_estate: '#059669',
  insurance: '#db2777',
  family: '#65a30d',
};

const PORTALS_MAP: Record<string, { name: string; phone?: string; url?: string; desc: string }[]> = {
  employment: [
    { name: 'Samadhan Portal (Ministry of Labour)', url: 'https://samadhan.labour.gov.in', desc: 'Industrial dispute conciliation' },
    { name: 'EPFO Grievance Portal (EPFiGMS)', phone: '14470', url: 'https://epfigms.gov.in', desc: 'PF & pension issues' },
  ],
  housing: [
    { name: 'Rent Authority / Rent Court (TNRERA/MahaRERA)', desc: 'Tenancy disputes & model tenancy act' },
    { name: 'National Consumer Helpline (NCH)', phone: '1915', url: 'https://consumerhelpline.gov.in', desc: 'Unfair trade & security deposit' },
  ],
  consumer: [
    { name: 'e-Daakhil Portal', url: 'https://edaakhil.nic.in', desc: 'Online filing of consumer disputes' },
    { name: 'National Consumer Helpline (NCH)', phone: '1915', url: 'https://consumerhelpline.gov.in', desc: 'Call or WhatsApp grievance' },
  ],
  banking: [
    { name: 'RBI CMS Portal', url: 'https://cms.rbi.org.in', desc: 'Banking Ombudsman complaints' },
    { name: 'National Cyber Crime Helpline', phone: '1930', url: 'https://cybercrime.gov.in', desc: 'Immediate UPI/banking fraud freeze' },
  ],
  cyber_crime: [
    { name: 'National Cyber Crime Reporting Portal', phone: '1930', url: 'https://cybercrime.gov.in', desc: 'Immediate financial freeze & FIR' },
  ],
  traffic: [
    { name: 'Parivahan Virtual Court', url: 'https://vcourts.gov.in', desc: 'Online contested challan disposal' },
  ],
  women_rights: [
    { name: 'NCW 24/7 Helpline', phone: '7827170170', url: 'https://ncw.nic.in', desc: 'National Commission for Women' },
    { name: 'Women Helpline (Universal)', phone: '181', desc: 'Immediate distress and support' },
  ],
};

export const SituationFinderScreen: React.FC<SituationFinderScreenProps> = ({
  screen: propScreen,
  setScreen: propSetScreen,
  categories,
  situations,
  bookmarks,
  toggleBookmark,
  onOpenWizard,
  selectedCategory: propCategory,
  setSelectedCategory: propSetCategory,
  selectedSituation,
  onSelectSituation,
  searchQuery: propSearchQuery,
  setSearchQuery: propSetSearchQuery,
  LAW_DETAILS_MAP,
  onBackHome,
}) => {
  const [internalScreen, setInternalScreen] = useState<'categories' | 'list' | 'detail'>('categories');
  const [internalCategory, setInternalCategory] = useState<CategoryItem | null>(null);
  const [internalSearchQuery, setInternalSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'bookmarked' | 'recent'>('all');
  const [expandedLaw, setExpandedLaw] = useState<string | null>(null);

  const screen = propScreen !== undefined ? propScreen : internalScreen;
  const setScreen = propSetScreen || setInternalScreen;

  const selectedCategory = propCategory !== undefined ? propCategory : internalCategory;
  const setSelectedCategory = propSetCategory || setInternalCategory;

  const searchQuery = propSearchQuery !== undefined ? propSearchQuery : internalSearchQuery;
  const setSearchQuery = propSetSearchQuery || setInternalSearchQuery;

  const handleDetailBack = () => {
    onSelectSituation(null);
    if (selectedCategory) {
      setScreen('list');
    } else {
      setScreen('categories');
    }
  };

  const handleListBack = () => {
    onSelectSituation(null);
    setSelectedCategory(null);
    setSearchQuery('');
    setScreen('categories');
  };

  React.useEffect(() => {
    if (selectedSituation) {
      setScreen('detail');
    }
  }, [selectedSituation]);

  const getFilteredSituations = () => {
    let list = situations;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(s =>
        s.title.toLowerCase().includes(q) ||
        (s.description || '').toLowerCase().includes(q) ||
        s.category.toLowerCase().includes(q)
      );
    } else if (selectedCategory) {
      if (selectedCategory.id === 'bookmarks') {
        list = list.filter(s => bookmarks.includes(s.situation_id));
      } else if (selectedCategory.id !== '__all__') {
        list = list.filter(s => s.category === selectedCategory.id);
      }
    }

    if (activeFilter === 'bookmarked') {
      list = list.filter(s => bookmarks.includes(s.situation_id));
    }
    return list;
  };

  const filtered = getFilteredSituations();

  const handleShare = async (sit: SituationDetail) => {
    try {
      await Share.share({
        message: `⚖️ LegalAce — ${sit.title}\n\n${sit.description || ''}\n\nStatutory rights under Indian Law.\nShared via LegalAce Mobile App`,
      });
    } catch { /* ignore */ }
  };

  // ─── 1. DETAIL SCREEN ───────────────────────────────────────────
  if (screen === 'detail' && selectedSituation) {
    const isBookmarked = bookmarks.includes(selectedSituation.situation_id);
    const portals = PORTALS_MAP[selectedSituation.category] || [];

    return (
      <ScrollView style={styles.screen} contentContainerStyle={styles.contentContainer}>
        {/* Dark Hero Gradient */}
        <LinearGradient
          colors={['#1a1a5e', '#312e81', '#1e1b4b']}
          style={styles.detailHero}
        >
          <View style={styles.detailHeroNav}>
            <TouchableOpacity
              style={styles.detailNavBtn}
              onPress={handleDetailBack}
              activeOpacity={0.7}
            >
              <Ionicons name="arrow-back" size={20} color="#ffffff" />
            </TouchableOpacity>

            <View style={styles.detailNavActions}>
              <TouchableOpacity
                style={styles.heroActionBtn}
                onPress={() => handleShare(selectedSituation)}
                activeOpacity={0.7}
              >
                <Ionicons name="share-social" size={15} color="#ffffff" />
                <Text style={styles.heroActionBtnText}>Share</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.heroBookmarkBtn, isBookmarked && styles.heroBookmarkBtnActive]}
                onPress={() => toggleBookmark(selectedSituation.situation_id)}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={isBookmarked ? 'star' : 'star-outline'}
                  size={18}
                  color={isBookmarked ? '#f59e0b' : '#ffffff'}
                />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.detailHeroTag}>
            <Text style={styles.detailHeroTagText}>
              {(selectedSituation.category || '').toUpperCase().replace('_', ' ')}
            </Text>
          </View>

          <Text style={styles.detailHeroTitle}>{selectedSituation.title}</Text>
          {selectedSituation.description ? (
            <Text style={styles.detailHeroDesc}>{selectedSituation.description}</Text>
          ) : null}
        </LinearGradient>

        <View style={styles.detailBody}>
          {/* Statutory Rights Section */}
          {selectedSituation.user_rights && selectedSituation.user_rights.length > 0 && (
            <View style={styles.detailCard}>
              <View style={styles.detailCardHeader}>
                <Ionicons name="shield-checkmark" size={18} color="#059669" />
                <Text style={styles.detailCardHeading}>Your Statutory Rights</Text>
              </View>
              {selectedSituation.user_rights.map((right, idx) => (
                <View key={idx} style={styles.rightCheckRow}>
                  <Ionicons name="checkmark-circle" size={16} color="#059669" style={{ marginTop: 2 }} />
                  <Text style={styles.rightCheckText}>{right}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Action Steps Section */}
          {selectedSituation.action_steps && selectedSituation.action_steps.length > 0 && (
            <View style={styles.detailCard}>
              <View style={styles.detailCardHeader}>
                <Ionicons name="list" size={18} color="#4f46e5" />
                <Text style={styles.detailCardHeading}>Step-by-Step Action Plan</Text>
              </View>
              {selectedSituation.action_steps.map((step, idx) => (
                <View key={idx} style={styles.actionStepRow}>
                  <View style={styles.actionStepNum}>
                    <Text style={styles.actionStepNumText}>{idx + 1}</Text>
                  </View>
                  <Text style={styles.actionStepText}>{step}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Applicable Laws Accordion */}
          {selectedSituation.applicable_laws && selectedSituation.applicable_laws.length > 0 && (
            <View style={styles.detailCard}>
              <View style={styles.detailCardHeader}>
                <Ionicons name="book" size={18} color="#7c3aed" />
                <Text style={styles.detailCardHeading}>Applicable Laws & Remedies</Text>
              </View>
              {selectedSituation.applicable_laws.map((law, idx) => {
                const isExpanded = expandedLaw === law.section;
                const detailText = LAW_DETAILS_MAP[law.section];

                return (
                  <TouchableOpacity
                    key={idx}
                    style={styles.lawAccordionCard}
                    onPress={() => setExpandedLaw(isExpanded ? null : law.section)}
                    activeOpacity={0.8}
                  >
                    <View style={styles.lawAccordionHeader}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.lawAct}>{law.act} — {law.section}</Text>
                        <Text style={styles.lawTitle}>{law.section_title}</Text>
                      </View>
                      <Ionicons
                        name={isExpanded ? 'chevron-up' : 'chevron-down'}
                        size={18}
                        color={Colors.textMuted}
                      />
                    </View>
                    {isExpanded && detailText ? (
                      <View style={styles.lawExpandedBody}>
                        <Text style={styles.lawExpandedText}>{detailText}</Text>
                        <Text style={styles.lawRemedyNote}>
                          ⚖️ Legal Remedy: Failure to comply with {law.section} grants affected individuals the right to issue statutory demand notice and file for damages or compensation.
                        </Text>
                      </View>
                    ) : null}
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {/* Official Portals & Helplines */}
          {portals.length > 0 && (
            <View style={styles.detailCard}>
              <View style={styles.detailCardHeader}>
                <Ionicons name="link" size={18} color="#6366f1" />
                <Text style={styles.detailCardHeading}>Official Portals & Helplines</Text>
              </View>
              {portals.map((p, idx) => (
                <View key={idx} style={styles.portalItem}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.portalName}>{p.name}</Text>
                    <Text style={styles.portalDesc}>{p.desc}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', gap: 6 }}>
                    {p.phone && (
                      <TouchableOpacity
                        style={styles.portalPhoneBtn}
                        onPress={() => Linking.openURL(`tel:${p.phone}`)}
                      >
                        <Ionicons name="call" size={12} color="#15803d" />
                        <Text style={styles.portalPhoneText}>{p.phone}</Text>
                      </TouchableOpacity>
                    )}
                    {p.url && (
                      <TouchableOpacity
                        style={styles.portalWebBtn}
                        onPress={() => { if (p.url) Linking.openURL(p.url); }}
                      >
                        <Text style={styles.portalWebText}>Portal ↗</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* Wizard CTA */}
          <TouchableOpacity
            style={styles.wizardCtaBtn}
            onPress={onOpenWizard}
            activeOpacity={0.8}
          >
            <Ionicons name="flash" size={18} color="#ffffff" />
            <Text style={styles.wizardCtaBtnText}>Get a Personalised Action Plan →</Text>
          </TouchableOpacity>

          {/* Browse More Situations Button */}
          <TouchableOpacity
            style={styles.detailRestartBtn}
            onPress={handleDetailBack}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={16} color="#4f46e5" />
            <Text style={styles.detailRestartBtnText}>Browse More Situations</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 95 }} />
      </ScrollView>
    );
  }

  // ─── 2. LIST SCREEN ─────────────────────────────────────────────
  if (screen === 'list') {
    return (
      <ScrollView style={styles.screen} contentContainerStyle={styles.contentContainer}>
        {/* Header Nav */}
        <View style={styles.listHeaderNav}>
          <TouchableOpacity
            style={styles.listBackBtn}
            onPress={handleListBack}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={20} color={Colors.textNavy} />
          </TouchableOpacity>
          <Text style={styles.listNavTitle}>
            {selectedCategory?.name || 'All Situations'}
          </Text>
          <View style={{ width: 36 }} />
        </View>

        {/* Search Input */}
        <View style={styles.listSearchWrap}>
          <View style={styles.listSearchBox}>
            <Ionicons name="search" size={18} color="#9ca3af" />
            <TextInput
              style={styles.listSearchInput}
              placeholder="Search situations..."
              placeholderTextColor="#9ca3af"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery ? (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={18} color="#9ca3af" />
              </TouchableOpacity>
            ) : null}
          </View>
        </View>

        {/* Filter Tabs */}
        <View style={styles.listFilterRow}>
          {(['all', 'bookmarked'] as const).map(tab => (
            <TouchableOpacity
              key={tab}
              style={[styles.listFilterChip, activeFilter === tab && styles.listFilterChipActive]}
              onPress={() => setActiveFilter(tab)}
            >
              <Text style={[styles.listFilterChipText, activeFilter === tab && styles.listFilterChipTextActive]}>
                {tab === 'all' ? 'All' : 'Bookmarked'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Situations List */}
        <View style={{ paddingHorizontal: 16 }}>
          {filtered.length === 0 ? (
            <View style={styles.emptyCard}>
              <Ionicons name="search-outline" size={38} color={Colors.textMuted} />
              <Text style={styles.emptyTitle}>No situations found</Text>
              <Text style={styles.emptySub}>Try searching with different terms.</Text>
            </View>
          ) : (
            filtered.map((sit, idx) => {
              const isBookmarked = bookmarks.includes(sit.situation_id);
              const catColor = CAT_COLORS[sit.category] || '#4f46e5';

              return (
                <TouchableOpacity
                  key={sit.situation_id || idx}
                  style={styles.sitListItem}
                  onPress={() => {
                    onSelectSituation(sit);
                    setScreen('detail');
                  }}
                  activeOpacity={0.7}
                >
                  <View style={[styles.sitListItemIcon, { backgroundColor: `${catColor}15` }]}>
                    <Ionicons name="shield" size={18} color={catColor} />
                  </View>

                  <View style={styles.sitListItemBody}>
                    <Text style={[styles.sitListItemTag, { color: catColor }]}>
                      {(sit.category || '').toUpperCase().replace(/_/g, ' ')}
                    </Text>
                    <Text style={styles.sitListItemTitle}>{sit.title}</Text>
                    <Text style={styles.sitListItemDesc} numberOfLines={2}>
                      {sit.description || 'Statutory rights & remedies under Indian acts.'}
                    </Text>
                  </View>

                  <TouchableOpacity
                    style={styles.sitListItemBookmark}
                    onPress={() => toggleBookmark(sit.situation_id)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons
                      name={isBookmarked ? 'star' : 'star-outline'}
                      size={20}
                      color={isBookmarked ? '#f59e0b' : '#9ca3af'}
                    />
                  </TouchableOpacity>
                </TouchableOpacity>
              );
            })
          )}
        </View>

        <View style={{ height: 95 }} />
      </ScrollView>
    );
  }

  // ─── 3. CATEGORIES SCREEN (Default) ─────────────────────────────
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.contentContainer}>
      {/* Top Header */}
      <View style={styles.situationsHeader}>
        <View style={styles.situationsHeaderNav}>
          {onBackHome ? (
            <TouchableOpacity style={styles.backBtnCircle} onPress={onBackHome}>
              <Ionicons name="arrow-back" size={20} color={Colors.textNavy} />
            </TouchableOpacity>
          ) : <View style={{ width: 36 }} />}
          <Text style={styles.navHeaderTitle}>LegalAce</Text>
          <View style={{ width: 36 }} />
        </View>

        <View style={styles.titleArea}>
          <Text style={styles.mainTitle}>Legal Situations</Text>
          <Text style={styles.subTitle}>
            Find actionable legal information tailored to your circumstances.
          </Text>
        </View>
      </View>

      {/* Search Input */}
      <View style={styles.searchWrap}>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={18} color="#9ca3af" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search situations, laws, or topics..."
            placeholderTextColor="#9ca3af"
            value={searchQuery}
            onChangeText={(q) => {
              setSearchQuery(q);
              if (q.trim()) {
                onSelectSituation(null);
                setSelectedCategory(null);
                setScreen('list');
              }
            }}
          />
        </View>
      </View>

      {/* Categories Grid */}
      <View style={styles.categoriesSection}>
        <Text style={styles.sectionHeaderTitle}>Categories</Text>
        <View style={styles.categoriesGrid}>
          {categories.map((cat) => {
            const count = situations.filter(s => s.category === cat.id).length;
            const catColor = CAT_COLORS[cat.id] || '#4f46e5';

            return (
              <TouchableOpacity
                key={cat.id}
                style={styles.catGridCard}
                onPress={() => {
                  onSelectSituation(null);
                  setSelectedCategory(cat);
                  setScreen('list');
                }}
                activeOpacity={0.7}
              >
                <View style={[styles.catIconWrap, { backgroundColor: `${catColor}15` }]}>
                  <Text style={styles.catEmoji}>{cat.icon}</Text>
                </View>
                <Text style={styles.catGridName}>{cat.name}</Text>
                {count > 0 && (
                  <Text style={styles.catGridCount}>{count} situations</Text>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Saved Situations Section (Bookmarks) */}
      {bookmarks.length > 0 && (
        <View style={styles.bookmarksSection}>
          <View style={styles.bookmarksLabelRow}>
            <Ionicons name="star" size={14} color="#f59e0b" />
            <Text style={styles.bookmarksLabelText}>Saved Situations ({bookmarks.length})</Text>
          </View>
          {situations
            .filter(s => bookmarks.includes(s.situation_id))
            .slice(0, 3)
            .map((sit) => (
              <TouchableOpacity
                key={sit.situation_id}
                style={styles.sitListItem}
                onPress={() => {
                  onSelectSituation(sit);
                  setScreen('detail');
                }}
                activeOpacity={0.7}
              >
                <View style={[styles.sitListItemIcon, { backgroundColor: '#eef2ff' }]}>
                  <Ionicons name="shield" size={18} color="#4f46e5" />
                </View>
                <View style={styles.sitListItemBody}>
                  <Text style={styles.sitListItemTag}>{sit.category.toUpperCase()}</Text>
                  <Text style={styles.sitListItemTitle}>{sit.title}</Text>
                </View>
                <Ionicons name="star" size={18} color="#f59e0b" />
              </TouchableOpacity>
            ))}
        </View>
      )}

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
  situationsHeader: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
  },
  situationsHeaderNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  backBtnCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e8eaf0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  navHeaderTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1a1a5e',
  },
  titleArea: {
    marginBottom: 4,
  },
  mainTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#1a1a5e',
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  subTitle: {
    fontSize: 13,
    color: '#6b7280',
    lineHeight: 18,
  },
  searchWrap: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#e8eaf0',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 13.5,
    color: '#111827',
  },
  categoriesSection: {
    paddingHorizontal: 16,
    marginTop: 6,
  },
  sectionHeaderTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 12,
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  catGridCard: {
    width: '48.5%',
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1.5,
    borderColor: '#f0f1f5',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  catIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  catEmoji: {
    fontSize: 22,
  },
  catGridName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1a1a5e',
    lineHeight: 18,
    marginBottom: 4,
  },
  catGridCount: {
    fontSize: 11.5,
    color: '#6b7280',
    fontWeight: '500',
  },
  bookmarksSection: {
    paddingHorizontal: 16,
    marginTop: 18,
  },
  bookmarksLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  bookmarksLabelText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1a1a5e',
  },
  sitListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1.5,
    borderColor: '#f0f1f5',
    marginBottom: 10,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
  },
  sitListItemIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sitListItemBody: {
    flex: 1,
  },
  sitListItemTag: {
    fontSize: 9.5,
    fontWeight: '800',
    letterSpacing: 0.4,
    marginBottom: 2,
  },
  sitListItemTitle: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#111827',
    lineHeight: 17,
  },
  sitListItemDesc: {
    fontSize: 11.5,
    color: '#6b7280',
    marginTop: 2,
  },
  sitListItemBookmark: {
    padding: 4,
  },
  listHeaderNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 6,
  },
  listBackBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e8eaf0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  listNavTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#1a1a5e',
  },
  listSearchWrap: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  listSearchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#e8eaf0',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  listSearchInput: {
    flex: 1,
    fontSize: 13,
    color: '#111827',
  },
  listFilterRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  listFilterChip: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e8eaf0',
  },
  listFilterChipActive: {
    backgroundColor: '#4f46e5',
    borderColor: '#4f46e5',
  },
  listFilterChipText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#6b7280',
  },
  listFilterChipTextActive: {
    color: '#ffffff',
  },
  detailHero: {
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 22,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  detailHeroNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  detailNavBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailNavActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  heroActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  heroActionBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ffffff',
  },
  heroBookmarkBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroBookmarkBtnActive: {
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
  },
  detailHeroTag: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(99, 102, 241, 0.3)',
    borderWidth: 1,
    borderColor: 'rgba(165, 180, 252, 0.4)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginBottom: 8,
  },
  detailHeroTagText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#a5b4fc',
    letterSpacing: 0.5,
  },
  detailHeroTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: '#ffffff',
    lineHeight: 25,
    marginBottom: 8,
  },
  detailHeroDesc: {
    fontSize: 12.5,
    color: 'rgba(255, 255, 255, 0.85)',
    lineHeight: 18,
  },
  detailBody: {
    paddingHorizontal: 16,
    marginTop: 14,
    gap: 12,
  },
  detailCard: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1.5,
    borderColor: '#f0f1f5',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
  },
  detailCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  detailCardHeading: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1a1a5e',
  },
  rightCheckRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 8,
  },
  rightCheckText: {
    flex: 1,
    fontSize: 12.5,
    color: '#111827',
    lineHeight: 18,
  },
  actionStepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 10,
  },
  actionStepNum: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#eef2ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 1,
  },
  actionStepNumText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#4f46e5',
  },
  actionStepText: {
    flex: 1,
    fontSize: 12.5,
    color: '#111827',
    lineHeight: 18,
  },
  lawAccordionCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 8,
  },
  lawAccordionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  lawAct: {
    fontSize: 11,
    fontWeight: '700',
    color: '#7c3aed',
  },
  lawTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1a1a5e',
    marginTop: 2,
  },
  lawExpandedBody: {
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  lawExpandedText: {
    fontSize: 12,
    color: '#475569',
    lineHeight: 17,
    marginBottom: 8,
  },
  lawRemedyNote: {
    fontSize: 11.5,
    color: '#047857',
    backgroundColor: '#ecfdf5',
    padding: 8,
    borderRadius: 8,
    lineHeight: 16,
  },
  portalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    gap: 8,
  },
  portalName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1a1a5e',
  },
  portalDesc: {
    fontSize: 11.5,
    color: '#6b7280',
    marginTop: 2,
  },
  portalPhoneBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
    gap: 4,
  },
  portalPhoneText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#15803d',
  },
  portalWebBtn: {
    backgroundColor: '#eef2ff',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
  },
  portalWebText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#4f46e5',
  },
  wizardCtaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4f46e5',
    borderRadius: 16,
    paddingVertical: 14,
    gap: 8,
    shadowColor: '#4f46e5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  wizardCtaBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#ffffff',
  },
  detailRestartBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#e0e7ff',
    borderRadius: 16,
    paddingVertical: 14,
    marginTop: 10,
    marginBottom: 8,
  },
  detailRestartBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#4f46e5',
  },
  emptyCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 30,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#f0f1f5',
    marginTop: 10,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1a1a5e',
    marginTop: 8,
  },
  emptySub: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
});

export default SituationFinderScreen;
