import React from 'react';
import type { Message, ConversationSummary } from '../shared/types';

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

const renderAIContent = (content: string) => {
  const lines = content.split('\n');
  return lines.map((line, i) => {
    if (line.startsWith('• ') || line.startsWith('- ')) {
      const text = line.slice(2);
      // Bold part before first colon
      const colonIdx = text.indexOf(':');
      if (colonIdx > -1) {
        const bold = text.slice(0, colonIdx + 1);
        const rest = text.slice(colonIdx + 1);
        return <li key={i}><strong>{bold}</strong>{rest}</li>;
      }
      return <li key={i}>{text}</li>;
    }
    if (line.trim() === '') return <br key={i} />;
    return <p key={i} style={{ marginBottom: 4 }}>{line}</p>;
  });
};
// ---- Action Step Item Subcomponent ----
const ActionStepItem: React.FC<{ userId: string; stepText: string; backendUrl: string }> = ({ userId, stepText, backendUrl }) => {
  const [isChecked, setIsChecked] = React.useState(false);
  const [reminderState, setReminderState] = React.useState<'idle' | 'loading' | 'created'>('idle');

  const handleCreateReminder = async () => {
    if (reminderState !== 'idle') return;
    setReminderState('loading');
    try {
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 15); // Default legal notice timeframe
      
      const res = await fetch(`${backendUrl}/api/v1/deadlines/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          title: stepText.replace(/^\d+[\.\-\s]*/, '').slice(0, 80), // Clean prefix number
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
  const hasBullets = (content: string) => content.includes('• ') || content.includes('- ');

  return (
    <div className="chat-screen animate-fade-in">
      {/* Header */}
      <div className="chat-screen-header">
        <button className="chat-back-btn" onClick={onBack} title="Back to Home">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="20" height="20">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <span className="chat-screen-title">AI Legal Assistant</span>
        <button className="chat-menu-btn" onClick={startNewChat} title="New Chat">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
            <circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /><circle cx="5" cy="12" r="1" />
          </svg>
        </button>
      </div>

      {/* Disclaimer Banner */}
      <div className="chat-disclaimer-banner">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
          <circle cx="12" cy="12" r="10" /><path d="M12 8v4M12 16h.01" />
        </svg>
        Information for education, not legal advice.
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
              <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" width="30" height="30">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
            </div>
            <h2>Hello. I am LegalAce, your AI Legal Assistant.</h2>
            <p>How can I help you understand your legal situation today?</p>

            <div className="suggestions-grid">
              {suggestions.map((s, idx) => (
                <button
                  key={idx}
                  className="suggestion-card"
                  onClick={() => handleSendMessage(s.text)}
                >
                  <span className="suggestion-label">{s.label}</span>
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
                              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
                                {m.content.split('\n').filter(l => l.startsWith('• ') || l.startsWith('- ')).map((line, li) => {
                                  const text = line.slice(2);
                                  const colonIdx = text.indexOf(':');
                                  return (
                                    <li key={li} style={{ fontSize: 13.5, color: '#374151', lineHeight: 1.5 }}>
                                      {colonIdx > -1 ? (
                                        <><strong style={{ color: '#1a1a5e' }}>{text.slice(0, colonIdx + 1)}</strong>{text.slice(colonIdx + 1)}</>
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
                        
                        {/* Rich Cards (Checklist, Reminders) */}
                        {m.rights && m.rights.length > 0 && (
                          <div className="rich-card rights-card-bubble animate-fade-in" style={{ marginTop: 10 }}>
                            <div className="rich-card-header">
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="13" height="13">
                                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                              </svg>
                              <span>Your Legal Rights</span>
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

                        {m.action_steps && m.action_steps.length > 0 && (
                          <div className="rich-card action-card-bubble animate-fade-in" style={{ marginTop: 10 }}>
                            <div className="rich-card-header">
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="13" height="13">
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

                        {m.citations && m.citations.length > 0 && (
                          <div className="citations-section">
                            <div className="citations-label">Citations:</div>
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
                                  {c.act?.replace('Act', '').trim().slice(0, 12)}... Sec {c.section}
                                </button>
                              ))}
                            </div>
                            {expandedCitation && (() => {
                              const activeCitationObj = m.citations.find(c => c.section === expandedCitation);
                              if (!activeCitationObj) return null;
                              return (
                                <div className="legal-dictionary-card animate-fade-in">
                                  <div className="ld-card-header">
                                    <div className="ld-act-badge">📜 {activeCitationObj.act}</div>
                                    <button className="ld-close-btn" onClick={() => toggleCitation(activeCitationObj.section)} title="Close">
                                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="12" height="12">
                                        <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                                      </svg>
                                    </button>
                                  </div>
                                  <h4 className="ld-section-number">{activeCitationObj.section}</h4>
                                  <h5 className="ld-section-title">{activeCitationObj.section_title}</h5>
                                  <div className="ld-section-text">
                                    {LAW_DETAILS_MAP[activeCitationObj.section] || 'Statutory text not fully cached in memory. Refer to official government gazette.'}
                                  </div>
                                  <div className="ld-card-footer">
                                    <button
                                      className="ld-copy-btn"
                                      onClick={() => {
                                        navigator.clipboard.writeText(`${activeCitationObj.act} - ${activeCitationObj.section}: ${activeCitationObj.section_title}\n\n${LAW_DETAILS_MAP[activeCitationObj.section] || ''}`);
                                        alert("Statute copied to clipboard!");
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
                      <div className="message-timestamp">{formatTime(m.timestamp)}</div>
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
          <button className="chat-attach-btn" title="Attach file">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
              <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48" />
            </svg>
          </button>
          <textarea
            className="chat-input-box"
            placeholder="Describe your situation..."
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
          title="Send"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" width="18" height="18">
            <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default ChatbotTab;
