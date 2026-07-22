import React, { useState, useEffect, useCallback } from 'react';
import './deadline_engine.css';

const BACKEND_URL = 'http://localhost:8000';

// ---- Helpers ----
const getDaysChipClass = (days: number, status: string) => {
  if (status === 'completed') return 'days-remaining-chip done';
  if (status === 'expired') return 'days-remaining-chip expired';
  if (days <= 7) return 'days-remaining-chip urgent';
  if (days <= 30) return 'days-remaining-chip soon';
  return 'days-remaining-chip ok';
};

const getDaysLabel = (days: number, status: string) => {
  if (status === 'completed') return '✓ Completed';
  if (status === 'expired') return '✗ Expired';
  if (days === 0) return '⚡ Due Today';
  if (days < 0) return `${Math.abs(days)}d overdue`;
  return `${days}d left`;
};

const getCatColorClass = (cat: string) => {
  const map: Record<string, string> = {
    rental: 'rental', employment: 'employment', consumer: 'consumer',
    banking: 'banking', insurance: 'insurance', general: 'general',
  };
  return map[cat] || 'general';
};

const getCatIcon = (cat: string) => {
  const icons: Record<string, React.ReactNode> = {
    rental: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    ),
    employment: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <rect x="2" y="7" width="20" height="14" rx="2" />
        <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
      </svg>
    ),
    consumer: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" />
        <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
      </svg>
    ),
    banking: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <line x1="12" y1="1" x2="12" y2="23" />
        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
      </svg>
    ),
    insurance: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </svg>
    ),
    general: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <circle cx="12" cy="12" r="10" /><path d="M12 8v4M12 16h.01" />
      </svg>
    ),
  };
  return icons[cat] || icons.general;
};

// ---- Skeleton Loader Component ----
const SkeletonList: React.FC = () => (
  <div className="de-skeleton-list">
    {[0,1,2].map(i => (
      <div key={i} className="de-skeleton-card" style={{ '--de-stagger': i } as React.CSSProperties}>
        <div className="de-skeleton-circle" />
        <div className="de-skeleton-body">
          <div className="de-skeleton-line w80" />
          <div className="de-skeleton-line w60" />
          <div className="de-skeleton-line w40" style={{ marginTop: 8 }} />
        </div>
      </div>
    ))}
  </div>
);

// ---- Health Score Ring Component ----
interface ScoreRingProps { score: number; grade: string; stats: { active: number; completed: number; expired: number } }

const ScoreRing: React.FC<ScoreRingProps> = ({ score, grade, stats }) => {
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  const getRingClass = () => {
    if (score >= 85) return 'score-ring-fill good';
    if (score >= 60) return 'score-ring-fill fair';
    if (score >= 30) return 'score-ring-fill risk';
    return 'score-ring-fill critical';
  };

  return (
    <div className="health-score-card">
      <div className="score-ring-wrap">
        <svg className="score-ring-svg" viewBox="0 0 90 90">
          <circle className="score-ring-track" cx="45" cy="45" r={radius} />
          <circle
            className={getRingClass()}
            cx="45" cy="45" r={radius}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
          />
        </svg>
        <div className="score-ring-number">
          {score}
          <span>/100</span>
        </div>
      </div>
      <div className="score-info">
        <div className="score-grade">{grade}</div>
        <div className="score-subtext">Legal Health Score — updated just now</div>
        <div className="score-stat-row">
          <div className="score-stat"><strong>{stats.active}</strong><span>Active</span></div>
          <div className="score-stat"><strong>{stats.completed}</strong><span>Done</span></div>
          <div className="score-stat"><strong>{stats.expired}</strong><span>Expired</span></div>
        </div>
      </div>
    </div>
  );
};

// ---- Add Deadline Bottom Sheet ----
interface AddSheetProps {
  userId: string;
  onClose: () => void;
  onAdded: () => void;
}

const AddDeadlineSheet: React.FC<AddSheetProps> = ({ userId, onClose, onAdded }) => {
  const [mode, setMode] = useState<'manual' | 'extract'>('manual');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('general');
  const [deadlineDate, setDeadlineDate] = useState('');
  const [priority, setPriority] = useState('medium');
  const [extractText, setExtractText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleManualSubmit = async () => {
    if (!title || !deadlineDate) return;
    setSubmitting(true);
    try {
      await fetch(`${BACKEND_URL}/api/v1/deadlines/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          title,
          description,
          category,
          deadline_date: new Date(deadlineDate).toISOString(),
          priority,
          source_type: 'manual',
        }),
      });
      onAdded();
    } catch (e) { console.error(e); }
    finally { setSubmitting(false); onClose(); }
  };

  const handleExtract = async () => {
    if (!extractText.trim()) return;
    setSubmitting(true);
    try {
      await fetch(`${BACKEND_URL}/api/v1/deadlines/extract`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, text: extractText, source_type: 'chat', auto_save: true }),
      });
      onAdded();
    } catch (e) { console.error(e); }
    finally { setSubmitting(false); onClose(); }
  };

  return (
    <div className="add-deadline-modal" onClick={onClose}>
      <div className="add-deadline-sheet" onClick={e => e.stopPropagation()}>
        <div className="sheet-header">
          <h3>Add Legal Deadline</h3>
          <button className="sheet-close-btn" onClick={onClose}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="16" height="16">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="extract-mode-toggle">
          <button className={`extract-toggle-btn${mode === 'manual' ? ' active' : ''}`} onClick={() => setMode('manual')}>
            ✏️ Manual Entry
          </button>
          <button className={`extract-toggle-btn${mode === 'extract' ? ' active' : ''}`} onClick={() => setMode('extract')}>
            🤖 AI Extract
          </button>
        </div>

        {mode === 'manual' ? (
          <>
            <div className="form-group">
              <label>Title</label>
              <input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Rental Agreement Renewal" />
            </div>
            <div className="form-group">
              <label>Description</label>
              <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="What action do you need to take?" />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Category</label>
                <select value={category} onChange={e => setCategory(e.target.value)}>
                  <option value="rental">Rental</option>
                  <option value="employment">Employment</option>
                  <option value="consumer">Consumer</option>
                  <option value="banking">Banking</option>
                  <option value="insurance">Insurance</option>
                  <option value="general">General</option>
                </select>
              </div>
              <div className="form-group">
                <label>Priority</label>
                <select value={priority} onChange={e => setPriority(e.target.value)}>
                  <option value="high">🔴 High</option>
                  <option value="medium">🟠 Medium</option>
                  <option value="low">🔵 Low</option>
                </select>
              </div>
            </div>
            <div className="form-group">
              <label>Deadline Date</label>
              <input type="date" value={deadlineDate} onChange={e => setDeadlineDate(e.target.value)} />
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
              <button className="form-cancel-btn" onClick={onClose} style={{ flex: 1, padding: 14, borderRadius: 14, border: '1.5px solid #e8eaf0', background: '#f4f5f9', color: '#6b7280', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                Exit
              </button>
              <button className="form-submit-btn" onClick={handleManualSubmit} disabled={submitting || !title || !deadlineDate} style={{ flex: 2, margin: 0 }}>
                {submitting ? 'Saving...' : 'Add Deadline'}
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="form-group">
              <label>Paste your text or legal situation</label>
              <textarea
                value={extractText}
                onChange={e => setExtractText(e.target.value)}
                placeholder="e.g. My employer terminated me on 1 July. I need to file for salary recovery within 30 days..."
                style={{ height: 120 }}
              />
            </div>
            <p style={{ fontSize: 12.5, color: '#6b7280', marginBottom: 12, lineHeight: 1.5 }}>
              AI will automatically identify deadlines, notice periods, and legal obligations from your text.
            </p>
            <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
              <button className="form-cancel-btn" onClick={onClose} style={{ flex: 1, padding: 14, borderRadius: 14, border: '1.5px solid #e8eaf0', background: '#f4f5f9', color: '#6b7280', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                Exit
              </button>
              <button className="form-submit-btn" onClick={handleExtract} disabled={submitting || !extractText.trim()} style={{ flex: 2, margin: 0 }}>
                {submitting ? 'Extracting...' : '🤖 Extract & Save'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

// ---- Main Dashboard Component ----
interface DeadlineDashboardProps {
  userId: string;
  onBackHome?: () => void;
}

export const DeadlineDashboard: React.FC<DeadlineDashboardProps> = ({ userId, onBackHome }) => {
  const [healthScore, setHealthScore] = useState<any>(null);
  const [upcoming, setUpcoming] = useState<any[]>([]);
  const [allDeadlines, setAllDeadlines] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddSheet, setShowAddSheet] = useState(false);
  const [activeFilter, setActiveFilter] = useState<string>('all');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [scoreRes, upcomingRes, allRes] = await Promise.all([
        fetch(`${BACKEND_URL}/api/v1/health-score/${userId}`),
        fetch(`${BACKEND_URL}/api/v1/deadlines/upcoming/${userId}?days_ahead=90`),
        fetch(`${BACKEND_URL}/api/v1/deadlines/user/${userId}`),
      ]);

      if (scoreRes.ok) setHealthScore(await scoreRes.json());
      if (upcomingRes.ok) { const d = await upcomingRes.json(); setUpcoming(d.deadlines || []); }
      if (allRes.ok) { const d = await allRes.json(); setAllDeadlines(d.deadlines || []); }
    } catch (e) {
      console.warn('Failed to fetch deadline data', e);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleComplete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    await fetch(`${BACKEND_URL}/api/v1/deadlines/${id}/complete?user_id=${userId}`, { method: 'PUT' });
    fetchData();
  };

  const handleDismiss = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    // Dismiss/Snooze extends the deadline by 7 days on the backend
    await fetch(`${BACKEND_URL}/api/v1/deadlines/${id}/dismiss?user_id=${userId}`, { method: 'PUT' });
    fetchData();
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!confirm('Delete this deadline?')) return;
    await fetch(`${BACKEND_URL}/api/v1/deadlines/${id}?user_id=${userId}`, { method: 'DELETE' });
    fetchData();
  };

  const handleExportICS = (e: React.MouseEvent, dl: any) => {
    e.stopPropagation();
    const title = dl.title || 'Legal Deadline';
    const description = dl.description || 'Legal obligation reminder set via LegalAce';
    const dt = new Date(dl.deadline_date || Date.now());
    const year = dt.getUTCFullYear();
    const month = String(dt.getUTCMonth() + 1).padStart(2, '0');
    const day = String(dt.getUTCDate()).padStart(2, '0');
    const dateStr = `${year}${month}${day}T090000Z`;

    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//LegalAce AI//EN',
      'BEGIN:VEVENT',
      `SUMMARY:⚖️ LegalAce: ${title}`,
      `DESCRIPTION:${description.replace(/\n/g, ' ')}`,
      `DTSTART:${dateStr}`,
      `DTEND:${dateStr}`,
      'STATUS:CONFIRMED',
      'END:VEVENT',
      'END:VCALENDAR'
    ].join('\r\n');

    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${title.replace(/\s+/g, '_')}_deadline.ics`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredDeadlines = allDeadlines.filter(d => {
    if (activeFilter === 'all') return true;
    if (activeFilter === 'active') return d.status === 'active';
    if (activeFilter === 'completed') return d.status === 'completed';
    if (activeFilter === 'expired') return d.status === 'expired';
    if (activeFilter === 'high') return d.priority === 'high' && d.status === 'active';
    return d.category === activeFilter;
  });

  const filters = [
    { key: 'all', label: 'All' },
    { key: 'active', label: '⏳ Active' },
    { key: 'high', label: '🔴 High Priority' },
    { key: 'completed', label: '✓ Done' },
    { key: 'expired', label: '⚠ Expired' },
  ];

  return (
    <div className={`deadline-dashboard animate-fade-in${showAddSheet ? ' modal-open' : ''}`} style={{ position: 'relative' }}>

      {/* Header */}
      <div className="deadline-header">
        <div className="deadline-header-row">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {onBackHome && (
              <button onClick={onBackHome} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', color: '#1a1a5e' }} title="Back to Home">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="20" height="20">
                  <polyline points="15 18 9 12 15 6" />
                </svg>
              </button>
            )}
            <div>
              <h1>Legal Health</h1>
              <p className="deadline-header-sub">Your personal legal guardian</p>
            </div>
          </div>
          <button className="add-deadline-btn" onClick={() => setShowAddSheet(true)} title="Add Deadline">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="18" height="18">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ marginTop: 24 }}>
           <SkeletonList />
        </div>
      ) : (
        <>
          {/* Health Score Ring */}
          {healthScore && (
            <ScoreRing
              score={healthScore.score}
              grade={healthScore.grade}
              stats={{ active: healthScore.active, completed: healthScore.completed, expired: healthScore.expired }}
            />
          )}

          {/* Strengths & Risks */}
          {healthScore && (
            <div className="health-insights">
              {healthScore.strengths.map((s: string, i: number) => (
                <div key={i} className="insight-pill strength" style={{ '--de-stagger': i } as React.CSSProperties}>
                  <span className="insight-pill-icon">✓</span>
                  {s}
                </div>
              ))}
              {healthScore.risks.map((r: string, i: number) => (
                <div key={i} className={`insight-pill ${r.includes('expired') || r.includes('immediate') ? 'critical' : 'risk'}`} style={{ '--de-stagger': healthScore.strengths.length + i } as React.CSSProperties}>
                  <span className="insight-pill-icon">⚠</span>
                  {r.replace('⚠ ', '')}
                </div>
              ))}
            </div>
          )}

          {/* Upcoming Deadlines */}
          {upcoming.length > 0 && (
            <>
              <div className="section-heading">
                <h3>Upcoming (90 days)</h3>
                <span style={{ fontSize: 12, color: '#6b7280' }}>{upcoming.length} items</span>
              </div>
              {upcoming.slice(0, 3).map((dl, idx) => (
                <div key={dl.id} className={`deadline-card ${dl.priority}`} style={{ '--de-stagger': idx } as React.CSSProperties}>
                  <div className={`deadline-card-icon ${getCatColorClass(dl.category)}`}>
                    {getCatIcon(dl.category)}
                  </div>
                  <div className="deadline-card-body">
                    <div className="deadline-card-meta">
                      <span className="deadline-cat-tag">{dl.category}</span>
                      <span className={`priority-badge ${dl.priority}`}>{dl.priority}</span>
                    </div>
                    <div className="deadline-card-title">{dl.title}</div>
                    <div className="deadline-card-footer">
                      <div className={getDaysChipClass(dl.days_remaining, dl.status)}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="11" height="11">
                          <circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" />
                        </svg>
                        {getDaysLabel(dl.days_remaining, dl.status)}
                      </div>
                      <div className="deadline-actions">
                        {dl.status === 'active' && (
                          <button className="dl-action-btn snooze" onClick={e => handleDismiss(e, dl.id)} title="Snooze 7 days">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                              <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                            </svg>
                          </button>
                        )}
                        <button className="dl-action-btn complete" onClick={e => handleComplete(e, dl.id)} title="Mark done">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        </button>
                        <button className="dl-action-btn delete" onClick={e => handleDelete(e, dl.id)} title="Delete">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </>
          )}

          {/* All Deadlines with filters */}
          <div className="section-heading" style={{ marginTop: 16 }}>
            <h3>All Deadlines</h3>
          </div>

          <div className="timeline-filters">
            {filters.map(f => (
              <button
                key={f.key}
                className={`filter-chip${activeFilter === f.key ? ' active' : ''}`}
                onClick={() => setActiveFilter(f.key)}
              >
                {f.label}
              </button>
            ))}
          </div>

          {filteredDeadlines.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <rect x="3" y="4" width="18" height="18" rx="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
              </div>
              <h3>No deadlines found</h3>
              <p>Tap + to add a deadline manually or let AI extract deadlines from your legal situation.</p>
            </div>
          ) : (
            filteredDeadlines.map((dl, idx) => (
              <div key={dl.id} className={`deadline-card ${dl.status === 'completed' || dl.status === 'expired' ? dl.status : dl.priority}`} style={{ '--de-stagger': idx } as React.CSSProperties}>
                <div className={`deadline-card-icon ${getCatColorClass(dl.category)}`}>
                  {getCatIcon(dl.category)}
                </div>
                <div className="deadline-card-body">
                  <div className="deadline-card-meta">
                    <span className="deadline-cat-tag">{dl.category}</span>
                    {dl.status === 'active' && (
                      <span className={`priority-badge ${dl.priority}`}>{dl.priority}</span>
                    )}
                  </div>
                  <div className="deadline-card-title">{dl.title}</div>
                  {dl.description && <div className="deadline-card-desc">{dl.description?.slice(0, 80)}...</div>}
                  <div className="deadline-card-footer">
                    <div className={getDaysChipClass(dl.days_remaining, dl.status)}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="11" height="11">
                        <circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" />
                      </svg>
                      {getDaysLabel(dl.days_remaining, dl.status)}
                    </div>
                    {dl.status === 'active' && (
                      <div className="deadline-actions">
                        <button className="dl-action-btn snooze" onClick={e => handleExportICS(e, dl)} title="Export to Calendar (.ics)">
                          📅
                        </button>
                        <button className="dl-action-btn snooze" onClick={e => handleDismiss(e, dl.id)} title="Snooze 7 days">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                          </svg>
                        </button>
                        <button className="dl-action-btn complete" onClick={e => handleComplete(e, dl.id)} title="Mark complete">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        </button>
                        <button className="dl-action-btn delete" onClick={e => handleDelete(e, dl.id)} title="Delete">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" />
                          </svg>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </>
      )}

      {/* Add Deadline Bottom Sheet */}
      {showAddSheet && (
        <AddDeadlineSheet
          userId={userId}
          onClose={() => setShowAddSheet(false)}
          onAdded={fetchData}
        />
      )}
    </div>
  );
};

export default DeadlineDashboard;
