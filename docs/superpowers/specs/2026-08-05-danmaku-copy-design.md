# 独轮车弹幕复制页 设计文档

> 日期：2026-08-05
> 状态：待用户审查

## 背景

kloa-site 现有导航第 3 项「Button」指向 `/soundboard/`，是一个点击播放克罗雅角色语音的音效板（`src/components/react/Soundboard.tsx` + `src/data/voices.ts`）。

本设计将其**完全替换**为「独轮车弹幕复制页」：一个克罗雅应援弹幕文案库，提供一键复制，方便粉丝去 B 站直播间 / 视频页手动粘贴刷屏（手动版「独轮车」）。

## 目标

- 完全替换原 soundboard 语音功能（语音功能移除）
- 提供「应援 / 整活 / 纪念」三类预设弹幕文案，一键复制到剪贴板
- 文案先由开发者拟示例占位，用户后续替换为真实文案
- 复用站点现有 glass + 天使粉 / 恶魔蓝视觉系统

## 非目标（YAGNI）

- **不做**自动循环发送：独立网站受浏览器跨域限制，无法代发 B 站弹幕，留给油猴脚本 / 插件
- **不做**用户自定义输入：本次只做预设文案库
- **不做**搜索：文案量小（示例约 15–20 条），分类筛选足够
- **不做**后端 / 持久化：纯静态页面

## 已确认决策

| 项 | 决策 |
|---|---|
| 导航标签 | 「独轮车」 |
| 路由 | `/danmaku/` |
| 替换策略 | 方案 A：全新替换，删除旧 soundboard 文件 |
| 分类维度 | 按用途：`cheer` 应援 / `meme` 整活 / `memorial` 纪念 |
| 文案来源 | 开发者先拟示例，用户后替换 |
| 原语音功能 | 移除 |

## 架构

镜像现有 soundboard 的「页面.astro + React 组件 client:load + data/.ts」三件套结构：

- `src/pages/danmaku.astro` → `BaseLayout` + `<DanmakuBoard client:load />`
- `src/components/react/DanmakuBoard.tsx`：分类筛选 + 文案卡片列表 + 复制逻辑
- `src/data/danmaku.ts`：导出 `danmaku` 数据数组
- `src/layouts/BaseLayout.astro`：导航第 3 项改为「独轮车」→ `/danmaku/`，图标由 `Volume2` 换为 `MessageCircle`（lucide-react）

## 数据结构

```ts
// src/data/danmaku.ts
export type DanmakuCategory = 'cheer' | 'meme' | 'memorial';

export interface DanmakuItem {
  id: string;
  text: string;          // 弹幕文案，建议 ≤20 字（B 站普通弹幕上限）
  category: DanmakuCategory;
  note?: string;         // 可选使用提示，如「适合生日直播」
}

export const danmaku: DanmakuItem[] = [
  { id: 'cheer-01', text: '克罗雅最可爱！', category: 'cheer' },
  { id: 'meme-01',  text: '今天是恶魔阵营', category: 'meme' },
  { id: 'memo-01',  text: '克罗雅生日快乐', category: 'memorial', note: '适合生日直播' },
  // ... 约 15–20 条，三类大致均衡
];
```

## 组件：DanmakuBoard.tsx

复用 `Soundboard.tsx` 的整体骨架（`useState` 分类筛选 + glass 卡片网格）：

- **state**：`selectedCategory: 'all' | DanmakuCategory`
- **顶部胶囊筛选 tab**：全部 / 应援 / 整活 / 纪念（沿用 soundboard 筛选样式，选中态用粉蓝渐变）
- **「复制全部（当前筛选）」按钮**：把当前筛选下的文案逐行合并写入剪贴板
- **卡片网格**：每张卡片显示
  - 文案全文
  - 字数标注 `x/20`（>20 用警告色，如红色）
  - 「复制」按钮
  - 整张卡片可点击触发复制
- **复制反馈**：成功后弹 Sonner toast「已复制」（站点已有 `ToasterWrapper`，直接复用）
- **空状态**：某分类无文案时，显示提示（复用 soundboard 空状态样式）

## 复制实现

```ts
import { toast } from 'sonner';

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    toast.success('已复制');
  } catch {
    // fallback：textarea + execCommand（兼容旧环境 / 非 HTTPS）
    // 站点部署在 HTTPS，正常情况走不到这里；实现时按需补
    toast.error('复制失败，请手动选择');
  }
}

// 单条：copyText(item.text)
// 全部：copyText(filtered.map(i => i.text).join('\n'))
```

## 视觉

- 复用站点 `glass` 卡片、`var(--accent-primary/secondary)`、天使粉 / 恶魔蓝渐变 accent
- 三类用色标区分：应援 = 粉（angel 系）、整活 = 蓝（demon 系）、纪念 = 紫
- 卡片 hover 复用现有 `scale-105` + glow 效果
- 「全部」筛选选中态用粉蓝渐变背景（同 soundboard）
- 暗色 / 亮色主题均需正常（复用 CSS 变量）

## 删除清单

- `src/pages/soundboard.astro`
- `src/components/react/Soundboard.tsx`
- `src/data/voices.ts`（含 6 个悬空音频路径 `/audio/angel|demon/*.mp3`）
- `src/layouts/BaseLayout.astro` 中 soundboard 专属样式（`.VoicePad` 等，随页面移除）
- 音频实体文件：经核查 `public/audio/` 目录**不存在**，6 个 mp3 从未入库——无需删实体，删 `voices.ts` 即清除引用

## 修改清单（导航 / 入口 / 测试迁移）

- `src/layouts/BaseLayout.astro`：桌面顶栏 + 移动底栏第 3 项，`Button` → `独轮车`、`/soundboard/` → `/danmaku/`、图标 `Volume2` → `MessageCircle`
- `src/components/astro/Hero.astro`：首页「克罗雅Button」入口卡片（约 178–191 行）改为指向 `/danmaku/`、文案改「独轮车」、图标换 `MessageCircle`
- `__tests__/unit/optimizations/dependencies.test.ts:29`：删除 `'src/components/react/Soundboard.tsx'`（或替换为 `'src/components/react/DanmakuBoard.tsx'`），否则文件不存在会致测试失败

## 相关测试用例核查

经核查**没有专门的 Soundboard 测试文件**，相关引用仅：
- `dependencies.test.ts` 第 29 行（见修改清单）
- `__tests__/unit/layouts/BaseLayout.test.tsx`：纯 placeholder，不断言 soundboard，无需改
- e2e 套件：无 `/soundboard` 路由断言，无需改

## 验收标准

1. 导航第 3 项（桌面顶栏 + 移动底栏）显示「独轮车」，点击进入 `/danmaku/`
2. 页面展示三类示例文案，顶部可按「全部 / 应援 / 整活 / 纪念」筛选
3. 点击任意卡片或「复制」按钮 → 文案进入剪贴板 + toast「已复制」
4. 「复制全部」→ 当前筛选下所有文案（换行分隔）进入剪贴板
5. 字数标注正确，超过 20 字标红
6. 原 `/soundboard/` 路由移除（个人小站，不做 301 重定向）
7. 暗色 / 亮色主题、移动端底部导航均正常
8. 无残留 soundboard 死代码（导航、组件、数据、样式）

## 风险 / 待确认

- 旧路由 `/soundboard/` 是否需要重定向：当前判断不需要（个人小站，直接移除）
