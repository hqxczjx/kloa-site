import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BilibiliIcon, GithubIcon } from '../../../src/components/ui/BrandIcons';

describe('BrandIcons', () => {
  describe('BilibiliIcon', () => {
    it('should render with default className', () => {
      render(<BilibiliIcon />);
      const svg = document.querySelector('svg');
      expect(svg).toHaveClass('w-6', 'h-6');
    });

    it('should render with custom className', () => {
      render(<BilibiliIcon className="w-10 h-10" />);
      const svg = document.querySelector('svg');
      expect(svg).toHaveClass('w-10', 'h-10');
    });

    it('should have correct viewBox', () => {
      render(<BilibiliIcon />);
      const svg = document.querySelector('svg');
      expect(svg).toHaveAttribute('viewBox', '0 0 24 24');
    });

    it('should have fill currentColor', () => {
      render(<BilibiliIcon />);
      const svg = document.querySelector('svg');
      expect(svg).toHaveAttribute('fill', 'currentColor');
    });

    it('should pass through additional props', () => {
      render(<BilibiliIcon data-testid="bilibili-icon" aria-label="Bilibili" />);
      const svg = document.querySelector('svg');
      expect(svg).toHaveAttribute('data-testid', 'bilibili-icon');
      expect(svg).toHaveAttribute('aria-label', 'Bilibili');
    });

    it('should render path element', () => {
      render(<BilibiliIcon />);
      const path = document.querySelector('path');
      expect(path).toBeInTheDocument();
    });
  });

  describe('GithubIcon', () => {
    it('should render with default className', () => {
      render(<GithubIcon />);
      const svg = document.querySelector('svg');
      expect(svg).toHaveClass('w-6', 'h-6');
    });

    it('should render with custom className', () => {
      render(<GithubIcon className="w-10 h-10" />);
      const svg = document.querySelector('svg');
      expect(svg).toHaveClass('w-10', 'h-10');
    });

    it('should have correct viewBox', () => {
      render(<GithubIcon />);
      const svg = document.querySelector('svg');
      expect(svg).toHaveAttribute('viewBox', '0 0 24 24');
    });

    it('should have correct dimensions', () => {
      render(<GithubIcon />);
      const svg = document.querySelector('svg');
      expect(svg).toHaveAttribute('width', '24');
      expect(svg).toHaveAttribute('height', '24');
    });

    it('should have stroke currentColor', () => {
      render(<GithubIcon />);
      const svg = document.querySelector('svg');
      expect(svg).toHaveAttribute('stroke', 'currentColor');
    });

    it('should have no fill', () => {
      render(<GithubIcon />);
      const svg = document.querySelector('svg');
      expect(svg).toHaveAttribute('fill', 'none');
    });

    it('should have correct stroke width', () => {
      render(<GithubIcon />);
      const svg = document.querySelector('svg');
      expect(svg).toHaveAttribute('stroke-width', '2');
    });

    it('should pass through additional props', () => {
      render(<GithubIcon data-testid="github-icon" aria-label="GitHub" />);
      const svg = document.querySelector('svg');
      expect(svg).toHaveAttribute('data-testid', 'github-icon');
      expect(svg).toHaveAttribute('aria-label', 'GitHub');
    });

    it('should render path elements', () => {
      render(<GithubIcon />);
      const paths = document.querySelectorAll('path');
      expect(paths.length).toBe(2);
    });
  });

  describe('Combined', () => {
    it('should render both icons together', () => {
      render(
        <div>
          <BilibiliIcon />
          <GithubIcon />
        </div>
      );

      const svgs = document.querySelectorAll('svg');
      expect(svgs.length).toBe(2);
    });

    it('should allow different styling for each icon', () => {
      render(
        <div>
          <BilibiliIcon className="icon-pink" />
          <GithubIcon className="icon-blue" />
        </div>
      );

      const svgs = document.querySelectorAll('svg');
      expect(svgs[0]).toHaveClass('icon-pink');
      expect(svgs[1]).toHaveClass('icon-blue');
    });
  });
});

  describe('Additional Coverage Tests', () => {
    it('should handle custom className', () => {
      render(<BilibiliIcon className="custom-class" />);
      const svg = document.querySelector('svg');
      expect(svg).toHaveClass('custom-class');
    });

    it('should handle custom viewBox', () => {
      render(<BilibiliIcon viewBox="0 0 100 100" />);
      const svg = document.querySelector('svg');
      expect(svg).toHaveAttribute('viewBox', '0 0 100 100');
    });

    it('should handle custom fill', () => {
      render(<BilibiliIcon fill="custom-color" />);
      const svg = document.querySelector('svg');
      expect(svg).toHaveAttribute('fill', 'custom-color');
    });

    it('should handle custom stroke', () => {
      render(<GithubIcon stroke="custom-stroke" strokeWidth="3" />);
      const svg = document.querySelector('svg');
      expect(svg).toHaveAttribute('stroke', 'custom-stroke');
      expect(svg).toHaveAttribute('stroke-width', '3');
    });

    it('should handle custom width and height', () => {
      render(<GithubIcon width="32" height="32" />);
      const svg = document.querySelector('svg');
      expect(svg).toHaveAttribute('width', '32');
      expect(svg).toHaveAttribute('height', '32');
    });

    it('should handle additional props', () => {
      render(<BilibiliIcon data-testid="test-icon" aria-label="Test Bilibili" />);
      const svg = document.querySelector('svg');
      expect(svg).toHaveAttribute('data-testid', 'test-icon');
      expect(svg).toHaveAttribute('aria-label', 'Test Bilibili');
    });

    it('should render multiple icons together', () => {
      render(
        <>
          <BilibiliIcon />
          <GithubIcon />
        </>
      );

      const svgs = document.querySelectorAll('svg');
      expect(svgs.length).toBe(2);
    });
  });
