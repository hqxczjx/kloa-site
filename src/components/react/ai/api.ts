import type { ChatRequest } from './types';

export interface StreamCallbacks {
  onDelta: (text: string) => void;
  onDone: () => void;
  onError: (message: string) => void;
}

export async function streamChat(req: ChatRequest, cb: StreamCallbacks, signal?: AbortSignal): Promise<void> {
  let res: Response;
  try {
    res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(req),
      signal,
    });
  } catch {
    cb.onError('网络错误，请重试');
    return;
  }

  if (!res.ok) {
    let message = '生成失败，请重试';
    try {
      message = ((await res.json()) as { error?: string }).error ?? message;
    } catch { /* 保留默认 */ }
    cb.onError(message);
    return;
  }

  const reader = res.body?.getReader();
  if (!reader) {
    cb.onError('流读取失败');
    return;
  }
  const decoder = new TextDecoder();
  let buffer = '';
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith('data:')) continue;
        const data = trimmed.slice(5).trim();
        if (data === '[DONE]') { cb.onDone(); return; }
        try {
          const parsed = JSON.parse(data) as { choices?: { delta?: { content?: string } }[] };
          const delta = parsed.choices?.[0]?.delta?.content;
          if (delta) cb.onDelta(delta);
        } catch { /* 忽略 keep-alive / 半包 */ }
      }
    }
    cb.onDone();
  } catch {
    cb.onError('回复中断');
  }
}

export const TOPICS = ['今天开心的事', '推荐一首歌', '天使和恶魔哪个是真的', '说句鼓励我的话'] as const;
