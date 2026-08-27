// 纪念日倒计时（P2-2：AnniversaryCards 去 React 岛后的内联脚本，
// 由 AnniversaryCards.astro 经 ?raw + set:html 原样注入 HTML，单测直接跑这一份）。
// SSR 占位「—」，脚本执行时写入天数：纯重算覆盖 textContent，重复执行天然幂等。
// 日差用 Date.UTC 纯日历差计算，规避夏令时 23/25 小时造成的 floor 偏差。
(function () {
  var els = document.querySelectorAll('[data-anniv-days]');
  var now = new Date();
  var today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  for (var i = 0; i < els.length; i++) {
    var el = els[i];
    var p = el.getAttribute('data-anniv-days').split('-');
    var m = Number(p[1]) - 1;
    var d = Number(p[2]);
    var next = Date.UTC(now.getFullYear(), m, d);
    if (next < today) next = Date.UTC(now.getFullYear() + 1, m, d);
    el.textContent = Math.round((next - today) / 86400000) + ' 天';
  }
})();
