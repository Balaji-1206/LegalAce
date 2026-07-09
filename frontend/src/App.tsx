import React, { useState, useEffect, useRef } from 'react';
import './App.css';

interface LawCitation {
  act: string;
  section: string;
  section_title: string;
  relevance_score: number;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  citations?: LawCitation[] | null;
  rights?: string[];
  action_steps?: string[];
  intent?: string;
  disclaimer?: string;
}

interface ConversationSummary {
  conversation_id: string;
  title: string;
  created_at: string;
  updated_at: string;
  message_count: number;
}

const BACKEND_URL = 'http://localhost:8000';

// Real law dictionary matches from data/indian_law_corpus.json to support interactive clicks in frontend!
const LAW_DETAILS_MAP: Record<string, string> = {
  "Section 2(7)": "Consumer means any person who buys any goods for a consideration which has been paid or promised or partly paid and partly promised...",
  "Section 35": "A complaint in relation to any goods sold or delivered or agreed to be sold or delivered or any service provided or agreed to be provided may be filed by a consumer in District Commission having jurisdiction...",
  "Section 39": "If the District Commission is satisfied that the goods complained against suffer from any of the defects specified in the complaint... it shall issue an order to the opposite party directing them to: remove the defect; replace; refund; pay compensation...",
  "Section 2(47)": "Unfair trade practice means a trade practice which, for the purpose of promoting the sale, use or supply of any goods or for the provision of any service, adopts any unfair method or unfair or deceptive practice...",
  "Section 106": "In the absence of a contract or local law or usage to the contrary, a lease of immovable property for agricultural or manufacturing purposes shall be deemed to be a lease from year to year; and other leases month to month...",
  "Section 108(q)": "On the determination of the lease, the lessee is bound to put the lessor into possession of the property. The lessor is bound to refund the security deposit to the lessee on vacating, deducting legitimate dues...",
  "General Provisions": "Across most Indian state Rent Control Acts, a landlord cannot evict a tenant without a valid legal reason... The security deposit must be returned within a reasonable period (usually 30-60 days).",
  "Section 25F": "No workman employed in any industry who has been in continuous service for not less than one year under an employer shall be retrenched until: given one month's notice (or paid in lieu) and compensation...",
  "Section 25G": "Procedure for Retrenchment -- Last In First Out (LIFO). Ordinarily retrench the workman who was the last person to be employed in that category.",
  "Section 25N": "Conditions Precedent to Retrenchment of Workmen in Establishments Employing 100+ Workers -- Requires prior permission in writing of the appropriate Government.",
  "Section 2(oo) & Section 25": "Termination is illegal if done without following prescribed procedure (no notice, compensation, or permission). Labour Court can award reinstatement, back wages, or compensation.",
  "Section 165": "A police officer, who has reasonable grounds for believing that anything necessary for the purposes of an investigation may be found... may, after recording grounds in writing, search.",
  "Section 100": "Whenever a place liable to search is closed, person in charge shall allow free ingress and afford all facilities for search. Two independent local inhabitants must witness.",
  "Section 66": "Computer Related Offences. Accessing someone's phone or computer without permission is punishable with imprisonment up to 3 years or fine up to 5 lakh rupees.",
  "Section 69": "Government can issue directions for interception or monitoring in interests of sovereignty/security. Police cannot search a phone without written authorization. Right to privacy protected.",
  "Article 21": "Right to Life and Personal Liberty. Supreme Court in Puttaswamy (2017) held that Right to Privacy is a fundamental right. Phone, electronic data, and personal communications are protected.",
  "Section 406": "Punishment for Criminal Breach of Trust. Up to 3 years imprisonment or fine or both. A landlord who wrongfully retains a security deposit may be liable under this section.",
  "Section 420": "Cheating and Dishonestly Inducing Delivery of Property. Punishable with imprisonment up to 7 years and fine.",
  "Section 503": "Criminal Intimidation. Threatening another with injury to person, reputation or property to cause alarm or force actions. Punishable under Section 504/505.",
  "Section 3": "POSH Act 2013 -- Prevention of Sexual Harassment of Women at Workplace. Restricts preferential/detrimental treatment or hostile work environments.",
  "Section 4": "ICC (Internal Complaints Committee) creation for every workplace employing 10+ workers, consisting of presiding female officer, employees, and NGO members.",
  "Section 163A": "Motor Vehicles Act -- Special Provisions as to Payment of Compensation on Structured Formula Basis. No fault liability: claimant does not need to establish negligence of the owner.",
  "Section 383": "Extortion. Putting any person in fear of injury to deliver property or valuable security. Punishable with up to 3 years imprisonment.",
  "Section 12": "DV Act 2005 -- Magistrate application for protection orders, residence orders, monetary reliefs, custody, or compensation. First hearing within 3 days.",
  "Section 498A": "Husband or relative of husband subjecting woman to cruelty. Punishable with up to 3 years imprisonment and fine."
};

export default function App() {
  const [userId, setUserId] = useState<string>('');
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [backendStatus, setBackendStatus] = useState<'online' | 'offline' | 'checking'>('checking');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [expandedCitation, setExpandedCitation] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Initialize User ID and check backend status
  useEffect(() => {
    let id = localStorage.getItem('legalace_user_id');
    if (!id) {
      id = 'user_' + Math.random().toString(36).substring(2, 11);
      localStorage.setItem('legalace_user_id', id);
    }
    setUserId(id);
    checkBackendHealth(id);
  }, []);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const checkBackendHealth = async (uid: string) => {
    try {
      const res = await fetch(`${BACKEND_URL}/`);
      if (res.ok) {
        setBackendStatus('online');
        fetchHistory(uid);
      } else {
        setBackendStatus('offline');
      }
    } catch (e) {
      setBackendStatus('offline');
    }
  };

  const fetchHistory = async (uid: string) => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/v1/conversation/history/${uid}`);
      if (res.ok) {
        const data = await res.json();
        setConversations(data.conversations || []);
      }
    } catch (err) {
      console.error('Failed to fetch conversation history:', err);
    }
  };

  const selectConversation = async (conversationId: string) => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const res = await fetch(`${BACKEND_URL}/api/v1/conversation/${conversationId}`);
      if (res.ok) {
        const data = await res.json();
        setCurrentConversationId(data.conversation_id);
        
        // Map messages to include structures returned by the backend
        const formattedMessages: Message[] = data.messages.map((m: any) => {
          if (m.role === 'assistant') {
            return {
              role: 'assistant',
              content: m.content,
              timestamp: m.timestamp,
              citations: m.citations,
              rights: m.rights || [],
              action_steps: m.action_steps || [],
              disclaimer: m.disclaimer || "This information is for educational purposes only and does not constitute legal advice."
            };
          }
          return {
            role: 'user',
            content: m.content,
            timestamp: m.timestamp
          };
        });
        setMessages(formattedMessages);
        setSidebarOpen(false);
      } else {
        setErrorMessage('Failed to load conversation.');
      }
    } catch (err) {
      setErrorMessage('Error connecting to server.');
    } finally {
      setLoading(false);
    }
  };

  const startNewChat = () => {
    setCurrentConversationId(null);
    setMessages([]);
    setErrorMessage(null);
    setExpandedCitation(null);
    setSidebarOpen(false);
  };

  const deleteConversation = async (e: React.MouseEvent, conversationId: string) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this chat history?')) return;
    
    try {
      const res = await fetch(`${BACKEND_URL}/api/v1/conversation/${conversationId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setConversations(prev => prev.filter(c => c.conversation_id !== conversationId));
        if (currentConversationId === conversationId) {
          startNewChat();
        }
      }
    } catch (err) {
      alert('Failed to delete conversation.');
    }
  };

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputValue).trim();
    if (!text) return;

    if (backendStatus === 'offline') {
      setErrorMessage('Server is offline. Please make sure the FastAPI backend is running.');
      return;
    }

    setInputValue('');
    setErrorMessage(null);
    setExpandedCitation(null);
    
    // Optimistically append user message
    const userMsg: Message = {
      role: 'user',
      content: text,
      timestamp: new Date().toISOString()
    };
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);

    try {
      const res = await fetch(`${BACKEND_URL}/api/v1/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          conversation_id: currentConversationId,
          message: text
        })
      });

      if (res.ok) {
        const data = await res.json();
        
        const assistantMsg: Message = {
          role: 'assistant',
          content: data.answer,
          timestamp: new Date().toISOString(),
          citations: data.law_citations,
          rights: data.rights,
          action_steps: data.action_steps,
          intent: data.intent,
          disclaimer: data.disclaimer
        };

        setMessages(prev => [...prev, assistantMsg]);
        
        if (!currentConversationId) {
          setCurrentConversationId(data.conversation_id);
        }
        
        // Refresh history list
        fetchHistory(userId);
      } else {
        const errorData = await res.json().catch(() => ({}));
        setErrorMessage(errorData.detail || 'Failed to generate response. Check backend logs or API keys.');
      }
    } catch (err) {
      setErrorMessage('Network error: Cannot reach the backend API.');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const toggleCitation = (section: string) => {
    if (expandedCitation === section) {
      setExpandedCitation(null);
    } else {
      setExpandedCitation(section);
    }
  };

  const suggestions = [
    { text: "My employer fired me without notice.", label: "Wrongful Firing" },
    { text: "My landlord is not returning my security deposit.", label: "Deposit Dispute" },
    { text: "Can police search my phone without permission?", label: "Police Search Rights" },
    { text: "I received a defective product and the seller refuses a refund.", label: "Defective Product" }
  ];

  return (
    <div className="phone-mockup-wrapper">
      <div className="phone-container">
        {/* Sidebar Backdrop Overlay */}
        {sidebarOpen && (
          <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />
        )}

        {/* Sidebar Panel (Drawer on Mobile) */}
        <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
          <div className="sidebar-brand">
            <div className="brand-logo">🛡️</div>
            <div className="brand-meta">
              <h2>LegalAce</h2>
              <span>Indian Rights Companion</span>
            </div>
          </div>

          <button className="new-chat-btn" onClick={startNewChat}>
            <span>+ New Consultation</span>
          </button>

          <div className="sidebar-history">
            <h3>Recent Consultations</h3>
            {conversations.length === 0 ? (
              <div className="no-history">No consultation history yet.</div>
            ) : (
              <ul className="history-list">
                {conversations.map((c) => (
                  <li 
                    key={c.conversation_id}
                    className={`history-item ${currentConversationId === c.conversation_id ? 'active' : ''}`}
                    onClick={() => selectConversation(c.conversation_id)}
                  >
                    <div className="history-info">
                      <span className="history-title">{c.title}</span>
                      <span className="history-date">
                        {new Date(c.updated_at).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    </div>
                    <button 
                      className="delete-history-btn" 
                      onClick={(e) => deleteConversation(e, c.conversation_id)}
                      title="Delete history"
                    >
                      🗑️
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="sidebar-footer">
            <div className="user-badge">
              <span className="user-dot"></span>
              <span className="user-id">ID: {userId}</span>
            </div>
          </div>
        </aside>

        {/* Main Chat Workspace */}
        <main className="chat-workspace">
          <header className="chat-header">
            <button className="menu-btn" onClick={() => setSidebarOpen(true)} aria-label="Open history">
              ☰
            </button>
            <div className="header-details">
              <h1>AI Legal Companion</h1>
              <p>Indian rights, laws & citations</p>
            </div>
            <div className="header-status">
              <span className={`status-badge ${backendStatus}`} title={backendStatus}>
                <span className="status-dot"></span>
              </span>
            </div>
          </header>

        {/* Chat Feed */}
        <div className="chat-feed">
          {messages.length === 0 ? (
            <div className="welcome-container">
              <div className="welcome-logo">🛡️</div>
              <h2>How can I help you today?</h2>
              <p className="welcome-subtitle">
                Ask legal questions regarding employment, tenancy, consumer disputes, criminal search/seizure rights, family laws, and other rights in India.
              </p>

              <div className="suggestions-grid">
                {suggestions.map((s, idx) => (
                  <button 
                    key={idx} 
                    className="suggestion-card"
                    onClick={() => handleSendMessage(s.text)}
                  >
                    <span className="suggestion-label">{s.label}</span>
                    <p className="suggestion-text">"{s.text}"</p>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="message-list">
              {messages.map((m, idx) => (
                <div key={idx} className={`message-wrapper ${m.role}`}>
                  <div className="message-avatar">
                    {m.role === 'user' ? '👤' : '🛡️'}
                  </div>
                  <div className="message-bubble">
                    {m.role === 'user' ? (
                      <div className="message-content">{m.content}</div>
                    ) : (
                      <div className="assistant-response">
                        {/* Factual Answer */}
                        <div className="message-content">{m.content}</div>

                        {/* Legal Rights Cards */}
                        {m.rights && m.rights.length > 0 && (
                          <div className="rights-section">
                            <h4>🔑 Key Legal Rights</h4>
                            <div className="rights-grid">
                              {m.rights.map((r, rIdx) => (
                                <div key={rIdx} className="right-card">
                                  <span className="right-check">✓</span>
                                  <p>{r}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Action Steps Roadmap */}
                        {m.action_steps && m.action_steps.length > 0 && (
                          <div className="actions-section">
                            <h4>📋 Recommended Action Steps</h4>
                            <ol className="action-roadmap">
                              {m.action_steps.map((a, aIdx) => (
                                <li key={aIdx}>
                                  <div className="step-num">{aIdx + 1}</div>
                                  <p>{a}</p>
                                </li>
                              ))}
                            </ol>
                          </div>
                        )}

                        {/* Citations badges */}
                        {m.citations && m.citations.length > 0 && (
                          <div className="citations-section">
                            <h4>📚 Law Citations (Click to view section text)</h4>
                            <div className="citations-flex">
                              {m.citations.map((c, cIdx) => (
                                <div key={cIdx} className="citation-pill-wrapper">
                                  <button 
                                    className={`citation-pill ${expandedCitation === c.section ? 'active' : ''}`}
                                    onClick={() => toggleCitation(c.section)}
                                  >
                                    <span className="citation-act">{c.act}</span>
                                    <span className="citation-sec">{c.section}: {c.section_title}</span>
                                  </button>
                                  {expandedCitation === c.section && (
                                    <div className="citation-detail-box">
                                      <p className="detail-text">
                                        {LAW_DETAILS_MAP[c.section] || "Detailed statutory text matches loaded in corpus."}
                                      </p>
                                      <span className="relevance-score">
                                        Retrieval Match: {Math.round(c.relevance_score * 100)}%
                                      </span>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Disclaimer */}
                        {m.disclaimer && (
                          <div className="disclaimer-text">
                            ⚠️ {m.disclaimer}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {loading && (
                <div className="message-wrapper assistant loading">
                  <div className="message-avatar">🛡️</div>
                  <div className="message-bubble">
                    <div className="loading-spinner-dots">
                      <span></span>
                      <span></span>
                      <span></span>
                    </div>
                    <span className="loading-label">Retrieving Indian statutes & generating response...</span>
                  </div>
                </div>
              )}

              {errorMessage && (
                <div className="error-banner">
                  <span className="error-icon">⚠️</span>
                  <p>{errorMessage}</p>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input Bar */}
        <footer className="chat-footer">
          <form 
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }} 
            className="chat-input-form"
          >
            <textarea
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="Describe your legal situation (e.g., 'My employer hasn't paid my salary for two months')..."
              rows={2}
              disabled={loading}
            />
            <button 
              type="submit" 
              className="send-btn"
              disabled={loading || !inputValue.trim()}
            >
              Send ➔
            </button>
          </form>
          <div className="footer-note">
            LegalAce is an educational companion. It uses an AI pipeline trained on real Indian statutes.
          </div>
        </footer>
      </main>
    </div>
  </div>
  );
}
