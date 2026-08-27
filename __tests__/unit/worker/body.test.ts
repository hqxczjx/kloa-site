import { describe, it, expect } from 'vitest';
import { readJsonBody } from '../../../worker/_lib/body';

function makeRequest(body: string, headers: Record<string, string> = {}): Request {
  return new Request('https://kloa.fans/api/chat', {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body,
  });
}

// Content-Length 预检路径用最小 stub：真实 Request 是否自动带 content-length 取决于运行时，
// stub 确定性地走预检分支，且能断言“超限时根本不读 body”
function stubRequest(headers: Record<string, string>, text?: () => Promise<string>): Request {
  return {
    headers: new Headers(headers),
    ...(text ? { text } : {}),
  } as unknown as Request;
}

describe('readJsonBody', () => {
  it('正常 JSON 解析为对象', async () => {
    const r = await readJsonBody<{ a: number }>(makeRequest('{"a":1}'));
    expect(r).toEqual({ ok: true, body: { a: 1 } });
  });

  it('application/json; charset=utf-8 放行', async () => {
    const r = await readJsonBody(makeRequest('{"a":1}', { 'content-type': 'application/json; charset=utf-8' }));
    expect(r.ok).toBe(true);
  });

  it('+json 后缀媒体类型放行', async () => {
    const r = await readJsonBody(makeRequest('{}', { 'content-type': 'application/vnd.api+json' }));
    expect(r.ok).toBe(true);
  });

  it('Content-Length 超限返回 413 且不读 body', async () => {
    let read = false;
    const req = stubRequest(
      { 'content-length': '100' },
      () => { read = true; return Promise.resolve('{}'); }
    );
    const r = await readJsonBody(req, 64);
    expect(r).toEqual({ ok: false, status: 413, error: '请求体过大（限 64KB）' });
    expect(read).toBe(false);
  });

  it('chunked 无 Content-Length：读后超限返回 413', async () => {
    const req = stubRequest({ 'content-type': 'application/json' }, () => Promise.resolve('x'.repeat(100)));
    const r = await readJsonBody(req, 64);
    expect(r).toEqual({ ok: false, status: 413, error: '请求体过大（限 64KB）' });
  });

  it('复核按 UTF-8 字节数而非字符数（CJK 1 字 = 3 字节）', async () => {
    const req = stubRequest({ 'content-type': 'application/json' }, () => Promise.resolve('汉'.repeat(10))); // 10 字符 / 30 字节
    const r = await readJsonBody(req, 20);
    expect(r).toEqual({ ok: false, status: 413, error: '请求体过大（限 64KB）' });
  });

  it('真实 Request 大 body（>64KB 默认上限）返回 413', async () => {
    const r = await readJsonBody(makeRequest(`{"m":"${'x'.repeat(70 * 1024)}"}`));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.status).toBe(413);
  });

  it('非 JSON Content-Type 返回 415', async () => {
    const r = await readJsonBody(makeRequest('{"a":1}', { 'content-type': 'text/plain' }));
    expect(r).toEqual({ ok: false, status: 415, error: 'Content-Type 需为 application/json' });
  });

  it('缺 Content-Type 返回 415', async () => {
    const req = new Request('https://kloa.fans/api/chat', { method: 'POST', body: '{}' });
    const r = await readJsonBody(req);
    expect(r).toEqual({ ok: false, status: 415, error: 'Content-Type 需为 application/json' });
  });

  it('非法 JSON 返回 400 请求格式有误', async () => {
    const r = await readJsonBody(makeRequest('not json'));
    expect(r).toEqual({ ok: false, status: 400, error: '请求格式有误' });
  });

  it('空 body 返回 400', async () => {
    const r = await readJsonBody(makeRequest(''));
    expect(r).toEqual({ ok: false, status: 400, error: '请求格式有误' });
  });
});
