export interface PendingActionItem {
  action_id: string;
  action_type: string;
  title: string;
  details: Record<string, unknown>;
  prompt_text: string;
  status?: 'pending' | 'approved' | 'rejected';
}

export interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  citations?: {
    act: string;
    section: string;
    section_title: string;
    relevance_score: number;
  }[];
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
