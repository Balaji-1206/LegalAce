import React, { useState } from 'react';
import type { Message, ConversationSummary } from '../shared/types';
import './ChatbotTab.css';

interface ChatbotTabProps {
  messages: Message[];
  inputValue: string;
  setInputValue: (val: string) => void;
  loading: boolean;
  errorMessage: string | null;
  expandedCitation: string | null;
  toggleCitation: (section: string) => void;
  LAW_DETAILS_MAP: Record<string, string>;
  handleSendMessage: (text?: string) => void;
  handleKeyPress: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  suggestions: { text: string; label: string }[];
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
  onBack: () => void;
  startNewChat: () => void;
  conversations: ConversationSummary[];
  selectConversation: (id: string) => void;
  deleteConversation: (e: React.MouseEvent, id: string) => void;
  userId: string;
  backendUrl: string;
}

const formatTime = (ts: string) => {
  try {
    return new Date(ts).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  } catch { return ''; }
};

// Action Step Item with Reminder Pinning
const ActionStepItem: React.FC<{ userId: string; stepText: string; backendUrl: string }> = ({ userId, stepText, backendUrl }) => {
  const [isChecked, setIsChecked] = useState(false);
  const [reminderState, setReminderState] = useState<'idle' | 'loading' | 'created'>('idle');

  const handleCreateReminder = async () => {
    if (reminderState !== 'idle') return;
    setReminderState('loading');
    try {
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 15);
      
      const res = await fetch(`${backendUrl}/api/v1/deadlines/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          title: stepText.replace(/^\d+[\.\-\s]*/, '').slice(0, 80),
          description: `Action step checklist item: "${stepText}"`,
          category: 'general',
          deadline_date: dueDate.toISOString(),
          priority: 'medium',
          source_type: 'chat',
        }),
      });
      if (res.ok) {
        setReminderState('created');
      } else {
        setReminderState('idle');
        alert('Could not save reminder. Please try again.');
      }
    } catch {
      setReminderState('idle');
      alert('Network error. Check connection.');
    }
  };

  return (
    <div className={`rich-action-item${isChecked ? ' checked' : ''}`}>
      <label className="action-checkbox-label">
        <input
          type="checkbox"
          checked={isChecked}
          onChange={e => setIsChecked(e.target.checked)}
          className="action-checkbox-input"
        />
        <span className="action-checkbox-custom" />
        <span className="action-step-text">{stepText}</span>
      </label>
      <button
        className={`create-reminder-btn ${reminderState}`}
        onClick={handleCreateReminder}
        disabled={reminderState !== 'idle'}
        title="Pin as a legal deadline reminder in Monitor tab"
      >
        {reminderState === 'idle' && (
          <>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="11" height="11">
              <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            <span>Remind Me</span>
          </>
        )}
        {reminderState === 'loading' && <span>Saving...</span>}
        {reminderState === 'created' && <span>✓ Saved!</span>}
      </button>
    </div>
  );
};

export const ChatbotTab: React.FC<ChatbotTabProps> = ({
  messages,
  inputValue,
  setInputValue,
  loading,
  errorMessage,
  expandedCitation,
  toggleCitation,
  LAW_DETAILS_MAP,
  handleSendMessage,
  handleKeyPress,
  suggestions,
  messagesEndRef,
  onBack,
  startNewChat,
  conversations,
  selectConversation,
  deleteConversation,
  userId,
  backendUrl,
}) => {
  const [copiedMsgIdx, setCopiedMsgIdx] = useState<number | null>(null);

  const handleCopyMessage = (text: string, idx: number) => {
    navigator.clipboard.writeText(text);
    setCopiedMsgIdx(idx);
    setTimeout(() => setCopiedMsgIdx(null), 2000);
  };

  const hasBullets = (content: string) => content.includes('• ') || content.includes('- ');

  const SUGGESTION_ICONS = ['💼', '🏠', '👮', '🛒'];

  return (
    <div className="chat-screen animate-fade-in">
      {/* Header */}
      <div className="chat-screen-header">
        <button className="chat-back-btn" onClick={onBack} title="Back to Home">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="20" height="20">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>

        <div className="chat-header-center">
          <span className="chat-screen-title">AI Legal Assistant</span>
          <div className="chat-status-pill">
            <span className="live-status-dot" />
            <span>Online • RAG Engine ⚡</span>
          </div>
        </div>

        <button className="chat-menu-btn" onClick={startNewChat} title="Start New Chat">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
            <path d="M12 5v14M5 12h14" />
          </svg>
        </button>
      </div>

      {/* Disclaimer Banner */}
      <div className="chat-disclaimer-banner">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
          <circle cx="12" cy="12" r="10" /><path d="M12 8v4M12 16h.01" />
        </svg>
        <span>Information for educational purposes, not formal legal advice.</span>
      </div>

      {/* Error Banner */}
      {errorMessage && (
        <div className="error-banner">{errorMessage}</div>
      )}

      {/* Messages Feed / Welcome Screen */}
      <div className="chat-feed">
        {messages.length === 0 ? (
          <div className="chat-welcome-screen animate-fade-in">
            <div className="chat-welcome-avatar">
              <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" width="34" height="34">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
            </div>
            <h2>Hello! I am LegalAce.</h2>
            <p>Describe your legal query or situation to get citations, rights, and action steps.</p>

            <div className="suggestions-grid">
              {suggestions.map((s, idx) => (
                <button
                  key={idx}
                  className="suggestion-card"
                  onClick={() => handleSendMessage(s.text)}
                >
                  <div className="suggestion-header-row">
                    <span className="suggestion-icon">{SUGGESTION_ICONS[idx % SUGGESTION_ICONS.length]}</span>
                    <span className="suggestion-label">{s.label}</span>
                  </div>
                  <p className="suggestion-text">{s.text}</p>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {messages.map((m, idx) => (
              <div key={idx} className={`message-wrapper ${m.role} animate-fade-in`}>
                {m.role === 'assistant' ? (
                  <div className="ai-avatar-row">
                    <div className="ai-avatar">
                      <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" width="16" height="16">
                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                      </svg>
                    </div>
                    <div style={{ flex: 1 }}>
                      <div className="message-bubble">
                        <div className="ai-message-content">
                          {hasBullets(m.content) ? (
                            <>
                              {m.content.split('\n').filter(l => !l.startsWith('• ') && !l.startsWith('- ')).join('\n').trim() && (
                                <p style={{ marginBottom: 10 }}>
                                  {m.content.split('\n').filter(l => !l.startsWith('• ') && !l.startsWith('- '))[0]}
                                </p>
                              )}
                              <ul className="bullet-list-custom">
                                {m.content.split('\n').filter(l => l.startsWith('• ') || l.startsWith('- ')).map((line, li) => {
                                  const text = line.slice(2);
                                  const colonIdx = text.indexOf(':');
                                  return (
                                    <li key={li}>
                                      {colonIdx > -1 ? (
                                        <><strong style={{ color: '#1e1b4b' }}>{text.slice(0, colonIdx + 1)}</strong>{text.slice(colonIdx + 1)}</>
                                      ) : text}
                                    </li>
                                  );
                                })}
                              </ul>
                            </>
                          ) : (
                            <p style={{ fontSize: 14, lineHeight: 1.6 }}>{m.content}</p>
                          )}
                        </div>

                        {/* Your Legal Rights Card */}
                        {m.rights && m.rights.length > 0 && (
                          <div className="rich-card rights-card-bubble animate-fade-in">
                            <div className="rich-card-header">
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="14" height="14">
                                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                              </svg>
                              <span>Your Statutory Legal Rights</span>
                            </div>
                            <div className="rich-card-content">
                              {m.rights.map((r, ri) => (
                                <div key={ri} className="rich-right-item">
                                  <span className="right-bullet-check">✓</span>
                                  <span className="right-text-content">{r}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Action Steps Checklist */}
                        {m.action_steps && m.action_steps.length > 0 && (
                          <div className="rich-card action-card-bubble animate-fade-in">
                            <div className="rich-card-header">
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="14" height="14">
                                <polyline points="9 11 12 14 22 4" />
                                <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
                              </svg>
                              <span>Action Steps Checklist</span>
                            </div>
                            <div className="rich-card-content">
                              {m.action_steps.map((step, si) => (
                                <ActionStepItem
                                  key={si}
                                  userId={userId}
                                  stepText={step}
                                  backendUrl={backendUrl}
                                />
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Citations Section */}
                        {m.citations && m.citations.length > 0 && (
                          <div className="citations-section">
                            <div className="citations-label">Statutory Citations & Acts:</div>
                            <div className="citation-pills">
                              {m.citations.map((c, ci) => (
                                <button
                                  key={ci}
                                  className="citation-pill"
                                  onClick={() => toggleCitation(c.section)}
                                  title={LAW_DETAILS_MAP[c.section] || c.section_title}
                                >
                                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="12" height="12">
                                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                                  </svg>
                                  <span>{c.act?.replace('Act', '').trim().slice(0, 14)} • Sec {c.section}</span>
                                </button>
                              ))}
                            </div>

                            {/* Expanded Statute View */}
                            {expandedCitation && (() => {
                              const activeCitationObj = m.citations.find(c => c.section === expandedCitation);
                              if (!activeCitationObj) return null;
                              return (
                                <div className="legal-dictionary-card animate-fade-in">
                                  <div className="ld-card-header">
                                    <div className="ld-act-badge">📜 {activeCitationObj.act}</div>
                                    <button className="ld-close-btn" onClick={() => toggleCitation(activeCitationObj.section)} title="Close">
                                      ✕
                                    </button>
                                  </div>
                                  <h4 className="ld-section-number">Section {activeCitationObj.section}</h4>
                                  <h5 className="ld-section-title">{activeCitationObj.section_title}</h5>
                                  <div className="ld-section-text">
                                    {LAW_DETAILS_MAP[activeCitationObj.section] || 'Statutory legal text loaded from official legal database.'}
                                  </div>
                                  <div className="ld-card-footer">
                                    <button
                                      className="ld-copy-btn"
                                      onClick={() => {
                                        navigator.clipboard.writeText(`${activeCitationObj.act} - Section ${activeCitationObj.section}: ${activeCitationObj.section_title}\n\n${LAW_DETAILS_MAP[activeCitationObj.section] || ''}`);
                                        alert("Statute section copied!");
                                      }}
                                    >
                                      📋 Copy Statute
                                    </button>
                                    {activeCitationObj.relevance_score > 0 && (
                                      <span className="ld-relevance">Match: {Math.round(activeCitationObj.relevance_score * 100)}%</span>
                                    )}
                                  </div>
                                </div>
                              );
                            })()}
                          </div>
                        )}
                      </div>

                      {/* Footer bar for AI Bubble: Copy Button + Timestamp */}
                      <div className="ai-message-footer">
                        <button
                          className="copy-msg-btn"
                          onClick={() => handleCopyMessage(m.content, idx)}
                          title="Copy AI response to clipboard"
                        >
                          {copiedMsgIdx === idx ? '✓ Copied' : '📋 Copy'}
                        </button>
                        <span className="message-timestamp">{formatTime(m.timestamp)}</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="message-bubble">{m.content}</div>
                    <div className="message-timestamp">{formatTime(m.timestamp)}</div>
                  </>
                )}
              </div>
            ))}

            {loading && (
              <div className="chat-loading-dots">
                <span /><span /><span />
              </div>
            )}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input Area */}
      <div className="chat-input-area">
        <div className="chat-input-box-wrapper">
          <textarea
            className="chat-input-box"
            placeholder="Describe your legal situation or question..."
            value={inputValue}
            onChange={e => setInputValue(e.target.value)}
            onKeyDown={handleKeyPress}
            rows={1}
            disabled={loading}
          />
        </div>
        <button
          className="chat-send-btn"
          onClick={() => handleSendMessage()}
          disabled={loading || !inputValue.trim()}
          title="Send message"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" width="18" height="18">
            <line x1="22" y1="2" x2="11" y2="13" />
            <polygon points="22 2 15 22 11 13 2 9 22 2" />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default ChatbotTab;
