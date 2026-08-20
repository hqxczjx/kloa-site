import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ThemeToggle from '../../../src/components/ui/ThemeToggle';

describe('ThemeToggle', () => {
  afterEach(() => {
    document.documentElement.classList.remove('dark');
  });

  describe('Initial State', () => {
    it('should render in Angel mode (light) by default', () => {
      render(<ThemeToggle />);

      const toggle = screen.getByRole('button');
      expect(toggle).toBeInTheDocument();
      expect(screen.getByLabelText('切换到恶魔模式')).toBeInTheDocument();
    });

    it('should use system preference when no saved theme', () => {
      (window.matchMedia as any).mockImplementation((query: string) => ({
        matches: query === '(prefers-color-scheme: dark)',
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }));

      render(<ThemeToggle />);

      expect(document.documentElement.classList.contains('dark')).toBe(true);
      expect(screen.getByLabelText('切换到天使模式')).toBeInTheDocument();
    });

    it('should use saved theme from localStorage', () => {
      (global.localStorage.getItem as any).mockImplementation((key: string) => {
        if (key === 'theme') return 'dark';
        return null;
      });

      render(<ThemeToggle />);

      expect(document.documentElement.classList.contains('dark')).toBe(true);
      expect(screen.getByLabelText('切换到天使模式')).toBeInTheDocument();
    });

    it('should prioritize saved theme over system preference', () => {
      (global.localStorage.getItem as any).mockImplementation((key: string) => {
        if (key === 'theme') return 'light';
        return null;
      });
      (window.matchMedia as any).mockImplementation((query: string) => ({
        matches: query === '(prefers-color-scheme: dark)',
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }));

      render(<ThemeToggle />);

      expect(document.documentElement.classList.contains('dark')).toBe(false);
      expect(screen.getByLabelText('切换到恶魔模式')).toBeInTheDocument();
    });
  });

  describe('Theme Toggling', () => {
    it('should switch to Demon mode (dark) when clicked', async () => {
      const user = userEvent.setup();
      render(<ThemeToggle />);

      const toggle = screen.getByLabelText('切换到恶魔模式');
      await user.click(toggle);

      expect(document.documentElement.classList.contains('dark')).toBe(true);
      expect(screen.getByLabelText('切换到天使模式')).toBeInTheDocument();
    });

    it('should switch back to Angel mode (light) when clicked again', async () => {
      const user = userEvent.setup();
      render(<ThemeToggle />);

      const toggle = screen.getByLabelText('切换到恶魔模式');
      await user.click(toggle);

      expect(document.documentElement.classList.contains('dark')).toBe(true);

      const toggleBack = screen.getByLabelText('切换到天使模式');
      await user.click(toggleBack);

      expect(document.documentElement.classList.contains('dark')).toBe(false);
      expect(screen.getByLabelText('切换到恶魔模式')).toBeInTheDocument();
    });

    it('should toggle multiple times correctly', async () => {
      const user = userEvent.setup();
      render(<ThemeToggle />);

      const toggle = screen.getByRole('button');

      // Click 1: Light -> Dark
      await user.click(toggle);
      expect(document.documentElement.classList.contains('dark')).toBe(true);

      // Click 2: Dark -> Light
      await user.click(toggle);
      expect(document.documentElement.classList.contains('dark')).toBe(false);

      // Click 3: Light -> Dark
      await user.click(toggle);
      expect(document.documentElement.classList.contains('dark')).toBe(true);
    });
  });

  describe('Visual Elements', () => {
    // 借 lucide icon class 区分图标（参考 PersistentPlayer.test.tsx 的 iconBtn 做法）；
    // 光环/辉光层（w-20）与 knob（w-6）尺寸类不同，靠 class 计数区分条件渲染
    it('天使态渲染 Sun 图标与光环层，不渲染 Moon（ThemeToggle.tsx L106-122）', () => {
      render(<ThemeToggle />);

      expect(document.querySelector('.lucide-sun')).toBeInTheDocument();
      expect(document.querySelector('.lucide-moon')).not.toBeInTheDocument();
      expect(document.querySelectorAll('button div.absolute.w-20')).toHaveLength(1);
    });

    it('恶魔态渲染 Moon 图标与辉光层，不渲染 Sun（ThemeToggle.tsx L106-133）', async () => {
      const user = userEvent.setup();
      render(<ThemeToggle />);

      await user.click(screen.getByLabelText('切换到恶魔模式'));

      expect(document.querySelector('.lucide-moon')).toBeInTheDocument();
      expect(document.querySelector('.lucide-sun')).not.toBeInTheDocument();
      expect(document.querySelectorAll('button div.absolute.w-20')).toHaveLength(1);
    });
  });

  describe('Accessibility', () => {
    it('should have correct aria-label in Angel mode', () => {
      render(<ThemeToggle />);

      expect(screen.getByLabelText('切换到恶魔模式')).toBeInTheDocument();
    });

    it('should have correct aria-label in Demon mode', async () => {
      const user = userEvent.setup();
      render(<ThemeToggle />);

      const toggle = screen.getByLabelText('切换到恶魔模式');
      await user.click(toggle);

      expect(screen.getByLabelText('切换到天使模式')).toBeInTheDocument();
    });

    it('should be keyboard accessible', async () => {
      const user = userEvent.setup();
      render(<ThemeToggle />);

      const toggle = screen.getByRole('button');
      toggle.focus();
      await user.keyboard('{Enter}');

      expect(document.documentElement.classList.contains('dark')).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('localStorage 非法值（invalid/空串/大小写不符）回退系统偏好（天使态）', () => {
      for (const value of ['invalid', '', 'DARK']) {
        (global.localStorage.getItem as any).mockReturnValue(value);
        document.documentElement.classList.remove('dark');

        const { unmount } = render(<ThemeToggle />);
        // saved !== 'dark' 且系统偏好 light → 天使态
        expect(document.documentElement.classList.contains('dark')).toBe(false);
        unmount();
      }
    });

    it('should handle localStorage read error gracefully', () => {
      (global.localStorage.getItem as any).mockImplementation(() => {
        throw new Error('Storage error');
      });

      // 即使localStorage出错，组件也应该能渲染（fallback到系统偏好）
      render(<ThemeToggle />);

      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('should handle localStorage write error gracefully', async () => {
      const user = userEvent.setup();
      (global.localStorage.setItem as any).mockImplementation(() => {
        throw new Error('Storage error');
      });

      render(<ThemeToggle />);

      await user.click(screen.getByRole('button'));

      // 写入失败不影响视觉切换（toggleTheme 的 try/catch 兜底）
      expect(document.documentElement.classList.contains('dark')).toBe(true);
    });
  });
});
