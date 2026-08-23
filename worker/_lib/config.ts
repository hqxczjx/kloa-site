export const AGNES_BASE_URL = 'https://api.agnes-ai.cn/v1';
export const CHAT_MODEL = 'agnes-2.5-flash';

export const RATE_LIMIT_MAX = 10;          // 每窗口每 IP 最大请求数
export const RATE_LIMIT_WINDOW_SEC = 60;   // 窗口大小（秒）

export const MAX_INPUT_CHARS = 100;        // 单条用户输入字数上限
export const MAX_HISTORY_TURNS = 6;        // 保留最近 N 条历史消息
export const CHAT_MAX_TOKENS = 512;        // 单次回复 token 上限
export const CHAT_TEMPERATURE = 0.8;       // 角色扮演场景偏活泛，避免默认值太保守
export const CHAT_SONG_SAMPLE_COUNT = 10;  // 命中推荐歌意图时注入的曲库节选条数

export const IMAGE_MODEL = 'agnes-image-2.1-flash';
// agnes 需公开可拉取的立绘 URL。可用环境变量 AGNES_CHARACTER_URL 覆盖（本地联调用临时公开图）。
// 与前端预览（ImageStudio/VideoStudio）共用 public/images/illustration.webp，避免界面与生图基准漂移。
export const DEFAULT_CHARACTER_IMAGE_URL = 'https://kloa.fans/images/illustration.webp';
// 图生图参考图按档位选择：立绘原图 1024×2496（≈1:2.44），直接送入失配画布会被
// 模型压扁或重构人体。档位图由 scripts/generate-character-crops.mjs 生成（三档顶部对齐
// 裁切 + 一档 letterbox 全身），立绘更新后需重跑（bun run gen:crops）并提交产物。
// 键为档位 id（前端下拉值），apiRatio 为上送 agnes 的画布比例——9:16 有膝上/全身两档，
// 故档位与画布比例不再一一对应。16:9 仅小剧场关键帧用（StoryStudio），换装 UI 不展示。
export const RATIO_FRAMES = {
  '1:1': { image: 'https://kloa.fans/images/illustration-1x1.webp', apiRatio: '1:1' },
  '3:4': { image: 'https://kloa.fans/images/illustration-3x4.webp', apiRatio: '3:4' },
  '9:16': { image: 'https://kloa.fans/images/illustration-9x16.webp', apiRatio: '9:16' },
  // 全身档：API 最竖仅 9:16，装不下 1:2.44 立绘，参考图等比缩小（宽 746）居中、
  // 两侧黑边由模型补背景，人物比例不畸变
  '9:16-full': { image: 'https://kloa.fans/images/illustration-9x16-full.webp', apiRatio: '9:16' },
  '16:9': { image: 'https://kloa.fans/images/illustration.webp', apiRatio: '16:9' },
} as const;
export const MAX_IMAGE_EXTRA_CHARS = 50;

export const VIDEO_MODEL = 'agnes-video-v2.0';
// agnesapi 轮询端点在 root（非 /v1）
export const AGNES_API_ROOT = 'https://api.agnes-ai.cn';
// duration(秒) → 帧数/帧率；num_frames 满足 8n+1
export const VIDEO_DURATION_PRESETS: Record<3 | 5, { num_frames: number; frame_rate: number }> = {
  3: { num_frames: 81, frame_rate: 24 },   // 81 = 8*10+1, ≈3.4s
  5: { num_frames: 121, frame_rate: 24 },  // 121 = 8*15+1, ≈5.0s
};

// 小剧场（关键帧链长视频）
export const STORY_SCENE_COUNT = 3;        // 段数（MVP 固定 3，关键帧 = 段数+1）
export const STORY_IDEA_MAX_CHARS = 200;   // 故事创意字数上限
export const STORYBOARD_MAX_TOKENS = 1024; // 分镜 JSON 输出 token 上限（4 帧+3 动作英文描述）
