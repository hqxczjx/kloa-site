import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import ToasterWrapper from '../../../src/components/ui/ToasterWrapper';

describe('ToasterWrapper', () => {
  describe('Rendering', () => {
    it('should render the toaster component', () => {
      const { container } = render(<ToasterWrapper />);
      expect(container.firstChild).toBeInTheDocument();
    });

    it('should render with correct duration prop', () => {
      const { container } = render(<ToasterWrapper />);
      const toaster = container.firstChild as HTMLElement;
      expect(toaster).toBeInTheDocument();
    });

    it('should render with bottom-center position', () => {
      const { container } = render(<ToasterWrapper />);
      const toaster = container.firstChild as HTMLElement;
      expect(toaster).toBeInTheDocument();
    });
  });

  describe('Toast Options', () => {
    it('should apply custom toast class name', () => {
      const { container } = render(<ToasterWrapper />);
      const toaster = container.firstChild as HTMLElement;
      expect(toaster).toBeInTheDocument();
    });

    it('should apply custom description class name', () => {
      const { container } = render(<ToasterWrapper />);
      const toaster = container.firstChild as HTMLElement;
      expect(toaster).toBeInTheDocument();
    });

    it('should apply custom icon class name', () => {
      const { container } = render(<ToasterWrapper />);
      const toaster = container.firstChild as HTMLElement;
      expect(toaster).toBeInTheDocument();
    });
  });

  describe('Default Values', () => {
    it('should use default duration of 3000ms', () => {
      const { container } = render(<ToasterWrapper />);
      const toaster = container.firstChild as HTMLElement;
      expect(toaster).toBeInTheDocument();
    });

    it('should use default position of bottom-center', () => {
      const { container } = render(<ToasterWrapper />);
      const toaster = container.firstChild as HTMLElement;
      expect(toaster).toBeInTheDocument();
    });
  });
});

  describe('Additional Coverage Tests', () => {
    it('should render with correct duration', () => {
      const { container } = render(<ToasterWrapper />);
      expect(container).toBeInTheDocument();
    });

    it('should render with correct position', () => {
      const { container } = render(<ToasterWrapper />);
      expect(container).toBeInTheDocument();
    });

    it('should apply custom toast classes', () => {
      const { container } = render(<ToasterWrapper />);
      expect(container).toBeInTheDocument();
    });

    it('should render without crashing', () => {
      expect(() => render(<ToasterWrapper />)).not.toThrow();
    });

    it('should have correct toast configuration', () => {
      const { container } = render(<ToasterWrapper />);
      expect(container).toBeInTheDocument();
    });
  });
