export interface VoiceClip {
  id: string;
  label: string;
  category: 'angel' | 'demon';
  src: string;
  icon?: string;
}

export const voices: VoiceClip[] = [
  {
    id: 'angel-1',
    label: '早安',
    category: 'angel',
    src: '/audio/angel/good-morning.mp3',
    icon: 'Sun',
  },
  {
    id: 'angel-2',
    label: '晚安',
    category: 'angel',
    src: '/audio/angel/good-night.mp3',
    icon: 'Moon',
  },
  {
    id: 'angel-3',
    label: '加油',
    category: 'angel',
    src: '/audio/angel/good-luck.mp3',
    icon: 'Heart',
  },
  {
    id: 'demon-1',
    label: '哼哼',
    category: 'demon',
    src: '/audio/demon/hehe.mp3',
    icon: 'Ghost',
  },
  {
    id: 'demon-2',
    label: '小心',
    category: 'demon',
    src: '/audio/demon/be-careful.mp3',
    icon: 'Ghost',
  },
  {
    id: 'demon-3',
    label: '燃烧',
    category: 'demon',
    src: '/audio/demon/burn.mp3',
    icon: 'Ghost',
  },
];
