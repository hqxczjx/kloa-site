export type ChatForm = 'angel' | 'demon';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatRequest {
  form: ChatForm;
  topic?: string;
  message: string;
  history: ChatMessage[];
}

// Pages Function 环境变量绑定
export interface Env {
  AGNES_API_KEY: string;
}
