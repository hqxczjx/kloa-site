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

// Worker 环境绑定（Workers + Static Assets）
export interface Env {
  AGNES_API_KEY: string;
  ASSETS: Fetcher;
}
