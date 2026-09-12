/**
 * LegalAce React Native API Configuration
 * Auto-detects host machine LAN IP from Expo dev server (hostUri),
 * ensuring phone connectivity across any Wi-Fi network.
 */
import Constants from 'expo-constants';
import { Platform } from 'react-native';

const getHostFromExpo = (): string | null => {
  try {
    const hostUri = Constants.expoConfig?.hostUri || (Constants as { manifest?: { debuggerHost?: string } }).manifest?.debuggerHost;
    if (hostUri) {
      const ip = hostUri.split(':')[0];
      if (ip && ip !== 'localhost' && ip !== '127.0.0.1') {
        return ip;
      }
    }
  } catch {
    // ignore
  }
  return null;
};

// Fallback active machine LAN IP
const CURRENT_LAN_IP = '172.16.10.168';

export const getApiBaseUrl = (): string => {
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }

  // Auto-detect IP from active Expo connection
  const expoHost = getHostFromExpo();
  if (expoHost) {
    return `http://${expoHost}:8000`;
  }

  // Web browser resolution
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined' && window.location?.hostname) {
      return `http://${window.location.hostname}:8000`;
    }
    return 'http://localhost:8000';
  }

  // Android emulator fallback
  if (Platform.OS === 'android' && !Constants.isDevice) {
    return 'http://10.0.2.2:8000';
  }

  // Default to current LAN IP
  return `http://${CURRENT_LAN_IP}:8000`;
};

export const API_BASE_URL: string = getApiBaseUrl();

export default API_BASE_URL;
