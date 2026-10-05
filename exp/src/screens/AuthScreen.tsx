import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ImageBackground,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../theme/colors';
import { UserProfile } from '../types';
import { authService, DEMO_CREDENTIALS } from '../services/authService';

interface AuthScreenProps {
  onLoginSuccess: (user: UserProfile) => void;
  onContinueAsGuest?: () => void;
}

const INDIAN_STATES = [
  'Delhi (NCR)',
  'Maharashtra',
  'Tamil Nadu',
  'Karnataka',
  'Telangana',
  'Uttar Pradesh',
  'West Bengal',
  'Gujarat',
  'Other',
];

export const AuthScreen: React.FC<AuthScreenProps> = ({
  onLoginSuccess,
}) => {
  const [isSignUp, setIsSignUp] = useState(false);

  // Form fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [selectedState, setSelectedState] = useState('Delhi (NCR)');
  const [rememberMe, setRememberMe] = useState(true);

  // UI state
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  // Forgot / Reset Password state
  const [isResetModalVisible, setIsResetModalVisible] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetNewPassword, setResetNewPassword] = useState('');
  const [resetConfirmPassword, setResetConfirmPassword] = useState('');
  const [resetShowPassword, setResetShowPassword] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);
  const [resetSuccess, setResetSuccess] = useState<string | null>(null);

  const handleSignIn = async () => {
    setErrorMessage(null);
    setInfoMessage(null);
    setLoading(true);
    try {
      const user = await authService.signIn(email, password);
      onLoginSuccess(user);
    } catch (err: any) {
      setErrorMessage(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async () => {
    setErrorMessage(null);
    setInfoMessage(null);
    setLoading(true);
    try {
      const user = await authService.signUp({
        name,
        email,
        password,
        state: selectedState,
      });
      onLoginSuccess(user);
    } catch (err: any) {
      setErrorMessage(err.message || 'Sign up failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenResetModal = () => {
    setResetEmail(email.trim());
    setResetNewPassword('');
    setResetConfirmPassword('');
    setResetError(null);
    setResetSuccess(null);
    setIsResetModalVisible(true);
  };

  const handleResetPassword = async () => {
    setResetError(null);
    setResetSuccess(null);

    const cleanEmail = resetEmail.trim().toLowerCase();
    const cleanPass = resetNewPassword.trim();
    const cleanConfirm = resetConfirmPassword.trim();

    if (!cleanEmail || !cleanEmail.includes('@')) {
      setResetError('Please enter a valid email address.');
      return;
    }
    if (cleanPass.length < 6) {
      setResetError('New password must be at least 6 characters long.');
      return;
    }
    if (cleanPass !== cleanConfirm) {
      setResetError('Passwords do not match.');
      return;
    }

    setResetLoading(true);
    try {
      const msg = await authService.resetPassword(cleanEmail, cleanPass);
      setResetSuccess(msg);
      setEmail(cleanEmail);
      setPassword(cleanPass);
      setTimeout(() => {
        setIsResetModalVisible(false);
        setInfoMessage('Password updated! You can now log in with your new password.');
        setTimeout(() => setInfoMessage(null), 6000);
      }, 1500);
    } catch (err: any) {
      setResetError(err.message || 'Failed to reset password. Please try again.');
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <ImageBackground
      source={require('../../assets/auth_background.jpg')}
      style={styles.backgroundImage}
      resizeMode="cover"
    >
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Top Spacing */}
          <View style={styles.topSpacer} />

          {/* Clean Modern Typography Brand Section (No weight machine / scale logo) */}
          <View style={styles.brandContainer}>
            <Text style={styles.brandTitle}>
              Legal<Text style={styles.brandAce}>Ace</Text>
            </Text>
            <Text style={styles.brandSubtitle}>
              Your Legal Companion for Everyday Life
            </Text>
            <Text style={styles.brandTagline}>
              Know Your Rights  •  Ask  •  Understand  •  Take Action
            </Text>
          </View>

          {/* White Centered Card Form */}
          <View style={styles.formCard}>
            <Text style={styles.cardHeaderTitle}>
              {isSignUp ? 'Create Account' : 'Welcome Back'}
            </Text>
            <Text style={styles.cardHeaderSubtitle}>
              {isSignUp
                ? 'Sign up to start your legal journey'
                : 'Login to continue your legal journey'}
            </Text>

            {errorMessage && (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle" size={16} color="#dc2626" />
                <Text style={styles.errorText}>{errorMessage}</Text>
              </View>
            )}

            {infoMessage && (
              <View style={styles.infoBox}>
                <Ionicons name="information-circle" size={16} color="#4338ca" />
                <Text style={styles.infoText}>{infoMessage}</Text>
              </View>
            )}

            {/* Sign Up: Name Field */}
            {isSignUp && (
              <View style={styles.inputWrapper}>
                <Ionicons
                  name="person-outline"
                  size={19}
                  color="#94a3b8"
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.textInput}
                  placeholder="Enter your full name"
                  placeholderTextColor="#94a3b8"
                  value={name}
                  onChangeText={setName}
                  autoCapitalize="words"
                />
              </View>
            )}

            {/* Email Field */}
            <View style={styles.inputWrapper}>
              <Ionicons
                name="mail-outline"
                size={19}
                color="#94a3b8"
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.textInput}
                placeholder="Enter your email address"
                placeholderTextColor="#94a3b8"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            {/* Password Field */}
            <View style={styles.inputWrapper}>
              <Ionicons
                name="lock-closed-outline"
                size={19}
                color="#94a3b8"
                style={styles.inputIcon}
              />
              <TextInput
                style={[styles.textInput, { flex: 1 }]}
                placeholder={isSignUp ? 'Enter a password (min 6 chars)' : 'Enter your password'}
                placeholderTextColor="#94a3b8"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
              />
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                style={styles.eyeButton}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons
                  name={showPassword ? 'eye-outline' : 'eye-off-outline'}
                  size={19}
                  color="#94a3b8"
                />
              </TouchableOpacity>
            </View>

            {/* Sign Up: State Jurisdiction selector */}
            {isSignUp && (
              <View style={styles.stateSelectorWrap}>
                <Text style={styles.stateLabel}>State / Jurisdiction</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.stateScroll}>
                  {INDIAN_STATES.map(st => (
                    <TouchableOpacity
                      key={st}
                      style={[styles.stateChip, selectedState === st && styles.stateChipActive]}
                      onPress={() => setSelectedState(st)}
                    >
                      <Text style={[styles.stateChipText, selectedState === st && styles.stateChipTextActive]}>
                        {st}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* Options Row: Remember Me & Forgot Password */}
            {!isSignUp && (
              <View style={styles.optionsRow}>
                <TouchableOpacity
                  style={styles.rememberMeWrap}
                  onPress={() => setRememberMe(!rememberMe)}
                  activeOpacity={0.8}
                >
                  <View style={[styles.checkbox, rememberMe && styles.checkboxChecked]}>
                    {rememberMe && <Ionicons name="checkmark" size={13} color="#ffffff" />}
                  </View>
                  <Text style={styles.rememberMeText}>Remember me</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={handleOpenResetModal}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Main Action Button */}
            <TouchableOpacity
              style={[styles.actionButton, loading && styles.actionButtonDisabled]}
              onPress={isSignUp ? handleSignUp : handleSignIn}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator color="#ffffff" size="small" />
              ) : (
                <>
                  <Text style={styles.actionButtonText}>
                    {isSignUp ? 'Sign Up' : 'Login'}
                  </Text>
                  <Ionicons name="arrow-forward" size={18} color="#ffffff" />
                </>
              )}
            </TouchableOpacity>

            {/* Bottom Switcher */}
            <View style={styles.switchModeContainer}>
              <Text style={styles.switchModeText}>
                {isSignUp ? 'Already have an account? ' : "Don't have an account? "}
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setIsSignUp(!isSignUp);
                  setErrorMessage(null);
                  setInfoMessage(null);
                }}
                hitSlop={{ top: 8, bottom: 8, left: 4, right: 8 }}
              >
                <Text style={styles.switchModeHighlight}>
                  {isSignUp ? 'Login' : 'Sign Up'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Bottom Cursive Quote from Mockup */}
          <View style={styles.footerQuoteContainer}>
            <Text style={styles.footerQuote}>
              A more informed society,
            </Text>
            <Text style={styles.footerQuote}>
              a fairer tomorrow.
            </Text>
            <View style={styles.quoteUnderline} />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Direct In-App Reset Password Modal (Zero External Keys) */}
      <Modal
        visible={isResetModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsResetModalVisible(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={styles.modalIconWrap}>
                <Ionicons name="key-outline" size={22} color="#4f46e5" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitle}>Reset Password</Text>
                <Text style={styles.modalSubtitle}>Update your password directly in MongoDB</Text>
              </View>
              <TouchableOpacity
                onPress={() => setIsResetModalVisible(false)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="close" size={22} color="#64748b" />
              </TouchableOpacity>
            </View>

            {resetError && (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle" size={16} color="#dc2626" />
                <Text style={styles.errorText}>{resetError}</Text>
              </View>
            )}

            {resetSuccess && (
              <View style={styles.successBox}>
                <Ionicons name="checkmark-circle" size={16} color="#16a34a" />
                <Text style={styles.successText}>{resetSuccess}</Text>
              </View>
            )}

            {/* Email Field */}
            <View style={styles.inputWrapper}>
              <Ionicons name="mail-outline" size={19} color="#94a3b8" style={styles.inputIcon} />
              <TextInput
                style={styles.textInput}
                placeholder="Enter your registered email"
                placeholderTextColor="#94a3b8"
                value={resetEmail}
                onChangeText={setResetEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            {/* New Password */}
            <View style={styles.inputWrapper}>
              <Ionicons name="lock-closed-outline" size={19} color="#94a3b8" style={styles.inputIcon} />
              <TextInput
                style={[styles.textInput, { flex: 1 }]}
                placeholder="New password (min 6 chars)"
                placeholderTextColor="#94a3b8"
                value={resetNewPassword}
                onChangeText={setResetNewPassword}
                secureTextEntry={!resetShowPassword}
                autoCapitalize="none"
              />
              <TouchableOpacity
                onPress={() => setResetShowPassword(!resetShowPassword)}
                style={styles.eyeButton}
              >
                <Ionicons
                  name={resetShowPassword ? 'eye-outline' : 'eye-off-outline'}
                  size={19}
                  color="#94a3b8"
                />
              </TouchableOpacity>
            </View>

            {/* Confirm New Password */}
            <View style={styles.inputWrapper}>
              <Ionicons name="shield-checkmark-outline" size={19} color="#94a3b8" style={styles.inputIcon} />
              <TextInput
                style={styles.textInput}
                placeholder="Confirm new password"
                placeholderTextColor="#94a3b8"
                value={resetConfirmPassword}
                onChangeText={setResetConfirmPassword}
                secureTextEntry={!resetShowPassword}
                autoCapitalize="none"
              />
            </View>

            {/* Modal Buttons */}
            <View style={styles.modalActionsRow}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setIsResetModalVisible(false)}
                disabled={resetLoading}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalSubmitBtn, resetLoading && styles.actionButtonDisabled]}
                onPress={handleResetPassword}
                disabled={resetLoading}
              >
                {resetLoading ? (
                  <ActivityIndicator color="#ffffff" size="small" />
                ) : (
                  <Text style={styles.modalSubmitText}>Update Password</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </ImageBackground>
  );
};

export default AuthScreen;

const styles = StyleSheet.create({
  backgroundImage: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 28,
  },
  topSpacer: {
    height: Platform.OS === 'ios' ? 52 : 36,
  },
  brandContainer: {
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  brandTitle: {
    fontSize: 34,
    fontWeight: '800',
    color: '#1e1b4b',
    letterSpacing: -0.5,
  },
  brandAce: {
    color: '#4f46e5',
  },
  brandSubtitle: {
    fontSize: 14.5,
    fontWeight: '600',
    color: '#475569',
    marginTop: 6,
    textAlign: 'center',
  },
  brandTagline: {
    fontSize: 11.5,
    color: '#64748b',
    marginTop: 8,
    textAlign: 'center',
    letterSpacing: 0.2,
  },
  formCard: {
    backgroundColor: '#ffffff',
    marginHorizontal: 20,
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingVertical: 24,
    shadowColor: '#1e1b4b',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 22,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  cardHeaderTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0f172a',
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  cardHeaderSubtitle: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 20,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    padding: 10,
    borderRadius: 10,
    gap: 8,
    marginBottom: 16,
  },
  errorText: {
    color: '#b91c1c',
    fontSize: 12.5,
    fontWeight: '500',
    flex: 1,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eef2ff',
    borderWidth: 1,
    borderColor: '#c7d2fe',
    padding: 10,
    borderRadius: 10,
    gap: 8,
    marginBottom: 16,
  },
  infoText: {
    color: '#3730a3',
    fontSize: 12,
    fontWeight: '500',
    flex: 1,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1.2,
    borderColor: '#e2e8f0',
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 50,
    marginBottom: 14,
  },
  inputIcon: {
    marginRight: 10,
  },
  textInput: {
    flex: 1,
    fontSize: 14,
    color: '#1e293b',
    paddingVertical: 0,
  },
  eyeButton: {
    padding: 4,
  },
  stateSelectorWrap: {
    marginBottom: 14,
  },
  stateLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 6,
  },
  stateScroll: {
    flexDirection: 'row',
  },
  stateChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginRight: 8,
  },
  stateChipActive: {
    backgroundColor: '#eef2ff',
    borderColor: '#4f46e5',
  },
  stateChipText: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
  },
  stateChipTextActive: {
    color: '#4f46e5',
    fontWeight: '700',
  },
  optionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
    marginTop: 2,
  },
  rememberMeWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: '#cbd5e1',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
  },
  checkboxChecked: {
    backgroundColor: '#4f46e5',
    borderColor: '#4f46e5',
  },
  rememberMeText: {
    fontSize: 12.5,
    color: '#475569',
    fontWeight: '500',
  },
  forgotPasswordText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#4f46e5',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4f46e5',
    paddingVertical: 14,
    borderRadius: 14,
    gap: 8,
    shadowColor: '#4f46e5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 10,
    elevation: 3,
  },
  actionButtonDisabled: {
    opacity: 0.65,
  },
  actionButtonText: {
    color: '#ffffff',
    fontSize: 15.5,
    fontWeight: '700',
  },
  switchModeContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 18,
  },
  switchModeText: {
    fontSize: 13,
    color: '#64748b',
  },
  switchModeHighlight: {
    fontSize: 13,
    fontWeight: '700',
    color: '#4f46e5',
  },
  footerQuoteContainer: {
    alignItems: 'center',
    marginTop: 22,
    paddingHorizontal: 20,
  },
  footerQuote: {
    fontStyle: 'italic',
    fontSize: 13.5,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 19,
    fontFamily: Platform.OS === 'ios' ? 'Snell Roundhand' : undefined,
  },
  quoteUnderline: {
    width: 60,
    height: 2,
    backgroundColor: '#c7d2fe',
    borderRadius: 1,
    marginTop: 6,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 22,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  modalIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#eef2ff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
  },
  modalSubtitle: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  modalActionsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f1f5f9',
  },
  modalCancelText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
  },
  modalSubmitBtn: {
    flex: 2,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4f46e5',
  },
  modalSubmitText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
  },
  successBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#bbf7d0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
    marginBottom: 14,
  },
  successText: {
    color: '#16a34a',
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
  },
});
