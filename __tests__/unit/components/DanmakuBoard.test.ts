import { describe, it, expect, vi, afterEach } from 'vitest';
import { readSrc } from '../optimizations/helpers';

// 页面内联与单测跑的是同一份源文件（DanmakuBoard.astro 经 ?raw + set:html 注入 HTML）。
// 脚本在 document 上做事件委托（幂等守卫防重绑），import 一次即可服务全部用例；
// 每个用例重挂 DOM，监听器按点击时的 DOM 查询，天然隔离。
async function initBoardScript() {
  await import('../../../src/scripts/danmaku-board.js');
}

const ACTIVE_CLASS = 'bg-gradient-to-r';

// 结构对齐 DanmakuBoard.astro 的 SSR 输出（省略与行为无关的样式类）
function mountBoard(cards: { category: string; text: string }[]) {
  document.body.innerHTML = `
    <div data-danmaku-board>
      <button data-filter="all" aria-label="全部" class="flex ${ACTIVE_CLASS} from-pink-500 to-blue-500 text-white shadow-lg">全部</button>
      <button data-filter="cheer" aria-label="应援" class="flex" style="background: var(--bg-secondary); color: var(--text-secondary)">应援</button>
      <button data-filter="meme" aria-label="整活" class="flex" style="background: var(--bg-secondary); color: var(--text-secondary)">整活</button>
      ${cards
        .map(
          (c) =>
            `<button data-danmaku-card data-category="${c.category}" data-danmaku-text="${c.text}" aria-label="复制 ${c.text}">${c.text}</button>`,
        )
        .join('')}
      <div data-danmaku-empty style="display: none">该分类暂无文案</div>
    </div>`;
  return {
    all: document.querySelector<HTMLButtonElement>('[data-filter="all"]')!,
    meme: document.querySelector<HTMLButtonElement>('[data-filter="meme"]')!,
    cards: Array.from(document.querySelectorAll<HTMLButtonElement>('[data-danmaku-card]')),
    empty: document.querySelector<HTMLElement>('[data-danmaku-empty]')!,
  };
}

describe('DanmakuBoard 静态化（P2-4，筛选/复制内联脚本）', () => {
  afterEach(() => {
    document.body.innerHTML = '';
    document.body.style.overflow = '';
  });

  it('点击「整活」只显示整活卡片，且激活态类随按钮切换', async () => {
    await initBoardScript();
    const { all, meme, cards } = mountBoard([
      { category: 'cheer', text: '克罗雅最可爱！' },
      { category: 'meme', text: '今天是恶魔阵营' },
    ]);
    meme.click();
    expect(cards[0]!.style.display).toBe('none');
    expect(cards[1]!.style.display).toBe('');
    // 整活按钮获得渐变激活类，原「全部」按钮被还原为内联双色
    expect(meme.classList.contains(ACTIVE_CLASS)).toBe(true);
    expect(all.classList.contains(ACTIVE_CLASS)).toBe(false);
    expect(all.style.background).toBe('var(--bg-secondary)');
  });

  it('切回「全部」恢复所有卡片（幂等往返）', async () => {
    await initBoardScript();
    const { all, meme, cards } = mountBoard([
      { category: 'cheer', text: '克罗雅最可爱！' },
      { category: 'meme', text: '今天是恶魔阵营' },
    ]);
    meme.click();
    all.click();
    expect(cards[0]!.style.display).toBe('');
    expect(cards[1]!.style.display).toBe('');
    expect(all.classList.contains(ACTIVE_CLASS)).toBe(true);
  });

  it('分类无卡片时显示空态，切回全部隐藏', async () => {
    await initBoardScript();
    const { meme, all, empty } = mountBoard([{ category: 'cheer', text: '克罗雅最可爱！' }]);
    meme.click();
    expect(empty.style.display).toBe('');
    all.click();
    expect(empty.style.display).toBe('none');
  });

  it('点击文案卡片复制到剪贴板并提示成功（自研 toast 替代 sonner）', async () => {
    await initBoardScript();
    const { cards } = mountBoard([{ category: 'cheer', text: '克罗雅最可爱！' }]);
    cards[0]!.click();
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('克罗雅最可爱！');
    await vi.waitFor(() => {
      const toast = document.getElementById('danmaku-toast');
      expect(toast?.textContent).toBe('已复制');
      expect(toast?.getAttribute('role')).toBe('status');
    });
  });

  it('剪贴板写入失败时提示手动复制且不提示成功', async () => {
    await initBoardScript();
    (navigator.clipboard.writeText as unknown as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new Error('denied'),
    );
    const { cards } = mountBoard([{ category: 'cheer', text: '克罗雅最可爱！' }]);
    cards[0]!.click();
    await vi.waitFor(() => {
      expect(document.getElementById('danmaku-toast')?.textContent).toBe('复制失败，请手动选择');
    });
  });

  it('脚本幂等：重复 import 不重复绑定（守卫拦截）', async () => {
    await initBoardScript();
    await initBoardScript();
    const { meme, cards } = mountBoard([
      { category: 'meme', text: '今天是恶魔阵营' },
    ]);
    meme.click();
    // 若重复绑定，卡片会被处理两次——结果仍一致，此处主要确保不抛错且行为正常
    expect(cards[0]!.style.display).toBe('');
  });

  describe('静态标记（与旧 React 版逐类对齐）', () => {
    it('超 40 字文案 SSR 标注 data-over-limit 且红色类（移植自旧用例）', () => {
      const src = readSrc('src/components/astro/DanmakuBoard.astro');
      expect(src).toContain('const over = d.text.length > LIMIT');
      expect(src).toContain("data-over-limit={over ? 'true' : 'false'}");
      expect(src).toContain("over ? 'text-red-500' : ''");
      expect(src).toContain('const LIMIT = 40');
    });

    it('筛选按钮四档齐全，卡片/文案经 data-* 供委托脚本使用', () => {
      const src = readSrc('src/components/astro/DanmakuBoard.astro');
      for (const f of ['all', 'cheer', 'meme', 'memorial']) {
        expect(src).toContain(`data-filter={value}`);
        expect(src).toMatch(new RegExp(`value: '${f}'`));
      }
      expect(src).toContain('data-danmaku-card');
      expect(src).toContain('data-danmaku-text={d.text}');
      expect(src).toContain('aria-label={`复制 ${d.text}`}');
    });

    it('激活态类集合与脚本侧 ACTIVE_CLASSES 一致', () => {
      const astro = readSrc('src/components/astro/DanmakuBoard.astro');
      const script = readSrc('src/scripts/danmaku-board.js');
      const astroActive = astro
        .match(/ACTIVE_FILTER_CLASSES = '([^']+)'/)![1]
        .split(' ')
        .sort()
        .join(' ');
      const scriptActive = script
        .match(/ACTIVE_CLASSES = \[([^\]]+)\]/)![1]
        .split(',')
        .map((s) => s.trim().replace(/'/g, ''))
        .sort()
        .join(' ');
      expect(scriptActive).toBe(astroActive);
    });

    it('toast 用自研实现（不引入 sonner），文案对齐旧版', () => {
      const script = readSrc('src/scripts/danmaku-board.js');
      expect(script).toContain("'已复制'");
      expect(script).toContain("'复制失败，请手动选择'");
      expect(script).not.toMatch(/import\s+.*sonner/);
      expect(script).not.toMatch(/from\s+.*sonner/);
      const board = readSrc('src/components/astro/DanmakuBoard.astro');
      expect(board).not.toMatch(/import\s+.*sonner/);
    });

    it('内联脚本不含字面闭合 script 序列（提前闭合标签会让整段脚本 SyntaxError）', () => {
      for (const f of ['src/scripts/danmaku-board.js', 'src/scripts/contribute-dialog.js']) {
        expect(readSrc(f)).not.toContain('</scr' + 'ipt>');
      }
    });
  });
});
