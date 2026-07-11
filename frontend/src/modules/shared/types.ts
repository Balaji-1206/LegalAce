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
}

export interface ConversationSummary {
  conversation_id: string;
  title: string;
  created_at: string;
  updated_at: string;
  message_count: number;
}
