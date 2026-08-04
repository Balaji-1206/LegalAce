import React, { useState, useEffect, useRef } from 'react';
import type { Message } from '../shared/types';
import './FloatingChatWidget.css';

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
  handleKeyPress?: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  suggestions: { text: string; label: string }[];
  startNewChat: () => void;
  userId: string;
  backendUrl: string;
  handleStopResponse?: () => void;
}


type AgentMode = 'general' | 'contracts' | 'disputes' | 'rights';

const AGENT_MODES: { id: AgentMode; label: string; icon: string; promptPrefix: string }[] = [
  { id: 'general', label: '🧠 Legal Assistant', icon: '🧠', promptPrefix: '' },
  { id: 'contracts', label: '📄 Contract Agent', icon: '📄', promptPrefix: '[Contract Analysis Mode]: ' },
  { id: 'disputes', label: '⚡ Dispute Specialist', icon: '⚡', promptPrefix: '[Dispute & Notice Mode]: ' },
  { id: 'rights', label: '🛡️ Rights Advisor', icon: '🛡️', promptPrefix: '[Rights Verification Mode]: ' },
];

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
          description: `Action step item from Floating AI Agent: "${stepText}"`,
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
      }
    } catch {
      setReminderState('idle');
    }
  };

  return (
    <div className={`rich-action-item${isChecked ? ' checked' : ''}`} style={{ marginTop: '4px' }}>
      <label className="action-checkbox-label" style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
        <input
          type="checkbox"
          checked={isChecked}
          onChange={e => setIsChecked(e.target.checked)}
          style={{ cursor: 'pointer' }}
        />
        <span className="action-step-text" style={{ fontSize: '0.74rem', color: isChecked ? '#94a3b8' : '#334155', textDecoration: isChecked ? 'line-through' : 'none' }}>
          {stepText}
        </span>
      </label>
      <button
        className="msg-action-btn"
        onClick={handleCreateReminder}
        disabled={reminderState !== 'idle'}
        style={{ marginTop: '2px', fontSize: '0.66rem', color: reminderState === 'created' ? '#10b981' : '#2563eb' }}
      >
        {reminderState === 'idle' && '📌 Remind Me'}
        {reminderState === 'loading' && 'Saving...'}
        {reminderState === 'created' && '✓ Saved'}
      </button>
    </div>
  );
};

const PendingActionCard: React.FC<{
  action: any;
  userId: string;
  backendUrl: string;
}> = ({ action, userId, backendUrl }) => {
  const [status, setStatus] = useState<'pending' | 'approved' | 'rejected' | 'loading'>(action.status || 'pending');
  const [feedback, setFeedback] = useState<string | null>(null);
  const [resultData, setResultData] = useState<any | null>(null);
  const [copiedDoc, setCopiedDoc] = useState<boolean>(false);
  const [showDocText, setShowDocText] = useState<boolean>(true);

  const handleDecision = async (approved: boolean) => {
    setStatus('loading');
    try {
      const res = await fetch(`${backendUrl}/api/v1/agent/confirm-action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          conversation_id: '',
          action_id: action.action_id,
          action_type: action.action_type,
          details: action.details,
          approved,
        }),
      });
      const data = await res.json();
      if (res.ok && approved) {
        setStatus('approved');
        setFeedback(data.message || 'Action approved & executed!');
        if (data.result) {
          setResultData(data.result);
        }
      } else {
        setStatus('rejected');
        setFeedback(data.message || 'Action cancelled.');
      }
    } catch {
      setStatus('pending');
      setFeedback('Failed to confirm action.');
    }
  };

  const handleCopyDoc = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedDoc(true);
    setTimeout(() => setCopiedDoc(false), 2000);
  };

  const handleDownloadDoc = (title: string, text: string) => {
    const element = document.createElement("a");
    const file = new Blob([text], { type: 'text/plain;charset=utf-8' });
    element.href = URL.createObjectURL(file);
    const filename = `${(title || 'legal_notice').toLowerCase().replace(/[^a-z0-9]/g, '_')}.txt`;
    element.download = filename;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const docText = resultData?.document_text || resultData?.doc_text || action.details?.document_text;

  return (
    <div className="pending-action-card" style={{ marginTop: '8px', padding: '10px 12px', background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '10px' }}>
      <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#1e293b' }}>
        ⚡ Confirmation Required: {action.title}
      </div>
      <div style={{ fontSize: '0.74rem', color: '#475569', marginTop: '3px' }}>
        {action.prompt_text}
      </div>

      {status === 'pending' && (
        <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
          <button
            onClick={() => handleDecision(true)}
            style={{ padding: '4px 10px', fontSize: '0.72rem', background: '#10b981', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}
          >
            ✓ Approve Action
          </button>
          <button
            onClick={() => handleDecision(false)}
            style={{ padding: '4px 10px', fontSize: '0.72rem', background: '#e2e8f0', color: '#475569', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
          >
            ✕ Cancel
          </button>
        </div>
      )}

      {status === 'loading' && <div style={{ fontSize: '0.72rem', color: '#3b82f6', marginTop: '6px' }}>Executing action...</div>}
      
      {status === 'approved' && (
        <div style={{ marginTop: '6px' }}>
          <div style={{ fontSize: '0.74rem', color: '#10b981', fontWeight: 600 }}>✅ {feedback}</div>
          
          {docText && (
            <div style={{ marginTop: '8px', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 10px', background: '#f1f5f9', borderBottom: '1px solid #e2e8f0' }}>
                <span style={{ fontSize: '0.74rem', fontWeight: 700, color: '#0f172a' }}>
                  📄 {resultData?.title || 'Generated Legal Notice Document'}
                </span>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button
                    onClick={() => handleCopyDoc(docText)}
                    style={{ padding: '3px 8px', fontSize: '0.68rem', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 600 }}
                  >
                    {copiedDoc ? '✓ Copied' : '📋 Copy'}
                  </button>
                  <button
                    onClick={() => handleDownloadDoc(resultData?.title || 'legal_notice', docText)}
                    style={{ padding: '3px 8px', fontSize: '0.68rem', background: '#10b981', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 600 }}
                  >
                    📥 Download
                  </button>
                  <button
                    onClick={() => setShowDocText(s => !s)}
                    style={{ padding: '3px 6px', fontSize: '0.68rem', background: '#e2e8f0', color: '#475569', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                  >
                    {showDocText ? '▼ Hide' : '▲ View'}
                  </button>
                </div>
              </div>

              {showDocText && (
                <div style={{ padding: '10px', maxHeight: '220px', overflowY: 'auto', background: '#fafafa' }}>
                  <pre style={{ margin: 0, fontFamily: 'Consolas, "Courier New", monospace', fontSize: '0.7rem', color: '#1e293b', whiteSpace: 'pre-wrap', wordBreak: 'break-word', lineHeight: 1.4 }}>
                    {docText}
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {status === 'rejected' && <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '6px' }}>❌ {feedback}</div>}
    </div>
  );

};

const parseInlineMarkdown = (str: string): string => {
  return str
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/`([^`]+)`/g, '<code style="background:#e2e8f0;padding:1px 4px;border-radius:4px;font-size:0.78rem">$1</code>');
};

const FormattedText: React.FC<{ text: string }> = ({ text }) => {
  if (!text) return null;
  const lines = text.split('\n');

  return (
    <div className="formatted-markdown-body">
      {lines.map((line, pIdx) => {
        const trimmed = line.trim();
        if (!trimmed) return null;

        if (trimmed.startsWith('###') || trimmed.startsWith('##')) {
          const title = trimmed.replace(/^#+\s*/, '');
          return (
            <div key={pIdx} className="msg-section-header">
              <span className="section-header-title">{title}</span>
            </div>
          );
        }

        if (trimmed.startsWith('•') || trimmed.startsWith('* ') || trimmed.startsWith('- ')) {
          const bulletContent = trimmed.replace(/^[\•\*\-]\s*/, '');
          return (
            <div key={pIdx} className="msg-bullet-item">
              <span className="bullet-dot">•</span>
              <span dangerouslySetInnerHTML={{ __html: parseInlineMarkdown(bulletContent) }} />
            </div>
          );
        }

        return (
          <p key={pIdx} className="msg-para" dangerouslySetInnerHTML={{ __html: parseInlineMarkdown(trimmed) }} />
        );
      })}
    </div>
  );
};

const ReasoningTraceAccordion: React.FC<{ trace?: string[]; objective?: string }> = ({ trace, objective }) => {
  const [expanded, setExpanded] = useState(false);
  if (!trace || trace.length === 0) return null;

  return (
    <div className="reasoning-accordion-wrap">
      <button className="reasoning-accordion-btn" onClick={() => setExpanded(!expanded)}>
        <span>🧠 Agent Execution Plan ({trace.length} steps)</span>
        <span style={{ transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>▼</span>
      </button>
      {expanded && (
        <div className="reasoning-accordion-body">
          {objective && <div className="reasoning-objective">🎯 <strong>Goal:</strong> {objective}</div>}
          {trace.map((step, idx) => (
            <div key={idx} className="reasoning-trace-item">
              <span className="trace-icon">✓</span>
              <span className="trace-text">{step}</span>
            </div>
          ))}
        </div>
      )}
    </div>
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
  handleKeyPress,
  suggestions,
  startNewChat,
  userId,
  backendUrl,
  handleStopResponse,
}) => {

  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [selectedMode, setSelectedMode] = useState<AgentMode>('general');
  const [isListening, setIsListening] = useState<boolean>(false);
  const [attachment, setAttachment] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [activeSpeechIdx, setActiveSpeechIdx] = useState<number | null>(null);
  const [showHint, setShowHint] = useState<boolean>(true);
  const [reasoningStepIndex, setReasoningStepIndex] = useState<number>(0);

  // Draggable icon state
  const [pos, setPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const dragStartRef = useRef<{ mouseX: number; mouseY: number; startX: number; startY: number }>({ mouseX: 0, mouseY: 0, startX: 0, startY: 0 });
  const hasDraggedRef = useRef<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const scrollEndRef = useRef<HTMLDivElement | null>(null);

  // ── Add-on: Runtime LLM provider selector ──
  type LLMProvider = 'auto' | 'gemini' | 'openai' | 'ollama';
  const [llmProvider, setLlmProvider] = useState<LLMProvider>('auto');
  const [showProviderMenu, setShowProviderMenu] = useState<boolean>(false);
  const PROVIDER_META: Record<LLMProvider, { label: string; icon: string; color: string }> = {
    auto:   { label: 'Auto',   icon: '🔄', color: '#6366f1' },
    gemini: { label: 'Gemini', icon: '✨', color: '#059669' },
    openai: { label: 'OpenAI', icon: '🧠', color: '#2563eb' },
    ollama: { label: 'Ollama', icon: '🦙', color: '#d97706' },
  };

  const switchLLMProvider = async (p: LLMProvider) => {
    try {
      await fetch(`${backendUrl}/api/v1/llm-settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: p }),
      });
      setLlmProvider(p);
    } catch { /* offline fallback */ setLlmProvider(p); }
    setShowProviderMenu(false);
  };

  useEffect(() => {
    fetch(`${backendUrl}/api/v1/llm-settings`)
      .then(r => r.json())
      .then(d => { if (d.provider) setLlmProvider(d.provider as LLMProvider); })
      .catch(() => {});
  }, [backendUrl]);

  const providerMenuRef = useRef<HTMLDivElement | null>(null);

  // Close provider dropdown when clicking outside
  useEffect(() => {
    if (!showProviderMenu) return;
    const handler = (e: MouseEvent) => {
      if (providerMenuRef.current && !providerMenuRef.current.contains(e.target as Node)) {
        setShowProviderMenu(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showProviderMenu]);


  // Reasoning step simulation for Agentic AI transparency
  const agenticSteps = [
    "Deconstructing legal query & context...",
    "Querying Indian Constitutional & Statutory Database...",
    "Evaluating procedural remedies & precedents...",
    "Building step-by-step resolution plan...",
  ];

  useEffect(() => {
    let timer: ReturnType<typeof setInterval>;
    if (loading) {
      setReasoningStepIndex(0);
      timer = setInterval(() => {
        setReasoningStepIndex((prev) => (prev < agenticSteps.length - 1 ? prev + 1 : prev));
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [loading]);

  useEffect(() => {
    if (isOpen) {
      scrollEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen, loading]);

  useEffect(() => {
    const timer = setTimeout(() => setShowHint(false), 8000);
    return () => clearTimeout(timer);
  }, []);

  // Draggable Pointer Event Handlers (Only moves the FAB icon)
  const handlePointerDown = (e: React.MouseEvent | React.TouchEvent) => {
    if ('button' in e && e.button !== 0) return;

    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    dragStartRef.current = {
      mouseX: clientX,
      mouseY: clientY,
      startX: pos.x,
      startY: pos.y,
    };
    hasDraggedRef.current = false;
    setIsDragging(true);
  };

  useEffect(() => {
    if (!isDragging) return;

    const handlePointerMove = (e: MouseEvent | TouchEvent) => {
      const clientX = 'touches' in e ? (e as TouchEvent).touches[0].clientX : (e as MouseEvent).clientX;
      const clientY = 'touches' in e ? (e as TouchEvent).touches[0].clientY : (e as MouseEvent).clientY;

      const deltaX = clientX - dragStartRef.current.mouseX;
      const deltaY = clientY - dragStartRef.current.mouseY;

      if (Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5) {
        hasDraggedRef.current = true;
      }

      setPos({
        x: dragStartRef.current.startX + deltaX,
        y: dragStartRef.current.startY + deltaY,
      });
    };

    const handlePointerUp = () => {
      setIsDragging(false);
    };

    window.addEventListener('mousemove', handlePointerMove);
    window.addEventListener('mouseup', handlePointerUp);
    window.addEventListener('touchmove', handlePointerMove);
    window.addEventListener('touchend', handlePointerUp);

    return () => {
      window.removeEventListener('mousemove', handlePointerMove);
      window.removeEventListener('mouseup', handlePointerUp);
      window.removeEventListener('touchmove', handlePointerMove);
      window.removeEventListener('touchend', handlePointerUp);
    };
  }, [isDragging]);

  const toggleWidget = () => {
    setIsOpen(!isOpen);
    if (!isOpen) setShowHint(false);
  };

  const handleFabClick = (e: React.MouseEvent) => {
    if (hasDraggedRef.current) {
      e.stopPropagation();
      e.preventDefault();
      return;
    }
    toggleWidget();
  };

  const [extractedContent, setExtractedContent] = useState<string | null>(null);
  const [uploadingFile, setUploadingFile] = useState<boolean>(false);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAttachment(file.name);
    setUploadingFile(true);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch(`${backendUrl}/api/v1/chat/upload-document`, {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        setExtractedContent(data.extracted_text || '');
      } else {
        alert("Failed to parse document on server.");
      }
    } catch {
      // offline / fallback
    } finally {
      setUploadingFile(false);
    }
  };

  const handleSendWithMode = () => {
    if (!inputValue.trim() && !attachment && !extractedContent) return;
    let finalPrompt = inputValue.trim();

    if (attachment && extractedContent) {
      finalPrompt = `[Attached Document: ${attachment}]\nExtracted Content:\n${extractedContent.slice(0, 2000)}\n\nUser Question: ${finalPrompt}`;
      setAttachment(null);
      setExtractedContent(null);
    } else if (attachment) {
      finalPrompt = `[Attached Document: ${attachment}]\n` + finalPrompt;
      setAttachment(null);
    }

    const currentModeObj = AGENT_MODES.find(m => m.id === selectedMode);
    if (currentModeObj && currentModeObj.promptPrefix && !finalPrompt.startsWith('[')) {
      finalPrompt = `${currentModeObj.promptPrefix}${finalPrompt}`;
    }

    handleSendMessage(finalPrompt);
  };

  const handleVoiceToggle = () => {
    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      alert("Speech recognition is not supported in this browser. Try Chrome/Edge.");
      return;
    }
    if (isListening) {
      setIsListening(false);
      return;
    }
    try {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-IN';
      recognition.onstart = () => setIsListening(true);
      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInputValue(inputValue ? `${inputValue} ${transcript}` : transcript);
        setIsListening(false);
      };
      recognition.onerror = () => setIsListening(false);
      recognition.onend = () => setIsListening(false);
      recognition.start();
    } catch {
      setIsListening(false);
    }
  };

  const handleCopyText = (text: string, idx: number) => {
    navigator.clipboard.writeText(text);
    setCopiedId(idx);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleTextToSpeech = (text: string, idx: number) => {
    if (!('speechSynthesis' in window)) {
      alert("Text-to-speech is not supported on this browser.");
      return;
    }

    if (activeSpeechIdx === idx) {
      window.speechSynthesis.cancel();
      setActiveSpeechIdx(null);
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.lang = 'en-IN';
    utterance.onend = () => setActiveSpeechIdx(null);
    utterance.onerror = () => setActiveSpeechIdx(null);

    setActiveSpeechIdx(idx);
    window.speechSynthesis.speak(utterance);
  };

  const formatTime = (ts?: string) => {
    if (!ts) return '';
    try {
      return new Date(ts).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
    } catch { return ''; }
  };

  return (
    <>
      {/* Movable Floating Trigger FAB Container (ONLY this moves when dragged) */}
      <div
        className="floating-ai-fab-container"
        style={{ transform: `translate3d(${pos.x}px, ${pos.y}px, 0)` }}
      >
        {/* Tooltip Hint */}
        {!isOpen && showHint && (
          <div className="floating-ai-hint" onClick={toggleWidget}>
            <span className="sparkle-icon">✨</span>
            <span>LegalAce Agentic AI — Ask Anything!</span>
          </div>
        )}

        {/* Movable FAB Button */}
        <button
          className={`floating-ai-fab ${isOpen ? 'open' : ''} ${isDragging ? 'dragging' : ''}`}
          onMouseDown={handlePointerDown}
          onTouchStart={handlePointerDown}
          onClick={handleFabClick}
          title={isOpen ? "Close LegalAce AI Agent" : "Drag to move position or click to open"}
          aria-label="Toggle LegalAce AI Floating Assistant"
        >
          <div className="floating-ai-fab-pulse" />
          <div className="floating-ai-fab-icon">
            {isOpen ? (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="24" height="24">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="26" height="26">
                <path d="M12 2a2 2 0 0 1 2 2v2a2 2 0 0 1-4 0V4a2 2 0 0 1 2-2zM4 11a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-7z" />
                <circle cx="9" cy="14" r="1.5" fill="currentColor" />
                <circle cx="15" cy="14" r="1.5" fill="currentColor" />
                <path d="M10 18h4" strokeLinecap="round" />
              </svg>
            )}
          </div>
          {!isOpen && <span className="floating-ai-badge" />}
        </button>
      </div>

      {/* Centered Agentic Chat Modal Window (Always stays centered!) */}
      {isOpen && (
        <div
          className="floating-chat-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsOpen(false);
          }}
        >
          <div className={`floating-chat-panel ${isFullscreen ? 'fullscreen' : ''}`}>
            {/* Header */}
            <div className="panel-header">
              <div className="panel-header-top">
                <div className="panel-title-group">
                  <div className="agent-avatar-icon">🤖</div>
                  <div className="agent-title-text">
                    <span className="agent-name">
                      LegalAce Agentic AI <span className="sparkle-icon">✨</span>
                    </span>
                    <span className="agent-status-badge">
                      <span className="status-dot-green" /> Agent Active & Reasoning
                    </span>
                  </div>
                </div>

                <div className="panel-header-actions">
                  {/* LLM Provider Selector ─ Add-on */}
                  <div ref={providerMenuRef} style={{ position: 'relative' }}>

                    <button
                      className="icon-btn-ghost"
                      onClick={() => setShowProviderMenu(p => !p)}
                      title={`Active AI: ${PROVIDER_META[llmProvider].label} — Click to switch`}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '4px',
                        fontSize: '0.7rem', fontWeight: 700, padding: '4px 8px',
                        border: `1px solid ${PROVIDER_META[llmProvider].color}22`,
                        background: `${PROVIDER_META[llmProvider].color}11`,
                        color: PROVIDER_META[llmProvider].color,
                        borderRadius: '8px', minWidth: 0,
                      }}
                    >
                      <span style={{ fontSize: '0.85rem' }}>{PROVIDER_META[llmProvider].icon}</span>
                      <span style={{ display: 'inline' }}>{PROVIDER_META[llmProvider].label}</span>
                      <span style={{ fontSize: '0.6rem', opacity: 0.7 }}>▾</span>
                    </button>
                    {showProviderMenu && (
                      <div style={{
                        position: 'absolute', top: 'calc(100% + 6px)', right: 0,
                        background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px',
                        boxShadow: '0 8px 24px rgba(0,0,0,0.12)', zIndex: 999,
                        minWidth: '190px', overflow: 'hidden',
                      }}>
                        <div style={{ padding: '8px 12px 4px', fontSize: '0.65rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                          AI Engine
                        </div>
                        {(Object.keys(PROVIDER_META) as LLMProvider[]).map(p => (
                          <button
                            key={p}
                            onClick={() => switchLLMProvider(p)}
                            style={{
                              width: '100%', display: 'flex', alignItems: 'center', gap: '8px',
                              padding: '8px 14px', border: 'none', background: llmProvider === p ? `${PROVIDER_META[p].color}12` : 'transparent',
                              cursor: 'pointer', textAlign: 'left', fontSize: '0.78rem',
                              fontWeight: llmProvider === p ? 700 : 400,
                              color: llmProvider === p ? PROVIDER_META[p].color : '#334155',
                              borderLeft: llmProvider === p ? `3px solid ${PROVIDER_META[p].color}` : '3px solid transparent',
                              transition: 'background 0.15s',
                            }}
                          >
                            <span style={{ fontSize: '1rem' }}>{PROVIDER_META[p].icon}</span>
                            <div>
                              <div style={{ fontWeight: 600 }}>{PROVIDER_META[p].label}</div>
                              {p === 'auto' && <div style={{ fontSize: '0.62rem', color: '#94a3b8' }}>Gemini → OpenAI → Ollama</div>}
                              {p === 'gemini' && <div style={{ fontSize: '0.62rem', color: '#94a3b8' }}>Cloud — best quality</div>}
                              {p === 'openai' && <div style={{ fontSize: '0.62rem', color: '#94a3b8' }}>Cloud — strong reasoning</div>}
                              {p === 'ollama' && <div style={{ fontSize: '0.62rem', color: '#94a3b8' }}>Local GPU — private</div>}
                            </div>
                            {llmProvider === p && <span style={{ marginLeft: 'auto', fontSize: '0.8rem' }}>✓</span>}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <button
                    className="icon-btn-ghost"
                    onClick={startNewChat}
                    title="New Conversation"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                      <path d="M12 5v14M5 12h14" />
                    </svg>
                  </button>
                  <button
                    className="icon-btn-ghost"
                    onClick={() => setIsFullscreen(!isFullscreen)}
                    title={isFullscreen ? "Restore size" : "Expand to fullscreen"}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                      {isFullscreen ? (
                        <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3" />
                      ) : (
                        <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
                      )}
                    </svg>
                  </button>
                  <button className="icon-btn-ghost" onClick={() => setIsOpen(false)} title="Close Widget">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Agent Persona Switcher Bar */}
              <div className="agent-mode-bar">
                {AGENT_MODES.map((mode) => (
                  <button
                    key={mode.id}
                    className={`agent-mode-chip ${selectedMode === mode.id ? 'active' : ''}`}
                    onClick={() => setSelectedMode(mode.id)}
                  >
                    {mode.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Quick Prompts Ribbon */}
            <div className="quick-prompts-ribbon">
              {suggestions.map((s, idx) => (
                <button
                  key={idx}
                  className="quick-prompt-pill"
                  onClick={() => {
                    setInputValue(s.text);
                  }}
                >
                  <span>⚡</span> {s.label}
                </button>
              ))}
            </div>

            {/* Messages Area */}
            <div className="floating-messages-container">
              {messages.length === 0 ? (
                <div className="floating-empty-state">
                  <div className="empty-state-icon">🤖</div>
                  <div className="empty-state-title">Hello! How can I assist you?</div>
                  <div className="empty-state-desc">
                    Ask any legal question, request document drafting, or verify your constitutional and statutory rights.
                  </div>
                </div>
              ) : (
                messages.map((msg, idx) => (
                  <div key={idx} className={`chat-msg-row ${msg.role}`}>
                    <div className={`msg-avatar ${msg.role}`}>
                      {msg.role === 'user' ? '👤' : '🤖'}
                    </div>

                    <div className="msg-content-box">
                      <div className={`msg-bubble ${msg.role}`}>
                        {msg.role === 'assistant' && (
                          <ReasoningTraceAccordion trace={msg.reasoning_trace} objective={msg.plan_objective} />
                        )}

                        {msg.role === 'assistant' ? (
                          <FormattedText text={msg.content} />
                        ) : (
                          msg.content
                        )}

                        {/* Citations Accordion */}
                        {msg.citations && msg.citations.length > 0 && (
                          <div className="msg-citations-wrap">
                            {msg.citations.map((c, cIdx) => (
                              <div key={cIdx}>
                                <span
                                  className="citation-chip"
                                  onClick={() => toggleCitation(c.section)}
                                >
                                  📜 {c.act} — {c.section}
                                </span>
                                {expandedCitation === c.section && (
                                  <div className="citation-details-popup">
                                    <strong>{c.section_title}:</strong>{' '}
                                    {LAW_DETAILS_MAP[c.section] || "Relevant statutory provision under Indian laws."}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Action Steps */}
                        {msg.action_steps && msg.action_steps.length > 0 && (
                          <div style={{ marginTop: '8px', borderTop: '1px solid #e2e8f0', paddingTop: '6px' }}>
                            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#1a1a5e' }}>Recommended Action Steps:</span>
                            {msg.action_steps.map((step, stepIdx) => (
                              <ActionStepItem key={stepIdx} userId={userId} stepText={step} backendUrl={backendUrl} />
                            ))}
                          </div>
                        )}

                        {/* Pending Confirmation Actions (USER CHOICE: Ask for confirmation) */}
                        {msg.pending_actions && msg.pending_actions.length > 0 && (
                          <div style={{ marginTop: '8px' }}>
                            {msg.pending_actions.map((act, actIdx) => (
                              <PendingActionCard key={actIdx} action={act} userId={userId} backendUrl={backendUrl} />
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Footer Actions (Copy, TTS, Timestamp) */}
                      <div className="msg-footer-bar">
                        <span className="msg-time">{formatTime(msg.timestamp)}</span>
                        {msg.role === 'assistant' && (
                          <div className="msg-actions">
                            <button
                              className={`msg-action-btn ${copiedId === idx ? 'active' : ''}`}
                              onClick={() => handleCopyText(msg.content, idx)}
                              title="Copy Answer"
                            >
                              {copiedId === idx ? '✓ Copied' : '📋 Copy'}
                            </button>
                            <button
                              className={`msg-action-btn ${activeSpeechIdx === idx ? 'active' : ''}`}
                              onClick={() => handleTextToSpeech(msg.content, idx)}
                              title="Listen to response"
                            >
                              {activeSpeechIdx === idx ? '🔊 Reading...' : '🔊 Listen'}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}

              {/* Agentic Reasoning / Tool Execution Steps */}
              {loading && (
                <div className="agentic-thinking-box">
                  <div className="thinking-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div className="thinking-spinner" />
                      <span>Agent Reasoning Engine Active</span>
                    </div>
                    {handleStopResponse && (
                      <button
                        onClick={handleStopResponse}
                        style={{
                          padding: '3px 8px',
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          background: '#ef4444',
                          color: '#ffffff',
                          border: 'none',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        ⏹️ Stop
                      </button>
                    )}
                  </div>
                  {agenticSteps.slice(0, reasoningStepIndex + 1).map((step, sIdx) => (
                    <div key={sIdx} className="thinking-step">
                      {sIdx < reasoningStepIndex ? (
                        <span className="step-check">✓</span>
                      ) : (
                        <span>⚙️</span>
                      )}
                      <span>{step}</span>
                    </div>
                  ))}
                </div>
              )}


              {errorMessage && (
                <div className="citation-details-popup" style={{ background: '#fef2f2', borderColor: '#fca5a5', color: '#991b1b' }}>
                  ⚠️ {errorMessage}
                </div>
              )}

              <div ref={scrollEndRef} />
            </div>

            {/* Bottom Input Area */}
            <div className="floating-input-bar">
              {attachment && (
                <div className="attachment-preview">
                  <span>📄 {attachment} {uploadingFile ? '(Parsing text...)' : extractedContent ? '✓ Parsed' : ''}</span>
                  <button className="remove-attach-btn" onClick={() => { setAttachment(null); setExtractedContent(null); }}>✕</button>
                </div>
              )}


              <div className="input-controls-row">
                {/* File Attachment Upload Button */}
                <input
                  type="file"
                  ref={fileInputRef}
                  style={{ display: 'none' }}
                  onChange={handleFileSelect}
                  accept=".pdf,.doc,.docx,.txt"
                />
                <button
                  className="tool-icon-btn"
                  onClick={() => fileInputRef.current?.click()}
                  title="Attach Document/Contract for AI analysis"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                    <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
                  </svg>
                </button>

                {/* Voice Speech Recognition Button */}
                <button
                  className={`tool-icon-btn ${isListening ? 'listening' : ''}`}
                  onClick={handleVoiceToggle}
                  title={isListening ? "Listening... Click to stop" : "Voice Input (Speech-to-Text)"}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                    <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                    <line x1="12" y1="19" x2="12" y2="23" />
                    <line x1="8" y1="23" x2="16" y2="23" />
                  </svg>
                </button>

                {/* Text Input */}
                <textarea
                  className="chat-input-textarea"
                  rows={1}
                  placeholder="Ask legal advice, draft notices..."
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendWithMode();
                    } else if (handleKeyPress) {
                      handleKeyPress(e);
                    }
                  }}
                />

                {/* Send / Stop Button */}
                {loading && handleStopResponse ? (
                  <button
                    className="stop-msg-btn"
                    onClick={handleStopResponse}
                    title="Stop generating response"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '6px 12px',
                      fontSize: '0.74rem',
                      fontWeight: 700,
                      background: '#ef4444',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      boxShadow: '0 2px 6px rgba(239, 68, 68, 0.3)',
                    }}
                  >
                    <span>⏹️</span> Stop
                  </button>
                ) : (
                  <button
                    className="send-msg-btn"
                    onClick={handleSendWithMode}
                    disabled={loading || (!inputValue.trim() && !attachment)}
                    title="Send to LegalAce Agent"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                      <line x1="22" y1="2" x2="11" y2="13" />
                      <polygon points="22 2 15 22 11 13 2 9 22 2" />
                    </svg>
                  </button>
                )}

              </div>

              <div className="floating-disclaimer">
                LegalAce AI provides legal information. For binding litigation, consult a advocate.
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
