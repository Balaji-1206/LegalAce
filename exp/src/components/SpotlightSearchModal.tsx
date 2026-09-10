import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../theme/colors';
import { SituationDetail, ActiveTab } from '../types';

interface SpotlightSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  situations: SituationDetail[];
  onSelectSituation: (id: string) => void;
  onNavigateTool: (tab: ActiveTab) => void;
}

const TRENDING_TOPICS = [
  { label: 'Salary Not Paid', query: 'salary', icon: '💼' },
  { label: 'Tenant Security Deposit', query: 'deposit', icon: '🏠' },
  { label: 'Cheque Bounce Sec 138', query: 'cheque', icon: '💳' },
  { label: 'Cyber Fraud Helpline 1930', query: 'cyber', icon: '🛡️' },
  { label: 'Defective Product Return', query: 'consumer', icon: '🛒' },
  { label: 'Police FIR & Arrest Rights', query: 'police', icon: '🚓' },
  { label: 'RERA Builder Delay', query: 'builder', icon: '🏢' },
];

export const SpotlightSearchModal: React.FC<SpotlightSearchModalProps> = ({
  isOpen,
  onClose,
  situations,
  onSelectSituation,
  onNavigateTool,
}) => {
  const [query, setQuery] = useState('');

  const trimmed = query.trim().toLowerCase();

  const filteredSituations = trimmed
    ? situations.filter(s =>
        s.title.toLowerCase().includes(trimmed) ||
        (s.description && s.description.toLowerCase().includes(trimmed)) ||
        s.category.toLowerCase().includes(trimmed)
      )
    : [];

  const handleClose = () => {
    setQuery('');
    onClose();
  };

  return (
    <Modal visible={isOpen} animationType="fade" transparent onRequestClose={handleClose}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          {/* Search Input Bar */}
          <View style={styles.inputBar}>
            <Ionicons name="search" size={20} color="#4f46e5" />
            <TextInput
              style={styles.input}
              placeholder="Search situations, laws, or topics..."
              placeholderTextColor="#9ca3af"
              value={query}
              onChangeText={setQuery}
              autoFocus
            />
            {query ? (
              <TouchableOpacity onPress={() => setQuery('')} style={styles.clearBtn}>
                <Ionicons name="close-circle" size={18} color="#9ca3af" />
              </TouchableOpacity>
            ) : null}
            <TouchableOpacity onPress={handleClose} style={styles.cancelBtn}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>

          {/* Scrollable Content */}
          <ScrollView style={styles.body} keyboardShouldPersistTaps="handled">
            {trimmed ? (
              <View>
                <View style={styles.sectionTitleRow}>
                  <Text style={styles.sectionTitle}>
                    Matching Legal Situations ({filteredSituations.length})
                  </Text>
                </View>

                {filteredSituations.length > 0 ? (
                  filteredSituations.map(sit => (
                    <TouchableOpacity
                      key={sit.situation_id}
                      style={styles.resultRow}
                      onPress={() => {
                        onSelectSituation(sit.situation_id);
                        handleClose();
                      }}
                      activeOpacity={0.7}
                    >
                      <View style={{ flex: 1 }}>
                        <View style={styles.resultTag}>
                          <Text style={styles.resultTagText}>
                            {sit.category.toUpperCase().replace('_', ' ')}
                          </Text>
                        </View>
                        <Text style={styles.resultTitle}>{sit.title}</Text>
                        {sit.description ? (
                          <Text style={styles.resultDesc} numberOfLines={2}>
                            {sit.description}
                          </Text>
                        ) : null}
                      </View>
                      <Ionicons name="chevron-forward" size={16} color="#9ca3af" />
                    </TouchableOpacity>
                  ))
                ) : (
                  <View style={styles.emptyBox}>
                    <Text style={{ fontSize: 32, marginBottom: 8 }}>🔍</Text>
                    <Text style={styles.emptyTitle}>No matching situations found</Text>
                    <Text style={styles.emptySub}>
                      Try searching for a different keyword or browse trending legal topics below.
                    </Text>
                  </View>
                )}
              </View>
            ) : (
              <View>
                {/* Trending Legal Inquiries */}
                <View style={styles.sectionTitleRow}>
                  <Text style={styles.sectionTitle}>🔥 Trending Legal Inquiries</Text>
                </View>
                <View style={styles.trendingWrap}>
                  {TRENDING_TOPICS.map(item => (
                    <TouchableOpacity
                      key={item.label}
                      style={styles.trendChip}
                      onPress={() => setQuery(item.query)}
                      activeOpacity={0.7}
                    >
                      <Text style={{ fontSize: 13 }}>{item.icon}</Text>
                      <Text style={styles.trendChipText}>{item.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Quick Legal Tools */}
                <View style={[styles.sectionTitleRow, { marginTop: 18 }]}>
                  <Text style={styles.sectionTitle}>⚡ Quick Legal Tools</Text>
                </View>
                <View style={styles.toolsGrid}>
                  <TouchableOpacity
                    style={styles.toolCard}
                    onPress={() => { onNavigateTool('xray'); handleClose(); }}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.toolIconWrap, { backgroundColor: '#eef2ff' }]}>
                      <Text style={{ fontSize: 18 }}>📄</Text>
                    </View>
                    <View style={styles.toolInfo}>
                      <Text style={styles.toolName}>Document X-Ray</Text>
                      <Text style={styles.toolSub}>AI doc analysis</Text>
                    </View>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.toolCard}
                    onPress={() => { onNavigateTool('legalaid'); handleClose(); }}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.toolIconWrap, { backgroundColor: '#ecfdf5' }]}>
                      <Text style={{ fontSize: 18 }}>🏛️</Text>
                    </View>
                    <View style={styles.toolInfo}>
                      <Text style={styles.toolName}>Free Legal Aid</Text>
                      <Text style={styles.toolSub}>DLSA eligibility</Text>
                    </View>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.toolCard}
                    onPress={() => { onNavigateTool('wizard'); handleClose(); }}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.toolIconWrap, { backgroundColor: '#f5f3ff' }]}>
                      <Text style={{ fontSize: 18 }}>⚡</Text>
                    </View>
                    <View style={styles.toolInfo}>
                      <Text style={styles.toolName}>Notice Wizard</Text>
                      <Text style={styles.toolSub}>Draft legal notices</Text>
                    </View>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.toolCard}
                    onPress={() => { onNavigateTool('deadlines'); handleClose(); }}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.toolIconWrap, { backgroundColor: '#fffbeb' }]}>
                      <Text style={{ fontSize: 18 }}>📅</Text>
                    </View>
                    <View style={styles.toolInfo}>
                      <Text style={styles.toolName}>Legal Monitor</Text>
                      <Text style={styles.toolSub}>Deadlines & alerts</Text>
                    </View>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            <View style={{ height: 20 }} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    padding: 16,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    maxHeight: '85%',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 10,
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f1f5',
    gap: 8,
  },
  input: {
    flex: 1,
    fontSize: 14.5,
    color: '#111827',
  },
  clearBtn: {
    padding: 4,
  },
  cancelBtn: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6b7280',
  },
  body: {
    padding: 16,
  },
  sectionTitleRow: {
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  trendingWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  trendChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 7,
    paddingHorizontal: 12,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 16,
  },
  trendChipText: {
    fontSize: 12,
    color: '#334151',
    fontWeight: '600',
  },
  toolsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  toolCard: {
    width: '48.5%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e8eaf0',
    borderRadius: 14,
  },
  toolIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toolInfo: {
    flex: 1,
  },
  toolName: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#111827',
  },
  toolSub: {
    fontSize: 10.5,
    color: '#6b7280',
    marginTop: 1,
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    gap: 10,
  },
  resultTag: {
    alignSelf: 'flex-start',
    paddingVertical: 2,
    paddingHorizontal: 8,
    backgroundColor: '#eef2ff',
    borderRadius: 10,
    marginBottom: 4,
  },
  resultTagText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#4f46e5',
  },
  resultTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 2,
  },
  resultDesc: {
    fontSize: 12,
    color: '#6b7280',
    lineHeight: 16,
  },
  emptyBox: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 20,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 6,
  },
  emptySub: {
    fontSize: 12.5,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 18,
  },
});

export default SpotlightSearchModal;
