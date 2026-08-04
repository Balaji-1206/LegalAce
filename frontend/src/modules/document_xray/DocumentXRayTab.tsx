import React, { useState, useRef, useCallback } from 'react';
import './document_xray.css';

const BACKEND_URL = 'http://localhost:8000';

interface ExtractedDate {
  label: string;
  date: string;
  iso_date?: string | null;
}

interface XRayResult {
  document_type: string;
  parties: string[];
  key_dates: ExtractedDate[];
  obligations: string[];
  red_flags: string[];
  suggested_limitation_rule_id?: string | null;
  suggested_wizard_scenario_id?: string | null;
  summary: string;
  confidence: number;
}

interface DocumentXRayTabProps {
  userId: string;
  onBackHome: () => void;
  onNavigateDeadlines: () => void;
  onNavigateWizard: () => void;
}

export const DocumentXRayTab: React.FC<DocumentXRayTabProps> = ({
  userId,
  onBackHome,
  onNavigateDeadlines,
  onNavigateWizard,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<XRayResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [deadlinesPushed, setDeadlinesPushed] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
    setResult(null);
    setError(null);
    setDeadlinesPushed(false);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(true);
  }, []);

  const handleDragLeave = useCallback(() => setDragActive(false), []);

  const handleAnalyze = async () => {
    if (!selectedFile) return;
    setAnalyzing(true);
    setError(null);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('user_id', userId);

      const res = await fetch(`${BACKEND_URL}/api/v1/document-xray/analyze`, {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || `Analysis failed (${res.status})`);
      }

      const data = await res.json();
      setResult(data.result as XRayResult);
    } catch (err: any) {
      setError(err.message || 'Failed to analyze document');
    } finally {
      setAnalyzing(false);
    }
  };

  const handlePushDeadlines = async () => {
    if (!result?.key_dates?.length) return;

    let pushed = 0;
    for (const d of result.key_dates) {
      if (!d.iso_date) continue;
      try {
        await fetch(`${BACKEND_URL}/api/v1/deadlines/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: userId,
            title: d.label,
            description: `Extracted from document: ${result.document_type}. Date: ${d.date}`,
            category: result.suggested_limitation_rule_id || 'general',
            deadline_date: new Date(d.iso_date).toISOString(),
            source_type: 'document',
            priority: 'medium',
          }),
        });
        pushed++;
      } catch { /* skip failed */ }
    }

    setDeadlinesPushed(true);
    if (pushed > 0) {
      setTimeout(() => onNavigateDeadlines(), 1200);
    }
  };

  const getConfidenceClass = (c: number) =>
    c >= 0.7 ? 'high' : c >= 0.4 ? 'medium' : 'low';

  const getConfidenceLabel = (c: number) =>
    c >= 0.7 ? 'High Confidence' : c >= 0.4 ? 'Medium' : 'Low';

  const resetUpload = () => {
    setSelectedFile(null);
    setResult(null);
    setError(null);
    setDeadlinesPushed(false);
  };

  return (
    <div className="xray-screen">
      <button className="xray-back-btn" onClick={onBackHome}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <polyline points="15 18 9 12 15 6" />
        </svg>
        Back
      </button>

      <div className="xray-header">
        <h2>📄 Document X-Ray</h2>
        <p>Upload a legal document — AI extracts obligations, deadlines & red flags</p>
      </div>

      {/* ─── Upload Zone ─── */}
      {!result && !analyzing && (
        <>
          <div
            className={`xray-upload-zone${dragActive ? ' drag-active' : ''}`}
            onClick={() => fileInputRef.current?.click()}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
          >
            <div className="xray-upload-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
            </div>
            <div className="xray-upload-title">
              {dragActive ? 'Drop your file here' : 'Tap to upload or drag & drop'}
            </div>
            <div className="xray-upload-subtitle">PDF, PNG, JPG — Max 10 MB</div>

            <input
              ref={fileInputRef}
              type="file"
              className="xray-file-input"
              accept=".pdf,.png,.jpg,.jpeg,.webp,.tiff"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFileSelect(f);
              }}
            />
          </div>

          {selectedFile && (
            <div className="xray-selected-file">
              📎 {selectedFile.name} ({(selectedFile.size / 1024).toFixed(0)} KB)
            </div>
          )}

          <button
            className="xray-analyze-btn"
            disabled={!selectedFile}
            onClick={handleAnalyze}
          >
            🔬 Analyze Document
          </button>

          {error && <div className="xray-error">⚠️ {error}</div>}
        </>
      )}

      {/* ─── Loading State ─── */}
      {analyzing && (
        <div className="xray-loading">
          <div className="xray-loading-spinner" />
          <p>🔍 Analyzing your document with AI...</p>
          <p style={{ fontSize: 12, color: '#9ca3af', marginTop: 8 }}>
            Extracting dates, obligations & red flags
          </p>
        </div>
      )}

      {/* ─── Results ─── */}
      {result && (
        <div className="xray-results">
          {/* Header */}
          <div className="xray-result-header">
            <div className="xray-result-icon">📄</div>
            <div className="xray-result-meta">
              <h3>
                {result.document_type}
                <span className={`xray-confidence-badge ${getConfidenceClass(result.confidence)}`}>
                  {getConfidenceLabel(result.confidence)}
                </span>
              </h3>
              <p>{selectedFile?.name}</p>
            </div>
          </div>

          {/* Summary */}
          {result.summary && (
            <div className="xray-summary-box">
              <p>📝 {result.summary}</p>
            </div>
          )}

          {/* Parties */}
          {result.parties.length > 0 && (
            <div className="xray-section">
              <div className="xray-section-title">👥 Parties Identified</div>
              {result.parties.map((p, i) => (
                <span key={i} className="xray-party-chip">{p}</span>
              ))}
            </div>
          )}

          {/* Key Dates Timeline */}
          {result.key_dates.length > 0 && (
            <div className="xray-section">
              <div className="xray-section-title">📅 Key Dates</div>
              <div className="xray-timeline">
                {result.key_dates.map((d, i) => (
                  <div key={i} className="xray-timeline-item">
                    <div className="xray-timeline-label">{d.label}</div>
                    <div className="xray-timeline-date">{d.date}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Obligations */}
          {result.obligations.length > 0 && (
            <div className="xray-section">
              <div className="xray-section-title">📋 Your Obligations</div>
              {result.obligations.map((o, i) => (
                <div key={i} className="xray-obligation-item">
                  <div className="xray-obligation-icon">{i + 1}</div>
                  <div className="xray-obligation-text">{o}</div>
                </div>
              ))}
            </div>
          )}

          {/* Red Flags */}
          {result.red_flags.length > 0 && (
            <div className="xray-section xray-red-flag-section">
              <div className="xray-section-title" style={{ color: '#dc2626' }}>
                🚩 Red Flags Detected
              </div>
              {result.red_flags.map((rf, i) => (
                <div key={i} className="xray-red-flag-item">
                  <div className="xray-red-flag-icon">⚠️</div>
                  <div className="xray-red-flag-text">{rf}</div>
                </div>
              ))}
            </div>
          )}

          {/* Action Buttons */}
          <div className="xray-action-buttons">
            {result.key_dates.some(d => d.iso_date) && (
              <button
                className="xray-action-btn monitor"
                onClick={handlePushDeadlines}
                disabled={deadlinesPushed}
              >
                {deadlinesPushed ? '✅ Deadlines Added!' : '📅 Add Deadlines to Monitor'}
              </button>
            )}

            {result.suggested_wizard_scenario_id && (
              <button className="xray-action-btn wizard" onClick={onNavigateWizard}>
                ⚡ Start Action Plan from this Document
              </button>
            )}

            <button className="xray-action-btn new-upload" onClick={resetUpload}>
              📤 Analyze Another Document
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DocumentXRayTab;
