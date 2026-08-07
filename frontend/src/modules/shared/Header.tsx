import React from 'react';

interface HeaderProps {
  activeTab: 'chat' | 'situations';
  screen: 'categories' | 'list' | 'detail';
  setSidebarOpen: (open: boolean) => void;
  backendStatus: string;
  selectedCategory: { id: string; name: string } | null;
  setScreen: (screen: 'categories' | 'list' | 'detail') => void;
  setSearchQuery: (query: string) => void;
  selectedSituation: { situation_id: string; title: string; category: string } | null;
  bookmarks: string[];
  toggleBookmark: (id: string) => void;
  getCategoryIcon: (cat: string) => string;
  filteredCount?: number;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  screen,
  setSidebarOpen,
  backendStatus,
  selectedCategory,
  setScreen,
  setSearchQuery,
  selectedSituation,
  bookmarks,
  toggleBookmark,
  getCategoryIcon,
  filteredCount = 0,
}) => {
  if (activeTab === 'chat') {
    return (
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
    );
  }

  // Situation Finder tab headers
  return (
    <header className="chat-header">
      {screen === 'categories' ? (
        <>
          <button className="menu-btn" onClick={() => setSidebarOpen(true)} aria-label="Open history">
            ☰
          </button>
          <div className="header-details">
            <h1>Situation Finder</h1>
            <p>Select a scenario to find your rights</p>
          </div>
        </>
      ) : screen === 'list' ? (
        <>
          <button className="back-nav-btn" onClick={() => { setScreen('categories'); setSearchQuery(''); }}>
            &larr;
          </button>
          <div className="header-details">
            <h1>{selectedCategory?.name || 'Search Results'}</h1>
            <p>{filteredCount} scenarios available</p>
          </div>
        </>
      ) : (
        <>
          <button className="back-nav-btn" onClick={() => setScreen('list')}>
            &larr;
          </button>
          <div className="header-details text-align-left-meta">
            <h1 className="truncated-title">{selectedSituation?.title}</h1>
            <p style={{ display: 'inline-flex', gap: '4px', alignItems: 'center' }}>
              {selectedSituation && getCategoryIcon(selectedSituation.category)}{' '}
              {selectedSituation?.category.replace('_', ' ').toUpperCase()}
            </p>
          </div>
          <button 
            className={`bookmark-btn ${selectedSituation && bookmarks.includes(selectedSituation.situation_id) ? 'active' : ''}`}
            onClick={() => selectedSituation && toggleBookmark(selectedSituation.situation_id)}
          >
            ⭐
          </button>
        </>
      )}
    </header>
  );
};
export default Header;
