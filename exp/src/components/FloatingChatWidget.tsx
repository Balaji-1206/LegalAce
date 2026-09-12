import React, { useState, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Modal,
  ScrollView,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Colors from '../theme/colors';
import { Message, LawCitation } from '../types';

interface FloatingChatWidgetProps {
  messages: Message[];
  inputValue: string;
  setInputValue: (val: string) => void;
  loading: boolean;
  errorMessage: string | null;
  expandedCitation: string | null;
  toggleCitation: (section: string) => void;
  LAW_DETAILS_MAP: Record<string, string>;
  handleSendMessage: (text?: string) => void;
  suggestions: { text: string; label: string }[];
  startNewChat: () => void;
  userId: string;
  backendUrl: string;
  handleStopResponse?: () => void;
}

type AgentMode = 'general' | 'contracts' | 'disputes' | 'rights';

const AGENT_MODES: { id: AgentMode; label: string; icon: string; prefix: string }[] = [
  { id: 'general', label: 'Legal Assistant', icon: '🧠', prefix: '' },
  { id: 'contracts', label: 'Contract Agent', icon: '📄', prefix: '[Contract Mode]: ' },
  { id: 'disputes', label: 'Dispute Specialist', icon: '⚡', prefix: '[Dispute Mode]: ' },
  { id: 'rights', label: 'Rights Advisor', icon: '🛡️', prefix: '[Rights Mode]: ' },
];

const parseInlineMarkdown = (text: string) => {
  const parts = text.split(/(\*\*.*?\*\*)/g);
  return parts.map((part, pIdx) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <Text key={pIdx} style={styles.mdBold}>
          {part.slice(2, -2)}
        </Text>
      );
    }
    return part;
  });
};

const renderFormattedMessage = (content: string, isUser: boolean) => {
  if (isUser) {
    return <Text style={[styles.msgText, styles.msgTextUser]}>{content}</Text>;
  }

  const lines = content.split('\n');
  return (
    <View style={{ gap: 4 }}>
      {lines.map((line, lIdx) => {
        const trimmed = line.trim();
        if (!trimmed) {
          return <View key={lIdx} style={{ height: 4 }} />;
        }

        if (trimmed.startsWith('### ') || trimmed.startsWith('## ') || trimmed.startsWith('# ')) {
          const headerText = trimmed.replace(/^#+\s*/, '');
          return (
            <Text key={lIdx} style={styles.mdHeading}>
              {parseInlineMarkdown(headerText)}
            </Text>
          );
        }

        const bulletMatch = trimmed.match(/^([*\-•]|\d+\.)\s+(.*)/);
        if (bulletMatch) {
          return (
            <View key={lIdx} style={styles.mdListItem}>
              <Text style={styles.mdListBullet}>{bulletMatch[1]}</Text>
              <Text style={styles.mdListText}>
                {parseInlineMarkdown(bulletMatch[2])}
              </Text>
            </View>
          );
        }

        return (
          <Text key={lIdx} style={[styles.msgText, styles.msgTextAssistant]}>
            {parseInlineMarkdown(trimmed)}
          </Text>
        );
      })}
    </View>
  );
};

export const FloatingChatWidget: React.FC<FloatingChatWidgetProps> = ({
  messages,
  inputValue,
  setInputValue,
  loading,
  errorMessage,
  expandedCitation,
  toggleCitation,
  LAW_DETAILS_MAP,
  handleSendMessage,
  suggestions,
  startNewChat,
  userId,
  backendUrl,
  handleStopResponse,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentMode, setCurrentMode] = useState<AgentMode>('general');
  const [reminderSavedMap, setReminderSavedMap] = useState<Record<string, boolean>>({});
  const scrollViewRef = useRef<ScrollView>(null);

  const onSend = (textOverride?: string) => {
    const text = textOverride || inputValue;
    if (!text.trim()) return;
    const modeObj = AGENT_MODES.find(m => m.id === currentMode);
    const prefix = modeObj?.prefix || '';
    handleSendMessage(prefix ? `${prefix}${text}` : text);
  };

  const handleCreateReminder = async (stepText: string) => {
    if (reminderSavedMap[stepText]) return;
    setReminderSavedMap(prev => ({ ...prev, [stepText]: true }));

    try {
      await fetch(`${backendUrl}/api/v1/deadlines/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          title: stepText.replace(/^\d+[.\s-]*/, '').slice(0, 80),
          description: `Action step from AI Agent: "${stepText}"`,
          category: 'general',
          deadline_date: new Date(Date.now() + 15 * 86400000).toISOString(),
          priority: 'medium',
          source_type: 'chat',
        }),
      });
    } catch { /* saved locally */ }
  };

  return (
    <>
      {/* Floating Action Button (when closed) */}
      {!isOpen && (
        <View style={styles.fabContainer}>
          {/* Hint Pill */}
          <TouchableOpacity
            style={styles.hintPill}
            onPress={() => setIsOpen(true)}
            activeOpacity={0.8}
          >
            <Text style={styles.hintText}>Ask AI Lawyer ✨</Text>
          </TouchableOpacity>

          {/* Glowing FAB */}
          <TouchableOpacity
            style={styles.fabWrapper}
            onPress={() => setIsOpen(true)}
            activeOpacity={0.85}
          >
            <View style={styles.fabPulseRing} />
            <LinearGradient
              colors={['#1a2f5e', '#4f46e5', '#2563eb']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.fabGradient}
            >
              <Ionicons name="chatbubbles" size={24} color="#ffffff" />
            </LinearGradient>
            <View style={styles.fabOnlineBadge} />
          </TouchableOpacity>
        </View>
      )}

      {/* Full Expandable Chat Sheet Modal */}
      <Modal visible={isOpen} animationType="slide" onRequestClose={() => setIsOpen(false)}>
        <KeyboardAvoidingView
          style={styles.modalContainer}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          {/* Chat Header */}
          <LinearGradient
            colors={['#0f1d3d', '#1a2f5e', '#1e1b5e']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.panelHeader}
          >
            <View style={styles.headerTopRow}>
              <View style={styles.headerLeft}>
                <View style={styles.agentAvatar}>
                  <Ionicons name="scale" size={20} color="#ffffff" />
                </View>
                <View>
                  <View style={styles.agentNameRow}>
                    <Text style={styles.agentName}>LegalAce AI</Text>
                    <Text style={{ fontSize: 12 }}>✨</Text>
                  </View>
                  <View style={styles.statusBadge}>
                    <View style={styles.statusDot} />
                    <Text style={styles.statusText}>LIVE • AI LEGAL COUNSEL</Text>
                  </View>
                </View>
              </View>

              <View style={styles.headerRight}>
                <TouchableOpacity
                  style={styles.headerActionBtn}
                  onPress={startNewChat}
                  activeOpacity={0.8}
                >
                  <Ionicons name="refresh" size={17} color="#ffffff" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.headerActionBtn}
                  onPress={() => setIsOpen(false)}
                  activeOpacity={0.8}
                >
                  <Ionicons name="close" size={20} color="#ffffff" />
                </TouchableOpacity>
              </View>
            </View>
          </LinearGradient>

          {/* Agent Mode Selector Strip */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.modeStrip}
            contentContainerStyle={{ paddingHorizontal: 12, gap: 6 }}
          >
            {AGENT_MODES.map(mode => (
              <TouchableOpacity
                key={mode.id}
                style={[styles.modeChip, currentMode === mode.id && styles.modeChipActive]}
                onPress={() => setCurrentMode(mode.id)}
              >
                <Text style={styles.modeIcon}>{mode.icon}</Text>
                <Text style={[styles.modeLabel, currentMode === mode.id && styles.modeLabelActive]}>
                  {mode.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Messages Scroll Area */}
          <ScrollView
            ref={scrollViewRef}
            style={styles.messageScroll}
            contentContainerStyle={styles.messageScrollContent}
            onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
          >
            {messages.length === 0 ? (
              <View style={styles.welcomeBox}>
                <View style={styles.welcomeIconCircle}>
                  <Text style={{ fontSize: 26 }}>⚖️</Text>
                </View>
                <Text style={styles.welcomeTitle}>Your AI Legal Protection Assistant</Text>
                <Text style={styles.welcomeSub}>
                  Ask anything about Indian laws, workplace rights, tenancy disputes, or police protocol.
                </Text>

                <Text style={styles.promptHeader}>POPULAR INQUIRIES</Text>
                {suggestions.map((s, idx) => (
                  <TouchableOpacity
                    key={idx}
                    style={styles.suggestionChip}
                    onPress={() => onSend(s.text)}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="help-circle-outline" size={16} color="#4f46e5" />
                    <Text style={styles.suggestionText}>{s.text}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            ) : (
              messages.map((msg, index) => {
                const isUser = msg.role === 'user';
                return (
                  <View
                    key={index}
                    style={[styles.msgRow, isUser ? styles.msgRowUser : styles.msgRowAssistant]}
                  >
                    <View
                      style={[
                        styles.msgBubble,
                        isUser ? styles.msgBubbleUser : styles.msgBubbleAssistant,
                      ]}
                    >
                      {renderFormattedMessage(msg.content, isUser)}

                      {/* Law Citations */}
                      {msg.citations && msg.citations.length > 0 && (
                        <View style={styles.citationsBox}>
                          <Text style={styles.citationHeader}>
                            📚 STATUTORY REFERENCES & LAW CITATIONS
                          </Text>
                          {msg.citations.map((c: LawCitation, cIdx: number) => {
                            const isExp = expandedCitation === c.section;
                            const secDetail = LAW_DETAILS_MAP[c.section];
                            return (
                              <TouchableOpacity
                                key={cIdx}
                                style={styles.citationBadge}
                                onPress={() => toggleCitation(c.section)}
                                activeOpacity={0.8}
                              >
                                <View style={styles.citationBadgeRow}>
                                  <Text style={styles.citationBadgeText}>
                                    ⚖️ {c.act} — {c.section}
                                  </Text>
                                  <Ionicons
                                    name={isExp ? 'chevron-up' : 'chevron-down'}
                                    size={14}
                                    color="#4f46e5"
                                  />
                                </View>
                                {isExp && (
                                  <Text style={styles.citationDetailText}>
                                    {secDetail || c.section_title || 'Statutory legal provision.'}
                                  </Text>
                                )}
                              </TouchableOpacity>
                            );
                          })}
                        </View>
                      )}

                      {/* Action Steps */}
                      {msg.action_steps && msg.action_steps.length > 0 && (
                        <View style={styles.actionStepsBox}>
                          <Text style={styles.actionStepsHeader}>
                            📋 RECOMMENDED LEGAL ACTION PLAN
                          </Text>
                          {msg.action_steps.map((step: string, sIdx: number) => (
                            <View key={sIdx} style={styles.actionStepItem}>
                              <Text style={styles.actionStepBullet}>•</Text>
                              <View style={{ flex: 1 }}>
                                <Text style={styles.actionStepText}>{step}</Text>
                                <TouchableOpacity
                                  style={styles.remindBtn}
                                  onPress={() => handleCreateReminder(step)}
                                  activeOpacity={0.7}
                                >
                                  <Ionicons
                                    name={reminderSavedMap[step] ? 'checkmark-circle' : 'alarm-outline'}
                                    size={13}
                                    color={reminderSavedMap[step] ? '#059669' : '#4f46e5'}
                                  />
                                  <Text
                                    style={[
                                      styles.remindBtnText,
                                      reminderSavedMap[step] && { color: '#059669' },
                                    ]}
                                  >
                                    {reminderSavedMap[step] ? 'Added to Monitor' : 'Add to Monitor'}
                                  </Text>
                                </TouchableOpacity>
                              </View>
                            </View>
                          ))}
                        </View>
                      )}

                      {/* Disclaimer */}
                      {msg.disclaimer ? (
                        <Text style={styles.disclaimerText}>{msg.disclaimer}</Text>
                      ) : null}
                    </View>
                  </View>
                );
              })
            )}

            {/* Loading Bubble */}
            {loading && (
              <View style={styles.loadingBubble}>
                <ActivityIndicator size="small" color="#4f46e5" />
                <Text style={styles.loadingBubbleText}>AI Legal Agent is reviewing Indian statutes...</Text>
                {handleStopResponse && (
                  <TouchableOpacity style={styles.stopBtn} onPress={handleStopResponse}>
                    <Text style={styles.stopBtnText}>Stop</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

            {/* Error Bubble */}
            {errorMessage && (
              <View style={styles.errorBubble}>
                <Ionicons name="alert-circle" size={18} color="#b91c1c" />
                <Text style={styles.errorBubbleText}>{errorMessage}</Text>
              </View>
            )}
          </ScrollView>

          {/* Input Bar */}
          <View style={styles.inputBar}>
            <TextInput
              style={styles.inputField}
              placeholder="Ask about your rights, laws, or notices..."
              placeholderTextColor="#9ca3af"
              value={inputValue}
              onChangeText={setInputValue}
              multiline
              maxLength={600}
            />
            <TouchableOpacity
              style={[styles.sendBtn, (!inputValue.trim() || loading) && styles.sendBtnDisabled]}
              onPress={() => onSend()}
              disabled={!inputValue.trim() || loading}
              activeOpacity={0.8}
            >
              <Ionicons name="arrow-up" size={20} color="#ffffff" />
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  fabContainer: {
    position: 'absolute',
    bottom: 76,
    right: 16,
    zIndex: 1000,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  hintPill: {
    backgroundColor: '#0f1d3d',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  hintText: {
    color: '#ffffff',
    fontSize: 11.5,
    fontWeight: '700',
  },
  fabWrapper: {
    width: 54,
    height: 54,
    borderRadius: 27,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fabPulseRing: {
    position: 'absolute',
    width: 62,
    height: 62,
    borderRadius: 31,
    borderWidth: 1.5,
    borderColor: 'rgba(99, 102, 241, 0.4)',
  },
  fabGradient: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#4f46e5',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 8,
  },
  fabOnlineBadge: {
    position: 'absolute',
    top: 1,
    right: 1,
    width: 13,
    height: 13,
    borderRadius: 6.5,
    backgroundColor: '#22c55e',
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  panelHeader: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.07)',
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  agentAvatar: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  agentNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  agentName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#ffffff',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 2,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#34d399',
  },
  statusText: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#34d399',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  headerRight: {
    flexDirection: 'row',
    gap: 8,
  },
  headerActionBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeStrip: {
    backgroundColor: '#ffffff',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e8eaf0',
    maxHeight: 48,
  },
  modeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    gap: 5,
  },
  modeChipActive: {
    backgroundColor: '#4f46e5',
    borderColor: '#4f46e5',
  },
  modeIcon: {
    fontSize: 12,
  },
  modeLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#334155',
  },
  modeLabelActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
  messageScroll: {
    flex: 1,
  },
  messageScrollContent: {
    padding: 16,
    gap: 12,
  },
  welcomeBox: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 18,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#e8eaf0',
  },
  welcomeIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#eef2ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  welcomeTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
    textAlign: 'center',
    marginBottom: 6,
  },
  welcomeSub: {
    fontSize: 12.5,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 16,
  },
  promptHeader: {
    fontSize: 11,
    fontWeight: '800',
    color: '#94a3b8',
    letterSpacing: 0.5,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  suggestionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    width: '100%',
    marginBottom: 8,
  },
  suggestionText: {
    fontSize: 12.5,
    color: '#334155',
    flex: 1,
  },
  msgRow: {
    flexDirection: 'row',
  },
  msgRowUser: {
    justifyContent: 'flex-end',
  },
  msgRowAssistant: {
    justifyContent: 'flex-start',
  },
  msgBubble: {
    maxWidth: '86%',
    borderRadius: 18,
    padding: 14,
  },
  msgBubbleUser: {
    backgroundColor: '#4f46e5',
    borderBottomRightRadius: 4,
  },
  msgBubbleAssistant: {
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#e8eaf0',
    borderBottomLeftRadius: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 2,
  },
  msgText: {
    fontSize: 13.5,
    lineHeight: 20,
  },
  msgTextUser: {
    color: '#ffffff',
    fontWeight: '500',
  },
  msgTextAssistant: {
    color: '#0f172a',
  },
  mdHeading: {
    fontSize: 14.5,
    fontWeight: '800',
    color: '#1a1a5e',
    marginTop: 6,
    marginBottom: 4,
  },
  mdBold: {
    fontWeight: '700',
    color: '#0f172a',
  },
  mdListItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginVertical: 2,
    paddingLeft: 4,
  },
  mdListBullet: {
    fontSize: 13,
    color: '#4f46e5',
    marginRight: 6,
    fontWeight: '700',
  },
  mdListText: {
    flex: 1,
    fontSize: 13.5,
    lineHeight: 20,
    color: '#0f172a',
  },
  citationsBox: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  citationHeader: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#4f46e5',
    marginBottom: 6,
  },
  citationBadge: {
    backgroundColor: '#eef2ff',
    padding: 8,
    borderRadius: 8,
    marginBottom: 6,
  },
  citationBadgeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  citationBadgeText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#4f46e5',
  },
  citationDetailText: {
    fontSize: 11,
    color: '#475569',
    lineHeight: 16,
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: 'rgba(99, 102, 241, 0.2)',
  },
  actionStepsBox: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  actionStepsHeader: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 6,
  },
  actionStepItem: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 8,
  },
  actionStepBullet: {
    fontSize: 14,
    color: '#4f46e5',
  },
  actionStepText: {
    fontSize: 12,
    color: '#0f172a',
    lineHeight: 17,
  },
  remindBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 3,
  },
  remindBtnText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#4f46e5',
  },
  disclaimerText: {
    fontSize: 10.5,
    color: '#94a3b8',
    fontStyle: 'italic',
    marginTop: 10,
  },
  loadingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#e8eaf0',
    gap: 8,
    alignSelf: 'flex-start',
  },
  loadingBubbleText: {
    fontSize: 12,
    color: '#475569',
  },
  stopBtn: {
    backgroundColor: '#fee2e2',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  stopBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#dc2626',
  },
  errorBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fee2e2',
    padding: 10,
    borderRadius: 10,
    gap: 6,
  },
  errorBubbleText: {
    fontSize: 12,
    color: '#b91c1c',
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#e8eaf0',
    gap: 8,
  },
  inputField: {
    flex: 1,
    backgroundColor: '#f8fafc',
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    fontSize: 13.5,
    color: '#0f172a',
    maxHeight: 80,
  },
  sendBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#4f46e5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendBtnDisabled: {
    opacity: 0.45,
  },
});

export default FloatingChatWidget;
