import AsyncStorage from '@react-native-async-storage/async-storage';
import { UserProfile, AuthSession } from '../types';
import { API_BASE_URL } from '../config/api';

const STORAGE_USERS_KEY = 'legalace_auth_users_db';
const STORAGE_SESSION_KEY = 'legalace_auth_session';
const STORAGE_GUEST_KEY = 'legalace_is_guest';

interface StoredAccount {
  user: UserProfile;
  passwordHash: string;
}

export const DEMO_CREDENTIALS = {
  email: 'demo@legalace.in',
  password: 'legalace123',
  name: 'Adv. Rahul Sharma',
  phone: '+91 98765 43210',
  persona: 'citizen',
  state: 'Delhi (NCR)',
};

const DEFAULT_DEMO_USERS: StoredAccount[] = [
  {
    user: {
      id: 'user_demo_rahul',
      name: DEMO_CREDENTIALS.name,
      email: DEMO_CREDENTIALS.email,
      phone: DEMO_CREDENTIALS.phone,
      persona: DEMO_CREDENTIALS.persona,
      state: DEMO_CREDENTIALS.state,
      createdAt: '2026-01-15T10:00:00.000Z',
    },
    passwordHash: DEMO_CREDENTIALS.password,
  },
  {
    user: {
      id: 'user_demo_priya',
      name: 'Priya Sundaram',
      email: 'priya@legalace.in',
      phone: '+91 98401 23456',
      persona: 'consumer',
      state: 'Tamil Nadu',
      createdAt: '2026-02-01T14:30:00.000Z',
    },
    passwordHash: 'legalace123',
  },
];

class AuthService {
  private async getStoredAccounts(): Promise<StoredAccount[]> {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_USERS_KEY);
      if (!raw) {
        await AsyncStorage.setItem(STORAGE_USERS_KEY, JSON.stringify(DEFAULT_DEMO_USERS));
        return DEFAULT_DEMO_USERS;
      }
      const parsed: StoredAccount[] = JSON.parse(raw);
      let updated = false;
      const combined = [...parsed];
      for (const demo of DEFAULT_DEMO_USERS) {
        if (!combined.some(u => u.user.email.toLowerCase() === demo.user.email.toLowerCase())) {
          combined.push(demo);
          updated = true;
        }
      }
      if (updated) {
        await AsyncStorage.setItem(STORAGE_USERS_KEY, JSON.stringify(combined));
      }
      return combined;
    } catch {
      return DEFAULT_DEMO_USERS;
    }
  }

  /**
   * Authenticates user with email and password via backend MongoDB API.
   * Falls back to local offline accounts if backend server is unreachable.
   */
  async signIn(email: string, password: string): Promise<UserProfile> {
    const cleanEmail = email.trim().toLowerCase();
    const cleanPass = password.trim();

    if (!cleanEmail || !cleanPass) {
      throw new Error('Please enter both email and password.');
    }

    // Try MongoDB backend authentication first
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);

      const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail, password: cleanPass }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        const user: UserProfile = data.user;
        const token: string = data.token || `token_${Date.now()}`;

        const session: AuthSession = {
          user,
          token,
          isGuest: false,
        };
        await AsyncStorage.setItem(STORAGE_SESSION_KEY, JSON.stringify(session));
        await AsyncStorage.removeItem(STORAGE_GUEST_KEY);
        await AsyncStorage.setItem('legalace_user_id', user.id);

        return user;
      }

      if (response.status === 401) {
        const errorJson = await response.json().catch(() => ({}));
        throw new Error(errorJson.detail || 'Invalid email or password.');
      } else if (response.status === 400 || response.status === 422) {
        const errorJson = await response.json().catch(() => ({}));
        throw new Error(errorJson.detail || 'Please check your email and password format.');
      }
    } catch (networkErr: any) {
      // If error was 401 or explicit validation, rethrow immediately
      if (networkErr.message?.includes('Invalid email or password')) {
        throw networkErr;
      }
      // Offline fallback: Check local AsyncStorage credentials
      const accounts = await this.getStoredAccounts();
      const match = accounts.find(
        acc => acc.user.email.toLowerCase() === cleanEmail && acc.passwordHash === cleanPass
      );

      if (match) {
        const session: AuthSession = {
          user: match.user,
          token: 'offline_token_' + Math.random().toString(36).substring(2),
          isGuest: false,
        };
        await AsyncStorage.setItem(STORAGE_SESSION_KEY, JSON.stringify(session));
        await AsyncStorage.removeItem(STORAGE_GUEST_KEY);
        await AsyncStorage.setItem('legalace_user_id', match.user.id);
        return match.user;
      }

      throw new Error(networkErr.message || 'Login failed. Please check your credentials or network.');
    }

    throw new Error('Invalid email or password.');
  }

  /**
   * Registers a new citizen account via backend MongoDB API.
   */
  async signUp(params: {
    name: string;
    email: string;
    password: string;
    phone?: string;
    persona?: string;
    state?: string;
  }): Promise<UserProfile> {
    const cleanName = params.name.trim();
    const cleanEmail = params.email.trim().toLowerCase();
    const cleanPass = params.password.trim();

    if (!cleanName) throw new Error('Please enter your full name.');
    if (!cleanEmail || !cleanEmail.includes('@')) throw new Error('Please enter a valid email address.');
    if (!cleanPass || cleanPass.length < 6) throw new Error('Password must be at least 6 characters long.');

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);

      const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: cleanName,
          email: cleanEmail,
          password: cleanPass,
          phone: params.phone?.trim() || null,
          persona: params.persona || 'citizen',
          state: params.state || 'Delhi (NCR)',
        }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        const user: UserProfile = data.user;
        const token: string = data.token || `token_${Date.now()}`;

        const session: AuthSession = {
          user,
          token,
          isGuest: false,
        };
        await AsyncStorage.setItem(STORAGE_SESSION_KEY, JSON.stringify(session));
        await AsyncStorage.removeItem(STORAGE_GUEST_KEY);
        await AsyncStorage.setItem('legalace_user_id', user.id);

        return user;
      }

      const errorJson = await response.json().catch(() => ({}));
      throw new Error(errorJson.detail || 'Sign up failed. Please try again.');
    } catch (networkErr: any) {
      if (networkErr.message?.includes('already exists') || networkErr.message?.includes('Please enter')) {
        throw networkErr;
      }

      // Offline fallback: store locally
      const accounts = await this.getStoredAccounts();
      if (accounts.some(acc => acc.user.email.toLowerCase() === cleanEmail)) {
        throw new Error('An account with this email already exists. Please sign in.');
      }

      const newUser: UserProfile = {
        id: 'user_' + Math.random().toString(36).substring(2, 11),
        name: cleanName,
        email: cleanEmail,
        phone: params.phone?.trim() || undefined,
        persona: params.persona || 'citizen',
        state: params.state || 'Delhi (NCR)',
        createdAt: new Date().toISOString(),
      };

      accounts.push({ user: newUser, passwordHash: cleanPass });
      await AsyncStorage.setItem(STORAGE_USERS_KEY, JSON.stringify(accounts));

      const session: AuthSession = {
        user: newUser,
        token: 'offline_token_' + Math.random().toString(36).substring(2),
        isGuest: false,
      };
      await AsyncStorage.setItem(STORAGE_SESSION_KEY, JSON.stringify(session));
      await AsyncStorage.removeItem(STORAGE_GUEST_KEY);
      await AsyncStorage.setItem('legalace_user_id', newUser.id);

      return newUser;
    }
  }

  /**
   * Enables Guest Mode
   */
  async continueAsGuest(): Promise<UserProfile> {
    let guestId = await AsyncStorage.getItem('legalace_user_id');
    if (!guestId || !guestId.startsWith('guest_')) {
      guestId = 'guest_' + Math.random().toString(36).substring(2, 9);
      await AsyncStorage.setItem('legalace_user_id', guestId);
    }

    const guestUser: UserProfile = {
      id: guestId,
      name: 'Guest Citizen',
      email: 'guest@legalace.local',
      persona: 'citizen',
      state: 'Delhi (NCR)',
      createdAt: new Date().toISOString(),
    };

    const session: AuthSession = {
      user: guestUser,
      isGuest: true,
    };

    await AsyncStorage.setItem(STORAGE_SESSION_KEY, JSON.stringify(session));
    await AsyncStorage.setItem(STORAGE_GUEST_KEY, 'true');

    return guestUser;
  }

  /**
   * Restores existing session or returns null if user must log in
   */
  async getInitialSession(): Promise<AuthSession | null> {
    try {
      const rawSession = await AsyncStorage.getItem(STORAGE_SESSION_KEY);
      if (rawSession) {
        return JSON.parse(rawSession);
      }
      return null;
    } catch {
      return null;
    }
  }

  /**
   * Resets account password in MongoDB users collection directly.
   */
  async resetPassword(email: string, newPassword: string): Promise<string> {
    const cleanEmail = email.trim().toLowerCase();
    const cleanPass = newPassword.trim();

    if (!cleanEmail || !cleanEmail.includes('@')) {
      throw new Error('Please enter a valid email address.');
    }
    if (!cleanPass || cleanPass.length < 6) {
      throw new Error('Password must be at least 6 characters long.');
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);

      const response = await fetch(`${API_BASE_URL}/api/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: cleanEmail,
          new_password: cleanPass,
        }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        // Update local cached account if present
        const accounts = await this.getStoredAccounts();
        const idx = accounts.findIndex(acc => acc.user.email.toLowerCase() === cleanEmail);
        if (idx !== -1) {
          accounts[idx].passwordHash = cleanPass;
          await AsyncStorage.setItem(STORAGE_USERS_KEY, JSON.stringify(accounts));
        }
        return data.message || 'Password updated successfully. You can now log in.';
      }

      const errJson = await response.json().catch(() => ({}));
      throw new Error(errJson.detail || 'Failed to reset password.');
    } catch (networkErr: any) {
      if (networkErr.message?.includes('No account registered') || networkErr.message?.includes('Password must be')) {
        throw networkErr;
      }
      // Offline fallback
      const accounts = await this.getStoredAccounts();
      const idx = accounts.findIndex(acc => acc.user.email.toLowerCase() === cleanEmail);
      if (idx !== -1) {
        accounts[idx].passwordHash = cleanPass;
        await AsyncStorage.setItem(STORAGE_USERS_KEY, JSON.stringify(accounts));
        return 'Password updated locally (offline mode). You can now log in.';
      }
      throw new Error(networkErr.message || 'Unable to reset password. Please check your network.');
    }
  }

  /**
   * Clears the session and returns to login gate
   */
  async signOut(): Promise<void> {
    try {
      await Promise.all([
        AsyncStorage.removeItem(STORAGE_SESSION_KEY),
        AsyncStorage.removeItem(STORAGE_GUEST_KEY),
      ]);
    } catch {
      // ignore
    }
  }
}

export const authService = new AuthService();
export default authService;
