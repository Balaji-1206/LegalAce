import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Modal,
  TextInput,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle } from 'react-native-svg';
import Colors from '../theme/colors';
import { API_BASE_URL } from '../config/api';
import { DeadlineItem } from '../types';

interface DeadlineScreenProps {
  userId: string;
  onBackHome: () => void;
}

const CAT_COLORS: Record<string, { bg: string; color: string; icon: keyof typeof Ionicons.glyphMap }> = {
  rental: { bg: '#ecfdf5', color: '#059669', icon: 'home-outline' },
  employment: { bg: '#eff6ff', color: '#2563eb', icon: 'briefcase-outline' },
  consumer: { bg: '#fffbeb', color: '#d97706', icon: 'cart-outline' },
  banking: { bg: '#ecfeff', color: '#0891b2', icon: 'business-outline' },
  insurance: { bg: '#fdf2f8', color: '#db2777', icon: 'shield-outline' },
  general: { bg: '#f8fafc', color: '#64748b', icon: 'time-outline' },
};

export const DeadlineScreen: React.FC<DeadlineScreenProps> = ({ userId, onBackHome }) => {
  const [deadlines, setDeadlines] = useState<DeadlineItem[]>([]);
  const [filter, setFilter] = useState<'all' | 'active' | 'completed' | 'expired'>('all');
  const [score, setScore] = useState<number>(85);
  const [grade, setGrade] = useState<string>('Safe');
  const [stats, setStats] = useState({ active: 2, completed: 1, expired: 0 });
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Form State
  const [newTitle, setNewTitle] = useState('');
  const [newCat, setNewCat] = useState('rental');
  const [newPriority, setNewPriority] = useState<'high' | 'medium' | 'low'>('medium');
  const [newDays, setNewDays] = useState('15');

  const fetchDeadlines = async () => {
    try {
      const [scoreRes, allRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/v1/health-score/${userId}`),
        fetch(`${API_BASE_URL}/api/v1/deadlines/user/${userId}`),
      ]);

      if (scoreRes.ok) {
        const scoreData = await scoreRes.json();
        setScore(scoreData.health_score ?? scoreData.score ?? 85);
        setGrade(scoreData.grade || 'Safe');
        if (scoreData.stats) {
          setStats(scoreData.stats);
        }
      }

      if (allRes.ok) {
        const data = await allRes.json();
        setDeadlines(data.deadlines || []);
      }
    } catch {
      setDeadlines([
        {
          id: 'dl_1',
          user_id: userId,
          title: 'Reply to Landlord Notice on Security Deposit',
          category: 'rental',
          deadline_date: new Date(Date.now() + 5 * 86400000).toISOString(),
          priority: 'high',
          source_type: 'manual',
          status: 'active',
          days_remaining: 5,
          health_impact: -15,
        },
        {
          id: 'dl_2',
          user_id: userId,
          title: 'File Consumer Forum Claim for Defective Phone',
          category: 'consumer',
          deadline_date: new Date(Date.now() + 25 * 86400000).toISOString(),
          priority: 'medium',
          source_type: 'manual',
          status: 'active',
          days_remaining: 25,
          health_impact: -5,
        },
      ]);
    }
  };

  useEffect(() => {
    fetchDeadlines();
  }, [userId]);

  const handleCreateDeadline = async () => {
    if (!newTitle.trim()) return;
    const days = parseInt(newDays) || 15;
    const targetDate = new Date(Date.now() + days * 86400000).toISOString();

    const newDl: DeadlineItem = {
      id: `dl_${Date.now()}`,
      user_id: userId,
      title: newTitle.trim(),
      category: newCat,
      deadline_date: targetDate,
      priority: newPriority,
      source_type: 'manual',
      status: 'active',
      days_remaining: days,
      health_impact: -10,
    };

    setDeadlines(prev => [newDl, ...prev]);
    setStats(prev => ({ ...prev, active: prev.active + 1 }));
    setIsAddModalOpen(false);
    setNewTitle('');

    try {
      await fetch(`${API_BASE_URL}/api/v1/deadlines/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          title: newDl.title,
          description: `Action deadline for ${newDl.title}`,
          category: newDl.category,
          deadline_date: newDl.deadline_date,
          priority: newDl.priority,
          source_type: 'manual',
        }),
      });
    } catch { /* saved locally */ }
  };

  const handleComplete = async (id: string) => {
    setDeadlines(prev =>
      prev.map(d => (d.id === id ? { ...d, status: 'completed' as const } : d))
    );
    setStats(prev => ({ ...prev, active: Math.max(0, prev.active - 1), completed: prev.completed + 1 }));
    try {
      await fetch(`${API_BASE_URL}/api/v1/deadlines/${id}/complete?user_id=${userId}`, { method: 'PUT' });
    } catch { /* offline */ }
  };

  const sendWhatsAppReminder = (dl: DeadlineItem) => {
    const text = encodeURIComponent(
      `⚖️ *LegalAce Reminder*: "${dl.title}" is due in ${dl.days_remaining} days (${new Date(dl.deadline_date).toLocaleDateString('en-IN')}). Ensure to file before statutory limitation expires!`
    );
    Linking.openURL(`https://wa.me/?text=${text}`);
  };

  const filtered = deadlines.filter(d => {
    if (filter === 'active') return d.status === 'active';
    if (filter === 'completed') return d.status === 'completed';
    if (filter === 'expired') return d.status === 'expired';
    return true;
  });

  const radius = 35;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.contentContainer}>
      {/* ─── Dashboard Header ─────────────────────────────────── */}
      <View style={styles.deadlineHeader}>
        <View style={styles.deadlineHeaderRow}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            {onBackHome && (
              <TouchableOpacity style={styles.backBtnCircle} onPress={onBackHome}>
                <Ionicons name="arrow-back" size={20} color="#0f172a" />
              </TouchableOpacity>
            )}
            <View>
              <Text style={styles.headerTitle}>Legal Health Monitor</Text>
              <Text style={styles.headerSub}>
                Track notice response dates & limitation periods
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.addDeadlineBtn}
            onPress={() => setIsAddModalOpen(true)}
            activeOpacity={0.8}
          >
            <Ionicons name="add" size={22} color="#ffffff" />
          </TouchableOpacity>
        </View>
      </View>

      {/* ─── Health Score Card (Dark Gradient) ────────────────── */}
      <View style={styles.scoreCardContainer}>
        <LinearGradient
          colors={['#0f172a', '#1e1b4b', '#312e81']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.healthScoreCard}
        >
          {/* Circular Score Ring */}
          <View style={styles.scoreRingWrap}>
            <Svg width="90" height="90" viewBox="0 0 90 90">
              <Circle
                cx="45"
                cy="45"
                r={radius}
                stroke="rgba(255, 255, 255, 0.12)"
                strokeWidth="7"
                fill="none"
              />
              <Circle
                cx="45"
                cy="45"
                r={radius}
                stroke={score >= 80 ? '#6ee7b7' : score >= 50 ? '#fde68a' : '#f87171'}
                strokeWidth="7"
                strokeDasharray={`${circumference} ${circumference}`}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                fill="none"
                transform="rotate(-90 45 45)"
              />
            </Svg>
            <View style={styles.scoreRingCenter}>
              <Text style={styles.scoreRingNumber}>{score}</Text>
              <Text style={styles.scoreRingSub}>/100</Text>
            </View>
          </View>

          {/* Score Info Text */}
          <View style={styles.scoreInfo}>
            <Text style={styles.scoreGrade}>{grade} • {score}/100</Text>
            <Text style={styles.scoreSubtext}>
              All active notices & filing deadlines are within statutory periods.
            </Text>

            <View style={styles.scoreStatRow}>
              <View style={styles.statChip}>
                <View style={[styles.statDot, { backgroundColor: '#6ee7b7' }]} />
                <Text style={styles.statChipText}>{stats.active} Active</Text>
              </View>
              <View style={styles.statChip}>
                <View style={[styles.statDot, { backgroundColor: '#a5b4fc' }]} />
                <Text style={styles.statChipText}>{stats.completed} Done</Text>
              </View>
            </View>
          </View>
        </LinearGradient>
      </View>

      {/* ─── Filter Tabs ───────────────────────────────────────── */}
      <View style={styles.filterRow}>
        {(['all', 'active', 'completed'] as const).map(tab => (
          <TouchableOpacity
            key={tab}
            style={[styles.filterTab, filter === tab && styles.filterTabActive]}
            onPress={() => setFilter(tab)}
          >
            <Text style={[styles.filterTabText, filter === tab && styles.filterTabTextActive]}>
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ─── Section Title ─────────────────────────────────────── */}
      <Text style={styles.sectionHeading}>Active Filing Deadlines</Text>

      {/* ─── Deadlines List ────────────────────────────────────── */}
      {filtered.length === 0 ? (
        <View style={styles.emptyCard}>
          <Ionicons name="calendar-outline" size={40} color={Colors.textMuted} />
          <Text style={styles.emptyTitle}>No deadlines in this view</Text>
          <Text style={styles.emptySub}>Tap '+' to add a statutory notice deadline.</Text>
        </View>
      ) : (
        filtered.map((dl, idx) => {
          const isDone = dl.status === 'completed';
          const isUrgent = dl.days_remaining <= 7 && !isDone;
          const catMeta = CAT_COLORS[dl.category] || CAT_COLORS.general;

          return (
            <View key={dl.id || idx} style={[styles.deadlineCard, isDone && styles.deadlineCardDone]}>
              {/* Category Icon */}
              <View style={[styles.deadlineCardIcon, { backgroundColor: catMeta.bg }]}>
                <Ionicons name={catMeta.icon} size={22} color={catMeta.color} />
              </View>

              {/* Body */}
              <View style={styles.deadlineBody}>
                <View style={styles.dlHeaderRow}>
                  <Text style={[styles.dlCategoryTag, { color: catMeta.color }]}>
                    {dl.category.toUpperCase()}
                  </Text>
                  <View
                    style={[
                      styles.daysChip,
                      isDone ? styles.daysDone : isUrgent ? styles.daysUrgent : styles.daysOk,
                    ]}
                  >
                    <Text
                      style={[
                        styles.daysChipText,
                        isDone ? styles.daysDoneText : isUrgent ? styles.daysUrgentText : styles.daysOkText,
                      ]}
                    >
                      {isDone
                        ? '✓ Done'
                        : dl.days_remaining === 0
                        ? '⚡ Today'
                        : `${dl.days_remaining}d left`}
                    </Text>
                  </View>
                </View>

                <Text style={[styles.dlTitle, isDone && styles.dlTitleDone]}>
                  {dl.title}
                </Text>

                <Text style={styles.dlDate}>
                  Due: {new Date(dl.deadline_date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}
                </Text>

                {/* Actions Row */}
                <View style={styles.dlActionsRow}>
                  {!isDone && (
                    <TouchableOpacity
                      style={styles.actionBtnDone}
                      onPress={() => handleComplete(dl.id)}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="checkmark-circle-outline" size={15} color="#059669" />
                      <Text style={styles.actionBtnDoneText}>Mark Complete</Text>
                    </TouchableOpacity>
                  )}

                  <TouchableOpacity
                    style={styles.actionBtnWa}
                    onPress={() => sendWhatsAppReminder(dl)}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="logo-whatsapp" size={14} color="#166534" />
                    <Text style={styles.actionBtnWaText}>WhatsApp</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          );
        })
      )}

      {/* ─── Add Deadline Modal ────────────────────────────────── */}
      <Modal visible={isAddModalOpen} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Filing Deadline</Text>
              <TouchableOpacity onPress={() => setIsAddModalOpen(false)}>
                <Ionicons name="close" size={22} color={Colors.textMuted} />
              </TouchableOpacity>
            </View>

            <Text style={styles.fieldLabel}>Dispute / Notice Title</Text>
            <TextInput
              style={styles.textInput}
              placeholder="e.g. Reply to 15-day Demand Notice"
              placeholderTextColor={Colors.textMuted}
              value={newTitle}
              onChangeText={setNewTitle}
            />

            <Text style={styles.fieldLabel}>Days Remaining</Text>
            <TextInput
              style={styles.textInput}
              placeholder="15"
              keyboardType="numeric"
              placeholderTextColor={Colors.textMuted}
              value={newDays}
              onChangeText={setNewDays}
            />

            <Text style={styles.fieldLabel}>Category</Text>
            <View style={styles.catPickerRow}>
              {['rental', 'employment', 'consumer', 'banking', 'general'].map(c => (
                <TouchableOpacity
                  key={c}
                  style={[styles.catPickChip, newCat === c && styles.catPickChipActive]}
                  onPress={() => setNewCat(c)}
                >
                  <Text style={[styles.catPickText, newCat === c && styles.catPickTextActive]}>
                    {c}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={styles.submitBtn}
              onPress={handleCreateDeadline}
              activeOpacity={0.8}
            >
              <Text style={styles.submitBtnText}>Save to Health Monitor</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <View style={{ height: 95 }} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  contentContainer: {
    paddingBottom: 20,
  },
  deadlineHeader: {
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 8,
  },
  deadlineHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: -0.3,
  },
  headerSub: {
    fontSize: 12.5,
    color: '#64748b',
    marginTop: 2,
  },
  addDeadlineBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#4f46e5',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#4f46e5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 4,
  },
  scoreCardContainer: {
    paddingHorizontal: 16,
    marginVertical: 12,
  },
  healthScoreCard: {
    borderRadius: 24,
    padding: 22,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 18,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 30,
    elevation: 6,
  },
  scoreRingWrap: {
    width: 90,
    height: 90,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scoreRingCenter: {
    position: 'absolute',
    alignItems: 'center',
  },
  scoreRingNumber: {
    fontSize: 26,
    fontWeight: '800',
    color: '#ffffff',
    lineHeight: 28,
  },
  scoreRingSub: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.7)',
    fontWeight: '600',
  },
  scoreInfo: {
    flex: 1,
  },
  scoreGrade: {
    fontSize: 19,
    fontWeight: '800',
    color: '#ffffff',
    marginBottom: 4,
  },
  scoreSubtext: {
    fontSize: 11.5,
    color: 'rgba(255, 255, 255, 0.7)',
    lineHeight: 16,
    marginBottom: 12,
  },
  scoreStatRow: {
    flexDirection: 'row',
    gap: 10,
  },
  statChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  statDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#ffffff',
  },
  filterRow: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 3,
    marginHorizontal: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  filterTab: {
    flex: 1,
    paddingVertical: 7,
    alignItems: 'center',
    borderRadius: 9,
  },
  filterTabActive: {
    backgroundColor: '#4f46e5',
  },
  filterTabText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748b',
  },
  filterTabTextActive: {
    color: '#ffffff',
  },
  sectionHeading: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
    paddingHorizontal: 18,
    marginBottom: 10,
  },
  deadlineCard: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 10,
    elevation: 2,
  },
  deadlineCardDone: {
    opacity: 0.75,
  },
  deadlineCardIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deadlineBody: {
    flex: 1,
  },
  dlHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  dlCategoryTag: {
    fontSize: 9.5,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  daysChip: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  daysChipText: {
    fontSize: 10.5,
    fontWeight: '800',
  },
  daysUrgent: {
    backgroundColor: '#fee2e2',
  },
  daysUrgentText: {
    color: '#b91c1c',
  },
  daysOk: {
    backgroundColor: '#eef2ff',
  },
  daysOkText: {
    color: '#4f46e5',
  },
  daysDone: {
    backgroundColor: '#ecfdf5',
  },
  daysDoneText: {
    color: '#047857',
  },
  dlTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
    lineHeight: 18,
    marginBottom: 4,
  },
  dlTitleDone: {
    textDecorationLine: 'line-through',
    color: '#94a3b8',
  },
  dlDate: {
    fontSize: 11.5,
    color: '#64748b',
    marginBottom: 10,
  },
  dlActionsRow: {
    flexDirection: 'row',
    gap: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  actionBtnDone: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 8,
    gap: 4,
  },
  actionBtnDoneText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#0f172a',
  },
  actionBtnWa: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#bbf7d0',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 8,
    gap: 4,
  },
  actionBtnWaText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#166534',
  },
  emptyCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 30,
    alignItems: 'center',
    marginHorizontal: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
    marginTop: 8,
  },
  emptySub: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 4,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 6,
  },
  textInput: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13.5,
    color: '#0f172a',
    marginBottom: 14,
  },
  catPickerRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 18,
  },
  catPickChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
  },
  catPickChipActive: {
    backgroundColor: '#4f46e5',
    borderColor: '#4f46e5',
  },
  catPickText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#0f172a',
  },
  catPickTextActive: {
    color: '#ffffff',
  },
  submitBtn: {
    backgroundColor: '#4f46e5',
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: 'center',
  },
  submitBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
  },
});

export default DeadlineScreen;
