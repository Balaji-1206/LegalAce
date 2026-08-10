import React, { useState, useEffect, useRef } from 'react';
import type { Message, PendingActionItem } from '../shared/types';
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
          title: stepText.replace(/^\d+[.\s-]*/, '').slice(0, 80),
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
    <div className="action-step-timeline-item">
      <div className="action-step-line" />
      <button
        className={`action-step-num${isChecked ? ' checked' : ''}`}
        onClick={() => setIsChecked(c => !c)}
        title={isChecked ? 'Mark incomplete' : 'Mark complete'}
        style={{ cursor: 'pointer', border: 'none' }}
      >
        {isChecked ? (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" width="10" height="10"><polyline points="20 6 9 17 4 12" /></svg>
        ) : stepText.match(/^\d+/) ? stepText.match(/^(\d+)/)?.[1] : '→'}
      </button>
      <div className="action-step-body">
        <span className={`action-step-text-label${isChecked ? ' checked' : ''}`}>
          {stepText.replace(/^\d+[.\s-]*/, '')}
        </span>
        <button
          className="action-step-remind-btn"
          onClick={handleCreateReminder}
          disabled={reminderState !== 'idle'}
        >
          {reminderState === 'idle' && <><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="10" height="10"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg> Add reminder</>}
          {reminderState === 'loading' && 'Saving...'}
          {reminderState === 'created' && <>✓ Reminder saved</>}
        </button>
      </div>
    </div>
  );
};

const PendingActionCard: React.FC<{
  action: PendingActionItem;
  userId: string;
  backendUrl: string;
}> = ({ action, userId, backendUrl }) => {
  const [status, setStatus] = useState<'pending' | 'approved' | 'rejected' | 'loading'>(action.status || 'pending');
  const [feedback, setFeedback] = useState<string | null>(null);
  const [resultData, setResultData] = useState<Record<string, unknown> | null>(null);
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

  const docText = String(resultData?.document_text || resultData?.doc_text || action.details?.document_text || '');

  return (
    <div className="pending-action-card">
      {/* Header */}
      <div className="pending-action-header">
        <div className="pending-action-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
            <path d="M9 12l2 2 4-4m6 2a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" />
          </svg>
        </div>
        <div>
          <div className="pending-action-title">{action.title}</div>
          <div className="pending-action-subtitle">Ready to proceed</div>
        </div>
      </div>

      {/* Body */}
      <div className="pending-action-body">
        <p className="pending-action-desc">{action.prompt_text}</p>

        {status === 'pending' && (
          <div className="pending-action-btns">
            <button className="pending-approve-btn" onClick={() => handleDecision(true)}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="13" height="13"><polyline points="20 6 9 17 4 12" /></svg>
              Approve & Generate
            </button>
            <button className="pending-cancel-btn" onClick={() => handleDecision(false)}>Cancel</button>
          </div>
        )}

        {status === 'loading' && (
          <div className="pending-action-status loading">Executing action...</div>
        )}

        {status === 'approved' && (
          <div>
            <div className="pending-action-status approved">✓ {feedback}</div>
            {docText && (
              <div className="doc-result-panel">
                <div className="doc-result-header">
                  <span className="doc-result-title">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="13" height="13"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                    {(resultData?.title as string) || 'Generated Legal Document'}
                  </span>
                  <div className="doc-result-actions">
                    <button className="doc-action-btn copy" onClick={() => handleCopyDoc(docText)}>
                      {copiedDoc ? '✓ Copied' : 'Copy'}
                    </button>
                    <button className="doc-action-btn download" onClick={() => handleDownloadDoc((resultData?.title as string) || 'legal_notice', docText)}>
                      Download
                    </button>
                    <button className="doc-action-btn toggle" onClick={() => setShowDocText(s => !s)}>
                      {showDocText ? 'Hide' : 'View'}
                    </button>
                  </div>
                </div>
                {showDocText && (
                  <div className="doc-result-body">
                    <pre>{docText}</pre>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {status === 'rejected' && (
          <div className="pending-action-status rejected">Action cancelled.</div>
        )}
      </div>
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
          const bulletContent = trimmed.replace(/^[-•*]\s*/, '');
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


  // Safe execution state labels (no internal chain-of-thought exposed)
  const agenticSteps = [
    "Analyzing your request",
    "Searching Indian statutes & provisions",
    "Reviewing applicable law",
    "Preparing your response",
  ];

  useEffect(() => {
    if (!loading) return;
    const timer = setInterval(() => {
      setReasoningStepIndex((prev) => (prev < agenticSteps.length - 1 ? prev + 1 : prev));
    }, 1000);
    return () => {
      clearInterval(timer);
      setReasoningStepIndex(0);
    };
  }, [loading, agenticSteps.length]);

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
      const win = window as unknown as Record<string, new () => {
        continuous: boolean;
        interimResults: boolean;
        lang: string;
        onstart: () => void;
        onresult: (e: { results: { transcript: string }[][] }) => void;
        onerror: () => void;
        onend: () => void;
        start: () => void;
      }>;
      const SpeechRec = win.SpeechRecognition || win.webkitSpeechRecognition;
      const recognition = new SpeechRec();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-IN';
      recognition.onstart = () => setIsListening(true);
      recognition.onresult = (event: { results: { transcript: string }[][] }) => {
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
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="13" height="13" style={{ opacity: 0.7 }}>
              <circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>
            </svg>
            <span>{loading ? 'LegalAce is working...' : 'Ask LegalAce'}</span>
          </div>
        )}

        {/* FAB Button */}
        <button
          className={`floating-ai-fab ${isOpen ? 'open' : ''} ${isDragging ? 'dragging' : ''}`}
          onMouseDown={handlePointerDown}
          onTouchStart={handlePointerDown}
          onClick={handleFabClick}
          title={isOpen ? 'Close LegalAce AI' : 'Open LegalAce AI Legal Assistant'}
          aria-label="Toggle LegalAce AI Floating Assistant"
        >
          <div className="floating-ai-fab-pulse" />
          <div className="floating-ai-fab-icon">
            {isOpen ? (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="22" height="22">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="26" height="26">
                <path d="M12 3L4 7v5c0 5.25 3.5 10.15 8 11.35C17.5 22.15 21 17.25 21 12V7l-8-4z" />
                <path d="M8 12.5l2.5 2.5L16 9" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </div>
          {!isOpen && <span className="floating-ai-badge" />}
        </button>
      </div>

      {/* Centered Agentic Chat Modal Window */}
      {isOpen && (
        <div
          className={`floating-chat-overlay${isFullscreen ? ' fullscreen-mode' : ''}`}
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsOpen(false);
          }}
        >
          <div className={`floating-chat-panel ${isFullscreen ? 'fullscreen' : ''}`}>
            {/* Clean Header */}
            <div className="panel-header">
              <div className="panel-header-top">
                <div className="panel-title-group">
                  <div className="agent-avatar-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="20" height="20">
                      <path d="M12 3L4 7v5c0 5.25 3.5 10.15 8 11.35C17.5 22.15 21 17.25 21 12V7l-8-4z" />
                      <path d="M8 12.5l2.5 2.5L16 9" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                  <div className="agent-title-text">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span className="agent-name">LegalAce AI</span>
                      <span className="agent-status-badge">
                        {loading
                          ? <><span className="status-dot-amber" /> Working...</>
                          : <><span className="status-dot-green" /> Ready to help</>
                        }
                      </span>
                    </div>
                    <span className="agent-tagline">Your legal companion</span>
                  </div>
                </div>

                <div className="panel-header-actions">
                  <button
                    className="icon-btn-ghost"
                    onClick={startNewChat}
                    title="New Conversation"
                    aria-label="Start new conversation"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                      <path d="M12 5v14M5 12h14" />
                    </svg>
                  </button>
                  <button
                    className="icon-btn-ghost"
                    onClick={() => setIsFullscreen(!isFullscreen)}
                    title={isFullscreen ? "Restore size" : "Expand to full screen"}
                    aria-label={isFullscreen ? "Restore size" : "Expand to full screen"}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                      {isFullscreen ? (
                        <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3" />
                      ) : (
                        <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
                      )}
                    </svg>
                  </button>
                  <button
                    className="icon-btn-ghost"
                    onClick={() => setIsOpen(false)}
                    title="Close"
                    aria-label="Close Assistant"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>

            {/* Quick Prompts Ribbon — only show when no conversation started */}
            {messages.length === 0 && (
              <div className="quick-prompts-ribbon">
                {suggestions.map((s, idx) => (
                  <button
                    key={idx}
                    className="quick-prompt-pill"
                    onClick={() => setInputValue(s.text)}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            )}

            {/* Messages Area */}
            <div className="floating-messages-container">
              {messages.length === 0 ? (
                <div className="floating-empty-state">
                  {/* Greeting */}
                  <div className="welcome-greeting-block">
                    <div className="welcome-avatar">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="26" height="26">
                        <path d="M12 3L4 7v5c0 5.25 3.5 10.15 8 11.35C17.5 22.15 21 17.25 21 12V7l-8-4z" />
                        <path d="M8 12.5l2.5 2.5L16 9" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>
                    <div className="welcome-title">How can I help you today?</div>
                    <div className="welcome-subtitle">
                      Ask about your rights, understand a legal situation, or get help taking the next step.
                    </div>
                  </div>

                  {/* Capability Cards */}
                  <div className="welcome-capability-grid">
                    {[
                      { icon: '⚖️', bg: '#eff6ff', color: '#2563eb', title: 'Understand My Rights', desc: 'Know what the law says', prompt: 'What are my rights as a ' },
                      { icon: '📄', bg: '#f0fdf4', color: '#059669', title: 'Analyze a Document', desc: 'Upload & review contracts', prompt: 'Please analyze this document: ' },
                      { icon: '🧭', bg: '#fdf4ff', color: '#7c3aed', title: 'What Should I Do?', desc: 'Get a step-by-step plan', prompt: 'I need help with a legal situation: ' },
                      { icon: '⏰', bg: '#fff7ed', color: '#c2410c', title: 'Check a Deadline', desc: 'Filing & limitation dates', prompt: 'What is the deadline for filing a complaint about ' },
                      { icon: '✍️', bg: '#fef9c3', color: '#92400e', title: 'Draft Legal Notice', desc: 'Generate formal notices', prompt: 'Draft a legal notice for ' },
                      { icon: '🏛️', bg: '#f0f9ff', color: '#0369a1', title: 'Free Legal Aid', desc: 'Check eligibility & offices', prompt: 'How can I access free legal aid in India?' },
                    ].map((cap, i) => (
                      <div
                        key={i}
                        className="welcome-capability-card"
                        onClick={() => setInputValue(cap.prompt)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={e => e.key === 'Enter' && setInputValue(cap.prompt)}
                      >
                        <div className="capability-icon" style={{ background: cap.bg, color: cap.color }}>{cap.icon}</div>
                        <div className="capability-title">{cap.title}</div>
                        <div className="capability-desc">{cap.desc}</div>
                      </div>
                    ))}
                  </div>

                  {/* Suggested prompts */}
                  <div className="welcome-prompts-section">
                    <div className="welcome-prompts-label">Try asking</div>
                    {[
                      'My landlord hasn\'t returned my security deposit.',
                      'My employer hasn\'t paid my salary for 2 months.',
                      'I received a legal notice. What should I do?',
                      'Can I file a consumer complaint against a seller?',
                    ].map((prompt, i) => (
                      <div
                        key={i}
                        className="welcome-prompt-item"
                        onClick={() => setInputValue(prompt)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={e => e.key === 'Enter' && setInputValue(prompt)}
                      >
                        <span>{prompt}</span>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                          <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
                        </svg>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                messages.map((msg, idx) => (
                  <div key={idx} className={`chat-msg-row ${msg.role}`}>
                    <div className={`msg-avatar ${msg.role}`}>
                      {msg.role === 'user' ? (
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                      ) : (
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="14" height="14"><path d="M12 3L4 7v5c0 5.25 3.5 10.15 8 11.35C17.5 22.15 21 17.25 21 12V7l-8-4z"/><path d="M8 12.5l2.5 2.5L16 9" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      )}
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

                        {/* Citations — premium cards */}
                        {msg.citations && msg.citations.length > 0 && (
                          <div className="msg-citations-wrap">
                            {msg.citations.map((c, cIdx) => (
                              <div key={cIdx} className="citation-card" onClick={() => toggleCitation(c.section)}>
                                <div className="citation-card-header">
                                  <div className="citation-icon-badge">⚖</div>
                                  <div className="citation-card-meta">
                                    <div className="citation-act-name">{c.act}</div>
                                    <div className="citation-section-label">{c.section}{c.section_title ? ` · ${c.section_title}` : ''}</div>
                                  </div>
                                  <svg className={`citation-expand-arrow${expandedCitation === c.section ? ' expanded' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><polyline points="6 9 12 15 18 9"/></svg>
                                </div>
                                {expandedCitation === c.section && (
                                  <div className="citation-details-popup">
                                    {LAW_DETAILS_MAP[c.section] || 'Relevant statutory provision under Indian laws.'}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Action Steps — Timeline */}
                        {msg.action_steps && msg.action_steps.length > 0 && (
                          <div>
                            <div className="action-plan-header">
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="12" height="12"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
                              Your Action Plan
                            </div>
                            <div className="action-plan-timeline">
                              {msg.action_steps.map((step, stepIdx) => (
                                <ActionStepItem key={stepIdx} userId={userId} stepText={step} backendUrl={backendUrl} />
                              ))}
                            </div>
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

              {/* Agent Execution Progress */}
              {loading && (
                <div className="agentic-thinking-box">
                  <div className="thinking-header">
                    <div className="thinking-header-left">
                      <div className="thinking-logo-badge">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="12" height="12">
                          <path d="M12 3L4 7v5c0 5.25 3.5 10.15 8 11.35C17.5 22.15 21 17.25 21 12V7l-8-4z"/>
                        </svg>
                      </div>
                      <span className="thinking-label">
                        LegalAce is working
                        <span className="thinking-dots">
                          <span className="thinking-dot" />
                          <span className="thinking-dot" />
                          <span className="thinking-dot" />
                        </span>
                      </span>
                    </div>
                    {handleStopResponse && (
                      <button className="stop-response-btn" onClick={handleStopResponse}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="10" height="10">
                          <rect x="3" y="3" width="18" height="18" rx="2"/>
                        </svg>
                        Stop
                      </button>
                    )}
                  </div>
                  <div className="execution-steps-list">
                    {agenticSteps.map((step, sIdx) => {
                      const isDone = sIdx < reasoningStepIndex;
                      const isActive = sIdx === reasoningStepIndex;
                      return (
                        <div key={sIdx} className={`thinking-step ${isDone ? 'done' : isActive ? 'active' : 'idle'}`}>
                          {isDone ? (
                            <span className="step-check">
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" width="8" height="8"><polyline points="20 6 9 17 4 12"/></svg>
                            </span>
                          ) : isActive ? (
                            <span className="step-active-dot"><span className="step-active-inner" /></span>
                          ) : (
                            <span className="step-idle-dot" />
                          )}
                          <span>{step}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}


              {/* Error State */}
              {errorMessage && (
                <div className="error-state-card">
                  <div className="error-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                      <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                    </svg>
                  </div>
                  <div className="error-content">
                    <div className="error-title">LegalAce couldn't complete that request.</div>
                    <div className="error-desc">Please try again. If the issue persists, start a new conversation.</div>
                  </div>
                </div>
              )}

              <div ref={scrollEndRef} />
            </div>

            {/* Bottom Composer */}
            <div className="composer-wrapper">
              {attachment && (
                <div className="attachment-preview">
                  <span>📄 {attachment} {uploadingFile ? '(Parsing text...)' : extractedContent ? '✓ Parsed' : ''}</span>
                  <button className="remove-attach-btn" onClick={() => { setAttachment(null); setExtractedContent(null); }}>✕</button>
                </div>
              )}

              <div className="composer-container">
                {/* Textarea — full width */}
                <textarea
                  className="composer-textarea"
                  rows={1}
                  placeholder="Ask LegalAce..."
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
                  aria-label="Type your legal question"
                />

                {/* Bottom Row: tools left, send right */}
                <div className="composer-bottom-row">
                  <div className="composer-tools">
                    {/* Hidden file input */}
                    <input
                      type="file"
                      ref={fileInputRef}
                      style={{ display: 'none' }}
                      onChange={handleFileSelect}
                      accept=".pdf,.doc,.docx,.txt"
                    />
                    <button
                      className="composer-tool-btn"
                      onClick={() => fileInputRef.current?.click()}
                      title="Attach document"
                      aria-label="Attach document for AI analysis"
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                        <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
                      </svg>
                    </button>

                    <button
                      className={`composer-tool-btn ${isListening ? 'listening' : ''}`}
                      onClick={handleVoiceToggle}
                      title={isListening ? "Listening... Click to stop" : "Voice input"}
                      aria-label={isListening ? "Stop voice recording" : "Start voice input"}
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                        <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                        <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                        <line x1="12" y1="19" x2="12" y2="23" />
                        <line x1="8" y1="23" x2="16" y2="23" />
                      </svg>
                    </button>
                  </div>

                  {/* Send / Stop Button */}
                  {loading && handleStopResponse ? (
                    <button
                      className="composer-stop-btn"
                      onClick={handleStopResponse}
                      title="Stop generating"
                      aria-label="Stop generating response"
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="14" height="14">
                        <rect x="4" y="4" width="16" height="16" rx="2"/>
                      </svg>
                    </button>
                  ) : (
                    <button
                      className="composer-send-btn"
                      onClick={handleSendWithMode}
                      disabled={loading || (!inputValue.trim() && !attachment)}
                      title="Send to LegalAce AI"
                      aria-label="Send message"
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                        <line x1="22" y1="2" x2="11" y2="13" />
                        <polygon points="22 2 15 22 11 13 2 9 22 2" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>

              <div className="composer-disclaimer">
                LegalAce provides general legal information, not legal advice. For litigation, consult a qualified advocate.
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
