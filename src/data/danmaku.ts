export type DanmakuCategory = 'cheer' | 'meme' | 'memorial';

export interface DanmakuItem {
  id: string;
  text: string;
  category: DanmakuCategory;
  note?: string;
}

// 示例文案，后续替换为真实应援弹幕。普通弹幕上限 20 字，超长条用 note 标注。
export const danmaku: DanmakuItem[] = [
  // 应援
  { id: 'cheer-01', text: '克罗雅最可爱！', category: 'cheer' },
  { id: 'cheer-02', text: '克罗雅冲冲冲', category: 'cheer' },
  { id: 'cheer-03', text: '今天也是克罗雅', category: 'cheer' },
  { id: 'cheer-04', text: '克罗雅唱歌真好听', category: 'cheer' },
  { id: 'cheer-05', text: '永远支持克罗雅', category: 'cheer' },
  { id: 'cheer-06', text: '克罗雅贴贴', category: 'cheer' },
  // 整活
  { id: 'meme-01', text: '今天是恶魔阵营', category: 'meme' },
  { id: 'meme-02', text: '天使克罗雅下线了', category: 'meme' },
  { id: 'meme-03', text: '恶魔克罗雅降临', category: 'meme' },
  { id: 'meme-04', text: '这波是克罗雅', category: 'meme' },
  { id: 'meme-05', text: '哈哈哈克罗雅', category: 'meme' },
  // 纪念
  { id: 'memorial-01', text: '克罗雅生日快乐', category: 'memorial' },
  { id: 'memorial-02', text: '与克罗雅相遇的第一天', category: 'memorial' },
  { id: 'memorial-03', text: '克罗雅感谢有你陪伴', category: 'memorial' },
  { id: 'memorial-04', text: '祝我们最爱的克罗雅生日快乐，永远幸福开心每一天！', category: 'memorial', note: '超过20字，需彩色/高级弹幕权限' },
];
