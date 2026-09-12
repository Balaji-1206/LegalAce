export type ActiveTab = 'home' | 'wizard' | 'situations' | 'deadlines' | 'profile' | 'xray' | 'legalaid' | 'rights';

export interface PendingActionItem {
  action_id: string;
  action_type: string;
  title: string;
  details: Record<string, unknown>;
  prompt_text: string;
  status?: 'pending' | 'approved' | 'rejected';
}

export interface LawCitation {
  act: string;
  section: string;
  section_title: string;
  relevance_score?: number;
  excerpt?: string;
  grounding_score?: number;
}

export interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  citations?: LawCitation[];
  rights?: string[];
  action_steps?: string[];
  disclaimer?: string;
  reasoning_trace?: string[];
  pending_actions?: PendingActionItem[];
  plan_objective?: string;
}

export interface ConversationSummary {
  conversation_id: string;
  title: string;
  created_at: string;
  updated_at: string;
  message_count: number;
}

export interface CategoryItem {
  id: string;
  name: string;
  icon: string;
  color?: string;
  color_gradient?: string[];
  situation_count?: number;
}

export interface SituationDetail {
  situation_id: string;
  title: string;
  category: string;
  description?: string;
  user_rights?: string[];
  action_steps?: string[];
  applicable_laws?: LawCitation[];
  important_deadlines?: string[];
  [key: string]: unknown;
}

export interface DeadlineItem {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  category: string;
  deadline_date: string;
  priority: 'high' | 'medium' | 'low';
  source_type: string;
  status: 'active' | 'completed' | 'expired';
  days_remaining: number;
  health_impact: number;
  created_at?: string;
}

export interface ExtractedDate {
  label: string;
  date: string;
  iso_date?: string | null;
}

export interface XRayResult {
  document_type: string;
  parties: string[];
  key_dates: ExtractedDate[];
  obligations: string[];
  redFlags?: string[];
  red_flags?: string[];
  suggested_limitation_rule_id?: string | null;
  suggested_wizard_scenario_id?: string | null;
  summary: string;
  confidence: number;
}

export interface LegalAidAuthority {
  name: string;
  authority_type: string;
  state: string;
  district: string;
  address: string;
  phone: string;
  email: string;
  website: string;
}

export interface LegalAidResult {
  eligible: boolean;
  qualifying_categories: string[];
  reasons: string[];
  suggested_authority: string | null;
  statutory_basis: string;
  disclaimer: string;
}

export interface WizardQuestion {
  id: string;
  text: string;
  text_ta?: string;
  text_hi?: string;
  type: 'boolean' | 'choice';
  options?: string[];
}

export interface WizardScenario {
  scenario_id: string;
  category: string;
  title: string;
  title_ta?: string;
  title_hi?: string;
  icon?: string;
  question_count?: number;
  questions?: WizardQuestion[];
}

export interface WizardActionStep {
  step_number: number;
  title: string;
  description: string;
  estimated_time: string;
  importance: string;
  applicable_law?: string;
}

export interface WizardAuthority {
  name: string;
  helpline: string;
  url: string;
  action: string;
}

export interface WizardTemplate {
  id: string;
  title: string;
  description: string;
}

export interface WizardActionPlan {
  title: string;
  steps: WizardActionStep[];
  required_documents: string[];
  authorities: WizardAuthority[];
  templates: WizardTemplate[];
  urgent: boolean;
  disclaimer: string;
}
