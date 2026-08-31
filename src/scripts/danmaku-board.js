// 独轮车弹幕板交互（P2-4：DanmakuBoard 去 React 岛后的内联脚本，
// 由 DanmakuBoard.astro 经 ?raw + set:html 原样注入 HTML，单测直接跑这一份）。
// 行为对齐旧 React 版：筛选切换（激活态渐变类 + 非激活内联色）、点击复制、
// toast 反馈（替代 sonner，位置/时长对齐 ToasterWrapper：bottom-center / 3s）。
// 事件委托挂在 document 上：ClientRouter 软导航后监听器存活，无需 data-astro-rerun；
// 幂等守卫防脚本意外双执行重复绑定。
// ⚠️ 永远不要在本文件引入字面闭合 script 的序列（含字符串/注释里）：本文件经
// set:html 原样内联进 script 元素，出现该序列会提前闭合标签——其后注释文字落入
// 复开的 script 元素头部，构成 SyntaxError 使整个脚本不执行（且无任何控制台特征）。
(function () {
  if (window.__danmakuBoardInit) return;
  window.__danmakuBoardInit = true;

  // 激活态筛选按钮的类集合（与 SSR 的「全部」按钮逐类一致；classList 多参在旧内核
  // 支持不稳，逐个添加/移除）
  var ACTIVE_CLASSES = ['bg-gradient-to-r', 'from-pink-500', 'to-blue-500', 'text-white', 'shadow-lg'];

  function setFilter(board, filter) {
    var buttons = board.querySelectorAll('[data-filter]');
    for (var i = 0; i < buttons.length; i++) {
      var btn = buttons[i];
      if (btn.getAttribute('data-filter') === filter) {
        btn.style.background = '';
        btn.style.color = '';
        for (var j = 0; j < ACTIVE_CLASSES.length; j++) btn.classList.add(ACTIVE_CLASSES[j]);
      } else {
        for (var k = 0; k < ACTIVE_CLASSES.length; k++) btn.classList.remove(ACTIVE_CLASSES[k]);
        btn.style.background = 'var(--bg-secondary)';
        btn.style.color = 'var(--text-secondary)';
      }
    }
    // 隐藏用内联 style.display：卡片基类含 flex，[hidden] 属性会被类样式覆盖
    var cards = board.querySelectorAll('[data-danmaku-card]');
    var visible = 0;
    for (var c = 0; c < cards.length; c++) {
      var show = filter === 'all' || cards[c].getAttribute('data-category') === filter;
      cards[c].style.display = show ? '' : 'none';
      if (show) visible++;
    }
    var empty = board.querySelector('[data-danmaku-empty]');
    if (empty) empty.style.display = visible === 0 ? '' : 'none';
  }

  // 自研 toast（不引入 sonner；旧版 toast.success/toast.error 的等价反馈）
  var toastEl = null;
  var toastTimer = null;
  function showToast(message, isError) {
    if (!toastEl || !toastEl.parentNode) {
      toastEl = document.createElement('div');
      toastEl.id = 'danmaku-toast';
      toastEl.setAttribute('role', 'status');
      toastEl.style.cssText =
        'position:fixed;left:50%;bottom:5rem;transform:translateX(-50%);z-index:60;' +
        'padding:10px 20px;border-radius:12px;font-size:14px;font-weight:500;' +
        'background:var(--bg-secondary);box-shadow:0 4px 15px var(--glow-color);' +
        'opacity:0;transition:opacity 0.3s;pointer-events:none';
      document.body.appendChild(toastEl);
    }
    toastEl.textContent = message;
    // 错误态红色（#ef4444）；正常态跟随主题文本色
    toastEl.style.color = isError ? '#ef4444' : 'var(--text-primary)';
    toastEl.style.opacity = '1';
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      toastEl.style.opacity = '0';
    }, 3000);
  }

  function copyText(text) {
    // navigator.clipboard 在非安全上下文（http）/旧内核下可能缺失，统一走失败提示
    var p = navigator.clipboard && navigator.clipboard.writeText
      ? navigator.clipboard.writeText(text)
      : Promise.reject(new Error('clipboard unavailable'));
    p.then(
      function () { showToast('已复制', false); },
      function () { showToast('复制失败，请手动选择', true); }
    );
  }

  document.addEventListener('click', function (e) {
    var target = e.target instanceof Element ? e.target : null;
    if (!target) return;
    var board = target.closest('[data-danmaku-board]');
    if (!board) return;
    var filterBtn = target.closest('[data-filter]');
    if (filterBtn) {
      setFilter(board, filterBtn.getAttribute('data-filter'));
      return;
    }
    var card = target.closest('[data-danmaku-card]');
    if (card) copyText(card.getAttribute('data-danmaku-text'));
  });
})();
