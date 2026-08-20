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

  it('HTTP 错误且 body 非 JSON(网关 502 返 HTML)时保留默认文案', async () => {
    const onError = vi.fn();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('<html>502</html>', { status: 502 })));
    await streamChat({ form: 'angel', message: 'hi', history: [] }, { onDelta: vi.fn(), onDone: vi.fn(), onError });
    // L26 res.json() 解析 HTML 抛错 → L27 catch 保留 L24 默认文案
    expect(onError).toHaveBeenCalledWith('生成失败，请重试');
  });

  it('res.body 为 null 时 onError(流读取失败)', async () => {
    const onError = vi.fn();
    // happy-dom 下 null body 构造出的 Response 其 body 属性即为 null
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      new Response(null, { status: 200, headers: { 'content-type': 'text/event-stream' } })
    ));
    await streamChat({ form: 'angel', message: 'hi', history: [] }, { onDelta: vi.fn(), onDone: vi.fn(), onError });
    expect(onError).toHaveBeenCalledWith('流读取失败'); // L32-35 getReader() 拿不到 reader
  });

  it('流读取中途抛错时 onError(回复中断)', async () => {
    const onDelta = vi.fn();
    const onError = vi.fn();
    const enc = new TextEncoder();
    let pulls = 0;
    const stream = new ReadableStream({
      pull(controller) {
        // 用 pull 而非 start+error:error() 会立刻丢弃已入队 chunk;
        // 首次 pull 发一条 delta,第二次 pull 抛错使流进入 errored
        if (pulls++ === 0) controller.enqueue(enc.encode('data: {"choices":[{"delta":{"content":"你"}}]}\n\n'));
        else throw new Error('aborted');
      },
    });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      new Response(stream, { status: 200, headers: { 'content-type': 'text/event-stream' } })
    ));
    await streamChat({ form: 'angel', message: 'hi', history: [] }, { onDelta, onDone: vi.fn(), onError });
    expect(onDelta).toHaveBeenCalledWith('你'); // 中断前的 chunk 正常送达
    expect(onError).toHaveBeenCalledWith('回复中断'); // L59-61 read() 抛错 → catch
  });

  it('AbortSignal 透传给 fetch', async () => {
    const fetchMock = vi.fn().mockResolvedValue(sseResponse(['data: [DONE]\n\n']));
    vi.stubGlobal('fetch', fetchMock);
    const ac = new AbortController();
    await streamChat({ form: 'angel', message: 'hi', history: [] }, { onDelta: vi.fn(), onDone: vi.fn(), onError: vi.fn() }, ac.signal);
    expect(fetchMock.mock.calls[0][1]).toMatchObject({ signal: ac.signal }); // L16 signal 进 fetch init
  });
});

describe('TOPICS 同步', () => {
  it('前端 TOPICS 与后端 TOPIC_HINTS key 完全一致', () => {
    expect([...TOPICS].sort()).toEqual(Object.keys(TOPIC_HINTS).sort());
  });
});
