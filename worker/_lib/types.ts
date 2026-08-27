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
  // Workers Rate Limiting binding（全局 RateLimit 类型来自 @cloudflare/workers-types），
  // 声明见 wrangler.jsonc 的 ratelimits：生成端点 10/60s、video-status 轮询 60/60s
  RATE_LIMITER: RateLimit;
  RATE_LIMITER_STATUS: RateLimit;
}
