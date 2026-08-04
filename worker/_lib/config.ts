export const AGNES_BASE_URL = 'https://api.agnes-ai.cn/v1';
export const CHAT_MODEL = 'agnes-2.5-flash';

export const RATE_LIMIT_MAX = 10;          // 每窗口每 IP 最大请求数
export const RATE_LIMIT_WINDOW_SEC = 60;   // 窗口大小（秒）

export const MAX_INPUT_CHARS = 100;        // 单条用户输入字数上限
export const MAX_HISTORY_TURNS = 6;        // 保留最近 N 条历史消息
export const CHAT_MAX_TOKENS = 512;        // 单次回复 token 上限

export const IMAGE_MODEL = 'agnes-image-2.1-flash';
// agnes 需公开可拉取的立绘 URL。可用环境变量 AGNES_CHARACTER_URL 覆盖（本地联调用临时公开图）。
export const DEFAULT_CHARACTER_IMAGE_URL = 'https://kloa.fans/images/character-1.png';
export const MAX_IMAGE_EXTRA_CHARS = 50;
