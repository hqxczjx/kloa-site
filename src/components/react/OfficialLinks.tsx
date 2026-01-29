import { Tv, Youtube, Twitter } from 'lucide-react';

export default function OfficialLinks() {
  return (
    <div className="flex flex-wrap justify-center gap-4 md:gap-6">
      {/* Bilibili / Live */}
      <a
        href="https://live.bilibili.com"
        target="_blank"
        rel="noopener noreferrer"
        className="group flex items-center gap-3 px-6 py-4 rounded-2xl glass transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-pink-500/30"
      >
        <div className="w-10 h-10 rounded-full flex items-center justify-center transition-colors duration-300 group-hover:bg-pink-500/20">
          <Tv className="w-5 h-5 transition-colors duration-300" style={{ color: 'var(--accent-primary)' }} />
        </div>
        <span className="font-medium transition-colors duration-300 group-hover:text-pink-500" style={{ color: 'var(--text-primary)' }}>
          直播间
        </span>
      </a>

      {/* YouTube */}
      <a
        href="https://youtube.com"
        target="_blank"
        rel="noopener noreferrer"
        className="group flex items-center gap-3 px-6 py-4 rounded-2xl glass transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-red-500/30"
      >
        <div className="w-10 h-10 rounded-full flex items-center justify-center transition-colors duration-300 group-hover:bg-red-500/20">
          <Youtube className="w-5 h-5 transition-colors duration-300 text-red-500" />
        </div>
        <span className="font-medium transition-colors duration-300 group-hover:text-red-500" style={{ color: 'var(--text-primary)' }}>
          Channel
        </span>
      </a>

      {/* Twitter/X */}
      <a
        href="https://twitter.com"
        target="_blank"
        rel="noopener noreferrer"
        className="group flex items-center gap-3 px-6 py-4 rounded-2xl glass transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-blue-500/30"
      >
        <div className="w-10 h-10 rounded-full flex items-center justify-center transition-colors duration-300 group-hover:bg-blue-500/20">
          <Twitter className="w-5 h-5 transition-colors duration-300 text-blue-500" />
        </div>
        <span className="font-medium transition-colors duration-300 group-hover:text-blue-500" style={{ color: 'var(--text-primary)' }}>
          Twitter
        </span>
      </a>
    </div>
  );
}
