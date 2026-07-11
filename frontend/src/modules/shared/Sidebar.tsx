import React from 'react';
import type { ConversationSummary } from './types';

interface SidebarProps {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  conversations: ConversationSummary[];
  currentConversationId: string | null;
  selectConversation: (id: string) => void;
  startNewChat: () => void;
  deleteConversation: (e: React.MouseEvent, id: string) => void;
  userId: string;
}

export const Sidebar: React.FC<SidebarProps> = ({
  sidebarOpen,
  setSidebarOpen,
  conversations,
  currentConversationId,
  selectConversation,
  startNewChat,
  deleteConversation,
  userId,
}) => {
  return (
    <>
      {sidebarOpen && (
        <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />
      )}

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
    </>
  );
};
export default Sidebar;
