import { AGNES_BASE_URL } from './config';

export function normalizeAgnesError(status: number): { status: number; message: string } {
  if (status === 401) return { status: 502, message: '服务配置问题，暂时无法使用' };
  if (status === 503) return { status: 503, message: 'AI 服务繁忙，请稍后重试' };
  if (status >= 500) return { status: 502, message: '生成失败，请重试' };
  return { status: 400, message: '请求有误，请检查输入' };
}

export function agnesHeaders(apiKey: string): HeadersInit {
  return {
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
  };
}

export function agnesChatUrl(): string {
  return `${AGNES_BASE_URL}/chat/completions`;
}
