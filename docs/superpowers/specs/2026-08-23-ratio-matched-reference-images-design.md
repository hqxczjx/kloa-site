# 图生图比例匹配参考图设计

## 背景与根因

图生图（换装玩法）输出的人物比例普遍失真。根因：基准立绘
`public/images/illustration.webp` 为 1024×2496（约 1:2.44 的超长竖版全身立绘），
而输出画布比例与参考图严重失配（默认 1:1，最竖的 9:16 也只有 1:1.78）。图生图
服务把参考图适配进目标画布潜空间时，跨比例重绘导致人物被压扁或模型"脑补"
重构人体（大头、长肢等解剖学畸变）。`preserve original composition` 约束与
不匹配画布冲突，进一步加剧畸变。

## 方案

静态裁切图 + 静态映射表（已否决：CF 图像变换运行时裁切——付费依赖、构图
约束无法用 center-crop 表达、本地 dev 不可用；纯 prompt 调整——潜空间失配
根因仍在）。

- 换装 UI 的横版比例（4:3、16:9）砍掉：换装立绘玩法天然适合竖版/方版，
  砍掉后每个保留比例都有构图精确匹配的参考图。
- 例外：`16:9` 保留为 API 合法档（映射原全身立绘 + `cinematic widescreen
  composition` 构图词）——小剧场 `StoryStudio` 硬编码 16:9 生成关键帧喂
  关键帧视频链，行为须保持不变（评审发现的计划遗漏，产品决策：保留横版）。
- 裁切档位（全部顶部对齐 y=0，头部必须完整，脚部取舍）：

| ratio | 裁切尺寸    | 构图       | 产物文件                          |
|-------|------------|-----------|----------------------------------|
| 1:1   | 1024×1024  | 头→胸口    | `public/images/illustration-1x1.webp`  |
| 3:4   | 1024×1365  | 头→腰      | `public/images/illustration-3x4.webp`  |
| 9:16  | 1024×1820  | 头→膝      | `public/images/illustration-9x16.webp` |

### 全身档（`9:16-full`，追加决策）

- 需求：裁切档全部"脚部取舍"，用户要"全身包括脚"的档位。Agnes 生图 API
  支持的最竖画布为 9:16（0.5625），装不下 1:2.44 立绘，跨比例直送必然畸变。
- 方案：letterbox——立绘等比缩到高 1820（宽 746 = floor(1024×1820/2496)），
  水平居中，两侧各 139px 纯黑 padding（与立绘原背景一致），生图模型补两侧
  背景。人物比例不畸变，全身含脚完整。
- 档位与画布比例解耦：`RATIO_FRAMES` 值由 URL 字符串改为
  `{ image, apiRatio }` 对象，`9:16-full` 档上送 `apiRatio: '9:16'`。
  9:16 有膝上/全身两档，档位 id 与画布比例不再一一对应。
- 构图词：`full-body illustration composition, entire figure from head to feet`。
- 产物：`public/images/illustration-9x16-full.webp`（1024×1820）。

## 组件改动

### 1. 裁切脚本 `scripts/generate-character-crops.mjs`

- 仿 `generate-font-subset.mjs` 模式：可重跑、产物入库、`--help` 说明。
- sharp（新增 devDependency）读 webp → 顶部对齐裁切 → 输出 webp。
- 文件名编码比例，与 worker URL、前端预览路径三方共用同一命名。

### 2. worker

- `config.ts` 新增单一数据源（全身档追加后值升级为 `{ image, apiRatio }` 对象，
  键为档位 id、`apiRatio` 为上送 Agnes 的画布比例）：
  ```ts
  export const RATIO_FRAMES = {
    '1:1':       { image: '.../illustration-1x1.webp',        apiRatio: '1:1' },
    '3:4':       { image: '.../illustration-3x4.webp',        apiRatio: '3:4' },
    '9:16':      { image: '.../illustration-9x16.webp',       apiRatio: '9:16' },
    '9:16-full': { image: '.../illustration-9x16-full.webp',  apiRatio: '9:16' },
    '16:9':      { image: '.../illustration.webp',            apiRatio: '16:9' }, // 小剧场关键帧专用
  } as const;
  ```
- `api/image.ts`：`RATIOS` 集合从 `Object.keys(RATIO_FRAMES)` 推导
  （消灭重复定义）；选图 `RATIO_FRAMES[ratio] ?? RATIO_FRAMES['1:1']`
  （防御性回退，正常路径不可达）；画布比例上送 `frame.apiRatio`。
- `AGNES_CHARACTER_URL` 覆盖语义保留：设置时所有 ratio 均用它（本地
  联调后门，行为不变）。
- `_lib/prompts.ts`：`buildImagePrompt(style, extra, ratio)` 新增 ratio
  参数，按 `RATIO_COMPOSITION_PROMPTS` 注入构图词（`'1:1' → 'upper-body
  portrait composition'`、`'3:4' → 'waist-up portrait composition'`、
  `'9:16' → 'knee-up illustration composition'`）。`preserve original
  composition` 保留——参考图比例匹配后该约束不再自相矛盾。

### 3. 前端 `ImageStudio.tsx` 与 `types.ts`

- `ImageRequest['ratio']` 类型为档位五值 `'1:1' | '3:4' | '9:16' | '9:16-full' | '16:9'`
  （StoryStudio 的 16:9 调用须类型合法）；换装下拉渲染 `1:1` / `3:4` /
  `9:16` / `9:16-full` 四个 option，4:3 与 16:9 不暴露给换装用户。
- 预览图 `src` 按 ratio 切换 `/images/illustration-{1x1|3x4|9x16|9x16-full}.webp`
  （生成前即可见参考图构图，管理预期）。
- 默认 ratio 仍为 `1:1`，其余不动。

## 错误处理

- 非法/缺失 ratio：校验后仍查不到映射时 fallback 到 1:1 图（防御性，
  正常路径不可达）。
- 前端 select 只有四个合法选项，无非法值入口。

## 测试

覆盖率阈值 95/88/97/98 不可破坏：

- `config.test.ts`：映射表恰好五键（含 9:16-full 全身档、16:9 小剧场专用档）、
  每档 `{ image, apiRatio }` 断言。
- `image.test.ts`：各 ratio → `extra_body.image` 断言正确 URL；全身档
  `ratio` 上送仍为 `'9:16'`；`AGNES_CHARACTER_URL` 覆盖生效；非法 ratio 落到 1:1。
- `image-prompts.test.ts`：五个档位构图词注入断言（含全身档
  `full-body illustration composition, entire figure from head to feet`）。
- 前端组件测试：ratio 选项数、预览 src 随 ratio 变化。
- `scripts/generate-character-crops.mjs` 不进覆盖率统计（与
  `generate-font-subset.mjs` 同待遇）。

## 范围外

- 视频链路（`api/video.ts`、`api/storyboard.ts`）继续用原全身立绘，
  未报问题不动。
- `public/images/illustration.webp` 原图保留（视频链路与它共用）。
