import { chatHandler } from './api/chat';
import { imageHandler } from './api/image';
import { createVideoHandler } from './api/video';
import { videoStatusHandler } from './api/video-status';
import type { Env } from './_lib/types';

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // /api/* 走 Worker 业务逻辑
    if (url.pathname === '/api/chat') {
      return chatHandler(request, env);
    }
    if (url.pathname === '/api/image') {
      return imageHandler(request, env);
    }
    if (url.pathname === '/api/video' && request.method === 'POST') {
      return createVideoHandler(request, env);
    }
    if (url.pathname === '/api/video/status') {
      return videoStatusHandler(request, env);
    }
    if (url.pathname.startsWith('/api/')) {
      return new Response('Not Found', { status: 404 });
    }

    // 其余请求交给静态资源
    return env.ASSETS.fetch(request);
  },
};
