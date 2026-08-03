import { describe, it, expect, vi } from 'vitest';
import { streamChat, TOPICS } from '../../../../src/components/react/ai/api';
import { TOPIC_HINTS } from '../../../../worker/_lib/prompts';

function sseResponse(chunks: string[]): Response {
  const enc = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      for (const c of chunks) controller.enqueue(enc.encode(c));
      controller.close();
    },
  });
  return new Response(stream, { status: 200, headers: { 'content-type': 'text/event-stream' } });
}

describe('streamChat', () => {
  it('解析 OpenAI 兼容 SSE 并累加 delta', async () => {
    const onDelta = vi.fn();
    const onDone = vi.fn();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(sseResponse([
      'data: {"choices":[{"delta":{"content":"你"}}]}\n\n',
      'data: {"choices":[{"delta":{"content":"好"}}]}\n\n',
      'data: [DONE]\n\n',
    ])));
    await streamChat({ form: 'angel', message: 'hi', history: [] }, { onDelta, onDone, onError: vi.fn() });
    expect(onDelta).toHaveBeenNthCalledWith(1, '你');
    expect(onDelta).toHaveBeenNthCalledWith(2, '好');
    expect(onDone).toHaveBeenCalledOnce();
  });

  it('HTTP 错误时回调 onError 并带文案', async () => {
    const onError = vi.fn();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: '繁忙' }), { status: 503 })));
    await streamChat({ form: 'angel', message: 'hi', history: [] }, { onDelta: vi.fn(), onDone: vi.fn(), onError });
    expect(onError).toHaveBeenCalledWith('繁忙');
  });

  it('网络异常时 onError', async () => {
    const onError = vi.fn();
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('net')));
    await streamChat({ form: 'angel', message: 'hi', history: [] }, { onDelta: vi.fn(), onDone: vi.fn(), onError });
    expect(onError).toHaveBeenCalledWith('网络错误，请重试');
  });
});

describe('TOPICS 同步', () => {
  it('前端 TOPICS 与后端 TOPIC_HINTS key 完全一致', () => {
    expect([...TOPICS].sort()).toEqual(Object.keys(TOPIC_HINTS).sort());
  });
});
