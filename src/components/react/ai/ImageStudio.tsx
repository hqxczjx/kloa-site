import { useState } from 'react';
import { Wand2, Download } from 'lucide-react';
import { generateImage, STYLES } from './api';
import type { ImageRequest } from './types';

// 与 worker RATIO_IMAGE_URLS 的产物同名（1x1/3x4/9x16），选比例即预览该比例的参考图构图。
// 16:9 仅小剧场关键帧链路使用（映射原全身立绘），换装下拉不展示该档。
const RATIO_PREVIEW: Record<ImageRequest['ratio'], string> = {
  '1:1': '/images/illustration-1x1.webp',
  '3:4': '/images/illustration-3x4.webp',
  '9:16': '/images/illustration-9x16.webp',
  '16:9': '/images/illustration.webp',
};

export default function ImageStudio() {
  const [style, setStyle] = useState<string>('');
  const [extra, setExtra] = useState('');
  const [size, setSize] = useState<'1K' | '2K'>('1K');
  const [ratio, setRatio] = useState<ImageRequest['ratio']>('1:1');
  const [url, setUrl] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function gen() {
    if (!style || loading) return;
    setLoading(true); setError(''); setUrl('');
    try {
      const u = await generateImage({ style, extra: extra.trim() || undefined, size, ratio });
      setUrl(u);
    } catch (e) {
      setError(e instanceof Error ? e.message : '生成失败');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-8 pb-32">
      <h1 className="text-3xl font-serif font-bold text-center mb-2" style={{ color: 'var(--accent-primary)' }}>
        给克罗雅换装
      </h1>
      <p className="text-center text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
        实验性 AI · 非官方二创 · 基于立绘图生图
      </p>

      <div className="grid md:grid-cols-2 gap-6">
        {/* 左：输入 */}
        <div className="glass rounded-2xl p-5">
          <img src={RATIO_PREVIEW[ratio]} alt="立绘预览" className="w-full max-h-64 object-contain rounded-xl mb-4" />
          <div className="text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>选风格</div>
          <div className="grid grid-cols-2 gap-2 mb-4">
            {STYLES.map((s) => (
              <button key={s} onClick={() => setStyle(s)} aria-label={s}
                className="px-3 py-2 rounded-lg text-sm border"
                style={style === s
                  ? { borderColor: 'var(--accent-primary)', background: 'var(--bg-secondary)', color: 'var(--accent-primary)' }
                  : { borderColor: 'var(--glass-border)', color: 'var(--text-secondary)' }}>
                {s}
              </button>
            ))}
          </div>
          <textarea value={extra} onChange={(e) => setExtra(e.target.value.slice(0, 50))}
            placeholder="追加描述（可选，限 50 字）" rows={2}
            className="w-full glass rounded-xl px-3 py-2 text-sm resize-none outline-none mb-3"
            style={{ color: 'var(--text-primary)' }} />
          <div className="flex gap-3 text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
            <label>尺寸
              <select value={size} onChange={(e) => setSize(e.target.value as '1K' | '2K')} className="glass rounded-lg px-2 py-1 ml-1">
                <option value="1K">1K（快）</option><option value="2K">2K</option>
              </select>
            </label>
            <label>比例
              <select value={ratio} onChange={(e) => setRatio(e.target.value as ImageRequest['ratio'])} className="glass rounded-lg px-2 py-1 ml-1">
                <option value="1:1">1:1</option><option value="3:4">3:4</option><option value="9:16">9:16</option>
              </select>
            </label>
          </div>
          <button onClick={() => void gen()} disabled={!style || loading}
            className="w-full py-3 rounded-xl text-white disabled:opacity-50 flex items-center justify-center gap-2"
            style={{ background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))' }}>
            <Wand2 className="w-4 h-4" />{loading ? '生成中…' : '生成'}
          </button>
          {error && <p className="text-sm mt-3 text-center" style={{ color: 'var(--accent-primary)' }}>{error}</p>}
        </div>

        {/* 右：结果 */}
        <div className="glass rounded-2xl p-5 flex flex-col items-center justify-center min-h-[300px]">
          {url ? (
            <>
              <img src={url} alt="生成结果" className="max-w-full max-h-80 rounded-xl mb-3" />
              <a href={url} download className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm" style={{ background: 'var(--bg-secondary)', color: 'var(--accent-primary)' }}>
                <Download className="w-4 h-4" />下载
              </a>
            </>
          ) : (
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{loading ? '生成中，请稍候…' : '选好风格后点生成'}</p>
          )}
          <p className="text-xs mt-4 opacity-60" style={{ color: 'var(--text-secondary)' }}>链接可能失效，请及时下载</p>
        </div>
      </div>
    </div>
  );
}
