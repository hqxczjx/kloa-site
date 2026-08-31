// 投稿弹窗交互（P2-4：ContributeDialog 去 React 岛后的内联脚本，
// 由 ContributeDialog.astro 经 ?raw + set:html 原样注入 HTML，单测直接跑这一份）。
// 行为对齐旧 React 版：打开锁 body 滚动 + aria-expanded 同步 + iframe 懒加载
// （React 版打开才挂载 iframe；SSR 常驻 DOM 改为 data-src 首开赋值，等价防预载），
// Escape / 遮罩 / 叉钮三种关闭途径均恢复滚动。
// 事件委托挂 document（ClientRouter 软导航后监听器存活）+ 幂等守卫。
// ⚠️ 永远不要在本文件引入字面闭合 script 的序列（含字符串/注释里）：本文件经
// set:html 原样内联进 script 元素，出现该序列会提前闭合标签——其后注释文字落入
// 复开的 script 元素头部，构成 SyntaxError 使整个脚本不执行（且无任何控制台特征）。
(function () {
  if (window.__contributeDialogInit) return;
  window.__contributeDialogInit = true;

  function findDialog() {
    return document.querySelector('[data-contribute-dialog]');
  }

  function findTrigger() {
    return document.querySelector('[data-contribute-open]');
  }

  function openDialog(dlg) {
    // display 置空回落到类里的 flex；SSR 初始为 display:none
    dlg.style.display = '';
    document.body.style.overflow = 'hidden';
    var trigger = findTrigger();
    if (trigger) trigger.setAttribute('aria-expanded', 'true');
    var iframe = dlg.querySelector('iframe[data-src]');
    if (iframe && !iframe.getAttribute('src')) {
      iframe.setAttribute('src', iframe.getAttribute('data-src'));
    }
  }

  function closeDialog(dlg) {
    dlg.style.display = 'none';
    document.body.style.overflow = '';
    var trigger = findTrigger();
    if (trigger) trigger.setAttribute('aria-expanded', 'false');
  }

  document.addEventListener('click', function (e) {
    var target = e.target instanceof Element ? e.target : null;
    if (!target) return;
    if (target.closest('[data-contribute-open]')) {
      var dlg = findDialog();
      if (dlg) openDialog(dlg);
      return;
    }
    if (target.closest('[data-contribute-close]') || target.closest('[data-contribute-backdrop]')) {
      var open2 = findDialog();
      if (open2) closeDialog(open2);
    }
  });

  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    var dlg = findDialog();
    if (dlg && dlg.style.display !== 'none') closeDialog(dlg);
  });
})();
