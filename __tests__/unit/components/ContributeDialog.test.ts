import { describe, it, expect, vi, afterEach } from 'vitest';
import { readSrc } from '../optimizations/helpers';

// 页面内联与单测跑的是同一份源文件（ContributeDialog.astro 经 ?raw + set:html 注入）。
// 脚本在 document 上做事件委托（幂等守卫防重绑），import 一次即可服务全部用例。
async function initDialogScript() {
  await import('../../../src/scripts/contribute-dialog.js');
}

const FORM_URL = 'https://wj.qq.com/s2/27522632/db0v/';

// 与 setup.ts 同动机：happy-dom 会在 setAttribute('src') 时触发 iframe 真实网络加载
// （#loadPage 为私有方法无法外补），这里逐元素遮蔽 iframe 层的 onSetAttribute 钩子、
// 保留 Element 祖先链的内部簿记——测试只校验属性值，不依赖实际加载。
function silenceIframeLoad(iframe: HTMLIFrameElement) {
  const iframeProto = Object.getPrototypeOf(iframe);
  const sym = Object.getOwnPropertySymbols(iframeProto).find(
    (s) => s.description === 'onSetAttribute',
  );
  if (!sym) return;
  let superProto = Object.getPrototypeOf(iframeProto);
  while (superProto && !(Object.getOwnPropertySymbols(superProto).includes(sym))) {
    superProto = Object.getPrototypeOf(superProto);
  }
  const superImpl = superProto ? (superProto as Record<symbol, (...a: unknown[]) => void>)[sym] : null;
  Object.defineProperty(iframe, sym, {
    value(this: HTMLIFrameElement, ...args: unknown[]) {
      if (superImpl) superImpl.apply(this, args);
    },
    configurable: true,
  });
}

function mountDialog() {
  document.body.innerHTML = `
    <button type="button" data-contribute-open aria-haspopup="dialog" aria-expanded="false">投稿</button>
    <div data-contribute-dialog role="dialog" aria-modal="true" aria-label="弹幕投稿" style="display: none">
      <div data-contribute-backdrop aria-hidden="true"></div>
      <div class="relative glass">
        <h2>投稿新弹幕</h2>
        <button type="button" data-contribute-close aria-label="关闭">X</button>
        <iframe data-src="${FORM_URL}" title="弹幕投稿表单"></iframe>
      </div>
    </div>`;
  const trigger = document.querySelector<HTMLButtonElement>('[data-contribute-open]')!;
  const dialog = document.querySelector<HTMLElement>('[data-contribute-dialog]')!;
  const backdrop = document.querySelector<HTMLElement>('[data-contribute-backdrop]')!;
  const closeBtn = document.querySelector<HTMLButtonElement>('[data-contribute-close]')!;
  const iframe = dialog.querySelector<HTMLIFrameElement>('iframe')!;
  silenceIframeLoad(iframe);
  return { trigger, dialog, backdrop, closeBtn, iframe };
}

function pressKey(key: string) {
  document.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
}

describe('ContributeDialog 静态化（P2-4，投稿弹窗内联脚本）', () => {
  afterEach(() => {
    document.body.innerHTML = '';
    document.body.style.overflow = '';
  });

  it('初始：弹窗隐藏、aria-expanded=false、iframe 懒加载（无 src）', async () => {
    await initDialogScript();
    const { trigger, dialog, iframe } = mountDialog();
    expect(dialog.style.display).toBe('none');
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    expect(iframe.getAttribute('src')).toBeNull();
    expect(document.body.style.overflow).toBe('');
  });

  it('点击投稿打开弹窗：显示 + 锁 body 滚动 + aria-expanded=true + iframe 赋 src', async () => {
    await initDialogScript();
    const { trigger, dialog, iframe } = mountDialog();
    trigger.click();
    expect(dialog.style.display).toBe('');
    expect(document.body.style.overflow).toBe('hidden');
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
    expect(iframe.getAttribute('src')).toBe(FORM_URL);
    expect(iframe.getAttribute('title')).toBe('弹幕投稿表单');
  });

  it('点击关闭按钮(X)关闭弹窗并恢复 body 滚动', async () => {
    await initDialogScript();
    const { trigger, closeBtn, dialog } = mountDialog();
    trigger.click();
    closeBtn.click();
    expect(dialog.style.display).toBe('none');
    expect(document.body.style.overflow).toBe('');
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
  });

  it('点击背景遮罩关闭弹窗', async () => {
    await initDialogScript();
    const { trigger, backdrop, dialog } = mountDialog();
    trigger.click();
    backdrop.click();
    expect(dialog.style.display).toBe('none');
    expect(document.body.style.overflow).toBe('');
  });

  it('按 Escape 关闭弹窗；非 Escape 键不关闭', async () => {
    await initDialogScript();
    const { trigger, dialog } = mountDialog();
    trigger.click();
    pressKey('Enter');
    expect(dialog.style.display).toBe('');
    expect(document.body.style.overflow).toBe('hidden');
    pressKey('Escape');
    expect(dialog.style.display).toBe('none');
    expect(document.body.style.overflow).toBe('');
  });

  it('关闭清 src、重开重赋（对齐旧 React 版卸载语义——重开是全新表单而非残留提交成功页）', async () => {
    await initDialogScript();
    const { trigger, closeBtn, dialog, iframe } = mountDialog();
    const setSrc = vi.spyOn(iframe, 'setAttribute');
    trigger.click();
    expect(iframe.getAttribute('src')).toBe(FORM_URL);
    closeBtn.click();
    // 关闭即卸载：src 移除（React 版 {open && ...} 关闭即卸载 iframe）
    expect(iframe.getAttribute('src')).toBeNull();
    trigger.click();
    expect(dialog.style.display).toBe('');
    // 重开从 data-src 重挂，用户看到全新表单
    expect(iframe.getAttribute('src')).toBe(FORM_URL);
    const srcCalls = setSrc.mock.calls.filter((c) => c[0] === 'src');
    expect(srcCalls).toHaveLength(2);
  });

  it('iframe 常驻 DOM 但初始不可见：页面加载不预载问卷（对齐旧版打开才挂载）', () => {
    const src = readSrc('src/components/astro/ContributeDialog.astro');
    expect(src).toContain('data-src={CONTRIBUTE_FORM_URL}');
    expect(src).toContain('style="display: none"');
    expect(src).not.toMatch(/<iframe[^>]*\ssrc=/);
  });

  it('内联脚本不含字面闭合 script 序列（提前闭合标签会让整段脚本 SyntaxError）', () => {
    expect(readSrc('src/scripts/contribute-dialog.js')).not.toContain('</scr' + 'ipt>');
  });
});
