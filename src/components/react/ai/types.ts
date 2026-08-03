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
