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
                            {expandedCitation && (
                              <div style={{ marginTop: 8, padding: '10px 12px', background: '#f5f7ff', borderRadius: 10, fontSize: 12.5, color: '#374151', lineHeight: 1.55, border: '1px solid #e0e7ff' }}>
                                {LAW_DETAILS_MAP[expandedCitation] || 'No detailed information available.'}
                              </div>
                            )}
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
        <button className="chat-attach-btn" title="Attach file">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
            <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48" />
          </svg>
        </button>
        <textarea
          className="chat-input-box"
          placeholder="Describe your situation or ask a legal question..."
          value={inputValue}
          onChange={e => setInputValue(e.target.value)}
          onKeyDown={handleKeyPress}
          rows={1}
          disabled={loading}
        />
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
