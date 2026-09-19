import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as DocumentPicker from 'expo-document-picker';
import Colors from '../theme/colors';
import { API_BASE_URL } from '../config/api';

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

interface DocumentXRayScreenProps {
  userId: string;
  onBackHome: () => void;
  onNavigateDeadlines: () => void;
  onNavigateWizard: () => void;
}

export const DocumentXRayScreen: React.FC<DocumentXRayScreenProps> = ({
  userId,
  onBackHome,
  onNavigateDeadlines,
  onNavigateWizard,
}) => {
  const [selectedFile, setSelectedFile] = useState<{
    uri: string;
    name: string;
    size?: number;
    mimeType?: string;
    file?: any;
  } | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<XRayResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deadlinesPushed, setDeadlinesPushed] = useState(false);

  const resolveMimeType = (filename: string, mime?: string): string => {
    if (mime && mime !== 'application/octet-stream') return mime;
    const ext = filename.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'pdf': return 'application/pdf';
      case 'png': return 'image/png';
      case 'jpg':
      case 'jpeg': return 'image/jpeg';
      case 'webp': return 'image/webp';
      case 'docx': return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      case 'txt': return 'text/plain';
      default: return 'application/pdf';
    }
  };

  const handlePickDocument = async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: [
          'application/pdf',
          'image/*',
          'text/plain',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'application/msword',
        ],
        copyToCacheDirectory: true,
      });

      if (!res.canceled && res.assets && res.assets.length > 0) {
        const file = res.assets[0];
        const mime = resolveMimeType(file.name, file.mimeType);
        setSelectedFile({
          uri: file.uri,
          name: file.name,
          size: file.size,
          mimeType: mime,
          file: (file as any).file, // Native browser File object if on Web
        });
        setResult(null);
        setError(null);
        setDeadlinesPushed(false);
      }
    } catch {
      setError('Could not access document picker.');
    }
  };

  const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const res = reader.result as string;
        const b64 = res.includes(',') ? res.split(',')[1] : res;
        resolve(b64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  const handleAnalyze = async () => {
    if (!selectedFile) return;
    setAnalyzing(true);
    setError(null);
    setResult(null);

    try {
      const mimeType = resolveMimeType(selectedFile.name, selectedFile.mimeType);

      // Step 1: Obtain a real Blob instance
      let fileBlob: Blob | null = null;
      if (selectedFile.file) {
        fileBlob = selectedFile.file;
      } else {
        try {
          const fileRes = await fetch(selectedFile.uri);
          fileBlob = await fileRes.blob();
        } catch (fetchErr) {
          console.warn('Could not fetch file URI as blob:', fetchErr);
        }
      }

      // Step 2: Attempt standard FormData upload with real Blob/File
      let uploadSuccess = false;
      if (fileBlob) {
        try {
          const formData = new FormData();
          formData.append('user_id', userId);

          const filePayload = typeof File !== 'undefined'
            ? new File([fileBlob], selectedFile.name, { type: mimeType })
            : fileBlob;

          formData.append('file', filePayload, selectedFile.name);

          const res = await fetch(`${API_BASE_URL}/api/v1/document-xray/analyze`, {
            method: 'POST',
            body: formData,
          });

          if (res.ok) {
            const data = await res.json();
            setResult(data.result as XRayResult);
            uploadSuccess = true;
          } else {
            const errData = await res.json().catch(() => ({}));
            // If server explicitly returned validation or parsing error, raise it
            if (res.status === 400 || res.status === 422) {
              throw new Error(errData.detail || `Document analysis failed (${res.status})`);
            }
          }
        } catch (formErr: any) {
          console.warn('Multipart FormData upload error, falling back to Base64:', formErr?.message);
        }
      }

      if (uploadSuccess) return;

      // Step 3: Base64 JSON fallback for environments where FormDataPart fails
      let base64Content = '';
      if (fileBlob) {
        base64Content = await blobToBase64(fileBlob);
      } else {
        // Direct fetch as blob then base64
        const fileRes = await fetch(selectedFile.uri);
        const blob = await fileRes.blob();
        base64Content = await blobToBase64(blob);
      }

      if (!base64Content) {
        throw new Error('Could not read document contents. Please re-select the file.');
      }

      const res = await fetch(`${API_BASE_URL}/api/v1/document-xray/analyze-base64`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          file_base64: base64Content,
          filename: selectedFile.name,
          mime_type: mimeType,
          user_id: userId,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setResult(data.result as XRayResult);
      } else {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || `Document analysis failed (${res.status})`);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Could not analyze document. Please ensure the document is clear and readable, or try again.';
      setError(msg);
      setResult(null);
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
        await fetch(`${API_BASE_URL}/api/v1/deadlines/`, {
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
      setTimeout(() => onNavigateDeadlines(), 1000);
    }
  };

  const resetUpload = () => {
    setSelectedFile(null);
    setResult(null);
    setError(null);
    setDeadlinesPushed(false);
  };

  const getConfidenceLabel = (c: number) => {
    if (c >= 0.7) return 'High Confidence';
    if (c >= 0.4) return 'Medium';
    return 'Low';
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.contentContainer}>
      {/* Back Button */}
      <TouchableOpacity style={styles.backBtn} onPress={onBackHome} activeOpacity={0.7}>
        <Ionicons name="chevron-back" size={16} color="#4f46e5" />
        <Text style={styles.backBtnText}>Back</Text>
      </TouchableOpacity>

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>📄 Document X-Ray</Text>
        <Text style={styles.headerSubtitle}>
          Upload a legal document — AI extracts obligations, deadlines & red flags
        </Text>
      </View>

      {/* Upload Zone */}
      {!result && !analyzing && (
        <View style={styles.uploadContainer}>
          <TouchableOpacity
            style={styles.uploadZone}
            onPress={handlePickDocument}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={['#1a1a5e', '#312e81']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.uploadIcon}
            >
              <Ionicons name="cloud-upload-outline" size={26} color="#ffffff" />
            </LinearGradient>
            <Text style={styles.uploadTitle}>Tap to upload or choose file</Text>
            <Text style={styles.uploadSubtitle}>PDF, PNG, JPG — Max 10 MB</Text>
          </TouchableOpacity>

          {selectedFile && (
            <View style={styles.selectedFileBox}>
              <Text style={styles.selectedFileText}>
                📎 {selectedFile.name} {selectedFile.size ? `(${(selectedFile.size / 1024).toFixed(0)} KB)` : ''}
              </Text>
            </View>
          )}

          <TouchableOpacity
            onPress={handleAnalyze}
            disabled={!selectedFile}
            activeOpacity={0.8}
            style={[styles.analyzeBtnWrap, !selectedFile && { opacity: 0.55 }]}
          >
            <LinearGradient
              colors={['#1a1a5e', '#312e81']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.analyzeBtn}
            >
              <Text style={styles.analyzeBtnText}>🔬 Analyze Document</Text>
            </LinearGradient>
          </TouchableOpacity>

          {error && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>⚠️ {error}</Text>
            </View>
          )}
        </View>
      )}

      {/* Loading State */}
      {analyzing && (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color="#4f46e5" style={{ marginBottom: 16 }} />
          <Text style={styles.loadingTitle}>🔍 Analyzing your document with AI...</Text>
          <Text style={styles.loadingSub}>Extracting dates, obligations & red flags</Text>
        </View>
      )}

      {/* Results */}
      {result && (
        <View style={styles.resultsContainer}>
          {/* Header */}
          <View style={styles.resultHeaderCard}>
            <View style={styles.resultIconWrap}>
              <Text style={{ fontSize: 22 }}>📄</Text>
            </View>
            <View style={styles.resultMeta}>
              <View style={styles.resultTitleRow}>
                <Text style={styles.resultDocType}>{result.document_type}</Text>
                <View style={styles.confidenceBadge}>
                  <Text style={styles.confidenceBadgeText}>
                    {getConfidenceLabel(result.confidence)}
                  </Text>
                </View>
              </View>
              {selectedFile?.name && (
                <Text style={styles.resultFileName}>{selectedFile.name}</Text>
              )}
            </View>
          </View>

          {/* Summary Box */}
          {result.summary && (
            <View style={styles.summaryBox}>
              <Text style={styles.summaryText}>📝 {result.summary}</Text>
            </View>
          )}

          {/* Parties Identified */}
          {(result.parties?.length ?? 0) > 0 && (
            <View style={styles.cardSection}>
              <Text style={styles.sectionTitle}>👥 Parties Identified</Text>
              <View style={styles.partyChipsWrap}>
                {result.parties?.map((p, i) => (
                  <View key={i} style={styles.partyChip}>
                    <Text style={styles.partyChipText}>{p}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Key Dates Timeline */}
          {(result.key_dates?.length ?? 0) > 0 && (
            <View style={styles.cardSection}>
              <Text style={styles.sectionTitle}>📅 Key Dates</Text>
              <View style={styles.timeline}>
                {result.key_dates?.map((d, i) => (
                  <View key={i} style={styles.timelineItem}>
                    <View style={styles.timelineDot} />
                    <Text style={styles.timelineLabel}>{d.label}</Text>
                    <Text style={styles.timelineDate}>{d.date}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Obligations */}
          {(result.obligations?.length ?? 0) > 0 && (
            <View style={styles.cardSection}>
              <Text style={styles.sectionTitle}>📋 Your Obligations</Text>
              {result.obligations?.map((o, i) => (
                <View key={i} style={styles.obligationItem}>
                  <View style={styles.obligationBadge}>
                    <Text style={styles.obligationBadgeText}>{i + 1}</Text>
                  </View>
                  <Text style={styles.obligationText}>{o}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Red Flags */}
          {(result.red_flags?.length ?? 0) > 0 && (
            <View style={[styles.cardSection, styles.redFlagSection]}>
              <Text style={[styles.sectionTitle, { color: '#dc2626' }]}>
                🚩 Red Flags Detected
              </Text>
              {result.red_flags?.map((rf, i) => (
                <View key={i} style={styles.redFlagItem}>
                  <Text style={styles.redFlagIcon}>⚠️</Text>
                  <Text style={styles.redFlagText}>{rf}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Action Buttons */}
          <View style={styles.actionButtonsWrap}>
            {result.key_dates?.some(d => d.iso_date) && (
              <TouchableOpacity
                onPress={handlePushDeadlines}
                disabled={deadlinesPushed}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={['#059669', '#10b981']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.actionGradientBtn}
                >
                  <Text style={styles.actionBtnText}>
                    {deadlinesPushed ? '✅ Deadlines Added!' : '📅 Add Deadlines to Monitor'}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            )}

            {result.suggested_wizard_scenario_id && (
              <TouchableOpacity onPress={onNavigateWizard} activeOpacity={0.8}>
                <LinearGradient
                  colors={['#1a1a5e', '#312e81']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.actionGradientBtn}
                >
                  <Text style={styles.actionBtnText}>
                    ⚡ Start Action Plan from this Document
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={styles.newUploadBtn}
              onPress={resetUpload}
              activeOpacity={0.8}
            >
              <Text style={styles.newUploadBtnText}>📤 Analyze Another Document</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <View style={{ height: 95 }} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#f4f5f9',
  },
  contentContainer: {
    paddingHorizontal: 18,
    paddingTop: 12,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
    paddingBottom: 10,
  },
  backBtnText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#4f46e5',
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1a1a5e',
    letterSpacing: -0.4,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 12.5,
    color: '#6b7280',
    lineHeight: 18,
    textAlign: 'center',
    paddingHorizontal: 12,
  },
  uploadContainer: {
    marginTop: 4,
  },
  uploadZone: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#cbd5e1',
    borderRadius: 20,
    paddingVertical: 32,
    paddingHorizontal: 20,
    alignItems: 'center',
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 10,
    elevation: 2,
  },
  uploadIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    shadowColor: '#1a1a5e',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 14,
    elevation: 6,
  },
  uploadTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  uploadSubtitle: {
    fontSize: 12,
    color: '#6b7280',
  },
  selectedFileBox: {
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: '#eef2ff',
    borderWidth: 1.5,
    borderColor: '#c7d2fe',
    borderRadius: 14,
  },
  selectedFileText: {
    fontSize: 13,
    color: '#1e1b4b',
    fontWeight: '700',
  },
  analyzeBtnWrap: {
    marginTop: 16,
    borderRadius: 16,
    shadowColor: '#1a1a5e',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 14,
    elevation: 6,
  },
  analyzeBtn: {
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  analyzeBtnText: {
    color: '#ffffff',
    fontSize: 14.5,
    fontWeight: '800',
  },
  errorBox: {
    marginTop: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: '#fef2f2',
    borderWidth: 1.5,
    borderColor: '#fecaca',
    borderRadius: 12,
    alignItems: 'center',
  },
  errorText: {
    fontSize: 12.5,
    color: '#b91c1c',
    fontWeight: '600',
  },
  loadingBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    paddingHorizontal: 20,
    backgroundColor: '#ffffff',
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#e8eaf0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 10,
    elevation: 2,
    marginTop: 8,
  },
  loadingTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },
  loadingSub: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 8,
  },
  resultsContainer: {
    marginTop: 4,
  },
  resultHeaderCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#f0f1f5',
    borderRadius: 18,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  resultIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#eef2ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultMeta: {
    flex: 1,
  },
  resultTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 2,
  },
  resultDocType: {
    fontSize: 15.5,
    fontWeight: '800',
    color: '#111827',
  },
  confidenceBadge: {
    backgroundColor: '#dcfce7',
    borderWidth: 1,
    borderColor: '#bbf7d0',
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 20,
  },
  confidenceBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#15803d',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  resultFileName: {
    fontSize: 12,
    color: '#6b7280',
  },
  summaryBox: {
    backgroundColor: '#f0fdf4',
    borderWidth: 1.5,
    borderColor: '#bbf7d0',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  summaryText: {
    fontSize: 13,
    color: '#166534',
    lineHeight: 20,
  },
  cardSection: {
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#f0f1f5',
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 10,
  },
  partyChipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  partyChip: {
    paddingVertical: 4,
    paddingHorizontal: 12,
    backgroundColor: '#eef2ff',
    borderWidth: 1,
    borderColor: '#c7d2fe',
    borderRadius: 20,
  },
  partyChipText: {
    fontSize: 12,
    color: '#3730a3',
    fontWeight: '700',
  },
  timeline: {
    borderLeftWidth: 2,
    borderLeftColor: '#e0e7ff',
    paddingLeft: 14,
    marginLeft: 6,
    marginTop: 4,
  },
  timelineItem: {
    position: 'relative',
    marginBottom: 12,
  },
  timelineDot: {
    position: 'absolute',
    left: -20,
    top: 3,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#4f46e5',
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  timelineLabel: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#4f46e5',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  timelineDate: {
    fontSize: 13.5,
    fontWeight: '600',
    color: '#111827',
    marginTop: 1,
  },
  obligationItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f4f5f9',
  },
  obligationBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#eef2ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  obligationBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#4f46e5',
  },
  obligationText: {
    fontSize: 13,
    color: '#374151',
    lineHeight: 19,
    flex: 1,
  },
  redFlagSection: {
    backgroundColor: '#fff5f5',
    borderColor: '#fecaca',
  },
  redFlagItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#fee2e2',
  },
  redFlagIcon: {
    fontSize: 15,
    marginTop: 1,
  },
  redFlagText: {
    fontSize: 13,
    color: '#991b1b',
    lineHeight: 19,
    fontWeight: '500',
    flex: 1,
  },
  actionButtonsWrap: {
    gap: 10,
    marginTop: 4,
  },
  actionGradientBtn: {
    paddingVertical: 13,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 4,
  },
  actionBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  newUploadBtn: {
    paddingVertical: 13,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#e8eaf0',
  },
  newUploadBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#374151',
  },
});

export default DocumentXRayScreen;
