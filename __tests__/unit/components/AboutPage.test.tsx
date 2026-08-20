import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import AboutPage from '../../../src/components/react/AboutPage';

describe('AboutPage', () => {
  describe('Rendering', () => {
    it('should render disclaimer card', () => {
      render(<AboutPage />);
      // "本站声明"出现两次（天使和恶魔模式），使用getAllByText
      const disclaimerTexts = screen.getAllByText('本站声明');
      expect(disclaimerTexts.length).toBeGreaterThan(0);
      expect(screen.getByText('关于本站')).toBeInTheDocument();
    });

    it('should render disclaimer content', () => {
      render(<AboutPage />);
      // "本网站为"也出现两次，使用getAllByText
      const websiteTexts = screen.getAllByText(/本网站为/);
      expect(websiteTexts.length).toBeGreaterThan(0);
      const 克罗雅Texts = screen.getAllByText(/克罗雅/);
      expect(克罗雅Texts.length).toBeGreaterThan(0);
    });

    it('should render warning message', () => {
      render(<AboutPage />);
      // "请勿就本网站的相关问题"也出现两次
      const warningTexts = screen.getAllByText(/请勿就本网站的相关问题/);
      expect(warningTexts.length).toBeGreaterThan(0);
    });

    it('should render heart icon', () => {
      render(<AboutPage />);
      const heartIcon = document.querySelector('svg');
      expect(heartIcon).toBeInTheDocument();
    });
  });

  describe('Links', () => {
    it('should render Bilibili link', () => {
      render(<AboutPage />);
      const link = screen.getByText('@卿家ん');
      expect(link).toBeInTheDocument();
      expect(link).toHaveAttribute('href', 'https://space.bilibili.com/38028857');
    });

    it('外链（target="_blank"）均带含 noopener 的 rel（AboutPage.tsx L59 / L192）', () => {
      render(<AboutPage />);
      const external = screen
        .getAllByRole('link')
        .filter((a) => a.hasAttribute('target'));
      expect(external.length).toBeGreaterThan(0);
      for (const link of external) {
        expect(link).toHaveAttribute('rel', expect.stringContaining('noopener'));
      }
    });

    it('should render properly', () => {
      const { container } = render(<AboutPage />);
      expect(container).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper heading structure', () => {
      render(<AboutPage />);
      const headings = screen.getAllByRole('heading');
      expect(headings.length).toBeGreaterThan(0);
    });
  });

  describe('Visual Elements', () => {
    it('should render background effects', () => {
      render(<AboutPage />);
      const backgroundEffects = document.querySelectorAll('.animate-pulse-slow');
      expect(backgroundEffects.length).toBeGreaterThan(0);
    });

    it('should render disclaimer icon', () => {
      render(<AboutPage />);
      const disclaimerIcons = document.querySelectorAll('.w-12.h-12');
      expect(disclaimerIcons.length).toBeGreaterThan(0);
    });
  });
});
