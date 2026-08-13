/**
 * LegalAce API Configuration Module
 * 
 * Provides dynamic API base URL resolution supporting:
 * 1. Web application running on local computer browser (http://localhost:8000)
 * 2. Web application opened on mobile browser via LAN IP (http://<COMPUTER_LAN_IP>:8000)
 * 3. Mobile application running through Expo Go on physical phone (http://<COMPUTER_LAN_IP>:8000)
 */

// Helper to get environment variables across Vite (import.meta.env) and Node/React Native (process.env)
const getEnv = (key: string): string | undefined => {
  try {
    if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env[key] !== undefined) {
      return import.meta.env[key];
    }
  } catch {
    // import.meta may fail in non-ESM environments
  }
  try {
    const globalProc = (globalThis as Record<string, unknown>).process as { env?: Record<string, string> } | undefined;
    if (globalProc && globalProc.env && globalProc.env[key] !== undefined) {
      return globalProc.env[key];
    }
  } catch {
    // process may not be defined in standard browser context
  }
  return undefined;
};

// Default fallback URLs
const DEFAULT_WEB_URL = 'http://localhost:8000';
const DEFAULT_MOBILE_URL = 'http://172.16.6.28:8000';

// Configured URLs from EXPO_PUBLIC_* or VITE_* env vars
export const API_URL_WEB =
  getEnv('EXPO_PUBLIC_API_URL_WEB') ||
  getEnv('VITE_API_URL_WEB') ||
  DEFAULT_WEB_URL;

export const API_URL_MOBILE =
  getEnv('EXPO_PUBLIC_API_URL_MOBILE') ||
  getEnv('VITE_API_URL_MOBILE') ||
  DEFAULT_MOBILE_URL;

/**
 * Dynamically resolves the API Base URL:
 * - Native Mobile (Expo Go): Uses API_URL_MOBILE (http://<LAN_IP>:8000)
 * - Mobile Browser on LAN IP (e.g. http://172.16.15.251:5173): Uses http://172.16.15.251:8000
 * - Desktop Browser (http://localhost:5173): Uses API_URL_WEB (http://localhost:8000)
 */
export const getApiBaseUrl = (): string => {
  // 1. Check if running in Native React Native / Expo Go environment
  try {
    const nav = (globalThis as Record<string, unknown>).navigator as { product?: string } | undefined;
    if (nav && nav.product === 'ReactNative') {
      return API_URL_MOBILE;
    }
  } catch {
    // Not running in React Native native context
  }

  // 2. Running in browser
  if (typeof window !== 'undefined' && window.location) {
    const hostname = window.location.hostname;
    // If accessed via LAN IP or custom host on mobile/other device (not localhost/127.0.0.1)
    if (hostname && hostname !== 'localhost' && hostname !== '127.0.0.1' && hostname !== '0.0.0.0') {
      const protocol = window.location.protocol || 'http:';
      return `${protocol}//${hostname}:8000`;
    }
  }

  // 3. Fallback for desktop localhost web browser
  return API_URL_WEB;
};

export const API_BASE_URL: string = getApiBaseUrl();

export default API_BASE_URL;
