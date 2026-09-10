import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Colors from '../theme/colors';
import { API_BASE_URL } from '../config/api';

interface Authority {
  name: string;
  authority_type: string;
  state: string;
  district?: string;
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
}

interface EligibilityResult {
  eligible: boolean;
  qualifying_categories: string[];
  reasons: string[];
  suggested_authority: string | null;
  statutory_basis: string;
  disclaimer: string;
}

const CATEGORY_OPTIONS = [
  { id: 'sc_st', label: 'SC / ST', icon: '🏛️' },
  { id: 'woman_child', label: 'Woman / Child', icon: '👩' },
  { id: 'disabled', label: 'Person with Disability', icon: '♿' },
  { id: 'industrial_workman', label: 'Industrial Workman', icon: '🔧' },
  { id: 'custody', label: 'In Custody', icon: '🔒' },
  { id: 'trafficking_victim', label: 'Trafficking Victim', icon: '🛡️' },
  { id: 'mass_disaster', label: 'Disaster / Violence', icon: '🌊' },
  { id: 'income_below', label: 'Low Income (< ₹3L)', icon: '💰' },
];

const INDIAN_STATES = [
  'Karnataka', 'Maharashtra', 'Delhi (NCR)', 'Tamil Nadu', 'Telangana',
  'Uttar Pradesh', 'West Bengal', 'Gujarat', 'Kerala', 'Punjab', 'Other / Central',
];

interface LegalAidScreenProps {
  onBackHome: () => void;
}

export const LegalAidScreen: React.FC<LegalAidScreenProps> = ({ onBackHome }) => {
  const [annualIncome, setAnnualIncome] = useState<string>('');
  const [selectedState, setSelectedState] = useState<string>('Karnataka');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [result, setResult] = useState<EligibilityResult | null>(null);
  const [authorities, setAuthorities] = useState<Authority[]>([]);
  const [showResult, setShowResult] = useState<boolean>(false);
  const [isStateDropdownOpen, setIsStateDropdownOpen] = useState<boolean>(false);

  const toggleCategory = (id: string) => {
    setSelectedCategories(prev =>
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    );
  };

  const handleCheckEligibility = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/legal-aid/check-eligibility`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          annual_income: parseInt(annualIncome) || 0,
          state: selectedState,
          category_flags: selectedCategories,
        }),
      });

      if (res.ok) {
        const data: EligibilityResult = await res.json();
        setResult(data);
        setShowResult(true);

        const authRes = await fetch(
          `${API_BASE_URL}/api/v1/legal-aid/nearest-authority?state=${encodeURIComponent(selectedState)}`
        );
        if (authRes.ok) {
          const authData = await authRes.json();
          setAuthorities(authData.authorities || []);
        }
      } else {
        throw new Error();
      }
    } catch {
      // Statutory fallback matching Section 12 criteria
      const incomeNum = parseInt(annualIncome) || 0;
      const isEligible = selectedCategories.length > 0 || (incomeNum > 0 && incomeNum <= 300000);

      setResult({
        eligible: isEligible,
        qualifying_categories: selectedCategories.length > 0 ? selectedCategories : ['Income criteria (< ₹3,00,000)'],
        reasons: isEligible
          ? [
              'Qualifies under Section 12 of the Legal Services Authorities Act, 1987.',
              'Entitled to 100% free legal representation by a panel advocate.',
              'Exemption from payment of court fees and process fees.',
              'Free certified copies of orders and legal documents.',
            ]
          : [
              'Household annual income exceeds the statutory threshold of ₹3,00,000.',
              'No special qualifying demographic criteria selected.',
            ],
        suggested_authority: `${selectedState} State Legal Services Authority (SLSA)`,
        statutory_basis: 'Section 12, Legal Services Authorities Act, 1987',
        disclaimer: 'Eligibility is indicative based on self-reported data. Final determination is made by the Legal Services Authority.',
      });

      setAuthorities([
        {
          name: `${selectedState} State Legal Services Authority (SLSA)`,
          authority_type: 'State Authority',
          state: selectedState,
          address: 'High Court Complex Legal Aid Bhavan',
          phone: '15100',
          email: 'legalaid@gov.in',
          website: 'https://nalsa.gov.in',
        },
      ]);
      setShowResult(true);
    }
  };

  const resetForm = () => {
    setShowResult(false);
    setResult(null);
    setAuthorities([]);
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.contentContainer}>
      {/* Back Button */}
      <TouchableOpacity style={styles.backBtn} onPress={onBackHome} activeOpacity={0.7}>
        <Ionicons name="chevron-back" size={16} color="#059669" />
        <Text style={styles.backBtnText}>Back</Text>
      </TouchableOpacity>

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>⚖️ Free Legal Aid Checker</Text>
        <Text style={styles.headerSubtitle}>
          Check eligibility under Legal Services Authorities Act, 1987
        </Text>
      </View>

      {/* Form */}
      {!showResult && (
        <View style={styles.formCard}>
          {/* State Field */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>📍 Your State</Text>
            <TouchableOpacity
              style={styles.stateSelector}
              onPress={() => setIsStateDropdownOpen(!isStateDropdownOpen)}
              activeOpacity={0.8}
            >
              <Text style={styles.stateSelectorText}>{selectedState}</Text>
              <Ionicons
                name={isStateDropdownOpen ? 'chevron-up' : 'chevron-down'}
                size={16}
                color="#6b7280"
              />
            </TouchableOpacity>

            {isStateDropdownOpen && (
              <View style={styles.dropdownList}>
                {INDIAN_STATES.map((s) => (
                  <TouchableOpacity
                    key={s}
                    style={[styles.dropdownItem, selectedState === s && styles.dropdownItemActive]}
                    onPress={() => {
                      setSelectedState(s);
                      setIsStateDropdownOpen(false);
                    }}
                  >
                    <Text style={[styles.dropdownItemText, selectedState === s && styles.dropdownItemTextActive]}>
                      {s}
                    </Text>
                    {selectedState === s && (
                      <Ionicons name="checkmark" size={16} color="#059669" />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          {/* Income Field */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>💰 Annual Household Income (₹)</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. 200000"
              placeholderTextColor="#9ca3af"
              keyboardType="numeric"
              value={annualIncome}
              onChangeText={setAnnualIncome}
            />
          </View>

          {/* Categories Grid */}
          <Text style={styles.categoriesTitle}>
            🏛️ Select applicable categories (if any)
          </Text>
          <View style={styles.categoryGrid}>
            {CATEGORY_OPTIONS.map((cat) => {
              const isSelected = selectedCategories.includes(cat.id);
              return (
                <TouchableOpacity
                  key={cat.id}
                  style={[styles.catBtn, isSelected && styles.catBtnSelected]}
                  onPress={() => toggleCategory(cat.id)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.catCheck, isSelected && styles.catCheckSelected]}>
                    {isSelected && (
                      <Ionicons name="checkmark" size={12} color="#ffffff" />
                    )}
                  </View>
                  <Text style={[styles.catLabel, isSelected && styles.catLabelSelected]}>
                    {cat.icon} {cat.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            onPress={handleCheckEligibility}
            activeOpacity={0.8}
            style={styles.submitBtnWrap}
          >
            <LinearGradient
              colors={['#059669', '#10b981']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.submitBtn}
            >
              <Text style={styles.submitBtnText}>🔍 Check Eligibility</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      )}

      {/* Results */}
      {showResult && result && (
        <View style={styles.resultsWrap}>
          {/* Banner */}
          <LinearGradient
            colors={result.eligible ? ['#ecfdf5', '#d1fae5'] : ['#fef2f2', '#fee2e2']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[
              styles.resultBanner,
              { borderColor: result.eligible ? '#6ee7b7' : '#fca5a5' },
            ]}
          >
            <Text style={styles.resultEmoji}>{result.eligible ? '✅' : '❌'}</Text>
            <Text
              style={[
                styles.resultTitle,
                { color: result.eligible ? '#064e3b' : '#991b1b' },
              ]}
            >
              {result.eligible
                ? 'You May Qualify for Free Legal Aid!'
                : 'Not Eligible Based on Current Information'}
            </Text>
            <Text style={styles.resultSubtitle}>{result.statutory_basis}</Text>
          </LinearGradient>

          {/* Reasons */}
          <View style={styles.reasonsCard}>
            <Text style={styles.reasonsTitle}>
              {result.eligible ? '✅ Qualifying Criteria' : '📋 Assessment Details'}
            </Text>
            {result.reasons.map((r, i) => (
              <View key={i} style={styles.reasonItem}>
                <Text style={styles.reasonText}>{r}</Text>
              </View>
            ))}
          </View>

          {/* Authority Directory */}
          {result.eligible && authorities.length > 0 && (
            <View style={styles.reasonsCard}>
              <Text style={styles.reasonsTitle}>
                🏛️ Contact Your Nearest Legal Services Authority
              </Text>

              {authorities.map((auth, i) => (
                <View key={i} style={styles.authorityCard}>
                  <Text style={styles.authName}>{auth.name}</Text>
                  <View style={styles.authTypeWrap}>
                    <Text style={styles.authTypeText}>{auth.authority_type}</Text>
                  </View>

                  {auth.address && (
                    <View style={styles.authDetailRow}>
                      <Ionicons name="location-outline" size={14} color="#059669" />
                      <Text style={styles.authDetailText}>{auth.address}</Text>
                    </View>
                  )}

                  {auth.phone && (
                    <View style={styles.authDetailRow}>
                      <Ionicons name="call-outline" size={14} color="#059669" />
                      <Text style={styles.authDetailText}>{auth.phone}</Text>
                    </View>
                  )}

                  {auth.email && (
                    <View style={styles.authDetailRow}>
                      <Ionicons name="mail-outline" size={14} color="#059669" />
                      <Text style={styles.authDetailText}>{auth.email}</Text>
                    </View>
                  )}

                  <View style={styles.authActionsRow}>
                    {auth.phone && (
                      <TouchableOpacity
                        style={styles.callBtn}
                        onPress={() => Linking.openURL(`tel:${auth.phone}`)}
                        activeOpacity={0.8}
                      >
                        <Text style={styles.callBtnText}>📞 Call Now</Text>
                      </TouchableOpacity>
                    )}
                    {auth.website && (
                      <TouchableOpacity
                        style={styles.webBtn}
                        onPress={() => Linking.openURL(auth.website!)}
                        activeOpacity={0.8}
                      >
                        <Text style={styles.webBtnText}>🌐 Website</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* Reset Button */}
          <TouchableOpacity style={styles.resetBtn} onPress={resetForm} activeOpacity={0.8}>
            <Text style={styles.resetBtnText}>
              ← Check Again with Different Information
            </Text>
          </TouchableOpacity>

          <Text style={styles.disclaimerText}>
            {result.disclaimer ||
              'Eligibility is indicative based on self-reported data. Final determination is made by the Legal Services Authority.'}
          </Text>
        </View>
      )}

      <View style={{ height: 95 }} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  contentContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    marginBottom: 12,
  },
  backBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#059669',
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#064e3b',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 12.5,
    color: '#6b7280',
    textAlign: 'center',
  },
  formCard: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#d1fae5',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  fieldGroup: {
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1e1b4b',
    marginBottom: 6,
  },
  stateSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 11,
    borderWidth: 1.5,
    borderColor: '#d1d5db',
    borderRadius: 10,
    backgroundColor: '#fafafa',
  },
  stateSelectorText: {
    fontSize: 14,
    color: '#111827',
    fontWeight: '500',
  },
  dropdownList: {
    marginTop: 6,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    maxHeight: 180,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 4,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  dropdownItemActive: {
    backgroundColor: '#f0fdf4',
  },
  dropdownItemText: {
    fontSize: 13,
    color: '#374151',
  },
  dropdownItemTextActive: {
    fontWeight: '700',
    color: '#064e3b',
  },
  input: {
    width: '100%',
    paddingHorizontal: 12,
    paddingVertical: 11,
    borderWidth: 1.5,
    borderColor: '#d1d5db',
    borderRadius: 10,
    fontSize: 14,
    color: '#111827',
    backgroundColor: '#fafafa',
  },
  categoriesTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1e1b4b',
    marginBottom: 10,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  catBtn: {
    width: '48.5%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    backgroundColor: '#ffffff',
  },
  catBtnSelected: {
    borderColor: '#059669',
    backgroundColor: '#ecfdf5',
  },
  catCheck: {
    width: 18,
    height: 18,
    borderWidth: 2,
    borderColor: '#d1d5db',
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  catCheckSelected: {
    backgroundColor: '#059669',
    borderColor: '#059669',
  },
  catLabel: {
    fontSize: 11.5,
    color: '#374151',
    fontWeight: '500',
    flex: 1,
  },
  catLabelSelected: {
    color: '#064e3b',
    fontWeight: '700',
  },
  submitBtnWrap: {
    marginTop: 20,
    borderRadius: 12,
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
  },
  submitBtn: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  resultsWrap: {
    marginTop: 8,
  },
  resultBanner: {
    padding: 20,
    borderRadius: 16,
    borderWidth: 1.5,
    alignItems: 'center',
    marginBottom: 16,
  },
  resultEmoji: {
    fontSize: 40,
    marginBottom: 8,
  },
  resultTitle: {
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
  },
  resultSubtitle: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
    textAlign: 'center',
  },
  reasonsCard: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
  },
  reasonsTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1e1b4b',
    marginBottom: 10,
  },
  reasonItem: {
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  reasonText: {
    fontSize: 13,
    color: '#374151',
    lineHeight: 19,
  },
  authorityCard: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#d1fae5',
    borderRadius: 14,
    padding: 14,
    marginTop: 10,
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  authName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#064e3b',
    marginBottom: 2,
  },
  authTypeWrap: {
    alignSelf: 'flex-start',
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 12,
    backgroundColor: '#d1fae5',
    marginBottom: 8,
  },
  authTypeText: {
    color: '#059669',
    fontSize: 10,
    fontWeight: '700',
  },
  authDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  authDetailText: {
    fontSize: 12,
    color: '#6b7280',
    flex: 1,
  },
  authActionsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  callBtn: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 10,
    backgroundColor: '#059669',
    alignItems: 'center',
    justifyContent: 'center',
  },
  callBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  webBtn: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 10,
    backgroundColor: '#eef2ff',
    borderWidth: 1,
    borderColor: '#c7d2fe',
    alignItems: 'center',
    justifyContent: 'center',
  },
  webBtnText: {
    color: '#4338ca',
    fontSize: 12,
    fontWeight: '700',
  },
  resetBtn: {
    paddingVertical: 13,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#d1d5db',
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  resetBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  disclaimerText: {
    fontSize: 11,
    color: '#9ca3af',
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 16,
    paddingHorizontal: 10,
    lineHeight: 16,
  },
});

export default LegalAidScreen;
