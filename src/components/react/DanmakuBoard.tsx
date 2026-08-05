import { useState } from 'react';
import { Copy, Sparkles, Heart, Ghost, Cake } from 'lucide-react';
import { toast } from 'sonner';
import { danmaku, type DanmakuCategory } from '../../data/danmaku';

type Filter = 'all' | DanmakuCategory;

const LIMIT = 20;

const filters: { value: Filter; label: string; icon: typeof Heart }[] = [
  { value: 'all', label: '全部', icon: Sparkles },
  { value: 'cheer', label: '应援', icon: Heart },
  { value: 'meme', label: '整活', icon: Ghost },
  { value: 'memorial', label: '纪念', icon: Cake },
];

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    toast.success('已复制');
  } catch {
    toast.error('复制失败，请手动选择');
  }
}

export default function DanmakuBoard() {
  const [filter, setFilter] = useState<Filter>('all');
  const filtered = danmaku.filter(d => filter === 'all' || d.category === filter);

  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-8 pb-32">
      <h1 className="text-3xl font-serif font-bold text-center mb-8" style={{ color: 'var(--text-primary)' }}>
        独轮车弹幕复制
      </h1>

      <div className="glass rounded-2xl p-6 mb-8">
        <div className="flex flex-wrap gap-3 justify-center mb-6">
          {filters.map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              onClick={() => setFilter(value)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-full font-medium transition-all duration-300 ${
                filter === value ? 'bg-gradient-to-r from-pink-500 to-blue-500 text-white shadow-lg' : ''
              }`}
              style={filter !== value ? { background: 'var(--bg-secondary)', color: 'var(--text-secondary)' } : {}}
              aria-label={label}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap justify-center gap-4">
          <button
            onClick={() => copyText(filtered.map(d => d.text).join('\n'))}
            className="flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-white transition-all duration-200 hover:scale-105 active:scale-95 bg-gradient-to-r from-pink-500 to-blue-500 hover:from-pink-600 hover:to-blue-600 shadow-lg"
            aria-label="复制全部"
          >
            <Copy className="w-5 h-5" />
            复制全部
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(d => {
          const over = d.text.length > LIMIT;
          return (
            <button
              key={d.id}
              onClick={() => copyText(d.text)}
              className="glass rounded-2xl p-5 text-left transition-all duration-200 hover:scale-[1.02] active:scale-95 flex flex-col gap-2"
              aria-label={`复制 ${d.text}`}
            >
              <span className="text-base break-all" style={{ color: 'var(--text-primary)' }}>{d.text}</span>
              {d.note && (
                <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{d.note}</span>
              )}
              <span className="flex items-center justify-between">
                <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>点击复制</span>
                <span
                  className={`text-xs font-semibold ${over ? 'text-red-500' : ''}`}
                  style={!over ? { color: 'var(--text-secondary)' } : {}}
                  data-over-limit={over ? 'true' : 'false'}
                >
                  {d.text.length}/{LIMIT}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-16">
          <Copy className="w-16 h-16 mx-auto mb-4" style={{ color: 'var(--text-secondary)' }} />
          <p className="text-lg" style={{ color: 'var(--text-secondary)' }}>该分类暂无文案</p>
        </div>
      )}
    </div>
  );
}
