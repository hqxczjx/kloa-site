import { useState, useEffect } from 'react';
import { PenLine, X } from 'lucide-react';

// 腾讯问卷公开填写链接：建好问卷后在「发布」处复制，替换下面的占位 URL。
const CONTRIBUTE_FORM_URL = 'https://wj.qq.com/s2/27522632/db0v/';

export default function ContributeDialog() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all duration-200 hover:scale-105 active:scale-95 glass"
        style={{ color: 'var(--accent-primary)' }}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <PenLine className="w-5 h-5" />
        投稿
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label="弹幕投稿"
        >
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          <div className="relative glass rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-4">
              <h2 className="text-lg font-serif font-bold" style={{ color: 'var(--text-primary)' }}>
                投稿新弹幕
              </h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="grid place-items-center w-8 h-8 rounded-full hover:bg-black/10 transition-colors"
                style={{ color: 'var(--text-secondary)' }}
                aria-label="关闭"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="px-4 pb-4 overflow-auto">
              <p className="text-sm mb-3" style={{ color: 'var(--text-secondary)' }}>
                想加什么应援 / 整活 / 纪念弹幕？填表提交，审核后加入文案库（普通弹幕 ≤20 字）。
              </p>
              <iframe
                src={CONTRIBUTE_FORM_URL}
                title="弹幕投稿表单"
                className="w-full rounded-xl bg-white"
                style={{ height: '520px', border: 0 }}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
