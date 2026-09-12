import AsyncStorage from '@react-native-async-storage/async-storage';
import { SituationDetail, CategoryItem } from '../types';

export const CACHE_KEYS = {
  SITUATIONS: '@legalace_cached_situations',
  CATEGORIES: '@legalace_cached_categories',
  RIGHTS: '@legalace_cached_rights',
  TEMPLATES: '@legalace_cached_templates',
  OUTCOMES: '@legalace_cached_outcomes',
};

/**
 * Save data payload to persistent offline storage
 */
export async function saveToOfflineCache<T>(key: string, data: T): Promise<void> {
  try {
    const payload = JSON.stringify({
      timestamp: Date.now(),
      data,
    });
    await AsyncStorage.setItem(key, payload);
  } catch (err) {
    console.warn(`[OfflineCache] Failed to save ${key}:`, err);
  }
}

/**
 * Retrieve cached data with optional fallback
 */
export async function loadFromOfflineCache<T>(key: string, fallback?: T): Promise<T | null> {
  try {
    const item = await AsyncStorage.getItem(key);
    if (!item) {
      return fallback ?? null;
    }
    const parsed = JSON.parse(item);
    return (parsed.data as T) ?? fallback ?? null;
  } catch (err) {
    console.warn(`[OfflineCache] Failed to read ${key}:`, err);
    return fallback ?? null;
  }
}

/**
 * Ping backend API to verify live network connectivity with timeout
 */
export async function checkBackendReachability(baseUrl: string, timeoutMs: number = 2500): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    const res = await fetch(`${baseUrl}/api/v1/situations/categories`, {
      method: 'GET',
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Curated offline emergency situation dataset for low connectivity regions
 */
export const STATIC_OFFLINE_SITUATIONS: SituationDetail[] = [
  {
    situation_id: 'sit_retrenchment',
    title: 'Wrongful Job Termination Without Notice',
    category: 'employment',
    description: 'Employer terminating service immediately without 30 days notice or retrenchment compensation.',
    user_rights: [
      'Right to 30 days written notice or pay in lieu (Sec 25F Industrial Disputes Act).',
      'Right to retrenchment compensation (15 days average pay per completed year).',
      'Protection against arbitrary firing without enquiry.',
    ],
    action_steps: [
      'Collect appointment letter, salary slips, and written email termination order.',
      'Issue a statutory legal demand notice through an advocate or registered speed post.',
      'File a conciliation petition before the Regional Labour Commissioner (ALC).',
    ],
    applicable_laws: [
      { act: 'Industrial Disputes Act, 1947', section: 'Section 25F', section_title: 'Conditions precedent to retrenchment' },
    ],
  },
  {
    situation_id: 'sit_security_deposit',
    title: 'Landlord Withholding Security Deposit',
    category: 'housing',
    description: 'Owner refusing to refund the rental advance after peaceful handover of keys.',
    user_rights: [
      'Mandatory return of deposit within 30 days of vacating under Model Tenancy Act.',
      'Landlord cannot make arbitrary deductions without providing itemized repair bills.',
      'Capped maximum deposit of 2 months rent for residential premises.',
    ],
    action_steps: [
      'Send keys via registered acknowledgement or video record key handover.',
      'Issue a 15-day statutory demand notice seeking refund with 18% interest.',
      'Approach the Rent Authority / Rent Tribunal under Tenancy Act.',
    ],
    applicable_laws: [
      { act: 'Model Tenancy Act, 2021', section: 'Section 11', section_title: 'Security Deposit Rules' },
      { act: 'Transfer of Property Act, 1882', section: 'Section 108(q)', section_title: 'Refund of Lessee Advances' },
    ],
  },
  {
    situation_id: 'sit_phone_search',
    title: 'Police Searching Mobile Device During Check',
    category: 'cyber_crime',
    description: 'Police officer demanding device unlock or checking WhatsApp messages on public road.',
    user_rights: [
      'Police cannot arbitrarily search phone contents without recorded reasonable suspicion (CrPC 165).',
      'Right to privacy is a fundamental constitutional guarantee under Article 21 (Puttaswamy 2017).',
      'Right to remain silent against self-incrimination under Article 20(3).',
    ],
    action_steps: [
      'Politely ask for the officer name, badge number, and legal provision under which search is demanded.',
      'Do not consent to arbitrary copying of private photos or chats.',
      'Complain to the Superintendent of Police (SP) or State Police Complaints Authority if harassed.',
    ],
    applicable_laws: [
      { act: 'Code of Criminal Procedure, 1973', section: 'Section 165', section_title: 'Search by Police Officer' },
      { act: 'Constitution of India', section: 'Article 21', section_title: 'Protection of Life and Personal Liberty' },
    ],
  },
  {
    situation_id: 'sit_defective_product',
    title: 'Defective Product & E-Commerce Refund Denial',
    category: 'consumer',
    description: 'Seller or platform refusing return or replacement of malfunctioning electronics.',
    user_rights: [
      'Right to replacement or 100% refund with interest under Section 39 Consumer Protection Act.',
      'Protection against unfair trade practices and misleading warranty terms.',
      'Right to file e-Daakhil consumer complaint from home without hiring a lawyer.',
    ],
    action_steps: [
      'Preserve purchase invoice, unboxing photos/video, and courier delivery slip.',
      'Lodge grievance on National Consumer Helpline (NCH Portal / 1915).',
      'File complaint before District Consumer Disputes Redressal Commission via e-Daakhil.',
    ],
    applicable_laws: [
      { act: 'Consumer Protection Act, 2019', section: 'Section 35', section_title: 'Manner of Consumer Complaint' },
      { act: 'Consumer Protection Act, 2019', section: 'Section 39', section_title: 'Order by District Commission' },
    ],
  },
];
