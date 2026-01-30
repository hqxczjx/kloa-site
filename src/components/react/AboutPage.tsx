import { ShieldAlert, Mail, Zap, Layers, Cpu, Heart, MessageCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { GithubIcon } from '../ui/BrandIcons';

export default function AboutPage() {
  return (
    <div className="relative min-h-screen px-4 py-8 md:px-8 lg:px-16 overflow-hidden">
      {/* Background Effects */}
      <div className="fixed inset-0 pointer-events-none">
        {/* Angel Mode: Floating Light Particles */}
        <div className="hidden dark:block absolute top-20 left-10 w-32 h-32 rounded-full animate-pulse-slow" style={{ background: 'radial-gradient(circle, oklch(0.64 0.10 240 / 0.2), transparent)' }}></div>
        <div className="hidden dark:block absolute top-40 right-20 w-24 h-24 rounded-full animate-pulse-slow" style={{ background: 'radial-gradient(circle, oklch(0.72 0.12 15 / 0.15), transparent)', animationDelay: '1s' }}></div>
        <div className="hidden dark:block absolute bottom-40 left-1/4 w-40 h-40 rounded-full animate-pulse-slow" style={{ background: 'radial-gradient(circle, oklch(0.64 0.10 240 / 0.15), transparent)', animationDelay: '2s' }}></div>
        <div className="hidden dark:block absolute bottom-20 right-1/3 w-28 h-28 rounded-full animate-pulse-slow" style={{ background: 'radial-gradient(circle, oklch(0.72 0.12 15 / 0.2), transparent)', animationDelay: '1.5s' }}></div>

        {/* Demon Mode: Neon Glows */}
        <div className="dark:hidden absolute top-20 left-10 w-32 h-32 rounded-full animate-pulse-slow" style={{ background: 'radial-gradient(circle, oklch(0.72 0.12 15 / 0.15), transparent)' }}></div>
        <div className="dark:hidden absolute top-40 right-20 w-24 h-24 rounded-full animate-pulse-slow" style={{ background: 'radial-gradient(circle, oklch(0.72 0.12 15 / 0.12), transparent)', animationDelay: '1s' }}></div>
        <div className="dark:hidden absolute bottom-40 left-1/4 w-40 h-40 rounded-full animate-pulse-slow" style={{ background: 'radial-gradient(circle, oklch(0.72 0.12 15 / 0.1), transparent)', animationDelay: '2s' }}></div>
        <div className="dark:hidden absolute bottom-20 right-1/3 w-28 h-28 rounded-full animate-pulse-slow" style={{ background: 'radial-gradient(circle, oklch(0.72 0.12 15 / 0.15), transparent)', animationDelay: '1.5s' }}></div>
      </div>

      {/* Page Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="text-center mb-12 relative z-10"
      >
        <h1 className="font-serif text-4xl md:text-5xl lg:text-6xl font-bold mb-4" style={{ color: 'var(--accent-primary)' }}>
          关于本站
        </h1>
        {/* Decorative Heart */}
        <div className="flex justify-center mt-6">
          <motion.div
            animate={{ scale: [1, 1.1, 1], rotate: [0, 5, -5, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            className="w-8 h-8"
            style={{ background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))' }}
          >
            <Heart className="w-8 h-8 text-white" fill="currentColor" />
          </motion.div>
        </div>
      </motion.div>

      {/* Bento Grid Layout */}
      <div className="max-w-6xl mx-auto relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 auto-rows-min">

          {/* Card 1: Disclaimer (Full Width, Top Priority) */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
            className="col-span-1 md:col-span-2 lg:col-span-3 rounded-2xl p-6 md:p-8 border-2 relative overflow-hidden disclaimer-card"
          >
            {/* Warning Card - Light Mode */}
            <div className="dark:hidden relative">
              <div className="flex items-start gap-4">
                <div className="shrink-0 w-12 h-12 rounded-full flex items-center justify-center disclaimer-icon-bg">
                  <ShieldAlert className="w-6 h-6 disclaimer-icon" />
                </div>
                <div className="flex-1">
                  <h2 className="font-serif text-xl md:text-2xl font-bold mb-4 disclaimer-title">
                    本站声明
                  </h2>
                  <div className="space-y-3 disclaimer-text">
                    <p className="text-base md:text-lg">
                      本网站为 <a href='https://space.bilibili.com/38028857'>@卿家ん</a> 出于临时起意而自发制作的非官方站点。
                    </p>
                    <p className="text-base md:text-lg">
                      本站与 <strong>克罗雅</strong> 及相关公司无任何直接或许可关系。
                    </p>
                    <p className="text-base md:text-lg font-bold border-l-4 pl-4 py-2 rounded-r disclaimer-highlight">
                      请勿就本网站的相关问题（如Bug、功能建议）去打扰主播本人或官方运营人员。
                    </p>
                  </div>
                </div>
              </div>
              {/* Decorative Warning Pattern */}
              <div className="absolute top-0 right-0 w-32 h-32 opacity-5 disclaimer-pattern">
                <ShieldAlert className="w-full h-full" />
              </div>
            </div>

            {/* Warning Card - Dark Mode */}
            <div className="hidden dark:block relative">
              <div className="flex items-start gap-4">
                <div className="shrink-0 w-12 h-12 rounded-full flex items-center justify-center disclaimer-icon-bg-dark">
                  <ShieldAlert className="w-6 h-6 disclaimer-icon-dark" />
                </div>
                <div className="flex-1">
                  <h2 className="font-serif text-xl md:text-2xl font-bold mb-4 disclaimer-title-dark">
                    本站声明
                  </h2>
                  <div className="space-y-3 disclaimer-text-dark">
                    <p className="text-base md:text-lg">
                      本网站为粉丝出于喜爱而制作的非官方应援站点。
                    </p>
                    <p className="text-base md:text-lg">
                      本站与 <strong>克罗雅</strong> 及相关公司无任何直接或许可关系。
                    </p>
                    <p className="text-base md:text-lg font-bold border-l-4 pl-4 py-2 rounded-r disclaimer-highlight-dark">
                      请勿就本网站的相关问题（如Bug、功能建议）去打扰主播本人或官方运营人员。
                    </p>
                  </div>
                </div>
              </div>
              {/* Decorative Warning Pattern */}
              <div className="absolute top-0 right-0 w-32 h-32 opacity-5 disclaimer-pattern-dark">
                <ShieldAlert className="w-full h-full" />
              </div>
            </div>
          </motion.div>

          {/* Card 2: Dev Note (The 'Murmur') */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="col-span-1 md:col-span-2 glass rounded-2xl p-6 hover:scale-[1.02] transition-transform duration-300"
          >
            <h3 className="font-serif text-xl font-bold mb-4 flex items-center gap-2" style={{ color: 'var(--accent-primary)' }}>
              <MessageCircle className="w-5 h-5" />
              开发者碎碎念
            </h3>
            <div className="space-y-4 mb-6">
              <p className="text-base md:text-lg" style={{ color: 'var(--text-primary)' }}>
                这个网站全靠爱发电，由我一人独立开发维护。
              </p>
              <p className="text-base md:text-lg" style={{ color: 'var(--text-primary)' }}>
                因为主播原歌单太神了，想试下弄个方便自己点歌用。
              </p>
              <p className="text-base md:text-lg" style={{ color: 'var(--text-primary)' }}>
                当了好多年前端也没试过自己部署网站，所以这算是个试验场，不确定什么时候爆炸。
              </p>
              <p className="text-base md:text-lg" style={{ color: 'var(--text-primary)' }}>
                如果遇到 Bug 或有数据补充，欢迎联系我！
              </p>
            </div>

            {/* Tech Stack Icons (Subtle Footer) */}
            <div className="pt-4 border-t" style={{ borderColor: 'var(--glass-border)' }}>
              <p className="text-xs mb-3" style={{ color: 'var(--text-secondary)' }}>Built with</p>
              <div className="flex flex-wrap gap-3">
                {/* Astro */}
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg transition-colors duration-300"
                  style={{ backgroundColor: 'var(--bg-secondary)' }}
                >
                  <div className="w-6 h-6 rounded flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #ff5d01, #ff8c00)' }}>
                    <Zap className="w-4 h-4 text-white" />
                  </div>
                  <span className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>Astro</span>
                </motion.div>
                {/* React */}
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg transition-colors duration-300"
                  style={{ backgroundColor: 'var(--bg-secondary)' }}
                >
                  <div className="w-6 h-6 rounded flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #61dafb, #21a1f1)' }}>
                    <Layers className="w-4 h-4 text-white" />
                  </div>
                  <span className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>React</span>
                </motion.div>
                {/* Bun */}
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg transition-colors duration-300"
                  style={{ backgroundColor: 'var(--bg-secondary)' }}
                >
                  <div className="w-6 h-6 rounded flex items-center justify-center bun-gradient">
                    <Cpu className="w-4 h-4 bun-icon" />
                  </div>
                  <span className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>Bun</span>
                </motion.div>
              </div>
            </div>
          </motion.div>

          {/* Card 3: Contact Method */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="col-span-1 glass rounded-2xl p-6 hover:scale-[1.02] transition-transform duration-300"
          >
            <h3 className="font-serif text-xl font-bold mb-4 flex items-center gap-2" style={{ color: 'var(--accent-primary)' }}>
              <Mail className="w-5 h-5" />
              联系方式
            </h3>
            <div className="space-y-4">
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                发现问题或有建议？欢迎反馈！
              </p>
              <a
                href="mailto:qwqtest1@outlook.com"
                className="flex items-center gap-3 w-full px-4 py-3 rounded-lg font-medium transition-all duration-300 hover:scale-105"
                style={{ background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))', color: 'white', boxShadow: '0 4px 15px var(--glow-color)' }}
              >
                <Mail className="w-4 h-4" />
                Email Me
              </a>
              <a
                href="https://github.com/hqxczjx/kloa-site"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 w-full px-4 py-3 rounded-lg font-medium transition-all duration-300 hover:scale-105"
                style={{ background: 'var(--bg-secondary)', border: '1px solid var(--glass-border)', color: 'var(--accent-primary)' }}
              >
                <GithubIcon className="w-4 h-4" />
                GitHub
              </a>
            </div>
          </motion.div>

        </div>
      </div>

      {/* Decorative Bottom Heart */}
      <motion.div
        initial={{ opacity: 0, scale: 0 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8, delay: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="fixed bottom-24 md:bottom-8 left-1/2 -translate-x-1/2 z-0 pointer-events-none"
      >
        <motion.div
          animate={{
            y: [0, -10, 0],
            opacity: [0.3, 0.5, 0.3]
          }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          className="w-16 h-16"
          style={{ background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))', filter: 'blur(40px)' }}
        >
        </motion.div>
      </motion.div>
    </div>
  );
}
