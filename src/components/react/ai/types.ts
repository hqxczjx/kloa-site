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

export interface ImageRequest {
  style: string;
  extra?: string;
  size: '1K' | '2K';
  ratio: '1:1' | '3:4' | '4:3' | '16:9' | '9:16';
}

export interface ImageResponse {
  url: string;
}
