import { useState, useRef, useCallback, useEffect } from 'react';
import { Send, Sparkles, Heart, Ghost } from 'lucide-react';
import { streamChat, TOPICS } from './api';
import type { ChatForm, ChatMessage } from './types';

const MAX_CHARS = 100;

export default function ChatStudio() {
  const [form, setForm] = useState<ChatForm>('angel');
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [streaming, setStreaming] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => () => {
    abortRef.current?.abort();
  }, []);

  const send = useCallback(async () => {
    const message = input.trim();
    if (!message || streaming) return;
    setInput('');
    const history = messages.slice(-6);
    setMessages((m) => [...m, { role: 'user', content: message }, { role: 'assistant', content: '' }]);
    setStreaming(true);
    const assistantIdx = messages.length + 1;
    abortRef.current = new AbortController();
    await streamChat(
      { form, message, history },
      {
        onDelta: (t) => setMessages((m) => {
          const next = [...m];
          const cur = next[assistantIdx];
          if (cur) next[assistantIdx] = { ...cur, content: cur.content + t };
          return next;
        }),
        onDone: () => setStreaming(false),
        onError: () => {
          setMessages((m) => {
            const next = [...m];
            const cur = next[assistantIdx];
            if (cur && cur.content === '') next[assistantIdx] = { ...cur, content: '（回复中断，请重试）' };
            return next;
          });
          setStreaming(false);
        },
      },
      abortRef.current?.signal
    );
  }, [input, streaming, messages, form]);

  return (
    <div className="w-full max-w-3xl mx-auto px-4 py-8 pb-32">
      <h1 className="text-3xl font-serif font-bold text-center mb-2" style={{ color: 'var(--accent-primary)' }}>
        和克罗雅聊天
      </h1>
      <p className="text-center text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
        实验性 AI · 非官方二创 · 可能偏离人设
      </p>

      {/* 形态切换 */}
      <div className="flex gap-3 justify-center mb-4">
        <button
          aria-label={form === 'angel' ? '当前天使形态' : '切换到天使形态'}
          onClick={() => setForm('angel')}
          className="px-4 py-2 rounded-full text-sm font-medium transition-all"
          style={form === 'angel'
            ? { background: 'linear-gradient(135deg, oklch(0.78 0.10 15), oklch(0.72 0.08 240))', color: '#fff' }
            : { background: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}
        >
          <Heart className="w-4 h-4 inline mr-1" />天使
        </button>
        <button
          aria-label={form === 'demon' ? '当前恶魔形态' : '切换到恶魔形态'}
          onClick={() => setForm('demon')}
          className="px-4 py-2 rounded-full text-sm font-medium transition-all"
          style={form === 'demon'
            ? { background: 'linear-gradient(135deg, oklch(0.64 0.10 240), oklch(0.55 0.12 270))', color: '#fff' }
            : { background: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}
        >
          <Ghost className="w-4 h-4 inline mr-1" />恶魔
        </button>
      </div>

      {/* 话题 chips */}
      <div className="flex flex-wrap gap-2 justify-center mb-6">
        {TOPICS.map((t) => (
          <button
            key={t}
            onClick={() => setInput(t)}
            className="px-3 py-1.5 rounded-full text-xs border"
            style={{ borderColor: 'var(--glass-border)', color: 'var(--text-secondary)' }}
          >
            {t}
          </button>
        ))}
      </div>

      {/* 对话区 */}
      <div className="glass rounded-2xl p-4 mb-4 min-h-[200px]">
        {messages.length === 0 && (
          <p className="text-center text-sm py-8" style={{ color: 'var(--text-secondary)' }}>
            选个话题或直接和她说点什么吧 ✨
          </p>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`mb-3 flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className="max-w-[80%]">
              {m.role === 'assistant' && (
                <div className="text-xs mb-1 flex items-center gap-1" style={{ color: 'var(--text-secondary)' }}>
                  <Sparkles className="w-3 h-3" />AI 生成 · 二创
                </div>
              )}
              <div
                className="px-4 py-2 rounded-2xl text-sm whitespace-pre-wrap break-words"
                style={m.role === 'user'
                  ? { background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))', color: '#fff' }
                  : { background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
              >
                {m.content || (m.role === 'assistant' && streaming ? '…' : '')}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 输入区 */}
      <div className="flex gap-2 items-end">
        <textarea
          aria-label="输入框"
          value={input}
          onChange={(e) => setInput(e.target.value.slice(0, MAX_CHARS))}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void send(); } }}
          placeholder="说点什么…（限 100 字，Enter 发送）"
          rows={1}
          className="flex-1 glass rounded-xl px-4 py-3 text-sm resize-none outline-none"
          style={{ color: 'var(--text-primary)' }}
        />
        <button
          aria-label="发送"
          onClick={() => void send()}
          disabled={streaming || !input.trim()}
          className="px-4 py-3 rounded-xl text-white disabled:opacity-50"
          style={{ background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))' }}
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
