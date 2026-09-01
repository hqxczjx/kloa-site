// 纪念日卡片「日期/标签」的单一数据源（原双维护在 AnniversaryCards.astro 与其单测里，
// 改日期要改两处且期望天数容易漏改）。组件构建期渲染与单测期望值均从此派生。
// 注：卡片上显示的年份只是展示文本，倒计时按「今年已过翻明年」自动滚动（见
// src/scripts/anniversary-countdown.js），跨年不需要动这里。
export const ANNIVERSARIES = [
  { date: '2026-07-19', label: '生日' },
  { date: '2026-01-16', label: '出道日' },
] as const;
