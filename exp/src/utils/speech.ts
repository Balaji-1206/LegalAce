import { Platform } from 'react-native';
import { SupportedLang } from '../config/i18n';

/**
 * Clean markdown symbols and emojis for natural speech synthesis
 */
export function cleanTextForSpeech(raw: string): string {
  if (!raw) return '';
  return raw
    .replace(/[#*_`~>\[\]\(\)]/g, ' ')
    .replace(/[\u{1F300}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F900}-\u{1F9FF}\u{1F1E0}-\u{1F1FF}]/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Check if Web Speech Synthesis is available in current environment
 */
export function isSpeechSynthesisSupported(): boolean {
  if (Platform.OS !== 'web' && typeof window === 'undefined') {
    return false;
  }
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

/**
 * Check if Web Speech Recognition (STT) is available
 */
export function isSpeechRecognitionSupported(): boolean {
  if (Platform.OS !== 'web' && typeof window === 'undefined') {
    return false;
  }
  return (
    typeof window !== 'undefined' &&
    ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)
  );
}

/**
 * Convert app SupportedLang to BCP-47 language tag
 */
export function getVoiceLocale(lang: SupportedLang): string {
  switch (lang) {
    case 'hi':
      return 'hi-IN';
    case 'ta':
      return 'ta-IN';
    case 'en':
    default:
      return 'en-IN';
  }
}

/**
 * Read text aloud using Text-to-Speech
 */
export function speakText(
  text: string,
  lang: SupportedLang = 'en',
  onStart?: () => void,
  onEnd?: () => void
): void {
  if (!isSpeechSynthesisSupported()) {
    console.warn('Speech synthesis is not supported on this platform/browser.');
    return;
  }

  try {
    window.speechSynthesis.cancel(); // Stop any pending speech

    const clean = cleanTextForSpeech(text);
    if (!clean) return;

    const utterance = new SpeechSynthesisUtterance(clean);
    utterance.lang = getVoiceLocale(lang);
    utterance.rate = 0.95; // Slightly slower for crisp legal clarity
    utterance.pitch = 1.0;

    // Pick best matching voice if available
    const voices = window.speechSynthesis.getVoices();
    const targetPrefix = lang === 'hi' ? 'hi' : lang === 'ta' ? 'ta' : 'en';
    const match = voices.find((v) => v.lang.toLowerCase().startsWith(targetPrefix));
    if (match) {
      utterance.voice = match;
    }

    if (onStart) utterance.onstart = () => onStart();
    if (onEnd) utterance.onend = () => onEnd();
    utterance.onerror = () => {
      if (onEnd) onEnd();
    };

    window.speechSynthesis.speak(utterance);
  } catch (err) {
    console.error('Speech synthesis error:', err);
    if (onEnd) onEnd();
  }
}

/**
 * Cancel any ongoing speech synthesis
 */
export function stopSpeaking(): void {
  if (isSpeechSynthesisSupported()) {
    try {
      window.speechSynthesis.cancel();
    } catch (err) {
      console.warn('Error stopping speech:', err);
    }
  }
}

export interface SpeechRecognizerHandle {
  stop: () => void;
}

/**
 * Start speech-to-text dictation
 */
export function startSpeechRecognition(options: {
  lang: SupportedLang;
  onResult: (transcript: string) => void;
  onError?: (err: any) => void;
  onEnd?: () => void;
}): SpeechRecognizerHandle | null {
  if (!isSpeechRecognitionSupported()) {
    console.warn('Speech recognition is not supported on this platform/browser.');
    return null;
  }

  try {
    const SpeechRecognitionClass =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognitionClass) {
      return null;
    }

    const recognition = new SpeechRecognitionClass();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = getVoiceLocale(options.lang);

    recognition.onresult = (event: any) => {
      if (event.results && event.results[0] && event.results[0][0]) {
        const transcript = event.results[0][0].transcript;
        if (transcript) {
          options.onResult(transcript);
        }
      }
    };

    recognition.onerror = (event: any) => {
      console.warn('Speech recognition error:', event.error);
      if (options.onError) {
        options.onError(event.error);
      }
    };

    recognition.onend = () => {
      if (options.onEnd) {
        options.onEnd();
      }
    };

    recognition.start();

    return {
      stop: () => {
        try {
          recognition.stop();
        } catch {
          // ignore
        }
      },
    };
  } catch (err) {
    console.error('Failed to start speech recognition:', err);
    if (options.onError) {
      options.onError(err);
    }
    return null;
  }
}
