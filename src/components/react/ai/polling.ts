import { ApiError } from './api';

// video-status 轮询共用策略：指数退避 + 瞬时错误可重试。
// VideoStudio（单任务）与 StoryStudio（3 并发段）共用 worker 端 60 req/60s 的
// 每 IP 限流桶——固定 5s 间隔时 3 段即 36 req/min，CGNAT（移动网络同 IP 多客户端）
// 下两台设备即互踩 429，故步长逐次翻倍、且 429/网络错误走退避重试而非当场判死。
export const BASE_POLL_MS = 5000;
export const MAX_POLL_MS = 60000;

// 第 attempt 次（1 起）轮询后的下次步长：5s → 10s → 20s → 40s → 60s 封顶
export function nextDelay(attempt: number): number {
  return Math.min(BASE_POLL_MS * 2 ** (attempt - 1), MAX_POLL_MS);
}

// 瞬时错误：429（限流打满）/ 5xx（上游抖动），以及非 ApiError 的网络层失败
// （fetch reject、响应解析失败等）。其余（4xx 业务错）为终态，轮询方应停止并标失败。
export function isTransientPollError(e: unknown): boolean {
  if (e instanceof ApiError) return e.status === 429 || e.status >= 500;
  return true;
}
