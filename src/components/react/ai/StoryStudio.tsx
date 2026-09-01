import { useState, useRef, useEffect } from 'react';
import { Clapperboard, Download } from 'lucide-react';
import { createStoryboard, generateImage, createKeyframeVideo, getVideoStatus } from './api';
import { nextDelay, isTransientPollError } from './polling';
import type { VideoStatus } from './types';

// 轮询步长与 429 重试共用 polling.ts：8 次轮询末次在 255s（5+10+20+40+60×3），
// 超时窗 315s（5+10+20+40+60×4）≈ 5m15s，段生成约 1-4 分钟即可完成。
// 原先固定 5s×36（180s）时 3 段并发即 36 req/min，
// 再加 CGNAT 同 IP 多客户端即 429（限流 60/60s 每 IP）
const MAX_ATTEMPTS = 8;

type Phase = 'idle' | 'storyboarding' | 'frames' | 'videos';

interface SegState {
  status: VideoStatus | 'creating';
  progress: number;
  url?: string;
}

const PHASE_TEXT: Record<Phase, string> = {
  idle: '选好创意后点生成',
  storyboarding: '正在拆分故事分镜…',
  frames: '正在生成关键帧…',
  videos: '正在生成视频段…',
};

export default function StoryStudio() {
  const [idea, setIdea] = useState('');
  const [phase, setPhase] = useState<Phase>('idle');
  const [stepDetail, setStepDetail] = useState('');
  const [error, setError] = useState('');
  const [frameUrls, setFrameUrls] = useState<string[]>([]);
  const [segs, setSegs] = useState<SegState[]>([]);
  const [playIndex, setPlayIndex] = useState(0);

  const abortRef = useRef<AbortController | null>(null);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => () => {
    abortRef.current?.abort();
    timersRef.current.forEach(clearTimeout);
  }, []);

  function updateSeg(i: number, patch: Partial<SegState>) {
    setSegs(prev => prev.map((s, j) => (j === i ? { ...s, ...patch } : s)));
  }

  function pollSeg(i: number, id: string, attempt: number, signal: AbortSignal) {
    if (attempt > MAX_ATTEMPTS) { updateSeg(i, { status: 'timeout' }); return; }
    getVideoStatus(id, signal).then(s => {
      if (signal.aborted) return;
      updateSeg(i, { status: s.status, progress: s.progress, url: s.url ?? undefined });
      if (s.status === 'completed' && s.url) return;
      if (s.status === 'failed' || s.status === 'timeout') return;
      const t = setTimeout(() => pollSeg(i, id, attempt + 1, signal), nextDelay(attempt));
      timersRef.current.push(t);
    }).catch(e => {
      if (signal.aborted) return;
      // 429（CGNAT 同 IP 共用限流）：按 nextDelay 重试，由 MAX_ATTEMPTS 收口
      // （见 polling.ts）；重试期间段 status 不动（非终态）。4xx 即段失败
      if (isTransientPollError(e)) {
        const t = setTimeout(() => pollSeg(i, id, attempt + 1, signal), nextDelay(attempt));
        timersRef.current.push(t);
        return;
      }
      updateSeg(i, { status: 'failed' });
    });
  }

  async function run() {
    const text = idea.trim();
    if (!text || phase !== 'idle') return;
    setError(''); setFrameUrls([]); setSegs([]); setPlayIndex(0); setStepDetail('');
    abortRef.current?.abort();
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
    abortRef.current = new AbortController();
    const signal = abortRef.current.signal;
    try {
      setPhase('storyboarding');
      const sb = await createStoryboard(text, signal);

      setPhase('frames');
      const urls: string[] = [];
      for (let i = 0; i < sb.frames.length; i++) {
        setStepDetail(`关键帧 ${i + 1}/${sb.frames.length}`);
        urls.push(await generateImage({ style: sb.frames[i]!, size: '1K', ratio: '16:9' }, signal));
        setFrameUrls([...urls]);
      }

      setPhase('videos'); setStepDetail('');
      setSegs(sb.motions.map(() => ({ status: 'creating' as const, progress: 0 })));
      await Promise.all(sb.motions.map((motion, i) =>
        createKeyframeVideo(
          { prompt: motion, first_frame: urls[i]!, last_frame: urls[i + 1]!, duration: 5 },
          signal,
        ).then(id => { pollSeg(i, id, 1, signal); })
          .catch(() => { updateSeg(i, { status: 'failed' }); }),
      ));
    } catch (e) {
      if (signal.aborted) return;
      setPhase('idle');
      setError(e instanceof Error ? e.message : '生成失败,请重试');
    }
  }

  // 终态解锁。不变量:本谓词与 pollSeg 的续轮条件(L53-54)严格对称(completed 需有 url),
  // 且段级 catch 保证 Promise.all 不 reject——三者协同确保「按钮可点 ⟺ 无存活轮询」;
  // run() 开头的 abort+clear 是该不变量被破坏时的纵深防御,勿单独"简化"任何一处。
  useEffect(() => {
    if (phase === 'videos' && segs.length > 0 && segs.every(s =>
      (s.status === 'completed' && s.url) || s.status === 'failed' || s.status === 'timeout'
    )) setPhase('idle');
  }, [phase, segs]);

  const busy = phase !== 'idle';
  const segUrls = segs.map(s => s.url);
  const allDone = segs.length > 0 && segs.every(s => s.status === 'completed' && s.url);
  const someFailed = segs.some(s => s.status === 'failed' || s.status === 'timeout');

  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-8 pb-32">
      <h1 className="text-3xl font-serif font-bold text-center mb-2" style={{ color: 'var(--accent-primary)' }}>
        克罗雅小剧场
      </h1>
      <p className="text-center text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
        实验性 AI · 非官方二创 · 一个创意生成约 15 秒连续小剧场,全程约 3-8 分钟,离开即放弃
      </p>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="glass rounded-2xl p-5">
          <textarea
            value={idea}
            onChange={e => setIdea(e.target.value.slice(0, 200))}
            placeholder="故事创意(如:克罗雅在花园里追一只发光的蝴蝶,最后蝴蝶落在她指尖)"
            rows={3}
            className="w-full glass rounded-xl px-3 py-2 text-sm resize-none outline-none mb-3"
            style={{ color: 'var(--text-primary)' }}
          />
          <button
            onClick={() => void run()}
            disabled={!idea.trim() || busy}
            className="w-full py-3 rounded-xl text-white disabled:opacity-50 flex items-center justify-center gap-2"
            style={{ background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))' }}
          >
            <Clapperboard className="w-4 h-4" />
            {busy ? `${PHASE_TEXT[phase]}${stepDetail ? `(${stepDetail})` : ''}` : '生成小剧场'}
          </button>
          {error && <p className="text-sm mt-3 text-center" style={{ color: 'var(--accent-primary)' }}>{error}</p>}

          {frameUrls.length > 0 && (
            <div className="mt-4">
              <div className="text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>关键帧(相邻段共享边界帧)</div>
              <div className="grid grid-cols-4 gap-2">
                {frameUrls.map((u, i) => (
                  <img key={i} src={u} alt={`关键帧 ${i + 1}`} className="w-full aspect-video object-cover rounded-lg" />
                ))}
              </div>
            </div>
          )}

          {segs.length > 0 && (
            <div className="mt-4 text-sm" style={{ color: 'var(--text-secondary)' }}>
              {segs.map((s, i) => (
                <div key={i} className="flex justify-between mb-1">
                  <span>第 {i + 1} 段</span>
                  <span>{s.url ? (allDone ? '✓ 完成' : '✓ 已完成') : s.status === 'failed' || s.status === 'timeout' ? '✗ 失败' : `${s.progress}%`}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="glass rounded-2xl p-5 flex flex-col items-center justify-center min-h-[300px]">
          {segs.some(s => s.url) ? (
            <>
              <p className="text-sm mb-3" style={{ color: 'var(--text-secondary)' }}>
                {allDone ? '小剧场完成' : someFailed ? '部分段落失败,已生成如下' : '生成中,先看已完成的段落…'}
              </p>
              <video
                key={playIndex}
                data-testid={`story-video-${playIndex}`}
                src={segUrls[playIndex]}
                controls
                autoPlay
                onEnded={() => setPlayIndex(i => Math.min(i + 1, segs.length - 1))}
                className="max-w-full max-h-72 rounded-xl mb-3"
              />
              <div className="flex gap-2 mb-3">
                {segs.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setPlayIndex(i)}
                    disabled={!segUrls[i]}
                    className="px-3 py-1 rounded-lg text-sm disabled:opacity-40"
                    style={playIndex === i
                      ? { background: 'var(--accent-primary)', color: '#fff' }
                      : { background: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}
                  >第 {i + 1} 段</button>
                ))}
              </div>
              <div className="flex gap-2">
                {segs.map((s, i) => s.url && (
                  <a key={i} href={s.url} download className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm"
                    style={{ background: 'var(--bg-secondary)', color: 'var(--accent-primary)' }}>
                    <Download className="w-3.5 h-3.5" />下载 {i + 1}
                  </a>
                ))}
              </div>
            </>
          ) : (
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              {busy ? `${PHASE_TEXT[phase]}${stepDetail ? `(${stepDetail})` : ''}` : PHASE_TEXT.idle}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
