import { useState, useRef, useEffect } from 'react';
import { Clapperboard, Download } from 'lucide-react';
import { createVideo, getVideoStatus, ACTIONS } from './api';
import type { VideoStatus } from './types';

const POLL_INTERVAL_MS = 5000;
const MAX_ATTEMPTS = 36; // 180s

export default function VideoStudio() {
  const [action, setAction] = useState('');
  const [extra, setExtra] = useState('');
  const [duration, setDuration] = useState<3 | 5>(3);
  const [status, setStatus] = useState<VideoStatus | 'idle' | 'creating'>('idle');
  const [progress, setProgress] = useState(0);
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');

  const abortRef = useRef<AbortController | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    abortRef.current?.abort();
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  async function poll(id: string, attempt: number) {
    if (attempt > MAX_ATTEMPTS) { setStatus('timeout'); setError('生成较久，请稍后再试'); return; }
    try {
      const s = await getVideoStatus(id, abortRef.current?.signal);
      setProgress(s.progress);
      if (s.status === 'completed' && s.url) { setStatus('completed'); setUrl(s.url); return; }
      if (s.status === 'failed') { setStatus('failed'); setError('生成失败，请重试'); return; }
      setStatus(s.status);
      timerRef.current = setTimeout(() => void poll(id, attempt + 1), POLL_INTERVAL_MS);
    } catch {
      setStatus('failed'); setError('查询失败，请重试');
    }
  }

  async function gen() {
    if (!action || status === 'creating' || status === 'queued' || status === 'in_progress') return;
    setError(''); setUrl(''); setProgress(0);
    setStatus('creating');
    abortRef.current = new AbortController();
    try {
      const id = await createVideo({ action, extra: extra.trim() || undefined, duration }, abortRef.current.signal);
      setStatus('queued');
      await poll(id, 1);
    } catch (e) {
      setStatus('failed');
      setError(e instanceof Error ? e.message : '创建任务失败');
    }
  }

  const busy = status === 'creating' || status === 'queued' || status === 'in_progress';

  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-8 pb-32">
      <h1 className="text-3xl font-serif font-bold text-center mb-2" style={{ color: 'var(--accent-primary)' }}>
        让克罗雅动起来
      </h1>
      <p className="text-center text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
        实验性 AI · 非官方二创 · 生成约 1-3 分钟，离开即放弃
      </p>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="glass rounded-2xl p-5">
          <img src="/images/illustration.png" alt="立绘预览" className="w-full max-h-64 object-contain rounded-xl mb-4" />
          <div className="text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>选动作</div>
          <div className="grid grid-cols-2 gap-2 mb-4">
            {ACTIONS.map((a) => (
              <button key={a} onClick={() => setAction(a)} aria-label={a}
                className="px-3 py-2 rounded-lg text-sm border"
                style={action === a
                  ? { borderColor: 'var(--accent-primary)', background: 'var(--bg-secondary)', color: 'var(--accent-primary)' }
                  : { borderColor: 'var(--glass-border)', color: 'var(--text-secondary)' }}>{a}</button>
            ))}
          </div>
          <textarea value={extra} onChange={(e) => setExtra(e.target.value.slice(0, 50))}
            placeholder="追加描述（可选，限 50 字）" rows={2}
            className="w-full glass rounded-xl px-3 py-2 text-sm resize-none outline-none mb-3"
            style={{ color: 'var(--text-primary)' }} />
          <div className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
            时长
            <button onClick={() => setDuration(3)} className="ml-2 px-3 py-1 rounded-lg"
              style={duration === 3 ? { background: 'var(--accent-primary)', color: '#fff' } : { background: 'var(--bg-secondary)' }}>3s</button>
            <button onClick={() => setDuration(5)} className="ml-2 px-3 py-1 rounded-lg"
              style={duration === 5 ? { background: 'var(--accent-primary)', color: '#fff' } : { background: 'var(--bg-secondary)' }}>5s</button>
          </div>
          <button onClick={() => void gen()} disabled={!action || busy}
            className="w-full py-3 rounded-xl text-white disabled:opacity-50 flex items-center justify-center gap-2"
            style={{ background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))' }}>
            <Clapperboard className="w-4 h-4" />{busy ? `生成中… ${progress}%` : '生成'}
          </button>
          {error && <p className="text-sm mt-3 text-center" style={{ color: 'var(--accent-primary)' }}>{error}</p>}
        </div>

        <div className="glass rounded-2xl p-5 flex flex-col items-center justify-center min-h-[300px]">
          {url ? (
            <>
              <video data-testid="result-video" src={url} controls className="max-w-full max-h-80 rounded-xl mb-3" />
              <a href={url} download className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm" style={{ background: 'var(--bg-secondary)', color: 'var(--accent-primary)' }}>
                <Download className="w-4 h-4" />下载
              </a>
            </>
          ) : (
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              {busy ? `生成中… ${progress}%` : status === 'timeout' ? '生成较久，请稍后再试' : status === 'failed' ? error : '选好动作后点生成'}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
