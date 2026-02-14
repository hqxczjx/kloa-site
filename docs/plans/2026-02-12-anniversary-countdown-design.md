# 纪念日倒计时卡片设计

## 概述
在首页添加两个独立的悬浮玻璃态卡片，分别展示生日和出道日的倒计时信息。卡片固定在屏幕右下角区域，带有毛玻璃效果和细微的阴影，完美融入现有的天使/恶魔双主题设计系统。

## 功能需求

### 显示内容
每个卡片包含：
- 顶部标签（图标 + 纪念日名称）
- 倒计时区域（距离下一个纪念日的剩余天数）
- 纪念日计数区域（从该日起已过的天数）

### 交互
- 轻柔的悬浮动画（y轴 ±5px，3秒周期）
- 两个卡片动画相位错开（出道日延迟 1.5 秒）
- 悬停时轻微放大效果（hover:scale-105）

### 更新机制
- 仅在页面加载时计算一次，无实时更新
- 使用 `useMemo` 计算天数，避免不必要的重渲染

## 组件设计

### AnniversaryCard 组件

**Props 类型：**
```typescript
type AnniversaryType = 'birthday' | 'debut';

interface AnniversaryCardProps {
  type: AnniversaryType;
  date: Date;
  label: string;
  icon: JSX.Element;
}
```

**核心逻辑：**
```typescript
// 计算已过天数
const daysSince = useMemo(() => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const anniversary = new Date(date);
  anniversary.setHours(0, 0, 0, 0);
  return Math.floor((today - anniversary) / (1000 * 60 * 60 * 24));
}, [date]);

// 计算下一个纪念日
const nextOccurrence = useMemo(() => {
  const today = new Date();
  const nextDate = new Date(date);
  nextDate.setFullYear(today.getFullYear());
  if (nextDate < today) {
    nextDate.setFullYear(today.getFullYear() + 1);
  }
  return nextDate;
}, [date]);

// 计算剩余天数
const daysRemaining = useMemo(() => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.floor((nextOccurrence - today) / (1000 * 60 * 60 * 24));
}, [nextOccurrence]);
```

**组件结构：**
```tsx
<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: [0, -5, 0] }}
  transition={{ duration: 3, repeat: Infinity }}
  className="fixed glass rounded-2xl p-4 ..."
>
  {/* 图标 + 标签 */}
  <div className="flex items-center gap-2 mb-2">
    {icon}
    <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
      {label}
    </span>
  </div>

  {/* 倒计时 */}
  <div className="mb-1">
    <div className="text-2xl font-bold font-serif" style={{ color: 'var(--text-primary)' }}>
      {daysRemaining} 天
    </div>
    <div className="text-xs opacity-75">距离{label}</div>
  </div>

  {/* 纪念日计数 */}
  <div>
    <div className="text-sm opacity-90" style={{ color: 'var(--text-primary)' }}>
      {daysSince} 天
    </div>
    <div className="text-xs opacity-60">已过</div>
  </div>
</motion.div>
```

## 布局设计

### 桌面端位置（≥ 640px）
- 生日卡片：`bottom-24 right-6`
- 出道日卡片：`bottom-56 right-6`
- 卡片宽度：`w-48`
- 卡片间距：`16px`

### 移动端位置（< 640px）
- 生日卡片：`bottom-5 right-4`
- 出道日卡片：`bottom-36 right-4`
- 卡片宽度：`w-40`
- 卡片间距：`16px`
- 字体缩放：数字 `text-xl`，标签 `text-xs`

## 数据配置

在 `Hero.astro` 中配置：
```tsx
import { Cake, Sparkles } from 'lucide-react';

const anniversaryData = [
  {
    type: 'birthday' as const,
    date: new Date('2026-07-19'),
    label: '生日',
    icon: <Cake className="w-5 h-5" />
  },
  {
    type: 'debut' as const,
    date: new Date('2026-01-16'),
    label: '出道日',
    icon: <Sparkles className="w-5 h-5" />
  }
];
```

## 样式系统

### 玻璃态卡片
- 基础类：`glass rounded-2xl p-4 backdrop-blur-md`
- 背景：`bg-white/10 dark:bg-slate-900/10`
- 边框：`border border-white/20 dark:border-white/5`
- 阴影：`shadow-lg`

### 渐变光晕
- 生日卡片：`bg-linear-to-br from-pink-500/20 to-pink-400/5`（天使模式）
- 出道日卡片：`bg-linear-to-br from-blue-500/20 to-blue-400/5`（恶魔模式）

### 字体
- 数字：`font-serif text-2xl`（Noto Serif SC）
- 标签：`text-sm opacity-75`（Noto Sans SC）

### 颜色变量
- 主文字：`var(--text-primary)`
- 次要文字：`var(--text-secondary)`
- 强调色：`var(--accent-primary)`

## 实现步骤

1. 创建 `src/components/react/AnniversaryCard.tsx` 组件
2. 在 `Hero.astro` 中引入并配置数据
3. 添加响应式布局（Tailwind 前缀）
4. 使用 Framer Motion 添加悬浮动画
5. 测试移动端和桌面端显示效果

## 技术栈

- React 19（Server Components）
- Framer Motion（动画）
- Tailwind CSS v4（样式）
- Lucide React（图标）
- TypeScript（类型安全）
